class VTTimeline extends HTMLElement {
  connectedCallback() {
    this.dragTarget = null;
    this.state = { duration: 1, trimStart: 0, trimEnd: 1, playhead: 0, keyframes: [] };
    this.innerHTML = `
      <section class="vt-panel">
        <h3>Timeline (keyframe-snapped)</h3>
        <div id="timeline" class="vt-timeline">
          <div id="filmstrip" class="vt-filmstrip"></div>
          <div id="excludedLeft" class="vt-excluded"></div>
          <div id="excludedRight" class="vt-excluded"></div>
          <div id="keyframes" class="vt-keyframes"></div>
          <div id="playhead" class="vt-playhead"></div>
          <div id="inHandle" class="vt-handle in"></div>
          <div id="outHandle" class="vt-handle out"></div>
        </div>
      </section>
    `;

    this.timeline = this.querySelector('#timeline');
    this.filmstrip = this.querySelector('#filmstrip');
    this.excludedLeft = this.querySelector('#excludedLeft');
    this.excludedRight = this.querySelector('#excludedRight');
    this.keyframesEl = this.querySelector('#keyframes');

    const inHandle = this.querySelector('#inHandle');
    const outHandle = this.querySelector('#outHandle');

    inHandle.addEventListener('pointerdown', (event) => this.#startDrag(event, 'in'));
    outHandle.addEventListener('pointerdown', (event) => this.#startDrag(event, 'out'));

    this.timeline.addEventListener('click', (event) => {
      const ratio = this.#eventRatio(event);
      const timestampUs = Math.round(ratio * this.state.duration);
      this.dispatchEvent(new CustomEvent('vt-seek-request', { bubbles: true, composed: true, detail: { timestampUs } }));
    });

    window.addEventListener('pointermove', (event) => this.#onDrag(event));
    window.addEventListener('pointerup', () => this.dragTarget = null);
  }

  setData({ duration, trimStart, trimEnd, playhead, keyframes }) {
    this.state = { duration, trimStart, trimEnd, playhead, keyframes: keyframes || [] };
    this.#render();
  }

  setThumbnails(urls) {
    this.filmstrip.innerHTML = urls.map((url) => `<img src="${url}" alt="thumbnail"/>`).join('');
  }

  #render() {
    const { duration, trimStart, trimEnd, playhead, keyframes } = this.state;
    const startRatio = trimStart / duration;
    const endRatio = trimEnd / duration;
    this.querySelector('#inHandle').style.left = `${startRatio * 100}%`;
    this.querySelector('#outHandle').style.left = `${endRatio * 100}%`;
    this.querySelector('#playhead').style.left = `${(playhead / duration) * 100}%`;
    this.excludedLeft.style.width = `${startRatio * 100}%`;
    this.excludedRight.style.left = `${endRatio * 100}%`;
    this.excludedRight.style.width = `${(1 - endRatio) * 100}%`;

    this.keyframesEl.innerHTML = keyframes
      .map((timestamp) => `<span class="vt-key" style="left:${(timestamp / duration) * 100}%"></span>`)
      .join('');
  }

  #startDrag(event, target) {
    event.preventDefault();
    this.dragTarget = target;
  }

  #onDrag(event) {
    if (!this.dragTarget) return;
    const ratio = this.#eventRatio(event);
    const timestampUs = Math.round(ratio * this.state.duration);
    this.dispatchEvent(new CustomEvent('vt-trim-change-request', {
      bubbles: true,
      composed: true,
      detail: { target: this.dragTarget, timestampUs },
    }));
  }

  #eventRatio(event) {
    const rect = this.timeline.getBoundingClientRect();
    return Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  }
}

customElements.define('vt-timeline', VTTimeline);
