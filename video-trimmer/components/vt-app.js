import { videoAppMarkup } from '../initial-markup.mjs';
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

    if (!this.querySelector('.vt-layout')) this.innerHTML = videoAppMarkup();

    this.fileDrop = this.querySelector('vt-file-drop');
    this.infoPanel = this.querySelector('vt-info-panel');
    this.preview = this.querySelector('vt-video-preview');
    this.timeline = this.querySelector('vt-timeline');
    this.convertPanel = this.querySelector('vt-convert-panel');
    this.trimControls = this.querySelector('vt-trim-controls');
    this.exportPanel = this.querySelector('vt-export-panel');
    customElements.whenDefined('vt-convert-panel').then(() => {
      if (this.convertPanel?.setEngine) {
        this.convertPanel.setEngine(this.engine);
      }
      if (this.state?.metadata && this.convertPanel?.setMetadata) {
        this.convertPanel.setMetadata(this.state.metadata);
      }
    });

    this.addEventListener('vt-file-selected', (event) => this.#onFileSelected(event.detail.file));
    this.addEventListener('vt-playhead-change', (event) => this.#setPlayhead(event.detail.currentTimeUs));
    this.addEventListener('vt-seek-request', (event) => {
      this.#setPlayhead(event.detail.timestampUs);
      this.preview.seekTo(event.detail.timestampUs);
    });
    this.addEventListener('vt-trim-change-request', (event) => this.#updateTrim(event.detail));
    this.addEventListener('vt-export-request', () => this.#exportTrim());
    this.addEventListener('vt-export-cancel', () => this.engine.cancelExport());
    this.addEventListener('vt-convert-change', () => this.#refreshExportOperation());
    this.addEventListener('vt-timecode-edit', (event) => this.#onTimecodeEdit(event.detail));
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
      this.exportPanel.setWarning('');
      this.fileDrop.setStatus('Video loaded.');
      this.classList.remove('is-empty');
      this.classList.add('is-ready');
      if (this.convertPanel?.setMetadata) {
        this.convertPanel.setMetadata(metadata);
      }
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
    this.timeline.setPlayhead(this.state.playhead);
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
    const convert = this.convertPanel?.getValue ? this.convertPanel.getValue() : {
      outputFormat: 'mp4',
      videoCodec: 'copy',
      audioCodec: 'copy',
      quality: 'medium',
      operation: 'transmux',
    };
    const segments = this.#normalizedSegments();
    const trimForcesTranscode = segments.length > 1 || !this.#segmentsOnKeyframes(segments);
    const operation = trimForcesTranscode || convert.operation === 'transcode' ? 'transcode' : 'transmux';
    const suggestedExt = convert.outputFormat;
    const suggestedName = this.#suggestedOutputName(this.state.file.name, suggestedExt);
    const supportsPicker = typeof window.showSaveFilePicker === 'function';
    let fileHandle = null;

    if (!supportsPicker && this.state.metadata.fileSize > 500 * 1024 * 1024) {
      this.exportPanel.setWarning('Your browser does not support direct file saving. For very large files, consider using Chrome.');
    } else {
      this.exportPanel.setWarning('');
    }

    if (supportsPicker) {
      try {
        fileHandle = await window.showSaveFilePicker({
          suggestedName,
          types: [this.#fileTypeForFormat(suggestedExt)],
          excludeAcceptAllOption: false,
        });
      } catch (error) {
        if (error?.name === 'AbortError') {
          this.exportPanel.setProgress(0, 'Export canceled.', false);
          return;
        }
        this.exportPanel.setProgress(0, error?.message || 'Could not open save dialog.', false);
        return;
      }
    }

    this.exportPanel.setExporting(true);
    this.exportPanel.setOperationBadge(operation);
    this.exportPanel.hideDownload();
    this.exportPanel.setProgress(null, 'Exporting video…', true);

    try {
      const result = await this.engine.exportVideo({
        segments,
        outputFormat: convert.outputFormat,
        videoCodec: convert.videoCodec,
        audioCodec: convert.audioCodec,
        quality: convert.quality,
        fileHandle,
        forceTranscode: trimForcesTranscode,
      }, ({ percent, message, indeterminate }) => this.exportPanel.setProgress(percent, message, indeterminate));

      if (fileHandle) {
        this.exportPanel.setProgress(100, `Video saved. Output size ${(result.fileSize / (1024 * 1024)).toFixed(2)} MB`, false);
      } else {
        this.exportPanel.setProgress(100, `Your file is ready to download. Output size ${(result.fileSize / (1024 * 1024)).toFixed(2)} MB`, false);
        this.exportPanel.showDownload(result.blob, suggestedName);
      }
    } catch (error) {
      this.exportPanel.setProgress(0, error.message || 'Export failed.', false);
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
    this.#refreshExportOperation();
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

  #onTimecodeEdit({ edge, timestampUs, segmentIndex }) {
    if (!this.state.metadata) return;
    const segments = this.#normalizedSegments();
    const index = Number.isInteger(segmentIndex) ? segmentIndex : 0;
    const seg = segments[index];
    if (!seg) {
      this.trimControls.rejectTimecode(edge, index);
      return;
    }

    if (!Number.isFinite(timestampUs) || timestampUs < 0 || timestampUs > this.state.metadata.duration) {
      this.trimControls.rejectTimecode(edge, index);
      return;
    }

    const minSegment = 1000;
    const prev = index > 0 ? segments[index - 1] : null;
    const next = index < segments.length - 1 ? segments[index + 1] : null;
    if (edge === 'start') {
      const min = prev ? prev.end : 0;
      const max = seg.end - minSegment;
      if (timestampUs < min || timestampUs > max) {
        this.trimControls.rejectTimecode(edge, index);
        return;
      }
      this.#updateTrim({ target: `seg-${index}-start`, timestampUs, fine: true });
      return;
    }
    const min = seg.start + minSegment;
    const max = next ? next.start : this.state.metadata.duration;
    if (timestampUs < min || timestampUs > max) {
      this.trimControls.rejectTimecode(edge, index);
      return;
    }
    this.#updateTrim({ target: `seg-${index}-end`, timestampUs, fine: true });
  }

  #refreshExportOperation() {
    if (!this.state.metadata) return;
    const convert = this.convertPanel?.getValue ? this.convertPanel.getValue() : { operation: 'transmux' };
    const segments = this.#normalizedSegments();
    const trimForcesTranscode = segments.length > 1 || !this.#segmentsOnKeyframes(segments);
    const operation = trimForcesTranscode || convert.operation === 'transcode' ? 'transcode' : 'transmux';
    this.exportPanel.setOperationBadge(operation);
  }

  #parseHandle(target) {
    const match = /seg-(\d+)-(start|end)/.exec(target || '');
    if (!match) return { index: 0, edge: 'end' };
    return { index: Number(match[1]), edge: match[2] };
  }

  #suggestedOutputName(inputName, ext) {
    const base = String(inputName || 'video').replace(/\.[^.]+$/, '');
    return `trimmed_${base}.${ext}`;
  }

  #fileTypeForFormat(format) {
    const normalized = String(format || 'mp4').toLowerCase();
    if (normalized === 'webm') {
      return { description: 'WebM Video', accept: { 'video/webm': ['.webm'] } };
    }
    if (normalized === 'mkv') {
      return { description: 'MKV Video', accept: { 'video/x-matroska': ['.mkv'] } };
    }
    if (normalized === 'mov') {
      return { description: 'MOV Video', accept: { 'video/quicktime': ['.mov'] } };
    }
    return { description: 'MP4 Video', accept: { 'video/mp4': ['.mp4'] } };
  }
}

customElements.define('vt-app', VTApp);
