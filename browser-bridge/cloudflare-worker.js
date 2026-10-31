import { DurableObject } from 'cloudflare:workers';

const TTL_MS = 15 * 60 * 1000;
const MAX_BODY_BYTES = 32 * 1024;
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};
const json = (data, status = 200, headers = {}) => Response.json(data, {
  status, headers: { ...cors, 'Cache-Control': 'no-store', ...headers },
});

// Codes are bearer capabilities. This service can decode the connection details;
// WebRTC encrypts the subsequent device-to-device data channel separately.
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    const match = new URL(request.url).pathname.match(/^\/temp\/(\d{6}|[a-z]+(?:-[a-z]+){2,3})$/);
    if (!match || match[1].length > 50) return json({ error: 'Not found' }, 404);
    if (!['GET', 'POST'].includes(request.method)) return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST, OPTIONS' });
    // Fail closed: public deployments must not silently lose abuse controls.
    if (!env.RATE_LIMITER || !env.SIGNALING_INBOXES) return json({ error: 'Signaling service unavailable' }, 503);
    try {
      const ip = request.headers.get('CF-Connecting-IP');
      if (!ip) return json({ error: 'Signaling service unavailable' }, 503);
      const { success } = await env.RATE_LIMITER.limit({ key: `ip:${ip}` });
      if (!success) return json({ error: 'Rate limit exceeded', retryAfter: 60 }, 429, { 'Retry-After': '60' });
    } catch { return json({ error: 'Signaling service unavailable' }, 503); }
    try {
      const inbox = env.SIGNALING_INBOXES.getByName(match[1]);
      if (request.method === 'GET') {
        const record = await inbox.take();
        return record ? json(record) : json({ error: 'Passcode not found or expired' }, 404);
      }
      if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return json({ error: 'Expected JSON' }, 415);
      const reader = request.body?.getReader();
      if (!reader) return json({ error: 'Missing request body' }, 400);
      let length = 0;
      const chunks = [];
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.byteLength;
          if (length > MAX_BODY_BYTES) {
            await reader.cancel();
            return json({ error: 'Signaling record too large' }, 413);
          }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      let body;
      try { body = JSON.parse(await new Blob(chunks).text()); }
      catch { return json({ error: 'Invalid JSON' }, 400); }
      // encryptedData is the legacy wire-field name; the content is Base64.
      if (!body || typeof body.encryptedData !== 'string' ||
          !/^[A-Za-z0-9+/_-]+={0,2}$/.test(body.encryptedData) ||
          !['offer', 'answer'].includes(body.type)) return json({ error: 'Invalid signaling record' }, 400);
      const stored = await inbox.store({ encryptedData: body.encryptedData, type: body.type });
      return stored ? json({ success: true, expiresIn: TTL_MS / 1000 }) : json({ error: 'Passcode already in use' }, 409);
    } catch {
      // Never log connection details, codes, IPs, or record bodies.
      return json({ error: 'Signaling service unavailable' }, 503);
    }
  },
};

// One SQLite-backed object per code. Read/delete is one synchronous transaction.
export class SignalingInbox extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS inbox (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL, expires INTEGER NOT NULL)');
  }

  async store(record) {
    const expires = Date.now() + TTL_MS;
    const stored = this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec('DELETE FROM inbox WHERE expires <= ?', Date.now());
      if (this.ctx.storage.sql.exec('SELECT id FROM inbox').toArray().length) return false;
      this.ctx.storage.sql.exec('INSERT INTO inbox (id, payload, expires) VALUES (1, ?, ?)', JSON.stringify({ ...record, timestamp: Date.now() }), expires);
      return true;
    });
    if (stored) await this.ctx.storage.setAlarm(expires);
    return stored;
  }

  take() {
    return this.ctx.storage.transactionSync(() => {
      const row = this.ctx.storage.sql.exec('SELECT payload, expires FROM inbox WHERE id = 1').toArray()[0];
      // Keep a payload-free reservation until expiry, so an old retry cannot
      // consume a new person's record if the same short code is generated.
      this.ctx.storage.sql.exec("UPDATE inbox SET payload = 'null' WHERE id = 1");
      return row && row.expires > Date.now() ? JSON.parse(row.payload) : null;
    });
  }

  async alarm() {
    this.ctx.storage.sql.exec('DELETE FROM inbox WHERE expires <= ?', Date.now());
    const row = this.ctx.storage.sql.exec('SELECT expires FROM inbox WHERE id = 1').toArray()[0];
    if (row) await this.ctx.storage.setAlarm(row.expires);
  }
}
