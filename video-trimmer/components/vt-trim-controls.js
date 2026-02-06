class VTTrimControls extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <section class="vt-panel vt-timecodes">
        <div class="vt-trim-header">
          <h3>Trim</h3>
        </div>
        <div class="vt-nudge-row">
          <span class="muted">Playhead</span>
          <div class="vt-nudge-group">
            <button class="btn btn-secondary" data-playhead-nudge="edge" data-dir="-1" type="button">&laquo;</button>
            <button class="btn btn-secondary" data-playhead-nudge="keyframe" data-dir="-1" type="button">&lsaquo;&lsaquo;</button>
            <button class="btn btn-secondary" data-playhead-nudge="frame" data-dir="-1" type="button">&lsaquo;</button>
            <button class="btn btn-secondary" data-playhead-nudge="frame" data-dir="1" type="button">&rsaquo;</button>
            <button class="btn btn-secondary" data-playhead-nudge="keyframe" data-dir="1" type="button">&rsaquo;&rsaquo;</button>
            <button class="btn btn-secondary" data-playhead-nudge="edge" data-dir="1" type="button">&raquo;</button>
          </div>
          <div class="vt-trim-actions">
            <button class="btn btn-secondary btn-compact" id="splitBtn" type="button">Split at Playhead</button>
            <button class="btn btn-secondary btn-compact" id="clearSplitBtn" type="button" hidden>Clear Split</button>
          </div>
        </div>
        <div class="vt-nudge-row">
          <span class="muted">Trim</span>
          <div class="vt-nudge-group">
            <button class="btn btn-secondary" data-nudge="edge" data-dir="-1" type="button">&laquo;</button>
            <button class="btn btn-secondary" data-nudge="keyframe" data-dir="-1" type="button">&lsaquo;&lsaquo;</button>
            <button class="btn btn-secondary" data-nudge="frame" data-dir="-1" type="button">&lsaquo;</button>
            <button class="btn btn-secondary" data-nudge="frame" data-dir="1" type="button">&rsaquo;</button>
            <button class="btn btn-secondary" data-nudge="keyframe" data-dir="1" type="button">&rsaquo;&rsaquo;</button>
            <button class="btn btn-secondary" data-nudge="edge" data-dir="1" type="button">&raquo;</button>
          </div>
          <button class="btn btn-secondary btn-compact" id="snapToPlayheadBtn" type="button">Snap To Playhead</button>
          <span class="muted vt-trim-hint">Selected: <strong id="activeHandleLabel">2</strong></span>
        </div>
        <div id="singleTimes" class="vt-time-grid">
          <div><span class="muted">In</span><strong id="inPoint">00:00:00.000</strong></div>
          <div><span class="muted">Out</span><strong id="outPoint">00:00:00.000</strong></div>
          <div><span class="muted">Duration</span><strong id="duration">00:00:00.000</strong></div>
        </div>
        <div id="splitTimes" class="vt-split-grid" hidden>
          <div id="segmentList" class="vt-segment-list"></div>
          <div class="vt-split-total">
            <span class="muted">Total kept</span>
            <strong id="totalDuration">00:00:00.000</strong>
          </div>
        </div>
      </section>
    `;

    this.querySelector('#splitBtn').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('vt-split-request', { bubbles: true, composed: true }));
    });

    this.querySelector('#clearSplitBtn').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('vt-clear-split', { bubbles: true, composed: true }));
    });

    this.querySelectorAll('[data-playhead-nudge]').forEach((button) => {
      button.addEventListener('click', () => {
        const direction = Number(button.dataset.dir || 0);
        const mode = button.dataset.playheadNudge || 'frame';
        this.dispatchEvent(new CustomEvent('vt-playhead-nudge', {
          bubbles: true,
          composed: true,
          detail: { direction, mode },
        }));
      });
    });

    this.querySelectorAll('[data-nudge]').forEach((button) => {
      button.addEventListener('click', () => {
        const direction = Number(button.dataset.dir || 0);
        const mode = button.dataset.nudge || 'frame';
        this.dispatchEvent(new CustomEvent('vt-nudge-request', {
          bubbles: true,
          composed: true,
          detail: { direction, mode },
        }));
      });
    });

    this.querySelector('#snapToPlayheadBtn').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('vt-snap-to-playhead', {
        bubbles: true,
        composed: true,
      }));
    });
  }

  setActiveHandleLabel(label) {
    const el = this.querySelector('#activeHandleLabel');
    if (el) el.textContent = label;
  }

  updateTimes(segments) {
    const single = this.querySelector('#singleTimes');
    const split = this.querySelector('#splitTimes');
    const splitBtn = this.querySelector('#splitBtn');
    const clearSplitBtn = this.querySelector('#clearSplitBtn');
    const hasSplit = segments.length > 1;

    if (!hasSplit) {
      const seg = segments[0];
      this.querySelector('#inPoint').textContent = window.formatTimecode(seg.start);
      this.querySelector('#outPoint').textContent = window.formatTimecode(seg.end);
      this.querySelector('#duration').textContent = window.formatTimecode(Math.max(0, seg.end - seg.start));
      single.hidden = false;
      split.hidden = true;
      splitBtn.hidden = false;
      clearSplitBtn.hidden = true;
      return;
    }

    const list = this.querySelector('#segmentList');
    list.innerHTML = segments.map((seg, index) => `
      <div class="vt-split-block">
        <div class="muted">Segment ${index + 1}</div>
        <div class="vt-time-grid">
          <div><span class="muted">In</span><strong>${window.formatTimecode(seg.start)}</strong></div>
          <div><span class="muted">Out</span><strong>${window.formatTimecode(seg.end)}</strong></div>
          <div><span class="muted">Duration</span><strong>${window.formatTimecode(Math.max(0, seg.end - seg.start))}</strong></div>
        </div>
      </div>
    `).join('');
    const total = segments.reduce((sum, seg) => sum + Math.max(0, seg.end - seg.start), 0);
    this.querySelector('#totalDuration').textContent = window.formatTimecode(total);
    single.hidden = true;
    split.hidden = false;
    splitBtn.hidden = true;
    clearSplitBtn.hidden = false;
  }
}

customElements.define('vt-trim-controls', VTTrimControls);
