
-- Remove the broken policy
DROP POLICY IF EXISTS "Public can view own booking by access token" ON public.bookings;

-- Create secure function to fetch booking by access token
CREATE OR REPLACE FUNCTION public.get_booking_by_token(_token uuid)
RETURNS TABLE (
  id uuid,
  booking_date date,
  start_time time,
  end_time time,
  customer_name text,
  customer_email text,
  customer_phone text,
  status booking_status,
  notes text,
  service_id uuid,
  staff_id uuid,
  service_name text,
  service_duration int,
  staff_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    b.id, b.booking_date, b.start_time, b.end_time,
    b.customer_name, b.customer_email, b.customer_phone,
    b.status, b.notes, b.service_id, b.staff_id,
    s.name as service_name, s.duration as service_duration,
    st.name as staff_name
  FROM public.bookings b
  LEFT JOIN public.services s ON s.id = b.service_id
  LEFT JOIN public.staff st ON st.id = b.staff_id
  WHERE b.access_token = _token
  LIMIT 1
$$;
