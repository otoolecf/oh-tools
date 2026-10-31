# Security Policy

## Reporting A Vulnerability

Please do not open a public issue for sensitive security reports.

Report vulnerabilities by emailing `help@oh-tools.net` with:

- A description of the issue.
- Steps to reproduce.
- Affected tool or URL.
- Any suggested fix, if known.

## Scope

Most tools run locally in the browser. Browser Bridge Simple Codes mode uses a Cloudflare Worker as temporary signaling storage for WebRTC connection setup.

Please report issues involving data exposure, unsafe file handling, cross-site scripting, dependency compromise, or Browser Bridge signaling behavior.

## Known Signaling Limitation

Browser Bridge currently Base64-encodes signaling records; this is not encryption. A signaling-service operator can decode connection metadata. WebRTC data-channel traffic is encrypted separately. The maintained Worker atomically stores and consumes records in SQLite Durable Objects, limits record sizes, and fails closed if rate limiting is unavailable. Older KV deployments lack these protections until migrated. Frontend deployments do not update the signaling Worker. Expiration and consumption limit live retrieval; they do not guarantee physical erasure from provider backups or logs.

SQL history is memory-only and excludes values, URLs, and credential-related statements. The old persisted history key is deleted on startup. Avoid pasting credentials into shared-device browser tabs; runtime extensions/remote URLs contact their destination services.

Third-party notices and corresponding source are published at `/licenses/`. Automated checks cover malicious rendering inputs, peer message controls, dependency advisories, secret patterns, and signaling concurrency; they do not establish the absence of every possible vulnerability.
