class VTTimeline extends HTMLElement {
  connectedCallback() {
    this.dragTarget = null;
    this.state = {
      duration: 1,
      segments: [{ start: 0, end: 1 }],
      playhead: 0,
      keyframes: [],
      frameDurationUs: 33333,
    };
    this.innerHTML = `
      <section class="vt-panel">
        <h3>Timeline (keyframe-snapped, hold Shift/Alt for fine adjust)</h3>
        <div id="timeline" class="vt-timeline" tabindex="0">
          <div id="filmstrip" class="vt-filmstrip"></div>
          <div id="exclusions" class="vt-exclusions"></div>
          <div id="keyframes" class="vt-keyframes"></div>
          <div id="playhead" class="vt-playhead"></div>
          <div id="dividers" class="vt-dividers"></div>
          <div id="handles" class="vt-handles"></div>
          <div id="tabs" class="vt-tabs"></div>
        </div>
      </section>
    `;

    this.timeline = this.querySelector('#timeline');
    this.filmstrip = this.querySelector('#filmstrip');
    this.exclusions = this.querySelector('#exclusions');
    this.keyframesEl = this.querySelector('#keyframes');

    this.timeline.addEventListener('click', (event) => {
      const ratio = this.#eventRatio(event);
      const timestampUs = Math.round(ratio * this.state.duration);
      this.dispatchEvent(new CustomEvent('vt-seek-request', {
        bubbles: true,
        composed: true,
        detail: { timestampUs },
      }));
    });

    window.addEventListener('pointermove', (event) => this.#onDrag(event));
    window.addEventListener('pointerup', () => this.dragTarget = null);
    this.timeline.addEventListener('keydown', (event) => this.#onKeyAdjust(event));
    window.addEventListener('keydown', (event) => this.#onKeyAdjust(event), { capture: true });
  }

  setData({ duration, segments, playhead, keyframes, frameDurationUs }) {
    this.state = {
      duration,
      segments: segments && segments.length ? segments : [{ start: 0, end: duration }],
      playhead,
      keyframes: keyframes || [],
      frameDurationUs: frameDurationUs || 33333,
    };
    this.#render();
  }

  setActiveHandle(handleId) {
    this.activeHandle = handleId;
    this.#syncActiveClass();
  }

  setThumbnails(urls) {
    this.filmstrip.innerHTML = urls.map((url) => `<img src="${url}" alt="thumbnail"/>`).join('');
  }

  #render() {
    const { duration, segments, playhead, keyframes } = this.state;
    const handlesEl = this.querySelector('#handles');
    const tabsEl = this.querySelector('#tabs');
    const dividersEl = this.querySelector('#dividers');

    handlesEl.innerHTML = '';
    tabsEl.innerHTML = '';
    dividersEl.innerHTML = '';
    this.exclusions.innerHTML = '';

    const exclusions = [];
    const first = segments[0];
    if (first.start > 0) exclusions.push({ left: 0, right: first.start });
    for (let i = 0; i < segments.length - 1; i += 1) {
      const gapStart = segments[i].end;
      const gapEnd = segments[i + 1].start;
      if (gapEnd > gapStart) exclusions.push({ left: gapStart, right: gapEnd });
      dividersEl.innerHTML += `<div class="vt-split-marker" style="left:${(segments[i].end / duration) * 100}%"></div>`;
    }
    const last = segments[segments.length - 1];
    if (last.end < duration) exclusions.push({ left: last.end, right: duration });
    exclusions.forEach((range) => {
      const leftRatio = range.left / duration;
      const rightRatio = range.right / duration;
      const widthRatio = Math.max(0, rightRatio - leftRatio);
      this.exclusions.innerHTML += `<div class="vt-excluded" style="left:${leftRatio * 100}%;width:${widthRatio * 100}%"></div>`;
    });

    let handleIndex = 1;
    const tabMeta = [];
    segments.forEach((segment, index) => {
      const startRatio = segment.start / duration;
      const endRatio = segment.end / duration;
      const startId = `seg-${index}-start`;
      const endId = `seg-${index}-end`;
      handlesEl.innerHTML += `
        <div class="vt-handle in" data-handle="${startId}" style="left:${startRatio * 100}%"></div>
        <div class="vt-handle out" data-handle="${endId}" style="left:${endRatio * 100}%"></div>
      `;
      tabMeta.push({ id: startId, ratio: startRatio, label: handleIndex });
      handleIndex += 1;
      tabMeta.push({ id: endId, ratio: endRatio, label: handleIndex });
      handleIndex += 1;
    });

    const threshold = 0.015;
    tabMeta.forEach((tab, idx) => {
      let offsetX = 0;
      let offsetY = 0;
      for (let j = 0; j < tabMeta.length; j += 1) {
        if (j === idx) continue;
        if (Math.abs(tabMeta[j].ratio - tab.ratio) < threshold) {
          const isLower = tab.label < tabMeta[j].label;
          offsetX = isLower ? -12 : 12;
          offsetY = isLower ? 0 : 6;
          break;
        }
      }
      tabsEl.innerHTML += `
        <div class="vt-handle-tab"
             data-handle="${tab.id}"
             style="left:${tab.ratio * 100}%;--tab-offset-x:${offsetX}px;--tab-offset-y:${offsetY}px;">
          ${tab.label}
        </div>
      `;
    });

    this.querySelector('#playhead').style.left = `${(playhead / duration) * 100}%`;
    this.keyframesEl.innerHTML = keyframes
      .map((timestamp) => `<span class="vt-key" style="left:${(timestamp / duration) * 100}%"></span>`)
      .join('');

    this.querySelectorAll('.vt-handle').forEach((handle) => {
      const id = handle.dataset.handle;
      handle.addEventListener('pointerdown', (event) => this.#startDrag(event, id));
      handle.addEventListener('click', () => this.#setActiveHandle(id));
    });
    this.querySelectorAll('.vt-handle-tab').forEach((tab) => {
      tab.addEventListener('click', () => this.#setActiveHandle(tab.dataset.handle));
    });
    if (!this.activeHandle && segments.length) {
      this.#setActiveHandle(`seg-0-end`);
    } else {
      this.#syncActiveClass();
    }
  }

  #startDrag(event, target) {
    event.preventDefault();
    this.dragTarget = target;
    this.#setActiveHandle(target);
    this.timeline.focus({ preventScroll: true });
  }

  #onDrag(event) {
    if (!this.dragTarget) return;
    const ratio = this.#eventRatio(event);
    const timestampUs = Math.round(ratio * this.state.duration);
    const fine = event.shiftKey || event.altKey;
    this.dispatchEvent(new CustomEvent('vt-trim-change-request', {
      bubbles: true,
      composed: true,
      detail: { target: this.dragTarget, timestampUs, fine },
    }));
  }

  #onKeyAdjust(event) {
    const target = this.dragTarget || this.activeHandle;
    if (!target) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    event.stopPropagation();
    const fine = event.shiftKey || event.altKey;
    const timestampUs = fine
      ? this.#getHandleTimestamp(target) + (event.key === 'ArrowLeft' ? -1 : 1) * this.state.frameDurationUs
      : this.#nudgeToKeyframe(target, event.key === 'ArrowLeft' ? -1 : 1);
    this.dispatchEvent(new CustomEvent('vt-trim-change-request', {
      bubbles: true,
      composed: true,
      detail: { target, timestampUs, fine },
    }));
  }

  #getHandleTimestamp(target) {
    const { index, edge } = this.#parseHandle(target);
    const seg = this.state.segments[index];
    if (!seg) return 0;
    return edge === 'start' ? seg.start : seg.end;
  }

  #nudgeToKeyframe(target, direction) {
    const keyframes = this.state.keyframes || [];
    if (!keyframes.length) {
      return this.#getHandleTimestamp(target) + direction * this.state.frameDurationUs;
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

  #syncActiveClass() {
    const handles = this.querySelectorAll('.vt-handle');
    handles.forEach((handle) => handle.classList.remove('active'));
    const tabs = this.querySelectorAll('.vt-handle-tab');
    tabs.forEach((tab) => tab.classList.remove('active'));
    if (!this.activeHandle) return;
    const handle = this.querySelector(`.vt-handle[data-handle="${this.activeHandle}"]`);
    if (handle) handle.classList.add('active');
    const tab = this.querySelector(`.vt-handle-tab[data-handle="${this.activeHandle}"]`);
    if (tab) tab.classList.add('active');
  }

  #setActiveHandle(target) {
    this.activeHandle = target;
    this.#syncActiveClass();
    this.dispatchEvent(new CustomEvent('vt-handle-activate', {
      bubbles: true,
      composed: true,
      detail: { target },
    }));
  }

  #parseHandle(target) {
    const match = /seg-(\d+)-(start|end)/.exec(target || '');
    if (!match) return { index: 0, edge: 'end' };
    return { index: Number(match[1]), edge: match[2] };
  }

  #eventRatio(event) {
    const rect = this.timeline.getBoundingClientRect();
    return Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  }
}

customElements.define('vt-timeline', VTTimeline);
