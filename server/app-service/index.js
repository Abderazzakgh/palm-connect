const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const PORT = process.env.PORT || 4000;
const ALGO_SERVICE = process.env.ALGO_URL || 'http://localhost:4100/algorithm/analyze';
const DB_PATH = path.join(__dirname, '..', 'app.db');

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');

const HANDSHAKE_LOG = path.join(__dirname, '..', 'handshake.log');

function logHandshakeEvent(kind, keyId, info) {
  try {
    const entry = { ts: new Date().toISOString(), kind, keyId, info };
    const line = JSON.stringify(entry) + os.EOL;
    // append asynchronously; don't block main flow on logging
    fs.appendFile(HANDSHAKE_LOG, line, (err) => {
      if (err) console.warn('[handshake-log] append error', err);
    });
    console.log('[handshake-log]', kind, keyId, info || '');
  } catch (e) {
    console.warn('[handshake-log] failed to write', e);
  }
}

// Log rotation: rotate handshake.log when it exceeds threshold
const HANDSHAKE_LOG_MAX_BYTES = 1 * 1024 * 1024; // 1 MB
function rotateHandshakeLogIfNeeded() {
  try {
    fs.stat(HANDSHAKE_LOG, (err, stats) => {
      if (err) {
        // file may not exist yet
        return;
      }
      if (stats.size > HANDSHAKE_LOG_MAX_BYTES) {
        const archiveName = `${HANDSHAKE_LOG}.${new Date().toISOString().replace(/[:.]/g, '-')}.old`;
        fs.rename(HANDSHAKE_LOG, archiveName, (renameErr) => {
          if (renameErr) return console.warn('[handshake-log] rotate rename error', renameErr);
          // create a fresh empty log file
          fs.writeFile(HANDSHAKE_LOG, '', (werr) => {
            if (werr) console.warn('[handshake-log] rotate write error', werr);
            else console.log('[handshake-log] rotated to', archiveName);
          });
        });
      }
    });
  } catch (e) {
    console.warn('[handshake-log] rotate check failed', e);
  }
}
setInterval(rotateHandshakeLogIfNeeded, 60 * 1000);

// Generate server ECDH key pair (P-256 / prime256v1)
const ecdh = crypto.createECDH('prime256v1');
ecdh.generateKeys();
const serverPublicKeyBase64 = ecdh.getPublicKey().toString('base64');

const app = express();
app.use(bodyParser.json({ limit: '10mb' }));

// Helper to get client IP, honoring X-Forwarded-For when behind proxies
function getClientIp(req) {
  try {
    const xff = req.headers['x-forwarded-for'] || req.headers['X-Forwarded-For'];
    if (xff) {
      // x-forwarded-for may contain a comma-separated list; take the first
      const first = String(xff).split(',')[0].trim();
      if (first) return first;
    }
    if (req.ip) return req.ip;
    if (req.connection && req.connection.remoteAddress) return req.connection.remoteAddress;
  } catch (e) {
    // ignore and fallback
  }
  return null;
}

// Handshake store: map keyId -> { salt: Buffer, expires: timestamp }
const handshakeStore = {};
const HANDSHAKE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function createHandshake() {
  const keyId = crypto.randomBytes(12).toString('hex');
  const salt = crypto.randomBytes(16);
  const expires = Date.now() + HANDSHAKE_TTL_MS;
  handshakeStore[keyId] = { salt, expires };
  const res = { keyId, saltBase64: salt.toString('base64'), publicKey: serverPublicKeyBase64, expires };
  // audit log creation
  logHandshakeEvent('create', keyId, { expires });
  return res;
}

// Periodic garbage collector to remove expired handshake salts
function cleanupHandshakes() {
  const now = Date.now();
  for (const k of Object.keys(handshakeStore)) {
    const entry = handshakeStore[k];
    if (!entry || !entry.expires || entry.expires < now) {
      // log expiry
      logHandshakeEvent('expire', k, { expires: entry?.expires });
      delete handshakeStore[k];
    }
  }
}
setInterval(cleanupHandshakes, 60 * 1000); // run every minute

