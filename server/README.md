# Palm-connect Demo Server

This folder contains two minimal Express services to demo the flow for المرحلة 2:

- Application Service (port 4000): receives the encrypted payload from the client and forwards it to the Algorithm Service.
- Algorithm Service (port 4100): mock service that simulates feature extraction/matching and returns a mock unique user id and score.

Run (PowerShell):

```powershell
cd server
npm install
npm run start:algo
# in a second terminal
npm run start:app
```

Or run both together (requires concurrently):

```powershell
cd server
npm install
npm run start:all
```

Notes:
- These services are a demo only. They do not perform real decryption or secure key exchange.
- In production, the Application Service should securely unwrap/wrap keys, decrypt/encrypt as required, authenticate callers, and perform audit logging.
- Algorithm Service should perform real biometric feature extraction and matching with proper privacy and security controls.

Phase 4 & 5: permission checks and returning result
- The Application Service now includes a small SQLite DB (`server/app.db`) to store user permission records.
- Use the admin endpoint to register or update permissions for a `uniqueId` returned by the Algorithm Service:

	POST http://localhost:4000/admin/register
	Body: { "uniqueId": "uid-abc123", "allowed": 1, "meta": "optional info" }

- When the client uploads to `/vein/upload`, the Application Service forwards to the Algorithm Service, receives `matchedUserId`, then looks up permission in the DB and returns a response containing:

	{
		message: 'Uploaded and analyzed',
		result: { matched: true, matchedUserId: 'uid-abc123', ... },
		internalData: { uniqueUserId: 'uid-abc123' },
		permission: { authorized: true, reason: 'authorized' }
	}

Security note:
- Transport must use TLS (HTTPS) in production to ensure confidentiality in transit. Application-level encryption (wrapping responses to be readable only by the original device) can be added using client-provided public keys or a prior key agreement (e.g., ECDH). This demo returns plaintext JSON over HTTP for ease of testing.

Detailed guidance: key management, server responsibilities and next steps
---------------------------------------------------------------

1) Why the demo is limited
	- The frontend currently encrypts the image bytes with an ephemeral AES-GCM key but does not share that key
	  with the server. The Application Service therefore cannot decrypt the ciphertext. This is acceptable for a
	  UX/dev demo but not for production.

2) Recommended production approaches
	- Option A — ECDH (recommended):
	  * The server exposes an ECDH public key (e.g. X25519) or an endpoint to perform a key agreement.
	  * The client generates an ephemeral ECDH key pair and derives a shared secret with the server's public key.
	  * Derive an AES key from the shared secret (HKDF). Use AES-GCM to encrypt the payload. Send { iv, ciphertext, clientPub }.
	  * Server uses its private key + clientPub to derive the same AES key and decrypts.
	  * Pros: forward secrecy, modern, efficient.

	- Option B — RSA key-wrap:
	  * Server publishes an RSA public key (2048+ or 3072 bits). Client generates a random AES session key and wraps it with RSA-OAEP.
	  * Client sends { iv, ciphertext, wrappedKey } to server. Server unwraps with its private key and decrypts.
	  * Pros: simpler to implement if you already have an RSA key infrastructure; cons: no forward secrecy.

3) Message formats and integrity
	- Always include explicit metadata: algorithm versions, key IDs, key derivation info, and timestamps.
	- Sign or MAC messages if authorization/integrity is required (HMAC or digital signatures). For instance,
	  compute an HMAC of the ciphertext using the session key and send it along with the payload for server-side verification.

4) Server responsibilities
	- Authenticate the client (API keys, mutual TLS, JWT) before accepting biometric payloads.
	- Rate-limit and audit uploads to prevent abuse and replay attacks.
	- Decrypt payloads only in a secure, controlled environment. Consider a dedicated service or hardware module.
	- Store templates (features) rather than raw images where possible; encrypt at rest with a different key.

5) How to test locally (developer flow)
	- Option (quick): Keep demo behavior (client encrypts but server doesn't decrypt). Use the Algorithm Service hashing trick (current demo) to get reproducible unique IDs.
	- Option (end-to-end dev): Implement RSA wrap on the client and add server-side unwrapping in `app-service/index.js`.
	  * Add an endpoint `/key/public` to return the server RSA public key (PEM).
	  * Update `CompleteProfile.tsx` to generate AES key, encrypt image, export AES key (raw), then wrap with the server RSA public key (using SubtleCrypto importKey + wrapKey).
	  * Update Application Service to unwrap (using Node crypto or a key library) and decrypt AES-GCM.

6) Checklist before production rollout
	- [ ] Use TLS for all endpoints.
	- [ ] Implement authentication & authorization on Application Service.
	- [ ] Choose and implement a secure key exchange (ECDH recommended).
	- [ ] Sign/MAC messages for integrity.
	- [ ] Store only derived templates where possible; encrypt at rest and restrict access.
	- [ ] Perform privacy and legal review (consent, data retention policies).

Appendix: example minimal message payload (when using RSA wrap)

```
POST /vein/upload
Content-Type: application/json

{
  "userId": "user-123",
  "payload": {
	  "iv": "BASE64_IV",
	  "ciphertext": "BASE64_CIPHERTEXT",
	  "wrappedKey": "BASE64_RSA_WRAPPED_KEY",
	  "keyId": "rsa-v1",
	  "meta": { "algo": "AES-GCM", "version": "1" }
  }
}
```

If you want, I can implement one of the secure options (ECDH or RSA) end-to-end in this demo and provide the client + server changes along with tests and run instructions. Reply with which method you prefer.