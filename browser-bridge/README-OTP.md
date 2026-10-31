# Browser Bridge Simple Codes Setup

Simple Codes uses encoded WebRTC offer/answer records and six-digit codes to establish a peer-to-peer connection. The Worker stores encoded signaling records for up to 15 minutes and deletes a record after retrieval. Workers KV is eventually consistent, so this is not a guarantee of atomic one-time retrieval. Direct Exchange avoids the signaling service.

The current frontend uses Base64 encoding, not encryption, for signaling metadata. The service can decode these records. WebRTC encrypts the subsequent data-channel transport; this does not make the signaling records confidential.

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
npx wrangler kv namespace create TEMP_STORAGE_KV --config browser-bridge/wrangler.toml
npx wrangler kv namespace create TEMP_STORAGE_KV --preview --config browser-bridge/wrangler.toml
```

Set your namespace IDs in the local config; configure its optional rate limiter for a public deployment. Keep the real config untracked, then run:

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
- If a code is not found, it may have expired, been mistyped, or already retrieved. KV propagation can also delay visibility between locations.
- If storage fails, check the signaling Worker logs and KV bindings.
- Production signaling storage and consistency improvements are separate from the frontend build migration.
