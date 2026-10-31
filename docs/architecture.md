# Current architecture

Vite builds static HTML and shared browser modules. The build also renders the
header, tool guides, and initial import panels; there is no server rendering of
user files. Node.js 22.12+ and root `npm ci`/`npm run dev` are the supported setup.
Do not use the historical per-tool install/copy instructions in `docs/archive`.

Image editing uses a browser VIPS worker. ExifReader reads metadata in the
browser; rendered metadata is text, with explicit HTTP(S) links. HEIC conversion
loads on demand. Video processing uses Mediabunny and browser media APIs.
DuckDB runs SQL in a browser worker. Local files stay on the device; remote URLs
and extensions contact their hosts. SQL history is memory-only, clears on tab
close, and excludes statements with values, URLs, or credential-related terms.
The former persisted query-history key is deleted during initialization.

Browser Bridge sends user-selected text/files over WebRTC. Direct Exchange
avoids our signaling backend. Simple Codes uses a separate Worker with a
required rate limiter and one SQLite Durable Object per code. Records expire
after fifteen minutes; atomic creation and read/deletion prevent duplicate
creation/consumption. The service receives Base64-encoded connection details,
not encrypted signaling. It can read those details; WebRTC encrypts the
subsequent data channel. The backend stores no IP in signaling records. A consumed code remains reserved without its payload until expiry, preventing stale retries from retrieving a new record under a reused code. Live-record expiration does not promise physical erasure from provider backups/logs.
The backend requires its own deployment with the storage and rate-limiter
bindings; a static-site deployment does not update it.

No OPFS persistence, automatic remote uploads, or encrypted rendezvous from the
archived proposals is implied. See the public About page for network/privacy
behavior and `third-party/THIRD_PARTY_NOTICES.md` for library source downloads.
