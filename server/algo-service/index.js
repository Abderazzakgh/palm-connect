const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4100;
const STORE_PATH = path.join(__dirname, 'store.json');

const app = express();
app.use(bodyParser.json({ limit: '20mb' }));

// Load or init persistent mapping from feature-hash -> uniqueId
let store = {};
try {
  if (fs.existsSync(STORE_PATH)) {
    store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8') || '{}');
  }
} catch (err) {
  console.warn('[algo-service] could not read store.json, starting fresh');
  store = {};
}

function persistStore() {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('[algo-service] Failed to persist store:', err);
  }
}

// Deterministic unique id generation from a hash
function idFromHash(hash) {
  // short unique id: uid-<6 chars>
  return `uid-${hash.slice(0, 6)}`;
}

// Algorithm endpoint: deterministically derive a unique user id from payload
app.post('/algorithm/analyze', async (req, res) => {
  try {
    const { userId, payload } = req.body || {};
    console.log('[algo-service] Received analysis request for user:', userId);

    if (!payload) {
      return res.status(400).json({ message: 'Payload is required' });
    }

    // In a real system: decrypt payload, extract features, and perform matching.
    // For this demo, we'll compute a SHA-256 over ciphertext (or full payload JSON) to derive a stable identifier.
    const toHash = (payload && payload.ciphertext) ? payload.ciphertext : JSON.stringify(payload || '');
    
    if (!toHash || toHash.length === 0) {
      return res.status(400).json({ message: 'Invalid payload: empty or missing data' });
    }
    
    const hash = crypto.createHash('sha256').update(toHash).digest('hex');

    // Check store for existing mapping
    let uniqueId = store[hash];
    let isNew = false;
    if (!uniqueId) {
      uniqueId = idFromHash(hash);
      store[hash] = uniqueId;
      persistStore();
      isNew = true;
      console.log('[algo-service] New unique id generated:', uniqueId);
    } else {
      console.log('[algo-service] Existing unique id found:', uniqueId);
    }

    // Simulate a match score based on hash to keep it deterministic-ish
    const score = parseInt(hash.slice(0, 4), 16) / 0xffff;

    // Prepare a JSON-friendly payload that clients can embed in QR codes.
    // This includes the deterministic uid and the feature/hash used to derive it.
    const qrPayloadObj = { uid: uniqueId, hash };
    const qrPayload = JSON.stringify(qrPayloadObj);

    return res.json({
      matched: true,
      matchedUserId: uniqueId,
      uid: uniqueId,
      hash,
      qrPayload,
      score: score.toFixed(3),
      isNew,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[algo-service] Error:', err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ 
      message: 'Algorithm service error', 
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
});

app.get('/', (req, res) => res.send('Algorithm Service running'));

app.listen(PORT, () => console.log(`[algo-service] listening on http://localhost:${PORT}`));
