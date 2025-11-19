-- Add matched_user_id column to palm_prints table
ALTER TABLE public.palm_prints
ADD COLUMN IF NOT EXISTS matched_user_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_palm_prints_matched_user_id ON public.palm_prints(matched_user_id);

-- Add comment
COMMENT ON COLUMN public.palm_prints.matched_user_id IS 'Unique user ID from algorithm service when palm print is matched';

