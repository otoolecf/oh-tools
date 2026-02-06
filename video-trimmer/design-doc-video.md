# Browser Video Trimmer & Converter (Mediabunny)

Lightweight, in-browser video trimmer and format converter. Trim videos with a visual timeline, convert between container formats/codecs, and export — all client-side using Mediabunny. No uploads, no servers.

---

## Goals

- **Zero-install:** everything in the browser; user drops a video file and starts working.
- **Visual trimming:** filmstrip timeline with draggable in/out handles, frame-by-frame stepping, and keyframe indicators so the user sees exactly where cuts happen.
- **Format conversion:** convert between common video containers and codecs (MP4, WebM, MKV, MOV) with sensible defaults.
- **Fast path by default:** keyframe-snapped stream-copy trimming (no re-encoding) for near-instant results. Optional re-encode for frame-accurate cuts.
- **Privacy-first:** all processing local to the browser. Video files never leave the user's device.

## Non-Goals

- **Audio-only import/export:** audio tracks are preserved during trim/convert but there are no standalone audio tools (no audio extraction, no audio-only import, no audio mixing).
- **Multi-track editing / timeline composition:** this is a trimmer, not a video editor. No combining multiple clips, overlays, transitions, or effects.
- **Subtitles / captions:** not in scope. Subtitle tracks are dropped or passed through as-is if the library supports it, but there is no subtitle UI.
- **Server-side processing or fallback:** if the browser can't handle it, we inform the user. No backend.
- **Mobile-first design:** the timeline UI is designed for desktop/tablet with a pointer device. Mobile should be functional but is not the primary target. Show a notice recommending desktop for the best editing experience (similar to the image editor).

---

## High-Level Architecture

### UI (Vanilla JS + Web Components)

- Pure HTML/CSS/JS app. No framework.
- Page shell uses existing OToolebox conventions: `<otoolebox-header>`, `<otoolebox-footer>`, `<tool-hero>` components and `global.css`.
- Tool-specific Web Components (Custom Elements) with the `vt-` prefix:
  - `<vt-app>` — top-level orchestrator, manages state and wires child components together.
  - `<vt-file-drop>` — drag-and-drop / file picker for video input.
  - `<vt-video-preview>` — video playback area using native `<video>` element + canvas overlay for frame-accurate display.
  - `<vt-timeline>` — filmstrip thumbnail strip, playhead, draggable in/out trim handles, keyframe markers, zoom controls.
  - `<vt-trim-controls>` — trim mode selection (keyframe-snapped vs frame-accurate), frame stepping buttons, timecode displays.
  - `<vt-convert-panel>` — output format/codec selection, quality settings.
  - `<vt-export-panel>` — export button, progress bar, download link.
  - `<vt-info-panel>` — displays input file metadata (format, codec, resolution, duration, frame rate, file size).

### Mediabunny (Media Engine)

- Mediabunny is the sole media processing library. No FFmpeg WASM, no mp4box.js.
- Used for: demuxing (reading video metadata, iterating packets/samples, extracting thumbnails), muxing (writing output files), and conversion (transmux or transcode pipeline).
- Mediabunny uses the WebCodecs API internally for encoding/decoding. This is hardware-accelerated and does not require WASM.
- Mediabunny is pure TypeScript, zero dependencies, and tree-shakable. Only import what is needed.
- Install via npm; copy the built/bundled JS to `video-trimmer/lib/` for the final static deployment (same pattern as other tools in the repo).

### I/O

- **Input:** local files only via `File` / `Blob` from file picker or drag-and-drop. No remote URLs.
- **Output:** trimmed/converted file offered as a download. Use the File System Access API (`showSaveFilePicker`) where available for streaming large outputs directly to disk; fall back to `Blob` + `URL.createObjectURL` + download link.

### Required Headers

Mediabunny's multi-threaded encoding via WebCodecs requires `SharedArrayBuffer`:

