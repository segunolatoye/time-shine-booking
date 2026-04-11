
CREATE OR REPLACE FUNCTION public.cancel_booking_by_token(_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.bookings
  SET status = 'cancelled'::booking_status, updated_at = now()
  WHERE access_token = _token
    AND status NOT IN ('cancelled', 'completed', 'no_show');
  RETURN FOUND;
END;
$$;
