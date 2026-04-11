
-- Add a validation trigger for bookings INSERT to prevent arbitrary data
CREATE OR REPLACE FUNCTION public.validate_booking_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Validate required fields are not empty
  IF NEW.customer_name IS NULL OR trim(NEW.customer_name) = '' THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;
  
  IF NEW.customer_email IS NULL OR trim(NEW.customer_email) = '' THEN
    RAISE EXCEPTION 'Customer email is required';
  END IF;
  
  -- Basic email format validation
  IF NEW.customer_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Validate service_id references an active service
  IF NOT EXISTS (SELECT 1 FROM public.services WHERE id = NEW.service_id AND active = true) THEN
    RAISE EXCEPTION 'Invalid or inactive service';
  END IF;
  
  -- Validate staff_id if provided
  IF NEW.staff_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.staff WHERE id = NEW.staff_id AND active = true) THEN
    RAISE EXCEPTION 'Invalid or inactive staff member';
  END IF;
  
  -- Enforce length limits
  IF length(NEW.customer_name) > 100 THEN
    RAISE EXCEPTION 'Customer name too long';
  END IF;
  
  IF length(NEW.customer_email) > 255 THEN
    RAISE EXCEPTION 'Customer email too long';
  END IF;
  
  IF NEW.customer_phone IS NOT NULL AND length(NEW.customer_phone) > 20 THEN
    RAISE EXCEPTION 'Customer phone too long';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_booking_before_insert
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_booking_insert();
