-- Create a table for professional transition details
CREATE TABLE public.professional_transition_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  existing_role TEXT NOT NULL,
  aspired_role TEXT NOT NULL,
  years_of_experience TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.professional_transition_details ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view own transition details" 
ON public.professional_transition_details 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transition details" 
ON public.professional_transition_details 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transition details" 
ON public.professional_transition_details 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_professional_transition_details_updated_at
BEFORE UPDATE ON public.professional_transition_details
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();