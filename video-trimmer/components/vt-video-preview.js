class VTVideoPreview extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <section class="vt-panel">
        <div class="vt-video-wrap">
          <video id="video" controls playsinline></video>
        </div>
        <div class="vt-player-controls">
          <button class="btn" id="playBtn" type="button">Play</button>
          <span id="currentTime" class="muted">00:00:00.000</span>
        </div>
      </section>
    `;

    this.video = this.querySelector('#video');
    this.playBtn = this.querySelector('#playBtn');
    this.currentTime = this.querySelector('#currentTime');

    this.playBtn.addEventListener('click', () => {
      if (this.video.paused) this.video.play();
      else this.video.pause();
    });

    this.video.addEventListener('play', () => this.playBtn.textContent = 'Pause');
    this.video.addEventListener('pause', () => this.playBtn.textContent = 'Play');
    this.video.addEventListener('timeupdate', () => {
      const timestampUs = Math.round(this.video.currentTime * window.VT_US_PER_SECOND);
      this.currentTime.textContent = window.formatTimecode(timestampUs);
      this.dispatchEvent(new CustomEvent('vt-playhead-change', {
        bubbles: true,
        composed: true,
        detail: { currentTimeUs: timestampUs },
      }));
    });
  }

  setFile(file) {
    if (this.video.src?.startsWith('blob:')) URL.revokeObjectURL(this.video.src);
    this.video.src = URL.createObjectURL(file);
    this.video.load();
  }

  seekTo(timestampUs) {
    this.video.currentTime = timestampUs / window.VT_US_PER_SECOND;
  }
}

customElements.define('vt-video-preview', VTVideoPreview);
