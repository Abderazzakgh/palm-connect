// Test script: request /handshake with and without X-Forwarded-For header
// Usage: node xfwd_test.js

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const SERVER = process.env.SERVER || 'http://localhost:4000';
const LOG_PATH = path.join(__dirname, '..', 'handshake.log');

async function run() {
  try {
    console.log('1) Requesting /handshake WITH X-Forwarded-For header...');
    const resp1 = await fetch(`${SERVER}/handshake`, { headers: { 'X-Forwarded-For': '1.2.3.4', 'User-Agent': 'xfwd-test/1' } });
    const body1 = await resp1.text();
    console.log('Response status:', resp1.status);
    console.log('Response body:', body1);

    // small delay to allow server to write logs
    await new Promise((r) => setTimeout(r, 300));

    console.log('\n2) Requesting /handshake WITHOUT X-Forwarded-For header...');
    const resp2 = await fetch(`${SERVER}/handshake`, { headers: { 'User-Agent': 'xfwd-test/2' } });
    const body2 = await resp2.text();
    console.log('Response status:', resp2.status);
    console.log('Response body:', body2);

    // wait a bit for server to append logs
    await new Promise((r) => setTimeout(r, 500));

    console.log('\n3) Tail `server/handshake.log` (last 50 lines) if exists:');
    if (fs.existsSync(LOG_PATH)) {
      const data = fs.readFileSync(LOG_PATH, 'utf8');
      const lines = data.trim().split(/\r?\n/).filter(Boolean);
      const last = lines.slice(-50);
      console.log('--- handshake.log (last ' + last.length + ' lines) ---');
      last.forEach((l) => console.log(l));
      console.log('--- end log ---');
    } else {
      console.log('No handshake.log file found at', LOG_PATH);
    }

  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

run();
