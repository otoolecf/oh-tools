class VTInfoPanel extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<section class="vt-panel"><h3>Video Info</h3><div id="info" class="vt-info-grid muted">Load a file to view metadata.</div></section>`;
  }

  setMetadata(metadata) {
    const info = this.querySelector('#info');
    if (!metadata) {
      info.textContent = 'Load a file to view metadata.';
      return;
    }

    info.innerHTML = `
      <div><strong>File:</strong> ${metadata.fileName}</div>
      <div><strong>Size:</strong> ${(metadata.fileSize / (1024 * 1024)).toFixed(2)} MB</div>
      <div><strong>Container:</strong> ${metadata.containerFormat}</div>
      <div><strong>Video:</strong> ${metadata.videoCodecFull || metadata.videoCodec}</div>
      <div><strong>Resolution:</strong> ${metadata.displayWidth}×${metadata.displayHeight}</div>
      <div><strong>Frame rate:</strong> ${metadata.frameRate ? metadata.frameRate.toFixed(2) : 'n/a'} fps</div>
      <div><strong>Audio:</strong> ${metadata.audioCodec || 'none'}</div>
      <div><strong>Duration:</strong> ${window.formatTimecode(metadata.duration)}</div>
      <div><strong>Keyframes:</strong> ${metadata.keyframeCount}</div>
      <div><strong>Avg keyframe interval:</strong> ${window.formatTimecode(metadata.avgKeyframeInterval)}</div>
    `;
  }
}

customElements.define('vt-info-panel', VTInfoPanel);
