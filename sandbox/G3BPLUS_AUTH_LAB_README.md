# G3-B+ HelpUS Auth — local Ed25519 JWT authority

**Laboratory only. Not the production login service.** This is a separate, dependency-free Node.js server under `sandbox/`, not imported into the existing React SPA.

- Requires `HELPUS_G3BPLUS_LOCAL_ONLY=1`, rejects `NODE_ENV=production` and binds only to `127.0.0.1` on an ephemeral port.
- Requires a random 32-byte hex `HELPUS_G3BPLUS_BOOTSTRAP_SECRET` supplied at runtime. No hard-coded signing secrets; an ephemeral Ed25519 keypair is generated per instance, never persisted.
- `POST /sandbox/g3bplus/token` requires the bootstrap secret; only synthetic `tenant_*` identifiers and narrow S2S `pay:read`, `pay:create`, `pay:cancel`, `callback:send` scopes are issued to fixed test service IDs.
- `GET /sandbox/g3bplus/jwks` exposes a *public* Ed25519 verification key only. JWTs expire after 120 seconds, are constrained to one issuer/audience and are invalid after restart.
- No real account registration, passwords, OAuth, customer identity, logout/revocation store, rotation service or permissions database.

Run `node --test test/g3bplus_jwt_auth.test.mjs` with Node 22; CI also builds and audits the existing SPA. **Never route real requests here.**

G3-B remains the last approved gate (`G3B_APPROVED_SANDBOX_ONLY`); this G3-B+ preparatory work has no merge/deploy or G3-C authorization.