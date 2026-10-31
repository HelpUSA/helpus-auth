/**
 * G3-B+ EXPERIMENTAL AUTHORITY. Strict localhost Ed25519 JWT issuer for synthetic S2S fixtures.
 * It is NOT wired to the existing HelpUS Auth SPA, and is NOT a production login/identity API.
 * No keys, tenants, phone numbers or secrets from live accounts may be used.
 */
import http from 'node:http';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const LAB_ISSUER = 'https://auth.invalid/helpus-g3bplus-lab';
export const LAB_AUDIENCE = 'helpus-g3bplus-s2s';
const MAX_BODY = 4096;

function guard() {
  if (process.env.NODE_ENV === 'production' || process.env.HELPUS_G3BPLUS_LOCAL_ONLY !== '1') {
    throw new Error('G3BPLUS_LOCAL_ONLY_REQUIRED');
  }
}

function bad(code, status = 400) {
  const err = new Error(code);
  err.httpStatus = status;
  return err;
}
function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store',
    'x-content-type-options': 'nosniff' });
  res.end(JSON.stringify(body));
}
async function readJson(req) {
  const chunks = [];
  let len = 0;
  for await (const chunk of req) {
    len += chunk.byteLength;
    if (len > MAX_BODY) throw bad('BODY_TOO_LARGE', 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw bad('MALFORMED_JSON'); }
}
function validName(s) { return typeof s === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(s); }
function equalSecret(got, expected) {
  if (typeof got !== 'string' || !/^[a-f0-9]{64}$/i.test(got)) return false;
  return crypto.timingSafeEqual(Buffer.from(got.toLowerCase(), 'hex'), Buffer.from(expected.toLowerCase(), 'hex'));
}
function b64(v) { return Buffer.from(JSON.stringify(v)).toString('base64url'); }
function parseSegment(v) {
  if (typeof v !== 'string' || !/^[\w-]+$/.test(v) || v.length > 4096) throw bad('INVALID_JWT', 401);
  const buf = Buffer.from(v, 'base64url');
  if (buf.toString('base64url') !== v) throw bad('INVALID_JWT', 401);
  try { return JSON.parse(buf.toString('utf8')); }
  catch { throw bad('INVALID_JWT', 401); }
}

export function createG3BPlusAuthLab({ bootstrapSecret, timeNow = () => Math.floor(Date.now() / 1000) } = {}) {
  guard();
  if (typeof bootstrapSecret !== 'string' || !/^[a-f0-9]{64}$/i.test(bootstrapSecret)) {
    throw new Error('RANDOM_TEST_BOOTSTRAP_SECRET_REQUIRED');
  }
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  const keyId = 'g3bplus-local-' + crypto.randomUUID();
  const jwk = publicKey.export({ format: 'jwk' });
  const publicJwk = { ...jwk, alg: 'EdDSA', use: 'sig', kid: keyId, key_ops: ['verify'] };

  function issue({ tenantId, clientId, scope }) {
    guard();
    if (!validName(tenantId) || !tenantId.startsWith('tenant_')) throw bad('SYNTHETIC_TENANT_REQUIRED');
    if (clientId !== 'zap-pro' && clientId !== 'pay') throw bad('INVALID_CLIENT');
    const permitted = clientId === 'zap-pro'
      ? new Set(['pay:read', 'pay:create', 'pay:cancel'])
      : new Set(['callback:send']);
    if (!Array.isArray(scope) || scope.length < 1 || scope.length > 3 ||
        new Set(scope).size !== scope.length || scope.some(s => !permitted.has(s))) {
      throw bad('SCOPE_NOT_ALLOWED', 403);
    }
    const now = timeNow();
    const payload = { iss: LAB_ISSUER, aud: LAB_AUDIENCE, sub: 'svc:' + clientId,
      tenant_id: tenantId, scope: scope.join(' '), iat: now, nbf: now, exp: now + 120,
      jti: crypto.randomUUID() };
    const prefix = b64({ alg: 'EdDSA', typ: 'JWT', kid: keyId }) + '.' + b64(payload);
    const signature = crypto.sign(null, Buffer.from(prefix), privateKey).toString('base64url');
    return prefix + '.' + signature;
  }

  function verify(token, { tenantId, audience = LAB_AUDIENCE, requiredScope = null } = {}) {
    guard();
    if (typeof token !== 'string' || token.length > 8192) throw bad('INVALID_JWT', 401);
    const parts = token.split('.');
    if (parts.length !== 3) throw bad('INVALID_JWT', 401);
    const header = parseSegment(parts[0]), p = parseSegment(parts[1]);
    if (!header || header.alg !== 'EdDSA' || header.typ !== 'JWT' || header.kid !== keyId ||
        !/^[\w-]+$/.test(parts[2])) throw bad('INVALID_JWT', 401);
    const signed = parts[0] + '.' + parts[1];
    const sig = Buffer.from(parts[2], 'base64url');
    if (sig.byteLength !== 64 || sig.toString('base64url') !== parts[2] ||
        !crypto.verify(null, Buffer.from(signed), publicKey, sig)) throw bad('INVALID_JWT', 401);
    const now = timeNow();
    if (!p || p.iss !== LAB_ISSUER || p.aud !== audience ||
        typeof p.exp !== 'number' || p.exp <= now || p.exp > now + 120 ||
        typeof p.nbf !== 'number' || p.nbf > now ||
        !validName(p.tenant_id) || typeof p.sub !== 'string' || !/^svc:(zap-pro|pay)$/.test(p.sub) ||
        !/^[a-f0-9-]{36}$/i.test(p.jti) || typeof p.scope !== 'string') {
      throw bad('INVALID_JWT_CLAIMS', 401);
    }
    if (tenantId != null && p.tenant_id !== tenantId) throw bad('TENANT_MISMATCH', 403);
    if (requiredScope != null && !p.scope.split(' ').includes(requiredScope)) throw bad('INSUFFICIENT_SCOPE', 403);
    return Object.freeze({ ...p });
  }

  const server = http.createServer(async (req, res) => {
    try {
      guard();
      const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
      if (req.method === 'GET' && pathname === '/sandbox/g3bplus/jwks') {
        return json(res, 200, { keys: [publicJwk] });
      }
      if (req.method === 'POST' && pathname === '/sandbox/g3bplus/token') {
        if (!equalSecret(req.headers['x-lab-bootstrap-secret'], bootstrapSecret)) {
          return json(res, 401, { ok: false, code: 'UNAUTHORIZED_LAB_BOOTSTRAP' });
        }
        const body = await readJson(req);
        if (!body || typeof body !== 'object' || Array.isArray(body) ||
            Object.keys(body).some(k => !['tenantId', 'clientId', 'scope'].includes(k))) {
          throw bad('INVALID_TOKEN_REQUEST');
        }
        const token = issue(body);
        return json(res, 200, { access_token: token, token_type: 'Bearer', expires_in: 120,
          issuer: LAB_ISSUER, audience: LAB_AUDIENCE });
      }
      if (req.method === 'POST' && pathname === '/sandbox/g3bplus/introspect') {
        if (!equalSecret(req.headers['x-lab-bootstrap-secret'], bootstrapSecret)) {
          return json(res, 401, { ok: false, code: 'UNAUTHORIZED_LAB_BOOTSTRAP' });
        }
        const body = await readJson(req);
        const p = verify(body?.token, { tenantId: body?.tenantId, requiredScope: body?.requiredScope });
        return json(res, 200, { active: true, tenant_id: p.tenant_id, sub: p.sub, scope: p.scope,
          exp: p.exp, jti: p.jti });
      }
      return json(res, 404, { ok: false, code: 'NOT_FOUND' });
    } catch (e) {
      return json(res, e.httpStatus || 500, { ok: false, code: e.httpStatus ? e.message : 'SANDBOX_ERROR' });
    }
  });
  return {
    issue, verify, jwks: { keys: [publicJwk] }, server,
    listen: () => new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => {
        server.off('error', reject);
        const port = server.address().port;
        resolve({ baseUrl: 'http://127.0.0.1:' + port,
          close: () => new Promise(r => server.close(r)) });
      });
    })
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const lab = createG3BPlusAuthLab({ bootstrapSecret: process.env.HELPUS_G3BPLUS_BOOTSTRAP_SECRET });
    const { baseUrl } = await lab.listen();
    process.stdout.write('G3BPLUS_AUTH_READY ' + JSON.stringify({ baseUrl }) + '\n');
  } catch (e) {
    process.stderr.write('G3BPLUS_AUTH_BLOCKED ' + e.message + '\n');
    process.exitCode = 1;
  }
}
