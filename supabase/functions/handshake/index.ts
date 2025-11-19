import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get or generate server ECDH key pair (P-256)
    // Check if we have an active key pair in the database
    const { data: existingKey, error: keyError } = await supabase
      .from('server_keys')
      .select('*')
      .eq('key_type', 'ECDH_P256')
      .eq('is_active', true)
      .single()

    let serverPublicKeyBase64: string
    let serverKeyId: string

    if (existingKey && !keyError) {
      // Use existing key pair
      serverPublicKeyBase64 = existingKey.public_key
      serverKeyId = existingKey.id
    } else {
      // Generate new key pair and store it
      // Note: In production, encrypt the private key before storing
      const serverKeyPair = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveBits']
      )

      // Export keys
      const serverPublicKey = await crypto.subtle.exportKey('raw', serverKeyPair.publicKey)
      serverPublicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(serverPublicKey)))
      
      // Export private key (in production, encrypt this before storing)
      const serverPrivateKey = await crypto.subtle.exportKey('pkcs8', serverKeyPair.privateKey)
      const serverPrivateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(serverPrivateKey)))
      
      // Deactivate old keys
      await supabase
        .from('server_keys')
        .update({ is_active: false })
        .eq('key_type', 'ECDH_P256')
        .eq('is_active', true)

      // Store new key pair
      // WARNING: In production, encrypt private_key_encrypted with a master key
      const { data: newKey, error: insertError } = await supabase
        .from('server_keys')
        .insert({
          key_type: 'ECDH_P256',
          public_key: serverPublicKeyBase64,
          private_key_encrypted: serverPrivateKeyBase64, // TODO: Encrypt this in production
          is_active: true,
        })
        .select()
        .single()

      if (insertError || !newKey) {
        throw new Error('Failed to store server key pair')
      }
      serverKeyId = newKey.id
    }

    // Generate keyId and salt
    const keyId = crypto.randomUUID().replace(/-/g, '').substring(0, 24)
    const saltArray = crypto.getRandomValues(new Uint8Array(16))
    const saltBase64 = btoa(String.fromCharCode(...saltArray))

    // Calculate expiration (5 minutes from now)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

    // Get client info
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Store handshake in database (include server_key_id for reference)
    const { error: dbError } = await supabase
      .from('handshakes')
      .insert({
        key_id: keyId,
        salt: saltBase64,
        expires_at: expiresAt,
        client_ip: clientIp,
        user_agent: userAgent,
        // Store reference to server key used (for secure-upload to retrieve private key)
        server_key_id: serverKeyId,
      })

    if (dbError) {
      console.error('Error storing handshake:', dbError)
      throw dbError
    }

    // Return handshake data
    return new Response(
      JSON.stringify({
        curve: 'P-256',
        publicKey: serverPublicKeyBase64,
        salt: saltBase64,
        keyId: keyId,
        expires: new Date(expiresAt).getTime(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Handshake error:', error)
    return new Response(
      JSON.stringify({ message: 'handshake error', error: String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

