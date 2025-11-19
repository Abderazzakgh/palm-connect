-- Create enum for registration status
CREATE TYPE registration_status AS ENUM ('pending', 'completed');

-- Create table for palm prints (biometric data)
CREATE TABLE public.palm_prints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  palm_hash TEXT NOT NULL UNIQUE, -- Hashed biometric data for security
  qr_code TEXT NOT NULL UNIQUE,
  status registration_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create trigger function to validate expiration date
CREATE OR REPLACE FUNCTION validate_palm_print_expiration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at <= now() THEN
    RAISE EXCEPTION 'Expiration date must be in the future';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for expiration validation
CREATE TRIGGER check_palm_print_expiration
  BEFORE INSERT OR UPDATE ON public.palm_prints
  FOR EACH ROW
  EXECUTE FUNCTION validate_palm_print_expiration();

-- Enable RLS
ALTER TABLE public.palm_prints ENABLE ROW LEVEL SECURITY;

-- Create table for user profiles with ATM card info
CREATE TABLE public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  palm_print_id UUID REFERENCES public.palm_prints(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  atm_card_last_4 TEXT,
  bank_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for palm_prints (public can create during scanning)
CREATE POLICY "Anyone can create palm print during scan"
  ON public.palm_prints
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their linked palm print"
  ON public.palm_prints
  FOR SELECT
  USING (
    id IN (
      SELECT palm_print_id 
      FROM public.user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();