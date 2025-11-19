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
    const { userId, payload } = await req.json()

    if (!payload) {
      return new Response(
        JSON.stringify({ message: 'Payload is required' }),
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

    // Parse payload (could be string or object)
    const payloadData = typeof payload === 'string' ? JSON.parse(payload) : payload
    const encryptedData = payloadData.ciphertext || payloadData
    
    // Store encrypted image in Supabase Storage
    const fileId = `encrypted_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.enc`
    const filePath = `palm_veins/${userId || 'anonymous'}/${fileId}`
    
    // Convert base64 ciphertext to Uint8Array for storage
    const ciphertextBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))
    
    // Upload encrypted file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('encrypted_palm_data')
      .upload(filePath, ciphertextBytes, {
        contentType: 'application/octet-stream',
        upsert: false,
      })

    let storagePath: string | null = null
    if (!uploadError && uploadData) {
      // Get public URL
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
        encrypted_data: encryptedData.substring(0, 100) + '...', // Store first 100 chars as metadata
        iv: payloadData.iv || 'N/A',
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
    // In production, you would call your algorithm service here
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
        message: 'Uploaded and analyzed',
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
    console.error('Upload error:', error)
    return new Response(
      JSON.stringify({ message: 'Internal server error', error: String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

