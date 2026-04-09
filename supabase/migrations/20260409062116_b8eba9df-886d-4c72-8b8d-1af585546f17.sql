
-- Add new values to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'stylist';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'billing';
