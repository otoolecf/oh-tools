P2P Clipboard & File/Image Share — Summary Architecture (WebRTC + QR/URL)

1. Goal

Enable phone ↔ laptop ↔ desktop copy/paste and file/image transfer with no central data storage. Prefer client-only operation; allow an optional minimal rendezvous for a short join code.

⸻

2. High-level Architecture
   • Transport: WebRTC DataChannel (bidirectional, encrypted via DTLS).
   • Signaling (one-time exchange):
   • Serverless: exchange SDP offer/answer via QR code or URL hash (copy/paste).
   • Optional short-code rendezvous: a minute-lived encrypted inbox (edge/worker) that temporarily holds encrypted SDP blobs (not your data).
   • NAT traversal:
   • STUN for public reflexive candidates (works most places).
   • Optional TURN relay for strict networks (still E2E; relay only forwards ciphertext).
   • LAN-only mode: iceServers: [] (host candidates only) for same-Wi-Fi speed and smaller SDPs.

// ICE config examples
const LAN_ONLY = { iceServers: [] };
const INTERNET = { iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] };
const WITH_TURN = {
iceServers: [
{ urls: ['stun:stun.l.google.com:19302'] },
{ urls: ['turns:your-turn.example.com'], username: 'u', credential: 'p' }
]
};

⸻

3. Roles & Components
   • Initiator: creates the DataChannel and offer (phone or laptop).
   • Joiner: receives the offer, creates the answer.
   • Signaling medium: QR/URL/short code (not used after connect).
   • DataChannel: one channel (or a few) for text/files, optional control pings.

⸻

4. Connection Flows

A) Pure client-only (QR/URL)

sequenceDiagram
participant A as Initiator (Device A)
participant B as Joiner (Device B)

A->>A: create RTCPeerConnection + DataChannel
A->>A: createOffer() + setLocalDescription()
A->>A: wait ICE gather complete
A-->>B: Share OFFER via QR/URL/copy-paste
B->>B: setRemoteDescription(offer)
B->>B: createAnswer() + setLocalDescription()
B->>B: wait ICE gather complete
B-->>A: Share ANSWER via QR/URL/copy-paste
A->>A: setRemoteDescription(answer)
A<->>B: ICE connectivity checks complete
A<->>B: DataChannel "open" (bidirectional)

Same Wi-Fi: use LAN_ONLY ICE config to shrink SDP and speed up connect.

⸻

B) Short-code rendezvous (minute-lived, encrypted)

sequenceDiagram
participant A as Initiator
participant R as Rendezvous (edge/worker)
participant B as Joiner

A->>A: createOffer() + setLocalDescription() + ICE complete
A->>A: encrypt(offer, code)
A->>R: PUT /o/:code (ciphertext, TTL ~120s)
B->>R: GET /o/:code (one-shot)
B->>B: decrypt -> setRemoteDescription(offer)
B->>B: createAnswer() + setLocalDescription() + ICE complete
B->>B: encrypt(answer, code)
B->>R: PUT /a/:code
A->>R: GET /a/:code (one-shot)
A->>A: decrypt -> setRemoteDescription(answer)
A<->>B: DataChannel "open"

(Data stays P2P; rendezvous only sees short-lived ciphertext.)

⸻

5. After Connect: Messaging Channels
   • Text channel (UTF-8 strings) for clipboard and control events (ping/ack/progress).
   • Binary channel (ArrayBuffer) for files/images in chunks.

One channel is fine; or split control and data (two channels) to avoid HOL blocking in reliable mode.

⸻

6. File/Image Transfer Protocol (over DataChannel)

Why chunk: Browsers limit message size; large frames can stall. Chunking + backpressure keeps the UI responsive.

Message types (JSON control frames + binary chunks):
• start: {kind:'start', transferId, name, type, size, createdAt}
• chunk: binary packet = [header JSON][0x1F delimiter][bytes] with {kind:'chunk', transferId, seq}
• end: {kind:'end', transferId, totalBytes, sha256?}
• abort (optional): {kind:'abort', transferId, reason}

