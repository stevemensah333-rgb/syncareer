-- Fix 1: Add content length constraint to posts table
-- Use a trigger-based validation instead of CHECK constraint for flexibility
CREATE OR REPLACE FUNCTION validate_post_content_length()
RETURNS TRIGGER AS $$
BEGIN
  IF length(NEW.content) > 5000 THEN
    RAISE EXCEPTION 'Post content exceeds maximum length of 5000 characters';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER check_post_content_length
BEFORE INSERT OR UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION validate_post_content_length();

-- Fix 2: Add missing DELETE policies for user data tables
CREATE POLICY "Users can delete own student details" 
ON student_details FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own employer details" 
ON employer_details FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transition details" 
ON professional_transition_details FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own counsellor details" 
ON counsellor_details FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookings" 
ON counsellor_bookings FOR DELETE 
USING (auth.uid() = user_id);