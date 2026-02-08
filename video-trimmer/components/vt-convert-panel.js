const CONTAINERS = ['mp4', 'webm', 'mkv', 'mov'];

const VIDEO_CODEC_LABELS = {
  avc: 'H.264 (AVC)',
  hevc: 'H.265 (HEVC)',
  av1: 'AV1',
  vp9: 'VP9',
  vp8: 'VP8',
};

const AUDIO_CODEC_LABELS = {
  aac: 'AAC',
  opus: 'Opus',
  vorbis: 'Vorbis',
};

function normalizeContainer(container) {
  const value = String(container || '').toLowerCase();
  return CONTAINERS.includes(value) ? value : 'mp4';
}

class VTConvertPanel extends HTMLElement {
  connectedCallback() {
    this.engine = null;
    this.metadata = null;
    this.codecSupport = new Map();
    this.state = {
      outputFormat: 'mp4',
      videoCodec: 'copy',
      audioCodec: 'copy',
      quality: 'medium',
    };

    this.innerHTML = `
      <details class="vt-panel vt-convert" open>
        <summary>
          <span>Format Conversion</span>
          <span id="modeBadge" class="vt-pill vt-pill-transmux">Transmux (fast)</span>
        </summary>
        <div class="vt-convert-grid">
          <label class="vt-field">
            <span>Output container</span>
            <select id="containerSelect">
              <option value="mp4">MP4</option>
              <option value="webm">WebM</option>
              <option value="mkv">MKV</option>
              <option value="mov">MOV</option>
            </select>
          </label>

          <label class="vt-field">
            <span>Output video codec</span>
            <select id="videoCodecSelect"></select>
          </label>

          <label class="vt-field">
            <span>Output audio codec</span>
            <select id="audioCodecSelect"></select>
          </label>

          <label id="qualityField" class="vt-field" hidden>
            <span>Quality preset</span>
            <select id="qualitySelect">
              <option value="high">High</option>
              <option value="medium" selected>Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
        </div>
        <p id="convertHint" class="muted"></p>
      </details>
    `;

    this.containerSelect = this.querySelector('#containerSelect');
    this.videoCodecSelect = this.querySelector('#videoCodecSelect');
    this.audioCodecSelect = this.querySelector('#audioCodecSelect');
    this.qualitySelect = this.querySelector('#qualitySelect');
    this.qualityField = this.querySelector('#qualityField');
    this.modeBadge = this.querySelector('#modeBadge');
    this.hint = this.querySelector('#convertHint');

    this.containerSelect.addEventListener('change', () => {
      this.state.outputFormat = this.containerSelect.value;
      this.#ensureSelections();
      this.#renderCodecSelects();
      this.#sync();
    });

    this.videoCodecSelect.addEventListener('change', () => {
      this.state.videoCodec = this.videoCodecSelect.value;
      this.#sync();
    });

    this.audioCodecSelect.addEventListener('change', () => {
      this.state.audioCodec = this.audioCodecSelect.value;
      this.#sync();
    });

    this.qualitySelect.addEventListener('change', () => {
      this.state.quality = this.qualitySelect.value;
      this.#sync();
    });

    this.#renderCodecSelects();
    this.#sync();
  }

  setEngine(engine) {
    this.engine = engine;
    this.#refreshSupport();
  }

  setMetadata(metadata) {
    this.metadata = metadata;
    this.state.outputFormat = normalizeContainer(metadata?.containerFormat);
    this.state.videoCodec = 'copy';
    this.state.audioCodec = 'copy';
    this.state.quality = 'medium';
    if (this.containerSelect) {
      this.containerSelect.value = this.state.outputFormat;
    }
    this.#renderCodecSelects();
    this.#refreshSupport();
    this.#sync();
  }

  getValue() {
    return {
      outputFormat: this.state.outputFormat,
      videoCodec: this.state.videoCodec,
      audioCodec: this.state.audioCodec,
      quality: this.state.quality,
      operation: this.#operation(),
    };
  }