Sender algorithm (pseudo): 1. send(start) 2. Stream the file/blob, slice into ~16 KiB chunks. 3. Before each send(chunk), await backpressure:
• Set dc.bufferedAmountLowThreshold = ~1_000_000
• If dc.bufferedAmount ≥ threshold, await bufferedamountlow event. 4. After last chunk, send(end) (include SHA-256 if you computed it). 5. Optionally await receiver ack.

Receiver algorithm (pseudo): 1. On start, allocate {chunks: Map<seq, Uint8Array>, size, meta}. 2. On chunk, parse header JSON, store chunks.set(seq, bytes). 3. On end, stitch in order → Blob([...]) →
• If type.startsWith('image/'): preview via URL.createObjectURL.
• Else: trigger download (<a download>). 4. If sha256 present, verify; else trust SCTP/DTLS integrity.

Ordered vs unordered:
• Small/medium files: ordered: true, reliable: true (simplest).
• Large files: ordered: false, reliable: true with seq in your header to avoid head-of-line blocking.

Progress: Track bytes sent/received for a progress bar. Use a periodic control message or infer from chunk counts.

⸻

7. Clipboard/Text
   • Send plain strings; on receive:
   • Attempt navigator.clipboard.writeText(text) (requires user gesture; have a “Copy” fallback button).
   • Always mirror payload in the UI for manual copy.

⸻

8. Security
   • Transport: DTLS (built into WebRTC).
   • Peer verification (recommended): show a Short Authentication String (SAS) derived from the DTLS fingerprints on both devices (e.g., 10–12 hex chars or two words). Users compare to detect MITM.
   • Optional E2E app encryption: wrap payloads in AES-GCM with a session key derived from a short code if you want application-layer E2E on top of DTLS.
   • Rendezvous (if used): store only encrypted SDP, single-read, TTL ~60–120s.

⸻

9. Failure Modes & Fallbacks
   • ICE fails: show prompt to retry with TURN enabled or switch to LAN-only if on same Wi-Fi.
   • Channel stalls: lower chunk size; ensure backpressure waiting.
   • Mobile backgrounding: keep transfers foreground; resume logic if needed.
   • Clipboard API denied: present “Copy” button with text visible.

⸻

10. UX Checklist
    • Pairing methods:
    • QR (fastest for phone+laptop).
    • URL hash link (no camera).
    • Short code (requires minute-lived rendezvous).
    • LAN-only toggle (speeds up local connect).
    • Connection state: “Connecting → Connected → Failed/Retry”.
    • SAS display after connect.
    • Drag & drop and file picker for files/images.
    • Progress bars and Cancel.
    • History (local only) via IndexedDB (no cloud persistence).

⸻

11. Minimal Interfaces

type ControlMsg =
| { kind: 'start'; transferId: string; name: string; type: string; size: number }
| { kind: 'end'; transferId: string; totalBytes: number; sha256?: string }
| { kind: 'abort'; transferId: string; reason: string }
| { kind: 'ping'; t: number }
| { kind: 'pong'; t: number };

⸻

12. Implementation Notes
    • Wait for ICE gathering complete before producing QR/URL to keep a stable, compact SDP.
    • Compress signaling payloads (deflate + base64url) for shorter QR/links.
    • Set dc.binaryType = 'arraybuffer' for binary.
    • Use try { JSON.parse(msg) } catch { /_ treat as plain text _/ } to multiplex control vs text.
    • Consider two DataChannels: control (ordered, reliable) and data (unordered, reliable).

⸻

13. Optional: HTTP Relay Variant (non-P2P)

If P2P is blocked: run a tiny HTTP relay and forward messages request/response-style. Keep AES-GCM around bodies for privacy. Simpler connectivity, but all traffic goes through the relay (use quotas/rate-limits).

⸻

14. Next Steps
    1.  Build a static PWA with QR/URL signaling (serverless).
    2.  Add LAN-only toggle.
    3.  Implement file chunking with backpressure + progress UI.
    4.  Add SAS display post-connect.
    5.  (Optional) Add minute-lived encrypted rendezvous for short codes.
    6.  (Optional) Add TURN for near-universal connectivity.

⸻
