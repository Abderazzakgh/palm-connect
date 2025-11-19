Security considerations for Savanna (Palm-connect)
===============================================

This document summarizes critical security recommendations for biometric capture, transport, storage, and matching.

1) Transport and channel security
   - Use TLS (HTTPS) for all endpoints. Prefer modern ciphers and HSTS.
   - Consider mutual TLS for stronger server ↔ device authentication where devices are managed.

2) Key management and encryption
   - Prefer ECDH (X25519) key agreement to derive per-session symmetric keys (HKDF + AES-GCM) for payload encryption.
   - Alternatively, use RSA-OAEP to wrap session keys if PKI is already available.
   - Never transmit unencrypted raw biometric images over the network in production.

3) Minimize data and store templates
   - Extract biometric templates (compact features) instead of storing raw images.
   - Templates should be irreversible where possible and encrypted at rest with keys different from transport keys.

4) Authentication, authorization, and audit
   - Require authenticated clients and maintain detailed audit logs for enrollment and verification attempts.
   - Rate-limit endpoints and implement anomaly detection to prevent brute-force/fraud.

5) Privacy, consent, and retention
   - Collect explicit user consent before enrolling biometrics.
   - Define retention policies and deletion workflows to comply with local regulations.

6) Testing and validation
   - Add unit and integration tests covering encryption, key exchange, and algorithm outputs.
   - Perform security reviews and threat modeling before production deployments.

If you want, I can implement an ECDH-based demo in this repo (client + server) that shows key agreement, AES-GCM wrapping/unwrapping, and encrypted response delivery. Reply "implement ECDH demo" to proceed.
