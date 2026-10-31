import worker from '../../../browser-bridge/cloudflare-worker.js';
import { SignalingInbox as Inbox } from '../../../browser-bridge/cloudflare-worker.js';
export class SignalingInbox extends Inbox {
  async expireForTest() {
    this.ctx.storage.sql.exec('UPDATE inbox SET expires = 0');
    await this.alarm();
  }
}
// Test-only entrypoint. Never included in the site's publish allowlist.
export default {
  fetch(request, env) {
    if (new URL(request.url).pathname === '/') return new Response('Ready');
    const expire = new URL(request.url).pathname.match(/^\/test-expire\/(\d{6})$/);
    if (expire) return env.SIGNALING_INBOXES.getByName(expire[1]).expireForTest().then(() => new Response('Expired'));
    const mode = request.headers.get('X-Audit-Limiter');
    const limiter = mode === 'missing' ? undefined : { limit: async () => {
      if (mode === 'error') throw new Error('Test outage');
      return { success: mode !== 'deny' };
    } };
    return worker.fetch(request, { ...env, RATE_LIMITER: limiter });
  },
};
