-- Fix security definer view by setting to invoker
ALTER VIEW public.counsellor_booking_view SET (security_invoker = on);