```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

These must be added to the `_headers` file for Cloudflare Pages and to `dev-server.js` for local development, scoped to `/video-trimmer/*` (same pattern as `/image-editor/*`).

---

## Detailed Feature Specifications

### 1. File Import

**Trigger:** user drops a video file onto `<vt-file-drop>` or clicks to open file picker.

**Accepted input types:** `.mp4`, `.webm`, `.mkv`, `.mov`, `.m4v`, `.avi`, `.ogg`, `.ogv`. The file input `accept` attribute should be `video/*`.

**On import:**

1. Create a `URL.createObjectURL(file)` and set it as the `<video>` element's `src` for native playback.
2. Create a Mediabunny `Input` with `BlobSource(file)` and `ALL_FORMATS` (or the specific formats imported to minimize bundle: `Mp4InputFormat`, `WebMInputFormat`, `MatroskaInputFormat`, `OggInputFormat`).
3. Read metadata from the `Input`:
   - Duration: `await input.computeDuration()` (returns microseconds).
   - Primary video track: `await input.getPrimaryVideoTrack()` → extract `displayWidth`, `displayHeight`, `rotation`, codec info.
   - Primary audio track: `await input.getPrimaryAudioTrack()` → extract `sampleRate`, `numberOfChannels`, codec info (display-only; we don't manipulate audio).
   - Keyframe positions: iterate over video packets and record timestamps of keyframes (packets where `isKeyframe === true` or equivalent). Store these as a sorted array of microsecond timestamps.
4. Populate `<vt-info-panel>` with metadata.
5. Begin thumbnail generation (see Timeline section).
6. Set initial trim range to full duration (in = 0, out = duration).

**Error handling:** if Mediabunny cannot parse the file (unsupported format or corrupt), display a clear error message in a status area. Do not crash. Suggest the user try a different file.

### 2. Video Preview (`<vt-video-preview>`)

**Structure:** a container with:
- A native `<video>` element (primary playback, hardware-accelerated, streams from disk via object URL). Set `preload="metadata"`.
- A `<canvas>` element overlaid on the video, same dimensions, used for displaying Mediabunny-decoded frames during frame-accurate scrubbing. Hidden by default; shown only when in frame-stepping mode.

**Playback controls** (custom, not browser defaults — set `controls` attribute to `false` on the `<video>` element):
- Play / Pause toggle button.
- Current timecode display (HH:MM:SS:FF format, where FF is frame number within the current second, calculated from the video's frame rate).
- Playback is driven by the native `<video>` element. On `timeupdate` events, update the playhead position on the timeline.

**Frame-accurate display:** when the user is fine-stepping with arrow keys or the jog control (see Trim Controls), switch to canvas display mode:
1. Hide the `<video>` element (or make it transparent).
2. Use Mediabunny `VideoSampleSink.getSample(timestamp)` to decode the exact frame.
3. Draw the decoded `VideoFrame` onto the canvas using `ctx.drawImage(frame, ...)`.
4. Call `frame.close()` after drawing.
5. When the user resumes normal playback (presses play), switch back to the `<video>` element.

**Sizing:** the preview should scale responsively to fit the available width while maintaining aspect ratio. Apply `rotation` from the video track metadata if non-zero (Mediabunny provides this). Max height should be constrained so the timeline remains visible without scrolling.

### 3. Timeline (`<vt-timeline>`)

The timeline is the core UI component. It consists of several layers stacked vertically:

#### 3a. Filmstrip Thumbnail Strip

A horizontal strip of evenly-spaced thumbnail images representing frames across the video duration. This gives the user a visual overview of the video content.

**Thumbnail generation:**
- Calculate the number of thumbnails to fill the timeline width at a fixed thumbnail width of ~120px. For example, a 900px-wide timeline = ~7-8 thumbnails.
- For each thumbnail position, compute the target timestamp: `(i / numThumbs) * duration`.
- Use Mediabunny `VideoSampleSink.getSample(timestamp)` to decode each frame.
- Draw each decoded `VideoFrame` onto a small offscreen canvas (120 × height scaled to aspect ratio), then convert to an image (`canvas.toDataURL('image/jpeg', 0.6)` or store as `ImageBitmap`).
- Call `frame.close()` after each draw.
- **Generate progressively:** decode and display thumbnails one by one using `requestIdleCallback` or a simple async loop with `await` + small delay. Do NOT block the UI generating all thumbnails at once. Show a loading placeholder for thumbnails not yet generated.
- **Regenerate on zoom:** when the user zooms in (see Zoom), regenerate thumbnails for the visible time range at higher density.

**Display:** thumbnails are rendered as a horizontal row of `<img>` or `<canvas>` elements inside a scrollable container. Each thumbnail has a fixed width and a height proportional to the video aspect ratio.

#### 3b. Keyframe Markers

Small tick marks or vertical lines overlaid on the filmstrip indicating keyframe positions. These are visually distinct (e.g., small orange/yellow triangles at the bottom edge of the filmstrip or thin vertical lines).

**Data source:** the keyframe timestamp array built during import.

**Purpose:** helps the user understand where clean stream-copy cuts can happen. When a trim handle is near a keyframe, it should snap to it (see Trim Handles).

#### 3c. Trim Handles (In/Out Points)

Two draggable handles on the timeline representing the trim in-point and out-point:

- **In handle:** left edge of the selected region. Draggable horizontally. Clamped to `[0, outPoint)`.
- **Out handle:** right edge of the selected region. Draggable horizontally. Clamped to `(inPoint, duration]`.
- **Visual style:** colored vertical bars or "ear" handles (like YouTube's trimmer) with a shaded region between them representing the kept portion. The region outside the in/out range should be dimmed/grayed out.

**Dragging behavior:**
- On drag, update the timecode display and seek the video preview to the handle's timestamp so the user sees the frame at the cut point.
- In "keyframe-snapped" mode (default): handles snap to the nearest keyframe position. Show a subtle snap animation or indicator.
- In "frame-accurate" mode: handles can be placed at any frame position (no snapping). Show a warning indicator that this will require re-encoding.

**Multiple trim segments (cut out middle):**
- Support a "split" or "add cut" action that adds an additional excluded region within the timeline.
- Internally, represent the trim as an array of `{ start, end }` keep-ranges rather than a single in/out pair.
- For MVP, support a single in/out range only. Document the data model for extensibility to multiple ranges in V2.

#### 3d. Playhead

A thin vertical line indicating the current playback position. Moves during playback (synced to `video.currentTime`). Draggable to seek.

#### 3e. Zoom

- A zoom slider or +/- buttons that control the time range visible in the filmstrip.
- Default: full duration visible.
- Zooming in expands a time range centered on the playhead, showing more detail (and regenerating thumbnails at higher density).
- Horizontal scroll (or drag on the filmstrip background) to pan when zoomed in.
- Display time labels along the bottom edge of the timeline (e.g., every N seconds, adjusted to zoom level).

### 4. Trim Controls (`<vt-trim-controls>`)

A control bar near the timeline with:

**Trim Mode Toggle:**
- **Keyframe-snapped (default):** fast, no re-encoding. Cuts happen at the nearest keyframe. Label: "Fast trim (keyframe)" with a description: "Near-instant. Cuts at nearest keyframe. No quality loss."
- **Frame-accurate:** requires re-encoding. Cuts happen at the exact frame. Label: "Precise trim (re-encode)" with a description: "Slower. Cuts at exact frame. Re-encodes video."

When switching modes, update the trim handle snapping behavior and recalculate the effective cut points. If going from frame-accurate to keyframe-snapped, snap the current handles to the nearest keyframes.

**Frame Stepping:**
- Left arrow button (or keyboard left arrow): step backward one frame. Calculate frame duration as `1_000_000 / fps` microseconds and subtract from current position.
- Right arrow button (or keyboard right arrow): step forward one frame.
- When stepping, switch the preview to canvas mode and decode the exact frame via Mediabunny.
- Display the current frame number alongside the timecode.

**Timecode Displays:**
- In-point timecode (editable — user can type an exact time).
- Out-point timecode (editable).
- Selection duration (calculated: out - in).
- Format: `HH:MM:SS.mmm` (hours, minutes, seconds, milliseconds).

**Keyboard Shortcuts:**
- `Space` — play/pause.
- `Left/Right Arrow` — step one frame back/forward.
- `I` — set in-point to current playhead position.
- `O` — set out-point to current playhead position.
- `Home` — seek to start.
- `End` — seek to end.
- `[` — seek to in-point.
- `]` — seek to out-point.

### 5. Format Conversion (`<vt-convert-panel>`)

A panel (collapsible section or tab) for output format settings:

**Output Container Format:**
- Dropdown: MP4, WebM, MKV, MOV.
- Default: same as input format.

**Output Video Codec:**
- Dropdown, filtered to codecs compatible with the selected container:
  - MP4: H.264 (AVC), H.265 (HEVC), AV1, VP9.
  - WebM: VP8, VP9, AV1.
  - MKV: H.264, H.265, VP8, VP9, AV1.
  - MOV: H.264, H.265, AV1.
- Default: "Same as source" (stream copy if container supports it; otherwise, the most common codec for the chosen container, e.g., H.264 for MP4).
- If "Same as source" is selected AND the source codec is compatible with the target container, this is a transmux (no re-encoding — fast). Indicate this to the user with a "Transmux (fast)" badge.
- If a different codec is selected or the source codec is incompatible, this is a transcode. Indicate with a "Transcode (slower)" badge and show estimated time if possible.

**Quality / Bitrate (only shown when transcoding):**
- Preset dropdown: "High", "Medium", "Low" (maps to Mediabunny's `QUALITY_HIGH`, `QUALITY_MEDIUM`, `QUALITY_LOW` or specific bitrate values).
- OR a manual bitrate input (in Mbps) for advanced users.

**Audio Codec:**
- Dropdown: "Same as source" (default), AAC, Opus, Vorbis.
- Filtered to container compatibility.
- For transmux operations, audio is always stream-copied. Only relevant when transcoding.

**Codec Availability Check:**
- On page load and when codec selection changes, use Mediabunny's utility functions to check if the browser can encode the selected codec.
- If a codec is not supported (e.g., the browser lacks a hardware encoder for HEVC), gray it out in the dropdown and show a tooltip: "Not supported in this browser."

### 6. Export (`<vt-export-panel>`)

**Export button:** prominent button labeled "Export" or "Save Trimmed Video". Disabled until a file is loaded.

**On export:**

1. Validate the trim range (in < out, duration > 0).
2. Determine the operation type:
   - **Trim-only, same format, stream copy:** use Mediabunny `Conversion` API with transmux mode. This is the fast path.
   - **Format conversion (with or without trim):** use Mediabunny `Conversion` API with appropriate output format and codec settings.
   - **Frame-accurate trim:** requires decode + re-encode; use Mediabunny `Conversion` with transcode mode.
3. Construct the Mediabunny pipeline:
   ```
   Input (BlobSource from file)
     → Conversion (with trim range, output format, codec settings)
       → Output (StreamTarget or BufferTarget)
   ```
4. **Output target:**
   - **Preferred:** use `window.showSaveFilePicker()` (File System Access API) to get a writable file handle, then wrap it in a Mediabunny `StreamTarget`. This streams output directly to disk without holding the entire file in memory. Ideal for large videos.
   - **Fallback:** if `showSaveFilePicker` is not available (Firefox, some Safari versions), use a `BufferTarget` to collect output in memory, then create a `Blob` and trigger a download via `URL.createObjectURL` + click on a temporary `<a>` element.
5. **Progress reporting:**
   - Show a progress bar during export. Mediabunny's Conversion API should provide progress callbacks or events (check docs — may need to estimate based on packets processed / total packets).
   - Display estimated time remaining if possible.
   - Show current operation: "Transmuxing..." or "Transcoding... (frame X of Y)".
6. **On completion:**
   - If using `showSaveFilePicker`, the file is already saved. Show a success message: "Video saved successfully."
   - If using fallback, present a "Download" button/link.
   - Show output file size and a summary of what was done (e.g., "Trimmed 2:30 → 1:15, MP4 H.264, 45 MB").

**Cancel:** provide a cancel button during export. Abort the Mediabunny conversion.

### 7. Info Panel (`<vt-info-panel>`)

A compact metadata display showing:
- File name, file size.
- Container format (e.g., "MP4 (ISOBMFF)").
- Video codec, resolution, frame rate, bitrate (if available).
- Audio codec, sample rate, channels, bitrate (if available).
- Total duration.
- Number of keyframes (and average keyframe interval).

This is read-only. Displayed as a small card or collapsible section above or beside the timeline.

---

## File & Directory Structure

```
video-trimmer/
├── index.html              # Page shell with component tags and script imports
├── styles.css              # Tool-specific styles
├── design-doc.md           # This document
├── package.json            # Dependencies (mediabunny)
├── lib/
│   └── mediabunny.esm.js   # Bundled Mediabunny (copied from node_modules at build time)
├── video-engine.js         # Mediabunny wrapper: init, metadata extraction, thumbnail
│                           #   generation, keyframe scanning, trim/convert execution.
│                           #   Provides a clean async API for the UI components.
├── components/
│   ├── vt-app.js           # Top-level orchestrator
│   ├── vt-file-drop.js     # File input
│   ├── vt-video-preview.js # Video playback + canvas overlay
│   ├── vt-timeline.js      # Filmstrip + handles + keyframe markers + playhead
│   ├── vt-trim-controls.js # Mode toggle, frame stepping, timecodes, keyboard shortcuts
│   ├── vt-convert-panel.js # Output format/codec selection
│   ├── vt-export-panel.js  # Export button, progress, download
│   └── vt-info-panel.js    # Input file metadata display
```

### `video-engine.js` — API Surface

This module wraps Mediabunny and exposes a clean interface for the UI. The UI components should NEVER import Mediabunny directly; they go through `video-engine.js`. This isolates the library dependency and makes it possible to swap engines later.

```js
// video-engine.js — public API (all methods are async)

class VideoEngine {
  /**
   * Load a video file. Returns metadata object.
   * @param {File} file
   * @returns {Promise<VideoMetadata>}
   * 
   * VideoMetadata shape:
   * {
   *   duration: number,           // microseconds
   *   videoCodec: string,         // e.g., "avc", "vp9", "av1"
   *   videoCodecFull: string,     // e.g., "avc1.640028"
   *   width: number,
   *   height: number,
   *   displayWidth: number,
   *   displayHeight: number,
   *   rotation: number,           // degrees (0, 90, 180, 270)
   *   frameRate: number,          // e.g., 29.97
   *   videoBitrate: number|null,  // bps, if available
   *   audioCodec: string|null,    // e.g., "aac", "opus", null if no audio
   *   audioSampleRate: number|null,
   *   audioChannels: number|null,
   *   audioBitrate: number|null,
   *   containerFormat: string,    // e.g., "mp4", "webm", "mkv"
   *   fileSize: number,           // bytes
   *   fileName: string,
   *   keyframes: number[],        // sorted array of keyframe timestamps (microseconds)
   *   keyframeCount: number,
   *   avgKeyframeInterval: number // microseconds
   * }
   */
  async loadFile(file) {}

  /**
   * Decode and return a single video frame at the given timestamp.
   * Caller MUST call frame.close() when done.
   * @param {number} timestampUs — microseconds
   * @returns {Promise<VideoFrame>}
   */
  async getFrame(timestampUs) {}

  /**
   * Generate a thumbnail image for the given timestamp.
   * Returns a data URL (JPEG) or ImageBitmap.
   * @param {number} timestampUs
   * @param {number} width — desired thumbnail width in pixels
   * @returns {Promise<string>} — data:image/jpeg;base64,...
   */
  async getThumbnail(timestampUs, width) {}

  /**
   * Check if a given output codec is encodable in this browser.
   * @param {string} codec — e.g., "avc", "hevc", "vp9", "av1"
   * @returns {Promise<boolean>}
   */
  async isCodecSupported(codec) {}

  /**
   * Get compatible codecs for a given container format.
   * @param {string} container — "mp4", "webm", "mkv", "mov"
   * @returns {{ video: string[], audio: string[] }}
   */
  getCompatibleCodecs(container) {}

  /**
   * Execute a trim and/or convert operation.
   * @param {TrimExportOptions} options
   * @param {function} onProgress — called with { percent: number, message: string }
   * @returns {Promise<ExportResult>}
   * 
   * TrimExportOptions shape:
   * {
   *   trimStart: number,         // microseconds
   *   trimEnd: number,           // microseconds
   *   outputFormat: string,      // "mp4", "webm", "mkv", "mov"
   *   videoCodec: string|"copy", // "avc", "vp9", "copy" (stream copy)
   *   audioCodec: string|"copy", // "aac", "opus", "copy"
   *   quality: string|number,    // "high", "medium", "low" or bitrate in bps
   *   fileHandle: FileSystemFileHandle|null // from showSaveFilePicker, or null for in-memory
   * }
   * 
   * ExportResult shape:
   * {
   *   blob: Blob|null,           // non-null if fileHandle was null (in-memory export)
   *   fileSize: number,          // bytes
   *   duration: number,          // microseconds of output
   *   transmuxed: boolean,       // true if no re-encoding was done
   * }
   */
  async exportVideo(options, onProgress) {}

  /**
   * Cancel an in-progress export.
   */
  cancelExport() {}

  /**
   * Release all resources (Mediabunny Input, decoded frames, etc.).
   */
  dispose() {}
}
```

---

## User Flow

### Happy Path: Quick Trim

1. User opens the video trimmer page.
2. Drops a video file onto the file drop zone.
3. Video loads: preview starts playing, filmstrip populates progressively, metadata appears in info panel.
4. User drags the in-handle to the right to trim the beginning. The filmstrip region outside the handle is dimmed. The preview seeks to the in-point frame.
5. User drags the out-handle to the left to trim the end.
6. (Optional) user presses arrow keys to fine-tune the cut points frame by frame.
7. Trim mode shows "Fast trim (keyframe)" by default. Handles are snapped to keyframes. User sees keyframe tick marks and is comfortable with the snap positions.
8. User clicks "Export". `showSaveFilePicker` opens (or falls back to in-memory). Progress bar shows "Transmuxing..." and completes in seconds.
9. File is saved. Success message with file size shown.

### Happy Path: Format Conversion + Trim

1. Steps 1–6 same as above.
2. User opens the Convert panel, changes output format from MP4 to WebM, codec to VP9.
3. UI shows "Transcode (slower)" badge. Quality preset defaults to "Medium".
4. User clicks "Export". Progress bar shows "Transcoding... frame X of Y" with estimated time.
5. Export completes. File is saved.

---

## Browser Compatibility

| Feature | Chrome 94+ | Firefox 130+ | Safari 16.4+ | Notes |
|---|---|---|---|---|
| Mediabunny demux/mux | ✅ | ✅ | ✅ | Pure TypeScript, no browser API dependency |
| WebCodecs VideoDecoder | ✅ | ✅ | ✅ | Needed for thumbnails + frame stepping |
| WebCodecs VideoEncoder | ✅ | ✅ | ⚠️ Partial | Needed only for transcode/frame-accurate trim |
| WebCodecs AudioDecoder | ✅ | ✅ | ⚠️ TP only | Needed only for transcode |
| SharedArrayBuffer | ✅ | ✅ | ✅ | Requires COOP/COEP headers |
| File System Access API | ✅ | ❌ | ❌ | Fallback to Blob download |
| `<video>` + object URL | ✅ | ✅ | ✅ | Universal |

**Degradation strategy:**

- If WebCodecs VideoDecoder is unavailable: fall back to using the native `<video>` element for thumbnail generation (seek + draw to canvas). Thumbnails will snap to keyframes and may be less accurate, but functional.
- If WebCodecs VideoEncoder is unavailable: disable "Precise trim (re-encode)" mode and frame-accurate trim. Only offer keyframe-snapped stream-copy. Disable codec conversion to codecs that require encoding.
- If File System Access API is unavailable: use in-memory `BufferTarget` + Blob download. Warn user for very large files (> 500 MB) that memory may be insufficient.
- Check capabilities on page load using Mediabunny's `isConfigSupported` checks and `typeof window.showSaveFilePicker`. Gray out unsupported options.

**Known Firefox quirks:** Firefox's H.264 VideoDecoder has bugs with certain codec strings (e.g., rejecting valid `avc1.*` strings that Chrome accepts). If a decode fails, retry with a simplified codec string. If all attempts fail, fall back to native `<video>` element seeking for that specific file.

---

## Performance Considerations

### Large Files (> 1 GB)

- **Preview:** the native `<video>` element handles large files well since it streams from the object URL (backed by the `File` on disk). No memory concern.
- **Thumbnail generation:** only a handful of frames are decoded at any time. Each `VideoFrame` is drawn to canvas and closed immediately. Memory footprint is minimal.
- **Keyframe scanning:** iterating all packets to find keyframes could be slow for very long videos (hours). Do this in a non-blocking async loop. Show a "Scanning keyframes..." indicator. If the video has > 10,000 keyframes, consider only scanning the visible portion at first and expanding lazily.
- **Export (stream copy):** Mediabunny reads and writes packets without decoding. Memory usage is proportional to packet buffer size, not file size. With `StreamTarget` (File System Access API), output goes directly to disk.
- **Export (transcode):** memory usage is proportional to frame size × pipeline depth. For 4K video this can be significant. Mediabunny's pipelined design with backpressure should keep this bounded, but monitor and warn if memory usage appears excessive.

### Bundle Size

- Import only what is needed from Mediabunny. For this tool's feature set, approximate treeshaken sizes:
  - Reading all formats: ~30 kB gzipped.
  - Writing MP4 + WebM + MKV: ~25 kB gzipped.
  - Total Mediabunny contribution: ~50-70 kB gzipped (far smaller than FFmpeg WASM's 25+ MB).

---

## Error Handling

- **Unsupported file format:** "This video format is not supported. Try MP4, WebM, MKV, or MOV."
- **Corrupt file / parse failure:** "Could not read this video file. It may be corrupt or use an unsupported codec."
- **Codec not available for encoding:** "Your browser does not support encoding [codec]. Try a different output codec, or use Chrome for the widest codec support."
- **Export failure (out of memory):** "Export failed — the file may be too large for in-memory processing. Try using Chrome (which supports direct file saving) or export a shorter segment."
- **Export cancelled:** "Export cancelled." Clean up partial output.
- **WebCodecs not available at all:** show a banner: "Your browser does not support the required video APIs. Please use a recent version of Chrome, Firefox, or Safari."

All errors should be user-friendly (no technical jargon), displayed in a status/toast area, and non-destructive (the user's trim selection and settings are preserved).

---

## Styling

- Use `global.css` variables for colors, fonts, borders (`--primary-color`, `--text-primary`, `--text-secondary`, `--panel-bg`, `--border-color`, etc.).
- Match the overall OToolebox aesthetic: clean, minimal, dark/light theme support via existing theme toggle.
- Timeline-specific colors:
  - Filmstrip background: `var(--panel-bg)`.
  - Trim region (kept): no overlay.
  - Trim region (excluded): dimmed with a semi-transparent dark overlay.
  - In/out handles: `var(--primary-color)` with a slightly larger hit area for dragging.
  - Keyframe markers: subtle accent color, small (2-3px wide ticks).
  - Playhead: thin white/bright line.
- Progress bar: `var(--primary-color)` fill on `var(--border-color)` background.
- Use CSS `cursor: col-resize` on trim handles, `cursor: pointer` on the filmstrip (for seeking).

---

## Testing Plan

- **Manual testing with sample files:** test with a variety of files:
  - Short MP4 (H.264 + AAC, 10 seconds).
  - Long MP4 (H.264 + AAC, > 1 hour).
  - WebM (VP9 + Opus).
  - MKV (H.265 + AAC).
  - MOV (H.264, from iPhone — has rotation metadata).
  - Variable frame rate video (common from screen recordings).
  - Audio-only file (should be rejected or handled gracefully — show error that this is a video trimmer).
  - Corrupt / truncated file.
- **Cross-browser:** Chrome, Firefox, Safari. Verify degradation (no crash, features gracefully disabled).
- **Large file test:** 2+ GB file. Verify no memory crash on load, thumbnail generation, and export (with File System Access API).
- **Export accuracy:** trim a known video, verify output starts and ends at the expected frames. Compare stream-copy output with a reference tool (e.g., FFmpeg CLI) to ensure no corruption.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Mediabunny is relatively new; may have edge-case bugs with certain files | Test broadly; file issues upstream; implement try-catch wrappers with fallback to native `<video>` for preview features |
| Firefox WebCodecs H.264 bugs | Detect and fall back to native `<video>` seeking; show a notice if encoding is affected |
| Very large files exceed browser memory on Blob-download fallback | Detect `showSaveFilePicker` support; warn user if unavailable and file is large; suggest Chrome |
| Variable frame rate videos break frame-stepping math | Use actual packet timestamps from Mediabunny instead of calculating from a fixed frame rate; display frame number as packet index rather than `time * fps` |
| User confusion about keyframe-snapped vs frame-accurate cuts | Clear labeling with descriptions; show the actual cut frame in the preview; display the time difference between requested and actual (snapped) cut point |
| Mediabunny's API or module structure changes | Pin the version in package.json; vendor the built file in lib/ |

---

## Milestones

### MVP (V1)

- File import (drag-and-drop + file picker).
- Video preview with native `<video>` playback and custom play/pause.
- Info panel with metadata.
- Timeline with filmstrip thumbnails (generated from native `<video>` element seeking as a simpler starting point — Mediabunny thumbnail decoding can be added in V1.1).
- Single in/out trim handles with keyframe snapping.
- Keyframe markers on timeline.
- Timecode displays.
- Stream-copy trim export (fast, keyframe-snapped only).
- Same-format output only (no conversion).
- Blob download fallback.

### V1.1

- Mediabunny-powered thumbnail generation (replacing `<video>` seek method).
- Frame-by-frame stepping with canvas overlay.
- Frame-accurate trim mode (with re-encoding).
- Keyboard shortcuts.

### V2

- Format conversion (container + codec selection).
- Quality presets.
- File System Access API for streaming large exports.
- Codec availability detection with UI feedback.
- Timeline zoom.
- Editable timecodes (type-in exact timestamps).

### V3

- Multiple trim segments (cut out middle sections).
- Undo/redo for trim handle changes.
- Thumbnail caching (avoid regeneration on zoom-out).
- Estimated export time.

---

## Appendix: Mediabunny Quick Reference

### Installation

```bash
cd video-trimmer
npm init -y
npm install mediabunny
```

### Build Step (add to root package.json `build` script)

```bash
cd video-trimmer && npm install && mkdir -p lib && cp node_modules/mediabunny/dist/mediabunny.esm.js lib/
```

Note: the exact dist path may vary — check the Mediabunny package for the correct ESM bundle path. If Mediabunny does not ship a single-file ESM bundle, use a bundler (esbuild) to create one from the entry point, tree-shaking unused formats.

### Key Mediabunny Imports

```js
import {
  Input, Output, Conversion,
  BlobSource, StreamTarget, BufferTarget,
  Mp4OutputFormat, WebMOutputFormat, MatroskaOutputFormat,
  // Format readers (tree-shake by importing only what's needed)
  ALL_FORMATS,
  // Quality constants
  QUALITY_HIGH, QUALITY_MEDIUM, QUALITY_LOW,
  // For thumbnail/frame decoding
  VideoSampleSink,
} from './lib/mediabunny.esm.js';
```

### Trim via Conversion API (Conceptual)

```js
// Stream-copy trim (fast, keyframe-snapped)
const input = new Input({
  source: new BlobSource(file),
  formats: ALL_FORMATS,
});

