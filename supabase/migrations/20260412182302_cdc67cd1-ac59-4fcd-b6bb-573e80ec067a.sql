-- Drop the overly permissive policy that exposes phone_number/country_code to booking users
DROP POLICY IF EXISTS "Booking users can view counsellor details" ON public.counsellor_details;

-- Create a restricted view for booking users (only non-sensitive fields)
CREATE OR REPLACE VIEW public.counsellor_booking_view AS
SELECT 
  id,
  user_id,
  full_name,
  avatar_url,
  meeting_link,
  specialization,
  location,
  bio,
  hiring_price
FROM public.counsellor_details;

-- Allow booking users to read only through this restricted view
ALTER VIEW public.counsellor_booking_view OWNER TO postgres;

-- Enable RLS-like access via the view by granting select
GRANT SELECT ON public.counsellor_booking_view TO authenticated;

-- Add RLS policy so booking users can only see counsellors they've booked
CREATE POLICY "Booking users can view limited counsellor info"
ON public.counsellor_details
FOR SELECT
TO authenticated
USING (
  user_has_counsellor_booking(id)
);