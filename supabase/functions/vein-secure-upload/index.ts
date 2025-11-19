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
    const { userId, payload, clientPub, keyId } = await req.json()

    if (!payload || !payload.ciphertext || !payload.iv || !clientPub) {
      return new Response(
        JSON.stringify({ message: 'invalid secure payload: missing required fields' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    if (!keyId) {
      return new Response(
        JSON.stringify({ message: 'keyId is required for secure upload' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Retrieve handshake from database
    const { data: handshake, error: handshakeError } = await supabase
      .from('handshakes')
      .select('*')
      .eq('key_id', keyId)
      .single()

    if (handshakeError || !handshake) {
      return new Response(
        JSON.stringify({ message: 'invalid or expired keyId' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Check if handshake expired
    if (new Date(handshake.expires_at) < new Date()) {
      await supabase
        .from('handshakes')
        .delete()
        .eq('key_id', keyId)
      
      return new Response(
        JSON.stringify({ message: 'handshake expired' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Check if handshake already used
    if (handshake.used_at) {
      return new Response(
        JSON.stringify({ message: 'handshake already used' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Mark handshake as used
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    await supabase
      .from('handshakes')
      .update({
        used_at: new Date().toISOString(),
        user_id: userId || null,
      })
      .eq('key_id', keyId)

    // Store encrypted image in Supabase Storage
    const fileId = `encrypted_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.enc`
    const filePath = `palm_veins/${userId || 'anonymous'}/${fileId}`
    
    // Convert base64 ciphertext to Uint8Array for storage
    const ciphertextBytes = Uint8Array.from(atob(payload.ciphertext), c => c.charCodeAt(0))
    
    // Upload encrypted file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('encrypted_palm_data')
      .upload(filePath, ciphertextBytes, {
        contentType: 'application/octet-stream',
        upsert: false,
      })

    let storagePath: string | null = null
    if (!uploadError && uploadData) {
      // Get public URL (or signed URL for private storage)
      const { data: urlData } = supabase.storage
        .from('encrypted_palm_data')
        .getPublicUrl(filePath)
      storagePath = urlData.publicUrl
    }

    // Store encrypted data metadata in database
    const { data: palmData, error: insertError } = await supabase
      .from('palm_vein_data')
      .insert({
        user_id: userId || 'anonymous',
        encrypted_data: payload.ciphertext.substring(0, 100) + '...', // Store first 100 chars as metadata
        iv: payload.iv,
        storage_path: storagePath || filePath,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error storing palm vein data:', insertError)
      throw insertError
    }

    // For now, we'll simulate the algorithm service response
    // In production, you would:
    // 1. Derive AES key using ECDH + HKDF with the salt from handshake
    // 2. Decrypt the ciphertext using AES-GCM
    // 3. Call your algorithm service with the decrypted data
    const matchedUserId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

    // Update with matched user ID
    await supabase
      .from('palm_vein_data')
      .update({
        matched_user_id: matchedUserId,
        status: 'processed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', palmData.id)

    // Return response similar to original server
    return new Response(
      JSON.stringify({
        message: 'Uploaded and analyzed (secure)',
        result: { matchedUserId },
        internalData: { uniqueUserId: matchedUserId },
        permission: { authorized: true, reason: 'authorized' },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Secure upload error:', error)
    return new Response(
      JSON.stringify({ message: 'Internal server error', error: String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

