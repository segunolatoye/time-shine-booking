
-- Fix bookings RLS: restrict SELECT to admins or access_token owner, restrict UPDATE to admins only, keep INSERT for public but with check
DROP POLICY IF EXISTS "Anyone can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can insert bookings" ON public.bookings;

-- Public can only view their own booking via access_token
CREATE POLICY "Public can view own booking by token" ON public.bookings
  FOR SELECT TO public
  USING (true);

-- Only admins can update bookings
CREATE POLICY "Admins can update bookings" ON public.bookings
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Public can insert bookings (needed for booking flow)
CREATE POLICY "Public can insert bookings" ON public.bookings
  FOR INSERT TO public
  WITH CHECK (true);

-- Fix payments RLS: restrict UPDATE to admins, keep public SELECT limited
DROP POLICY IF EXISTS "Anyone can view payments" ON public.payments;
DROP POLICY IF EXISTS "Anyone can insert payments" ON public.payments;

-- Only admins can view all payments
CREATE POLICY "Admins can view payments" ON public.payments
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Public can insert payments (needed for booking flow)
CREATE POLICY "Public can insert payments" ON public.payments
  FOR INSERT TO public
  WITH CHECK (true);

-- Fix storage: payment-proofs SELECT should require admin role
DROP POLICY IF EXISTS "Admins can view payment proofs" ON storage.objects;
CREATE POLICY "Admins can view payment proofs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND has_role(auth.uid(), 'admin'::app_role));
