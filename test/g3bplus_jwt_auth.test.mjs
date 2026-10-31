import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { createG3BPlusAuthLab, LAB_AUDIENCE, LAB_ISSUER } from '../sandbox/g3bplus_jwt_auth.mjs';

const savedEnv = process.env.HELPUS_G3BPLUS_LOCAL_ONLY;
process.env.HELPUS_G3BPLUS_LOCAL_ONLY = '1';
const bootstrapSecret = crypto.randomBytes(32).toString('hex');
const lab = createG3BPlusAuthLab({ bootstrapSecret });
const { baseUrl, close } = await lab.listen();
const route = '/sandbox/g3bplus/token';
const options = { tenantId: 'tenant_barbearia', clientId: 'zap-pro', scope: ['pay:create', 'pay:read'] };
async function post(path, data, secret = bootstrapSecret) {
  const r = await fetch(baseUrl + path, { method: 'POST', headers: {
    'content-type': 'application/json', 'x-lab-bootstrap-secret': secret
  }, body: JSON.stringify(data) });
  return { status: r.status, body: await r.json() };
}
try {
  await test('real Ed25519 lab JWT verifies issuer, audience, tenant, scope and expiration', () => {
    const token = lab.issue(options);
    const p = lab.verify(token, { tenantId: 'tenant_barbearia', requiredScope: 'pay:create' });
    assert.equal(p.iss, LAB_ISSUER);
    assert.equal(p.aud, LAB_AUDIENCE);
    assert.equal(p.sub, 'svc:zap-pro');
    assert.equal(p.tenant_id, 'tenant_barbearia');
    assert.ok(p.exp > p.iat);
    assert.ok(p.exp - p.iat <= 120);
  });
  await test('public JWKS verifies the same token with NO private key', async () => {
    const r = await fetch(baseUrl + '/sandbox/g3bplus/jwks');
    assert.equal(r.status, 200);
    const data = await r.json();
    assert.equal(data.keys.length, 1);
    assert.ok(!data.keys[0].d);
    const key = crypto.createPublicKey({ key: data.keys[0], format: 'jwk' });
    const token = lab.issue(options);
    const [h, p, s] = token.split('.');
    assert.ok(crypto.verify(null, Buffer.from(h + '.' + p), key, Buffer.from(s, 'base64url')));
  });
  await test('no bootstrap secret means 401', async () => {
    assert.equal((await post(route, options, '')).status, 401);
    assert.equal((await post(route, options, crypto.randomBytes(32).toString('hex'))).status, 401);
  });
  await test('HTTP issues short-lived scoped token with valid bootstrap only', async () => {
    const r = await post(route, options);
    assert.equal(r.status, 200);
    assert.equal(r.body.expires_in, 120);
    assert.equal(lab.verify(r.body.access_token, { requiredScope: 'pay:create' }).sub, 'svc:zap-pro');
    assert.equal((await post('/sandbox/g3bplus/introspect', {
      token: r.body.access_token, tenantId: 'tenant_barbearia', requiredScope: 'pay:create'
    })).body.active, true);
  });
  await test('cross-tenant verification returns 403', () => {
    const t = lab.issue(options);
    assert.throws(() => lab.verify(t, { tenantId: 'tenant_pizzaria' }), /TENANT_MISMATCH/);
  });
  await test('missing permission is always denied', () => {
    const t = lab.issue(options);
    assert.throws(() => lab.verify(t, { requiredScope: 'pay:cancel' }), /INSUFFICIENT_SCOPE/);
    assert.throws(() => lab.issue({ ...options, clientId: 'pay', scope: ['pay:create'] }), /SCOPE_NOT_ALLOWED/);
  });
  await test('unrecognized scopes and clients are rejected', () => {
    assert.throws(() => lab.issue({ ...options, clientId: 'master' }), /INVALID_CLIENT/);
    assert.throws(() => lab.issue({ ...options, scope: ['admin:*'] }), /SCOPE_NOT_ALLOWED/);
    assert.throws(() => lab.issue({ ...options, tenantId: 'real_customer' }), /SYNTHETIC_TENANT_REQUIRED/);
  });
  await test('tampered signature or payload does not validate', () => {
    const t = lab.issue(options);
    const [h, p, s] = t.split('.');
    assert.throws(() => lab.verify(h + '.' + p + '.' + (s[0] === 'a' ? 'b' : 'a') + s.slice(1)), /INVALID_JWT/);
    const changed = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(p,'base64url')), tenant_id: 'tenant_pizzaria' })).toString('base64url');
    assert.throws(() => lab.verify(h + '.' + changed + '.' + s), /INVALID_JWT/);
  });
  await test('alg=none and wrong audience cannot authenticate', () => {
    const t = lab.issue(options);
    assert.throws(() => lab.verify(t, { audience: 'some-other-api' }), /INVALID_JWT_CLAIMS/);
    const [_, p, s] = t.split('.');
    const h = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    assert.throws(() => lab.verify(h + '.' + p + '.' + s), /INVALID_JWT/);
  });
  await test('expired JWT and future nbf are rejected', () => {
    let now = 1_700_000_000;
    const fresh = createG3BPlusAuthLab({ bootstrapSecret: crypto.randomBytes(32).toString('hex'), timeNow: () => now });
    const t = fresh.issue(options);
    now += 121;
    assert.throws(() => fresh.verify(t), /INVALID_JWT_CLAIMS/);
    now -= 200;
    assert.throws(() => fresh.verify(t), /INVALID_JWT_CLAIMS/);
  });
  await test('production and missing explicit local opt-in are blocked', () => {
    const old = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      assert.throws(() => lab.issue(options), /G3BPLUS_LOCAL_ONLY_REQUIRED/);
      delete process.env.NODE_ENV;
      delete process.env.HELPUS_G3BPLUS_LOCAL_ONLY;
      assert.throws(() => lab.issue(options), /G3BPLUS_LOCAL_ONLY_REQUIRED/);
    } finally {
      if (old !== undefined) process.env.NODE_ENV = old;
      else delete process.env.NODE_ENV;
      process.env.HELPUS_G3BPLUS_LOCAL_ONLY = '1';
    }
  });
  await test('HTTP client cannot request extra claims or malicious scope', async () => {
    assert.equal((await post(route, { ...options, admin: true })).status, 400);
    assert.equal((await post(route, { ...options, scope: ['pay:issue-refund'] })).status, 403);
  });
} finally {
  await close();
  if (savedEnv === undefined) delete process.env.HELPUS_G3BPLUS_LOCAL_ONLY;
  else process.env.HELPUS_G3BPLUS_LOCAL_ONLY = savedEnv;
}
