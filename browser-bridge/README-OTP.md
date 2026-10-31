# Browser Bridge Simple Codes Setup

Simple Codes uses encoded WebRTC offer/answer records and six-digit codes to establish a peer-to-peer connection. The Worker stores encoded signaling records for up to 15 minutes and clears a record's payload after retrieval. One SQLite Durable Object per code provides atomic creation and consumption; a consumed code stays reserved until expiry. Direct Exchange avoids the signaling service.

The current frontend uses Base64 encoding, not encryption, for signaling metadata. The service can decode these records. WebRTC encrypts the subsequent data-channel transport; this does not make the signaling records confidential.

## Hosted Production Backend

`signaling.oh-tools.net` runs the `oh-tools-signaling` Worker with
SQLite inboxes and the mandatory rate limiter. Its configuration is committed
as `wrangler.production.jsonc`. Deploy the hosted environments explicitly:

```bash
npm run deploy:signaling:production
npm run deploy:signaling:staging
```

Production is reachable only through its custom domain; its `workers.dev`
and preview URLs are disabled.

The configured rate is 10 requests per 60 seconds per IP in each Cloudflare
location. Cloudflare's rate limiter is approximate and eventually consistent,
so bursts can exceed that threshold before counters synchronize.

## Local Testing

Install dependencies once at the repository root with `npm ci`. Run these commands in separate terminals:

```bash
npm run dev
npm run dev:signaling
```

Open two tabs at http://localhost:8000/browser-bridge/. Localhost automatically uses the mock signaling server on port 3001. It stores data in memory and is intended only for local testing.

## Deploy The Signaling Worker

From the repository root:

```bash
cp browser-bridge/wrangler.example.toml browser-bridge/wrangler.toml
npx wrangler deploy --dry-run --config browser-bridge/wrangler.toml
```

Choose your Worker name and a distinct limiter namespace number in the local config. The example includes the SQLite class migration and a required rate limiter. Records are bounded to 32 KiB of JSON and expire after 15 minutes. Missing or failing bindings return 503; exhausted limits return 429. Keep the real config untracked, then run:

```bash
npm run deploy:signaling
```

The frontend's `npm run deploy` is separate and never changes signaling resources.

## Configure The Frontend

The hosted `oh-tools.net` site uses https://signaling.oh-tools.net automatically. Localhost uses http://localhost:3001. For forks or alternate hosts, copy the root `.env.example` to `.env.local` and set:

```dotenv
VITE_SIGNALING_URL=https://your-signaling-worker.example
```

Rebuild or restart the dev server after changing this value. This is a public URL embedded in the client bundle, not a secret. Do not put credentials in it. Forks/previews without a configured endpoint default to Direct Exchange and disable Simple Codes.

## API

- `POST /temp/{passcode}` stores encoded offer/answer data.
- `GET /temp/{passcode}` retrieves and deletes a record.

## Troubleshooting

- If Simple Codes is unavailable, configure `VITE_SIGNALING_URL` and rebuild, or use Direct Exchange.
- If a code is not found, it may have expired, been mistyped, or already retrieved. A retrieved code cannot be retrieved again.
- If storage fails, check the Worker configuration, required rate limiter and SIGNALING_INBOXES binding.
- Frontend and signaling deployments are separate. Validate the backend on a staging Worker before deploying to production.
