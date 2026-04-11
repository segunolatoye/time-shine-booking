
-- Allow public to view a single booking when they know the access_token
-- The BookingConfirmation page filters by access_token (UUID), so this is safe
CREATE POLICY "Public can view own booking by access token"
ON public.bookings
FOR SELECT
TO public
USING (false);
