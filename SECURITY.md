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

Browser Bridge currently Base64-encodes signaling records; this is not encryption. A signaling-service operator can decode connection metadata. WebRTC data-channel traffic is encrypted separately. The KV read/delete flow also does not guarantee atomic one-time retrieval. These backend limitations are separate from the static-site build migration.