  async #refreshSupport() {
    if (!this.engine) return;
    const checks = ['avc', 'hevc', 'av1', 'vp9', 'vp8', 'aac', 'opus', 'vorbis'];
    await Promise.all(checks.map(async (codec) => {
      if (this.codecSupport.has(codec)) return;
      const supported = await this.engine.isCodecSupported(codec);
      this.codecSupport.set(codec, supported);
    }));
    this.#renderCodecSelects();
    this.#sync();
  }

  #renderCodecSelects() {
    if (!this.videoCodecSelect || !this.audioCodecSelect) return;
    const compatible = this.#compatible();

    this.videoCodecSelect.innerHTML = [
      '<option value="copy">Same as source (copy)</option>',
      ...compatible.video.map((codec) => this.#codecOption(codec, VIDEO_CODEC_LABELS[codec] || codec.toUpperCase())),
    ].join('');

    this.audioCodecSelect.innerHTML = [
      '<option value="copy">Same as source (copy)</option>',
      ...compatible.audio.map((codec) => this.#codecOption(codec, AUDIO_CODEC_LABELS[codec] || codec.toUpperCase())),
    ].join('');

    this.#ensureSelections();

    this.videoCodecSelect.value = this.state.videoCodec;
    this.audioCodecSelect.value = this.state.audioCodec;
  }

  #codecOption(codec, label) {
    const support = this.codecSupport.get(codec);
    if (support === false) {
      return `<option value="${codec}" disabled title="Not supported in this browser.">${label} (Not supported)</option>`;
    }
    return `<option value="${codec}">${label}</option>`;
  }

  #compatible() {
    if (!this.engine) {
      return { video: ['avc', 'hevc', 'av1', 'vp9'], audio: ['aac'] };
    }
    return this.engine.getCompatibleCodecs(this.state.outputFormat);
  }

  #ensureSelections() {
    const compatible = this.#compatible();
    if (this.state.videoCodec !== 'copy' && !compatible.video.includes(this.state.videoCodec)) {
      this.state.videoCodec = 'copy';
    }
    if (this.state.audioCodec !== 'copy' && !compatible.audio.includes(this.state.audioCodec)) {
      this.state.audioCodec = 'copy';
    }
  }

  #operation() {
    const sourceVideo = String(this.metadata?.videoCodec || '').toLowerCase();
    const sourceAudio = String(this.metadata?.audioCodec || '').toLowerCase();
    const compatible = this.#compatible();
    const hasAudio = Boolean(sourceAudio);

    const videoNeedsTranscode = this.state.videoCodec !== 'copy'
      || !compatible.video.includes(sourceVideo);

    const audioNeedsTranscode = hasAudio && (this.state.audioCodec !== 'copy'
      || !compatible.audio.includes(sourceAudio));

    return (videoNeedsTranscode || audioNeedsTranscode) ? 'transcode' : 'transmux';
  }

  #sync() {
    const operation = this.#operation();
    const isTranscode = operation === 'transcode';
    this.qualityField.hidden = !isTranscode;

    this.modeBadge.className = `vt-pill ${isTranscode ? 'vt-pill-transcode' : 'vt-pill-transmux'}`;
    this.modeBadge.textContent = isTranscode ? 'Transcode (slower)' : 'Transmux (fast)';

    const sourceVideo = String(this.metadata?.videoCodec || '').toLowerCase();
    const sourceAudio = String(this.metadata?.audioCodec || '').toLowerCase();
    const compatible = this.#compatible();
    if (!compatible.video.includes(sourceVideo)) {
      this.hint.textContent = 'Source video codec is not compatible with this container. Video will be transcoded.';
    } else if (sourceAudio && !compatible.audio.includes(sourceAudio)) {
      this.hint.textContent = 'Source audio codec is not compatible with this container. Audio will be transcoded.';
    } else {
      this.hint.textContent = isTranscode ? 'Selected output requires re-encoding.' : 'This export can stream-copy media (faster).';
    }

    this.dispatchEvent(new CustomEvent('vt-convert-change', {
      bubbles: true,
      composed: true,
      detail: this.getValue(),
    }));
  }
}

customElements.define('vt-convert-panel', VTConvertPanel);
