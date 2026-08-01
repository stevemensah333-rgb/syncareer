DROP TRIGGER IF EXISTS enforce_counsellor_session_updates_trg ON public.counsellor_sessions;
CREATE TRIGGER enforce_counsellor_session_updates_trg
BEFORE UPDATE ON public.counsellor_sessions
FOR EACH ROW EXECUTE FUNCTION public.enforce_counsellor_session_updates();

DROP TRIGGER IF EXISTS enforce_counsellor_booking_updates_trg ON public.counsellor_bookings;
CREATE TRIGGER enforce_counsellor_booking_updates_trg
BEFORE UPDATE ON public.counsellor_bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_counsellor_booking_updates();