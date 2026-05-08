-- Add scheduled time columns to counsellor_bookings
ALTER TABLE public.counsellor_bookings
ADD COLUMN IF NOT EXISTS scheduled_date date,
ADD COLUMN IF NOT EXISTS scheduled_time time without time zone,
ADD COLUMN IF NOT EXISTS day_of_week integer;