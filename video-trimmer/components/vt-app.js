import { VideoEngine } from '../video-engine.js';

window.formatTimecode = function formatTimecode(timestampUs) {
  const totalMs = Math.max(0, Math.round(timestampUs / 1000));
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const millis = totalMs % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
};

class VTApp extends HTMLElement {
  connectedCallback() {
    this.engine = new VideoEngine();
    this.state = { file: null, metadata: null, segments: [], playhead: 0 };
    this.classList.add('vt-app', 'is-empty');

    this.innerHTML = `
      <div class="vt-layout">
        <section class="vt-sidebar">
          <vt-file-drop></vt-file-drop>
          <vt-info-panel></vt-info-panel>
        </section>
        <section class="vt-editor">
          <vt-video-preview></vt-video-preview>
          <vt-timeline></vt-timeline>
          <vt-trim-controls></vt-trim-controls>
          <vt-export-panel></vt-export-panel>
        </section>
      </div>
    `;

    this.fileDrop = this.querySelector('vt-file-drop');
    this.infoPanel = this.querySelector('vt-info-panel');
    this.preview = this.querySelector('vt-video-preview');
    this.timeline = this.querySelector('vt-timeline');
    this.trimControls = this.querySelector('vt-trim-controls');
    this.exportPanel = this.querySelector('vt-export-panel');

    this.addEventListener('vt-file-selected', (event) => this.#onFileSelected(event.detail.file));
    this.addEventListener('vt-playhead-change', (event) => this.#setPlayhead(event.detail.currentTimeUs));
    this.addEventListener('vt-seek-request', (event) => {
      this.#setPlayhead(event.detail.timestampUs);
      this.preview.seekTo(event.detail.timestampUs);
    });
    this.addEventListener('vt-trim-change-request', (event) => this.#updateTrim(event.detail));
    this.addEventListener('vt-export-request', () => this.#exportTrim());
    this.addEventListener('vt-export-cancel', () => this.engine.cancelExport());
    this.addEventListener('vt-split-request', () => this.#splitAtPlayhead());
    this.addEventListener('vt-clear-split', () => this.#clearSplit());
    this.addEventListener('vt-handle-activate', (event) => {
      this.activeHandle = event.detail.target;
      this.trimControls.setActiveHandleLabel(this.#labelForHandle(this.activeHandle));
    });
    this.addEventListener('vt-nudge-request', (event) => this.#nudgeHandle(event.detail));
    this.addEventListener('vt-playhead-nudge', (event) => this.#nudgePlayhead(event.detail));
    this.addEventListener('vt-snap-to-playhead', () => this.#snapTrimToPlayhead());
  }

  async #onFileSelected(file) {
    this.fileDrop.setStatus('Loading video...');
    try {
      const metadata = await this.engine.loadFile(file);
      this.state = {
        ...this.state,
        file,
        metadata,
        segments: [{ start: 0, end: metadata.duration }],
        playhead: 0,
      };
      this.activeHandle = 'seg-0-end';
      this.preview.setFile(file);
      this.infoPanel.setMetadata(metadata);
      this.exportPanel.setReady(true);
      this.fileDrop.setStatus('Video loaded.');
      this.classList.remove('is-empty');
      this.classList.add('is-ready');
      this.trimControls.setActiveHandleLabel(this.#labelForHandle(this.activeHandle || 'seg-0-end'));
      this.#refresh();
      this.#generateThumbnails();
    } catch (error) {
      this.fileDrop.setStatus(error.message || 'Could not load video file.', true);
    }
  }

  async #generateThumbnails() {
    const { duration } = this.state.metadata;
    const count = 10;
    const thumbs = [];
    for (let i = 0; i < count; i += 1) {
      const timestamp = Math.round((i / (count - 1)) * duration);
      thumbs.push(await this.engine.getThumbnail(timestamp, 140));
    }
    this.timeline.setThumbnails(thumbs);
  }

  #setPlayhead(currentTimeUs) {
    if (!this.state.metadata) return;
    this.state.playhead = Math.max(0, Math.min(this.state.metadata.duration, currentTimeUs));
    this.#refresh();
  }

  #updateTrim({ target, timestampUs, fine }) {
    if (!this.state.metadata) return;
    const snapped = fine ? timestampUs : this.engine.snapToKeyframe(timestampUs);
    const minSegment = 1000;
    const segments = this.#normalizedSegments();
    const { index, edge } = this.#parseHandle(target);
    const seg = segments[index];
    if (!seg) return;
    const prev = index > 0 ? segments[index - 1] : null;
    const next = index < segments.length - 1 ? segments[index + 1] : null;
    if (edge === 'start') {
      const min = prev ? prev.end : 0;
      const max = seg.end - minSegment;
      seg.start = Math.max(min, Math.min(snapped, max));
      this.preview.seekTo(seg.start);
    } else {
      const min = seg.start + minSegment;
      const max = next ? next.start : this.state.metadata.duration;
      seg.end = Math.min(max, Math.max(snapped, min));
      this.preview.seekTo(seg.end);
    }
    this.state.segments = segments;
    this.#refresh();
  }

  async #exportTrim() {
    if (!this.state.file || !this.state.metadata) return;
    this.exportPanel.setExporting(true);
    this.exportPanel.setProgress(0, 'Preparing export...');

    try {
      const ext = this.state.file.name.split('.').pop().toLowerCase();
      const segments = this.#normalizedSegments();
      const forceTranscode = segments.length > 1 || !this.#segmentsOnKeyframes(segments);
      const result = await this.engine.exportVideo({
        segments,
        outputFormat: ext,
        forceTranscode,
      }, ({ percent, message }) => this.exportPanel.setProgress(percent, message));

      const name = this.state.file.name.replace(/(\.[^.]+)?$/, `_trimmed.$1`).replace('..', '.');
      this.exportPanel.setProgress(100, `Done. Output size ${(result.fileSize / (1024 * 1024)).toFixed(2)} MB`);
      this.exportPanel.showDownload(result.blob, name);
    } catch (error) {
      this.exportPanel.setProgress(0, error.message || 'Export failed.');
    } finally {
      this.exportPanel.setExporting(false);
    }
  }

  #refresh() {
    if (!this.state.metadata) return;
    const segments = this.#normalizedSegments();
    this.timeline.setData({
      duration: this.state.metadata.duration,
      segments,
      playhead: this.state.playhead,
      keyframes: this.state.metadata.keyframes,
      frameDurationUs: this.state.metadata.frameRate ? Math.round(window.VT_US_PER_SECOND / this.state.metadata.frameRate) : 33333,
    });
    this.timeline.setActiveHandle(this.activeHandle);
    this.trimControls.updateTimes(segments);
  }

  #nudgeHandle({ direction, mode }) {
    if (!this.state.metadata) return;
    const target = this.activeHandle || 'seg-0-end';
    const frameUs = this.state.metadata.frameRate
      ? Math.round(window.VT_US_PER_SECOND / this.state.metadata.frameRate)
      : 33333;
    let timestampUs = this.#getHandleTimestamp(target);
    if (mode === 'edge') {
      timestampUs = direction < 0 ? 0 : this.state.metadata.duration;
      this.#updateTrim({ target, timestampUs, fine: true });
      return;
    }
    if (mode === 'keyframe') {
      timestampUs = this.#nudgeToKeyframe(target, direction);
      this.#updateTrim({ target, timestampUs, fine: false });
      return;
    }
    timestampUs += direction * frameUs;
    this.#updateTrim({ target, timestampUs, fine: true });
  }

  #nudgePlayhead({ direction, mode }) {
    if (!this.state.metadata) return;
    const frameUs = this.state.metadata.frameRate
      ? Math.round(window.VT_US_PER_SECOND / this.state.metadata.frameRate)
      : 33333;
    let timestampUs = this.state.playhead;
    if (mode === 'edge') {
      timestampUs = direction < 0 ? 0 : this.state.metadata.duration;
    } else if (mode === 'keyframe') {
      const keyframes = this.state.metadata.keyframes || [];
      if (keyframes.length) {
        if (direction < 0) {
          for (let i = keyframes.length - 1; i >= 0; i -= 1) {
            if (keyframes[i] < timestampUs) {
              timestampUs = keyframes[i];
              break;
            }
          }
        } else {
          for (let i = 0; i < keyframes.length; i += 1) {
            if (keyframes[i] > timestampUs) {
              timestampUs = keyframes[i];
              break;
            }
          }
        }
      } else {
        timestampUs += direction * frameUs;
      }
    } else {
      timestampUs += direction * frameUs;
    }
    this.#setPlayhead(timestampUs);
    this.preview.seekTo(this.state.playhead);
  }

  #snapTrimToPlayhead() {
    if (!this.state.metadata) return;
    const target = this.activeHandle || 'seg-0-end';
    const timestampUs = this.state.playhead;
    this.#updateTrim({ target, timestampUs, fine: true });
  }

  #labelForHandle(handle) {
    const { index, edge } = this.#parseHandle(handle);
    const number = edge === 'start' ? index * 2 + 1 : index * 2 + 2;
    return String(number);
  }

  #getHandleTimestamp(target) {
    const { index, edge } = this.#parseHandle(target);
    const seg = this.state.segments[index];
    if (!seg) return 0;
    return edge === 'start' ? seg.start : seg.end;
  }