const output = new Output({
  format: new Mp4OutputFormat(),
  target: new BufferTarget(),
});

const conversion = await Conversion.init({
  input,
  output,
  // Trim options — check Mediabunny docs for exact API
  // This is conceptual; actual API may differ:
  trim: { start: trimStartUs, end: trimEndUs },
});

await conversion.execute();
const resultBlob = new Blob([output.target.buffer], { type: 'video/mp4' });
```

**IMPORTANT:** the exact Mediabunny Conversion API for trim ranges should be verified against the current Mediabunny documentation at https://mediabunny.dev/guide/converting-media-files before implementation. The API shown above is illustrative. The implementer MUST read the Mediabunny docs to get the correct method signatures, especially for trim/seek options, progress reporting, and cancellation.

### tools.json Entry

Add this entry to the root `tools.json`:

```json
{
  "name": "Video Trimmer",
  "description": "Trim and convert videos directly in your browser. Visual timeline with frame-by-frame precision, keyframe indicators, and format conversion. All processing happens locally — no data is sent to any server.",
  "path": "/video-trimmer/",
  "status": "active",
  "poweredBy": [
    {
      "name": "Mediabunny",
      "url": "https://mediabunny.dev/"
    }
  ],
  "heroExtra": "<p style=\"font-size: 0.95rem; font-weight: 500; color: var(--text-primary); margin-top: 1rem;\">Desktop or wide-screen tablet recommended for best editing experience.</p>"
}
```

### _headers Additions (Cloudflare Pages)

```
# SharedArrayBuffer support for video-trimmer (WebCodecs)
/video-trimmer/*
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: cross-origin
```

### dev-server.js Additions

Add `pathname.startsWith('/video-trimmer')` to the existing condition that sets COEP/COOP headers:

```js
if (pathname.startsWith('/image-editor') || pathname.startsWith('/video-trimmer') || pathname.startsWith('/node_modules')) {
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
}
```
