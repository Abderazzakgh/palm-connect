-- Create storage bucket for encrypted palm data
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'encrypted_palm_data',
  'encrypted_palm_data',
  false, -- Private bucket for security
  52428800, -- 50MB limit
  ARRAY['application/octet-stream', 'application/json']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for palm scans (public images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'palm_scans',
  'palm_scans',
  true, -- Public bucket for QR code images
  10485760, -- 10MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for encrypted_palm_data (private)
CREATE POLICY "Service role can upload encrypted data"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'encrypted_palm_data');

CREATE POLICY "Service role can read encrypted data"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'encrypted_palm_data');

CREATE POLICY "Service role can delete encrypted data"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'encrypted_palm_data');

-- Storage policies for palm_scans (public read, authenticated upload)
CREATE POLICY "Anyone can view palm scans"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'palm_scans');

CREATE POLICY "Authenticated users can upload palm scans"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'palm_scans');

CREATE POLICY "Service role can manage palm scans"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'palm_scans');