// Initialize SQLite DB (simple users table for permission checks)
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) return console.error('[app-service] Failed to open DB', err);
  console.log('[app-service] SQLite DB opened at', DB_PATH);
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    uniqueId TEXT PRIMARY KEY,
    allowed INTEGER DEFAULT 0,
    meta TEXT
  )`);
});

// Admin endpoint to register or update a user's permission (for demo/testing)
app.post('/admin/register', async (req, res) => {
  try {
    const { uniqueId, allowed = 0, meta = null } = req.body || {};
    if (!uniqueId) return res.status(400).json({ message: 'uniqueId required' });

    db.run(`INSERT INTO users(uniqueId, allowed, meta) VALUES(?, ?, ?)
            ON CONFLICT(uniqueId) DO UPDATE SET allowed=excluded.allowed, meta=excluded.meta`,
      [uniqueId, allowed ? 1 : 0, meta], function(err) {
        if (err) return res.status(500).json({ message: 'DB error', error: String(err) });
        return res.json({ message: 'registered', uniqueId, allowed: !!allowed });
      });
  } catch (err) {
    return res.status(500).json({ message: 'Internal error', error: String(err) });
  }
});

app.post('/vein/upload', async (req, res) => {
  try {
    const { userId, payload } = req.body || {};
    console.log('[app-service] Received upload for user:', userId);

    if (!payload) {
      return res.status(400).json({ message: 'Payload is required' });
    }

    // Forward payload to algorithm service with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const forwardResp = await fetch(ALGO_SERVICE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, payload }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!forwardResp.ok) {
        const txt = await forwardResp.text();
        console.error('[app-service] Algorithm service error:', forwardResp.status, txt);
        return res.status(502).json({ message: 'Algorithm service error', details: txt });
      }

      const json = await forwardResp.json();
      const uniqueUserId = json.matchedUserId || (json.matchedUserId === undefined ? null : json.matchedUserId);

      // Permission check: look up uniqueUserId in SQLite DB
      if (!uniqueUserId) {
        return res.status(400).json({ message: 'Algorithm did not return uniqueUserId', result: json });
      }

      db.get('SELECT allowed, meta FROM users WHERE uniqueId = ?', [uniqueUserId], (err, row) => {
        if (err) {
          console.error('[app-service] DB error', err);
          return res.status(500).json({ message: 'DB error', error: String(err) });
        }

        const allowed = row ? !!row.allowed : false;
        const reason = row ? (row.allowed ? 'authorized' : 'not_authorized') : 'not_found';

        // Compose response. Transport-level security must be TLS in production.
        const responsePayload = {
          message: 'Uploaded and analyzed',
          result: json,
          internalData: { uniqueUserId },
          permission: { authorized: allowed, reason },
        };

        // For demo we return plaintext JSON. In production, use TLS and/or application-level encryption.
        return res.json(responsePayload);
      });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      if (fetchErr.name === 'AbortError') {
        return res.status(504).json({ message: 'Algorithm service timeout' });
      }
      throw fetchErr;
    }
  } catch (err) {
    console.error('[app-service] Error handling upload:', err);
    return res.status(500).json({ message: 'Internal server error', error: String(err) });
  }
});

app.get('/', (req, res) => res.send('Application Service running'));

// Return server ECDH public key (raw, base64) for clients to perform key agreement
app.get('/key/public', (req, res) => {
  return res.json({ curve: 'P-256', publicKey: serverPublicKeyBase64 });
});

// Handshake endpoint: returns server public key + salt + keyId for HKDF
app.get('/handshake', (req, res) => {
  try {
    const hs = createHandshake();
    // include client context in audit log
      const ip = getClientIp(req);
      const ua = req.headers['user-agent'] || null;
      logHandshakeEvent('create', hs.keyId, { expires: hs.expires, ip, userAgent: ua });
    return res.json({ curve: 'P-256', publicKey: hs.publicKey, salt: hs.saltBase64, keyId: hs.keyId, expires: hs.expires });
  } catch (err) {
    return res.status(500).json({ message: 'handshake error', error: String(err) });
  }
});

// Secure upload endpoint using ECDH + HKDF + AES-GCM. Client sends clientPub, iv, ciphertext (base64).
app.post('/vein/secure-upload', async (req, res) => {
  try {
    const { userId, payload, clientPub } = req.body || {};
    const { keyId } = req.body || {};
    
    if (!payload || !payload.ciphertext || !payload.iv || !clientPub) {
      return res.status(400).json({ message: 'invalid secure payload: missing required fields' });
    }

    if (!keyId) {
      return res.status(400).json({ message: 'keyId is required for secure upload' });
    }

    // Compute shared secret using server private key and client public key
    const clientPubBuf = Buffer.from(clientPub, 'base64');
    const sharedSecret = ecdh.computeSecret(clientPubBuf);

    // Derive AES-256 key via HKDF-SHA256 (info = 'savanna-derive-aes-key')
    const info = Buffer.from('savanna-derive-aes-key');
    // Look up salt by keyId (if provided) so client and server use same HKDF salt
    let saltBuf = null;
    if (keyId && handshakeStore[keyId]) {
      const handshake = handshakeStore[keyId];
      // Check if handshake expired
      if (handshake.expires && handshake.expires < Date.now()) {
        delete handshakeStore[keyId];
        return res.status(400).json({ message: 'handshake expired' });
      }
      // use the salt and remove the handshake to prevent replay
      saltBuf = handshake.salt;
      // audit consumption with client context
      const clientIp = getClientIp(req);
      const ua = req.headers['user-agent'] || null;
      logHandshakeEvent('consume', keyId, { usedAt: Date.now(), ip: clientIp, userAgent: ua, userId: userId || null });
      delete handshakeStore[keyId];
    } else {
      return res.status(400).json({ message: 'invalid or expired keyId' });
    }
    const key = crypto.hkdfSync('sha256', sharedSecret, saltBuf, info, 32);

    // Decrypt AES-GCM ciphertext (ciphertext contains tag at the end)
    let ctBuf, ivBuf, tag, enc, plain;
    try {
      ctBuf = Buffer.from(payload.ciphertext, 'base64');
      ivBuf = Buffer.from(payload.iv, 'base64');
      
      if (ivBuf.length !== 12) {
        return res.status(400).json({ message: 'invalid IV length (must be 12 bytes)' });
      }
      
      // GCM tag is 16 bytes at the end
      if (ctBuf.length < 16) {
        return res.status(400).json({ message: 'ciphertext too short' });
      }
      
      tag = ctBuf.slice(ctBuf.length - 16);
      enc = ctBuf.slice(0, ctBuf.length - 16);

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuf);
      decipher.setAuthTag(tag);
      plain = Buffer.concat([decipher.update(enc), decipher.final()]);
    } catch (decryptErr) {
      console.error('[app-service] Decryption error:', decryptErr);
      return res.status(400).json({ message: 'decryption failed', error: String(decryptErr) });
    }

    // For demo: forward plaintext (base64) to Algorithm Service to derive unique ID
    const plainBase64 = plain.toString('base64');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    
    try {
      const forwardResp = await fetch(ALGO_SERVICE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, payload: { ciphertext: plainBase64 } }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!forwardResp.ok) {
        const txt = await forwardResp.text();
        console.error('[app-service] Algorithm service error:', forwardResp.status, txt);
        return res.status(502).json({ message: 'Algorithm service error', details: txt });
      }

    const json = await forwardResp.json();
    const uniqueUserId = json.matchedUserId || null;

    if (!uniqueUserId) {
      return res.status(400).json({ message: 'Algorithm did not return uniqueUserId', result: json });
    }

    // Permission check
    db.get('SELECT allowed, meta FROM users WHERE uniqueId = ?', [uniqueUserId], (err, row) => {
      if (err) {
        console.error('[app-service] DB error', err);
        return res.status(500).json({ message: 'DB error', error: String(err) });
      }

      const allowed = row ? !!row.allowed : false;
      const reason = row ? (row.allowed ? 'authorized' : 'not_authorized') : 'not_found';

      const responsePayload = {
        message: 'Uploaded and analyzed (secure)',
        result: json,
        internalData: { uniqueUserId },
        permission: { authorized: allowed, reason },
      };

      return res.json(responsePayload);
      });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      if (fetchErr.name === 'AbortError') {
        return res.status(504).json({ message: 'Algorithm service timeout' });
      }
      throw fetchErr;
    }
  } catch (err) {
    console.error('[app-service] secure upload error', err);
    return res.status(500).json({ message: 'Internal server error', error: String(err) });
  }
});

app.listen(PORT, () => console.log(`[app-service] listening on http://localhost:${PORT}, forwarding to ${ALGO_SERVICE}`));