  #nudgeToKeyframe(target, direction) {
    const keyframes = this.state.metadata.keyframes || [];
    if (!keyframes.length) {
      const frameUs = this.state.metadata.frameRate
        ? Math.round(window.VT_US_PER_SECOND / this.state.metadata.frameRate)
        : 33333;
      return this.#getHandleTimestamp(target) + direction * frameUs;
    }
    const current = this.#getHandleTimestamp(target);
    if (direction < 0) {
      for (let i = keyframes.length - 1; i >= 0; i -= 1) {
        if (keyframes[i] < current) return keyframes[i];
      }
      return keyframes[0];
    }
    for (let i = 0; i < keyframes.length; i += 1) {
      if (keyframes[i] > current) return keyframes[i];
    }
    return keyframes[keyframes.length - 1];
  }

  #normalizedSegments() {
    if (!this.state.segments.length) return [{ start: 0, end: this.state.metadata.duration }];
    const segments = this.state.segments.map((seg) => ({
      start: Math.max(0, Math.min(this.state.metadata.duration, seg.start)),
      end: Math.max(0, Math.min(this.state.metadata.duration, seg.end)),
    })).sort((a, b) => a.start - b.start);
    return segments;
  }

  #segmentsOnKeyframes(segments) {
    const keys = new Set(this.state.metadata.keyframes || []);
    return segments.every((seg) => keys.has(seg.start) && keys.has(seg.end));
  }

  #splitAtPlayhead() {
    if (!this.state.metadata || !this.state.segments.length) return;
    const segments = this.#normalizedSegments();
    const minGap = 1000;
    const splitPoint = this.state.playhead;
    const index = segments.findIndex((seg) => splitPoint > seg.start + minGap && splitPoint < seg.end - minGap);
    if (index === -1) {
      this.fileDrop.setStatus('Split point is too close to the current trim edge.', true);
      return;
    }
    const seg = segments[index];
    segments.splice(index, 1, { start: seg.start, end: splitPoint }, { start: splitPoint, end: seg.end });
    this.state.segments = segments;
    this.activeHandle = `seg-${index}-end`;
    this.trimControls.setActiveHandleLabel(this.#labelForHandle(this.activeHandle));
    this.fileDrop.setStatus('Split created.');
    this.#refresh();
  }

  #clearSplit() {
    if (!this.state.metadata || this.state.segments.length <= 1) return;
    const segments = this.#normalizedSegments();
    this.state.segments = [{ start: segments[0].start, end: segments[segments.length - 1].end }];
    this.activeHandle = 'seg-0-end';
    this.trimControls.setActiveHandleLabel(this.#labelForHandle(this.activeHandle));
    this.fileDrop.setStatus('Split cleared.');
    this.#refresh();
  }

  #parseHandle(target) {
    const match = /seg-(\d+)-(start|end)/.exec(target || '');
    if (!match) return { index: 0, edge: 'end' };
    return { index: Number(match[1]), edge: match[2] };
  }
}

customElements.define('vt-app', VTApp);
