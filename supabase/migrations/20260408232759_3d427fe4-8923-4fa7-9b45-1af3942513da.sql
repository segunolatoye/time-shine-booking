
-- Enums
CREATE TYPE public.booking_status AS ENUM ('pending_payment', 'pending_verification', 'confirmed', 'completed', 'cancelled', 'no_show');
CREATE TYPE public.payment_status AS ENUM ('pending', 'pending_verification', 'paid_partial', 'paid_full', 'failed', 'refunded');
CREATE TYPE public.payment_method AS ENUM ('cash_app', 'zelle');
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- User roles table FIRST
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role function (security definer) — table exists now
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS for user_roles (can now use has_role)
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Services
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active services" ON public.services FOR SELECT USING (active = true);
CREATE POLICY "Admins can manage services" ON public.services FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Staff
CREATE TABLE public.staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active staff" ON public.staff FOR SELECT USING (active = true);
CREATE POLICY "Admins can manage staff" ON public.staff FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Staff-Services
CREATE TABLE public.staff_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  UNIQUE(staff_id, service_id)
);
ALTER TABLE public.staff_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view staff services" ON public.staff_services FOR SELECT USING (true);
CREATE POLICY "Admins can manage staff services" ON public.staff_services FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Working hours
CREATE TABLE public.working_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_off BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.working_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view working hours" ON public.working_hours FOR SELECT USING (true);
CREATE POLICY "Admins can manage working hours" ON public.working_hours FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Staff breaks
CREATE TABLE public.staff_breaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.staff_breaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view breaks" ON public.staff_breaks FOR SELECT USING (true);
CREATE POLICY "Admins can manage breaks" ON public.staff_breaks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Closures
CREATE TABLE public.closures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  reason TEXT,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.closures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view closures" ON public.closures FOR SELECT USING (true);
CREATE POLICY "Admins can manage closures" ON public.closures FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Bookings
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id),
  staff_id UUID REFERENCES public.staff(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending_payment',
  access_token UUID NOT NULL DEFAULT gen_random_uuid(),
  hold_expires_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view bookings" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert bookings" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update bookings" ON public.bookings FOR UPDATE USING (true);
CREATE POLICY "Admins can delete bookings" ON public.bookings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Payments
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  method payment_method NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  reference TEXT,
  proof_screenshot_url TEXT,
  admin_notes TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert payments" ON public.payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage payments" ON public.payments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Settings
CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage settings" ON public.settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', false);
CREATE POLICY "Anyone can upload payment proofs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'payment-proofs');
CREATE POLICY "Admins can view payment proofs" ON storage.objects FOR SELECT USING (bucket_id = 'payment-proofs');

-- Triggers
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_working_hours_updated_at BEFORE UPDATE ON public.working_hours FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
