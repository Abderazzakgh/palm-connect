-- Enable Row Level Security on all new tables
ALTER TABLE public.handshakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.palm_vein_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_keys ENABLE ROW LEVEL SECURITY;

-- Policy for handshakes: Service role can do everything
CREATE POLICY "Service role full access to handshakes"
ON public.handshakes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy for handshakes: Authenticated users can read their own handshakes
CREATE POLICY "Users can read own handshakes"
ON public.handshakes
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);

-- Policy for palm_vein_data: Service role can do everything
CREATE POLICY "Service role full access to palm_vein_data"
ON public.palm_vein_data
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy for palm_vein_data: Authenticated users can read their own data
CREATE POLICY "Users can read own palm_vein_data"
ON public.palm_vein_data
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);

-- Policy for server_keys: Only service role can access
CREATE POLICY "Service role only access to server_keys"
ON public.server_keys
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON public.handshakes TO service_role;
GRANT ALL ON public.palm_vein_data TO service_role;
GRANT ALL ON public.server_keys TO service_role;

