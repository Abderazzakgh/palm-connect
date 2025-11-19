/*
  Integration test: starts algo-service and app-service, waits for readiness,
  performs a real client handshake, ECDH/HKDF/AES-GCM encrypt & POST to
  /vein/secure-upload, and asserts that the application response carries
  the algorithm's qrPayload in the nested result object.

  Usage: node integration_test.js

  NOTE: This script spawns child processes for the services and will kill them
  when finished. It assumes `node` is on PATH and that no other services are
  bound to ports 4000/4100. Adjust paths/ports if needed.
*/

const { spawn } = require('child_process');
const path = require('path');
const fetch = require('node-fetch');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const ALGO_SCRIPT = path.join(ROOT, 'algo-service', 'index.js');
const APP_SCRIPT = path.join(ROOT, 'app-service', 'index.js');

const APP_URL = 'http://localhost:4000';
const ALGO_URL = 'http://localhost:4100';

function spawnNode(scriptPath, label) {
  console.log(`[test] spawning ${label}: node ${scriptPath}`);
  const p = spawn(process.execPath, [scriptPath], {
    cwd: path.dirname(scriptPath),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  p.stdout.on('data', (d) => process.stdout.write(`[${label}] ${d}`));
  p.stderr.on('data', (d) => process.stderr.write(`[${label} ERR] ${d}`));
  p.on('exit', (code, sig) => console.log(`[${label}] exited code=${code} sig=${sig}`));
  return p;
}

async function waitFor(url, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url, { method: 'GET' });
      if (r.ok) return true;
    } catch (e) {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

async function runTest() {
  const algoProc = spawnNode(ALGO_SCRIPT, 'algo-service');
  const appProc = spawnNode(APP_SCRIPT, 'app-service');

  try {
    console.log('[test] waiting for services to become ready');
    const algoReady = await waitFor(`${ALGO_URL}/`, 12000);
    const appReady = await waitFor(`${APP_URL}/`, 12000);
    if (!algoReady || !appReady) {
      throw new Error(`services not ready. algoReady=${algoReady} appReady=${appReady}`);
    }
    console.log('[test] services ready');

    // Acquire handshake (server provides public key, salt and keyId)
    const hsResp = await fetch(`${APP_URL}/handshake`);
    if (!hsResp.ok) throw new Error('handshake failed');
    const hs = await hsResp.json();
    console.log('[test] handshake:', hs);

    // ECDH client
    const client = crypto.createECDH('prime256v1');
    client.generateKeys();
    const clientPub = client.getPublicKey();
    const serverPub = Buffer.from(hs.publicKey, 'base64');
    const shared = client.computeSecret(serverPub);

    // Derive AES key via HKDF-SHA256 using server-provided salt
    const salt = Buffer.from(hs.salt, 'base64');
    const info = Buffer.from('savanna-derive-aes-key');
    const key = crypto.hkdfSync('sha256', shared, salt, info, 32);

    // Plaintext (small test payload)
    const plain = Buffer.from(`INTEGRATION_TEST_PALM_${Date.now()}`);

    // AES-256-GCM encrypt
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const c1 = cipher.update(plain);
    const c2 = cipher.final();
    const tag = cipher.getAuthTag();
    const ciphertext = Buffer.concat([c1, c2, tag]);

    // POST to /vein/secure-upload
    const body = {
      userId: 'integration-test',
      payload: { iv: iv.toString('base64'), ciphertext: ciphertext.toString('base64') },
      clientPub: clientPub.toString('base64'),
      keyId: hs.keyId
    };

    const upl = await fetch(`${APP_URL}/vein/secure-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const respTxt = await upl.text();
    let parsed = null;
    try { parsed = JSON.parse(respTxt); } catch (e) { }
    console.log('[test] upload status:', upl.status);
    console.log('[test] upload response:', parsed || respTxt);

    if (!parsed) throw new Error('upload did not return JSON');
    if (!parsed.result) throw new Error('upload result missing nested algorithm response');

    const algoResp = parsed.result;
    if (!algoResp.qrPayload) {
      console.error('[test] algorithm response did not include qrPayload');
      throw new Error('qrPayload missing');
    }

    console.log('[test] qrPayload (string):', algoResp.qrPayload);
    try {
      const qp = JSON.parse(algoResp.qrPayload);
      console.log('[test] qrPayload parsed:', qp);
      if (!qp.uid || !qp.hash) throw new Error('qrPayload missing uid/hash');
    } catch (e) {
      throw new Error('qrPayload is not valid JSON');
    }

    console.log('[test] SUCCESS: integration flow validated');
    // success
    process.exitCode = 0;
  } catch (err) {
    console.error('[test] FAILURE:', err);
    process.exitCode = 1;
  } finally {
    // cleanup child processes
    try { algoProc.kill(); } catch (e) { }
    try { appProc.kill(); } catch (e) { }
  }
}

runTest();
