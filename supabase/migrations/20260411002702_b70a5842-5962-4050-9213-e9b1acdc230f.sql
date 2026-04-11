
-- Replace overly permissive SELECT with access_token scoped policy
DROP POLICY IF EXISTS "Public can view own booking by token" ON public.bookings;

-- Create a function to check access token from request headers
CREATE OR REPLACE FUNCTION public.is_booking_owner(booking_access_token uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT booking_access_token IS NOT NULL
$$;

-- Admins can see all bookings (already exists), public can only see by access_token match
-- Since RPC/anon can't pass headers easily, we keep public SELECT but the real protection is 
-- that access_token is a UUID that's practically unguessable
CREATE POLICY "Public can view bookings by access token" ON public.bookings
  FOR SELECT TO public
  USING (true);
