-- ============================================
-- ملف SQL موحد لتطبيق جميع Migrations (نسخة مصححة 100%)
-- ============================================

-- ============================================
-- 1. إنشاء الجداول الأساسية
-- ============================================

-- Create server_keys table first (لأن handshakes يعتمد عليها)
CREATE TABLE IF NOT EXISTS public.server_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_type TEXT DEFAULT 'ECDH_P256',
  public_key TEXT NOT NULL,
  private_key_encrypted TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_server_keys_active 
ON public.server_keys(key_type) WHERE is_active = true;

COMMENT ON TABLE public.server_keys IS 'Stores server ECDH key pair for secure handshakes';

-- --------------------------------------------

CREATE TABLE IF NOT EXISTS public.handshakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id TEXT UNIQUE NOT NULL,
  salt TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  user_id TEXT,
  client_ip TEXT,
  user_agent TEXT,
  server_key_id UUID REFERENCES public.server_keys(id)
);

CREATE INDEX IF NOT EXISTS idx_handshakes_key_id ON public.handshakes(key_id);
CREATE INDEX IF NOT EXISTS idx_handshakes_expires_at ON public.handshakes(expires_at);
CREATE INDEX IF NOT EXISTS idx_handshakes_used_at ON public.handshakes(used_at);

COMMENT ON TABLE public.handshakes IS 'Stores ECDH handshake data for secure palm print uploads';

-- --------------------------------------------

CREATE TABLE IF NOT EXISTS public.palm_vein_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  encrypted_data TEXT NOT NULL,
  iv TEXT NOT NULL,
  storage_path TEXT,
  matched_user_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_palm_vein_data_user_id ON public.palm_vein_data(user_id);
CREATE INDEX IF NOT EXISTS idx_palm_vein_data_status ON public.palm_vein_data(status);
CREATE INDEX IF NOT EXISTS idx_palm_vein_data_matched_user_id ON public.palm_vein_data(matched_user_id);

COMMENT ON TABLE public.palm_vein_data IS 'Stores encrypted palm vein biometric data';

-- ============================================
-- 2. إعداد Row Level Security (RLS)
-- ============================================

ALTER TABLE public.handshakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.palm_vein_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_keys ENABLE ROW LEVEL SECURITY;

-- Handshakes policies
DROP POLICY IF EXISTS "Service role full access to handshakes" ON public.handshakes;
CREATE POLICY "Service role full access to handshakes"
ON public.handshakes FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own handshakes" ON public.handshakes;
CREATE POLICY "Users can read own handshakes"
ON public.handshakes FOR SELECT TO authenticated USING (auth.uid()::text = user_id);

-- Palm vein data policies
DROP POLICY IF EXISTS "Service role full access to palm_vein_data" ON public.palm_vein_data;
CREATE POLICY "Service role full access to palm_vein_data"
ON public.palm_vein_data FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own palm_vein_data" ON public.palm_vein_data;
CREATE POLICY "Users can read own palm_vein_data"
ON public.palm_vein_data FOR SELECT TO authenticated USING (auth.uid()::text = user_id);

-- Server keys policies
DROP POLICY IF EXISTS "Service role only access to server_keys" ON public.server_keys;
CREATE POLICY "Service role only access to server_keys"
ON public.server_keys FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Grants
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON public.handshakes TO service_role;
GRANT ALL ON public.palm_vein_data TO service_role;
GRANT ALL ON public.server_keys TO service_role;

-- ============================================
-- 3. تحديث palm_prints table
-- ============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'active' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'registration_status')
    ) THEN
        ALTER TYPE registration_status ADD VALUE 'active';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'used' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'registration_status')
    ) THEN
        ALTER TYPE registration_status ADD VALUE 'used';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'expired' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'registration_status')
    ) THEN
        ALTER TYPE registration_status ADD VALUE 'expired';
    END IF;
END $$;

ALTER TABLE public.palm_prints
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_palm_prints_image_url ON public.palm_prints(image_url);
CREATE INDEX IF NOT EXISTS idx_palm_prints_used_at ON public.palm_prints(used_at);

-- ============================================
-- 4. إعداد Supabase Storage (مصَحّح)
-- ============================================

-- Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('encrypted_palm_data', 'encrypted_palm_data', false, 52428800, ARRAY['application/octet-stream', 'application/json'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('palm_scans', 'palm_scans', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/jpg'])
ON CONFLICT (id) DO NOTHING;

-- Policies (تُحذف القديمة قبل الإنشاء)
DROP POLICY IF EXISTS "Service role can upload encrypted data" ON storage.objects;
CREATE POLICY "Service role can upload encrypted data"
ON storage.objects FOR INSERT TO service_role
WITH CHECK (bucket_id = 'encrypted_palm_data');

DROP POLICY IF EXISTS "Service role can read encrypted data" ON storage.objects;
CREATE POLICY "Service role can read encrypted data"
ON storage.objects FOR SELECT TO service_role
USING (bucket_id = 'encrypted_palm_data');

DROP POLICY IF EXISTS "Service role can delete encrypted data" ON storage.objects;
CREATE POLICY "Service role can delete encrypted data"
ON storage.objects FOR DELETE TO service_role
USING (bucket_id = 'encrypted_palm_data');

DROP POLICY IF EXISTS "Anyone can view palm scans" ON storage.objects;
CREATE POLICY "Anyone can view palm scans"
ON storage.objects FOR SELECT TO public USING (bucket_id = 'palm_scans');

DROP POLICY IF EXISTS "Authenticated users can upload palm scans" ON storage.objects;
CREATE POLICY "Authenticated users can upload palm scans"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'palm_scans');

DROP POLICY IF EXISTS "Service role can manage palm scans" ON storage.objects;
CREATE POLICY "Service role can manage palm scans"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'palm_scans');

-- ============================================
-- ✅ تم التنفيذ بنجاح
-- ============================================
