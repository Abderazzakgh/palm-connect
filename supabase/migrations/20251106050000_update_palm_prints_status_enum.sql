-- Update registration_status enum to include more statuses
-- Note: PostgreSQL doesn't support IF NOT EXISTS for ALTER TYPE ADD VALUE
-- So we check first and only add if it doesn't exist
DO $$ 
BEGIN
    -- Check if enum already has the values we need
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'active' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'registration_status')
    ) THEN
        -- Add new enum values (one at a time to avoid errors)
        BEGIN
            ALTER TYPE registration_status ADD VALUE 'active';
        EXCEPTION WHEN duplicate_object THEN
            -- Value already exists, ignore
        END;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'used' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'registration_status')
    ) THEN
        BEGIN
            ALTER TYPE registration_status ADD VALUE 'used';
        EXCEPTION WHEN duplicate_object THEN
            -- Value already exists, ignore
        END;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'expired' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'registration_status')
    ) THEN
        BEGIN
            ALTER TYPE registration_status ADD VALUE 'expired';
        EXCEPTION WHEN duplicate_object THEN
            -- Value already exists, ignore
        END;
    END IF;
END $$;

-- Add columns if they don't exist
ALTER TABLE public.palm_prints
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;

-- matched_user_id should already exist from previous migration, but add if not
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'palm_prints' 
        AND column_name = 'matched_user_id'
    ) THEN
        ALTER TABLE public.palm_prints ADD COLUMN matched_user_id TEXT;
    END IF;
END $$;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_palm_prints_image_url ON public.palm_prints(image_url);
CREATE INDEX IF NOT EXISTS idx_palm_prints_used_at ON public.palm_prints(used_at);

-- matched_user_id index should already exist, but create if not
CREATE INDEX IF NOT EXISTS idx_palm_prints_matched_user_id ON public.palm_prints(matched_user_id);

