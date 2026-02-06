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
    this.state = { file: null, metadata: null, trimStart: 0, trimEnd: 0, playhead: 0 };

    this.innerHTML = `
      <div class="vt-layout">
        <div>
          <vt-file-drop></vt-file-drop>
          <vt-info-panel></vt-info-panel>
        </div>
        <div>
          <vt-video-preview></vt-video-preview>
          <vt-timeline></vt-timeline>
          <vt-trim-controls></vt-trim-controls>
          <vt-export-panel></vt-export-panel>
        </div>
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
  }

  async #onFileSelected(file) {
    this.fileDrop.setStatus('Loading video...');
    try {
      const metadata = await this.engine.loadFile(file);
      this.state = {
        ...this.state,
        file,
        metadata,
        trimStart: 0,
        trimEnd: metadata.duration,
        playhead: 0,
      };
      this.preview.setFile(file);
      this.infoPanel.setMetadata(metadata);
      this.exportPanel.setReady(true);
      this.fileDrop.setStatus('Video loaded.');
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

  #updateTrim({ target, timestampUs }) {
    if (!this.state.metadata) return;
    const snapped = this.engine.snapToKeyframe(timestampUs);
    if (target === 'in') {
      this.state.trimStart = Math.min(snapped, this.state.trimEnd - 1000);
      this.preview.seekTo(this.state.trimStart);
    } else {
      this.state.trimEnd = Math.max(snapped, this.state.trimStart + 1000);
      this.preview.seekTo(this.state.trimEnd);
    }
    this.#refresh();
  }

  async #exportTrim() {
    if (!this.state.file || !this.state.metadata) return;
    this.exportPanel.setExporting(true);
    this.exportPanel.setProgress(0, 'Preparing export...');

    try {
      const ext = this.state.file.name.split('.').pop().toLowerCase();
      const result = await this.engine.exportVideo({
        trimStart: this.state.trimStart,
        trimEnd: this.state.trimEnd,
        outputFormat: ext,
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
    this.timeline.setData({
      duration: this.state.metadata.duration,
      trimStart: this.state.trimStart,
      trimEnd: this.state.trimEnd,
      playhead: this.state.playhead,
      keyframes: this.state.metadata.keyframes,
    });
    this.trimControls.updateTimes(this.state.trimStart, this.state.trimEnd);
  }
}

customElements.define('vt-app', VTApp);
