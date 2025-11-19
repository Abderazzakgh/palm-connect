// Simple Node test client for /vein/secure-upload
// Usage: node secure_upload.js

const fetch = require('node-fetch');
const crypto = require('crypto');

async function run() {
  try {
    const SERVER_KEY_URL = 'http://localhost:4000/key/public';
    const UPLOAD_URL = 'http://localhost:4000/vein/secure-upload';

    // 1) fetch server public key
    const k = await fetch(SERVER_KEY_URL);
    if (!k.ok) throw new Error(`failed to fetch server public key: ${k.status}`);
    const keyJson = await k.json();
    const serverPubBase64 = keyJson.publicKey;

    // 2) create client ECDH and compute shared secret (prime256v1)
    const client = crypto.createECDH('prime256v1');
    client.generateKeys();
    const clientPub = client.getPublicKey();
    const serverPubBuf = Buffer.from(serverPubBase64, 'base64');
    const shared = client.computeSecret(serverPubBuf);

    // 3) derive AES-256 key via HKDF-SHA256
    const info = Buffer.from('savanna-derive-aes-key');
    const key = crypto.hkdfSync('sha256', shared, null, info, 32);

    // 4) plaintext sample (palm hash)
    const palmHash = `TEST_PALM_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
    const plainBuf = Buffer.from(palmHash, 'utf8');

    // 5) encrypt AES-256-GCM with random iv
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const enc1 = cipher.update(plainBuf);
    const enc2 = cipher.final();
    const tag = cipher.getAuthTag();
    const ciphertext = Buffer.concat([enc1, enc2, tag]);

    // 6) build body
    const body = {
      userId: 'test-client',
      payload: {
        iv: iv.toString('base64'),
        ciphertext: ciphertext.toString('base64')
      },
      clientPub: clientPub.toString('base64')
    };

    console.log('Sending secure upload with palmHash:', palmHash);

    const resp = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const txt = await resp.text();
    console.log('Server response status:', resp.status);
    let parsed = null;
    try { parsed = JSON.parse(txt); console.log('Server response JSON:', parsed); } catch(e) { console.log(txt); }
    if (parsed && parsed.qrPayload) {
      console.log('QR payload (string):', parsed.qrPayload);
      try {
        const obj = JSON.parse(parsed.qrPayload);
        console.log('QR payload (parsed):', obj);
      } catch (e) {
        // ignore
      }
    }
  } catch (err) {
    console.error('Error in test client:', err);
    process.exit(1);
  }
}

run();
