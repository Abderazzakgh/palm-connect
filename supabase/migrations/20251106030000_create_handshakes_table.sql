-- Create server_keys table to store server ECDH key pair (encrypted)
CREATE TABLE IF NOT EXISTS public.server_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_type TEXT DEFAULT 'ECDH_P256',
  public_key TEXT NOT NULL,
  private_key_encrypted TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Create unique index to ensure only one active key pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_server_keys_active 
ON public.server_keys(key_type) 
WHERE is_active = true;

COMMENT ON TABLE public.server_keys IS 
'Stores server ECDH key pair for secure handshakes';


-- Create handshakes table for ECDH key exchange
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

CREATE INDEX IF NOT EXISTS idx_handshakes_key_id 
ON public.handshakes(key_id);
CREATE INDEX IF NOT EXISTS idx_handshakes_expires_at 
ON public.handshakes(expires_at);
CREATE INDEX IF NOT EXISTS idx_handshakes_used_at 
ON public.handshakes(used_at);

COMMENT ON TABLE public.handshakes IS 
'Stores ECDH handshake data for secure palm print uploads';


-- Create palm_vein_data table for storing encrypted palm vein data
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

CREATE INDEX IF NOT EXISTS idx_palm_vein_data_user_id 
ON public.palm_vein_data(user_id);
CREATE INDEX IF NOT EXISTS idx_palm_vein_data_status 
ON public.palm_vein_data(status);
CREATE INDEX IF NOT EXISTS idx_palm_vein_data_matched_user_id 
ON public.palm_vein_data(matched_user_id);

COMMENT ON TABLE public.palm_vein_data IS 
'Stores encrypted palm vein biometric data';
