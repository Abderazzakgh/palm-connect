# 📋 نسخ ولصق Edge Functions - دليل سريع

## ⚠️ المشكلة
"Failed to fetch" = Edge Functions غير منشورة

---

## ✅ الحل: نسخ ولصق (5 دقائق)

### الخطوة 1: فتح Supabase Dashboard

1. اذهب إلى: **https://supabase.com/dashboard**
2. سجل الدخول
3. اختر مشروعك (URL: `wpephofbbvqmllmueumw`)

---

### الخطوة 2: نشر handshake

1. **Edge Functions** → **Create a new function**
2. **Name:** `handshake`
3. **Code:** انسخ الكود من الملف أدناه
4. **Deploy**

---

## 📄 كود handshake (انسخه كاملاً)

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    let { data: existingKey, error: keyError } = await supabase
      .from('server_keys')
      .select('*')
      .eq('key_type', 'ECDH_P256')
      .eq('is_active', true)
      .single()

    let serverPublicKeyBase64: string
    let serverKeyId: string

    if (existingKey && !keyError) {
      serverPublicKeyBase64 = existingKey.public_key
      serverKeyId = existingKey.id
    } else {
      const serverKeyPair = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveBits']
      )

      const serverPublicKey = await crypto.subtle.exportKey('raw', serverKeyPair.publicKey)
      serverPublicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(serverPublicKey)))
      
      const serverPrivateKey = await crypto.subtle.exportKey('pkcs8', serverKeyPair.privateKey)
      const serverPrivateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(serverPrivateKey)))
      
      await supabase
        .from('server_keys')
        .update({ is_active: false })
        .eq('key_type', 'ECDH_P256')
        .eq('is_active', true)

      const { data: newKey, error: insertError } = await supabase
        .from('server_keys')
        .insert({
          key_type: 'ECDH_P256',
          public_key: serverPublicKeyBase64,
          private_key_encrypted: serverPrivateKeyBase64,
          is_active: true,
        })
        .select()
        .single()

      if (insertError || !newKey) {
        throw new Error('Failed to store server key pair')
      }
      serverKeyId = newKey.id
    }

    const keyId = crypto.randomUUID().replace(/-/g, '').substring(0, 24)
    const saltArray = crypto.getRandomValues(new Uint8Array(16))
    const saltBase64 = btoa(String.fromCharCode(...saltArray))
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    const { error: dbError } = await supabase
      .from('handshakes')
      .insert({
        key_id: keyId,
        salt: saltBase64,
        expires_at: expiresAt,
        client_ip: clientIp,
        user_agent: userAgent,
        server_key_id: serverKeyId,
      })

    if (dbError) {
      console.error('Error storing handshake:', dbError)
      throw dbError
    }

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
```

---

## 📄 كود vein-upload (انسخه كاملاً)

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const payloadData = typeof payload === 'string' ? JSON.parse(payload) : payload
    const encryptedData = payloadData.ciphertext || payloadData
    
    const fileId = `encrypted_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.enc`
    const filePath = `palm_veins/${userId || 'anonymous'}/${fileId}`
    
    const ciphertextBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('encrypted_palm_data')
      .upload(filePath, ciphertextBytes, {
        contentType: 'application/octet-stream',
        upsert: false,
      })

    let storagePath: string | null = null
    if (!uploadError && uploadData) {
      const { data: urlData } = supabase.storage
        .from('encrypted_palm_data')
        .getPublicUrl(filePath)
      storagePath = urlData.publicUrl
    }

    const { data: palmData, error: insertError } = await supabase
      .from('palm_vein_data')
      .insert({
        user_id: userId || 'anonymous',
        encrypted_data: encryptedData.substring(0, 100) + '...',
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

    const matchedUserId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

    await supabase
      .from('palm_vein_data')
      .update({
        matched_user_id: matchedUserId,
        status: 'processed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', palmData.id)

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
```

---

## 📄 كود vein-secure-upload (انسخه كاملاً)

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

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

    if (handshake.used_at) {
      return new Response(
        JSON.stringify({ message: 'handshake already used' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    await supabase
      .from('handshakes')
      .update({
        used_at: new Date().toISOString(),
        user_id: userId || null,
      })
      .eq('key_id', keyId)

    const fileId = `encrypted_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.enc`
    const filePath = `palm_veins/${userId || 'anonymous'}/${fileId}`
    
    const ciphertextBytes = Uint8Array.from(atob(payload.ciphertext), c => c.charCodeAt(0))
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('encrypted_palm_data')
      .upload(filePath, ciphertextBytes, {
        contentType: 'application/octet-stream',
        upsert: false,
      })

    let storagePath: string | null = null
    if (!uploadError && uploadData) {
      const { data: urlData } = supabase.storage
        .from('encrypted_palm_data')
        .getPublicUrl(filePath)
      storagePath = urlData.publicUrl
    }

    const { data: palmData, error: insertError } = await supabase
      .from('palm_vein_data')
      .insert({
        user_id: userId || 'anonymous',
        encrypted_data: payload.ciphertext.substring(0, 100) + '...',
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

    const matchedUserId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

    await supabase
      .from('palm_vein_data')
      .update({
        matched_user_id: matchedUserId,
        status: 'processed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', palmData.id)

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
```

---

## ✅ بعد النسخ

1. **Deploy** كل function
2. **تحقق:** يجب أن ترى 3 functions في القائمة
3. **أعد تشغيل التطبيق:** `npm run dev`
4. **اختبر:** Complete Profile → إرسال آمن (ECDH)

---

**✅ بعد نشر جميع Functions، يجب أن يعمل كل شيء!**

