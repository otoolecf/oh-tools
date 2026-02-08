class VTTrimControls extends HTMLElement {
  connectedCallback() {
    this.holdDelayMs = 220;
    this.holdIntervalMs = 65;
    this.holdTimer = null;
    this.holdInterval = null;
    this.holdButton = null;
    this.releaseHoldBound = this.releaseHold.bind(this);

    this.innerHTML = `
      <section class="vt-panel vt-timecodes">
        <div class="vt-trim-header">
          <h3>Trim</h3>
        </div>
        <p class="vt-control-help">
          <strong>How to use:</strong> Select a numbered trim handle under the timeline and drag the trim bars directly, or use <strong>Trim</strong> controls
          to move that edge (press and hold to keep moving). Use <strong>Playhead</strong> controls to navigate, then
          <strong>Split at Playhead</strong> or <strong>Snap To Playhead</strong>.
        </p>
        <div class="vt-nudge-row">
          <span class="muted">Playhead</span>
          <div class="vt-nudge-group">
            <button class="btn btn-secondary vt-icon-btn" data-playhead-nudge="edge" data-dir="-1" type="button" aria-label="Jump playhead to start" title="Jump to start">
              <span aria-hidden="true">|&#9664;</span>
            </button>
            <button class="btn btn-secondary vt-icon-btn" data-playhead-nudge="keyframe" data-dir="-1" type="button" aria-label="Move playhead to previous keyframe" title="Previous keyframe">
              <span aria-hidden="true">&#9664;&#9664;</span>
            </button>
            <button class="btn btn-secondary vt-icon-btn" data-playhead-nudge="frame" data-dir="-1" type="button" aria-label="Move playhead backward one frame" title="Back one frame">
              <span aria-hidden="true">&#9664;</span>
            </button>
            <button class="btn btn-secondary vt-icon-btn" data-playhead-nudge="frame" data-dir="1" type="button" aria-label="Move playhead forward one frame" title="Forward one frame">
              <span aria-hidden="true">&#9654;</span>
            </button>
            <button class="btn btn-secondary vt-icon-btn" data-playhead-nudge="keyframe" data-dir="1" type="button" aria-label="Move playhead to next keyframe" title="Next keyframe">
              <span aria-hidden="true">&#9654;&#9654;</span>
            </button>
            <button class="btn btn-secondary vt-icon-btn" data-playhead-nudge="edge" data-dir="1" type="button" aria-label="Jump playhead to end" title="Jump to end">
              <span aria-hidden="true">&#9654;|</span>
            </button>
          </div>
          <div class="vt-trim-actions">
            <button class="btn btn-secondary btn-compact" id="splitBtn" type="button">Split at Playhead</button>
            <button class="btn btn-secondary btn-compact" id="clearSplitBtn" type="button" hidden>Clear Split</button>
          </div>
        </div>
        <div class="vt-nudge-row">
          <span class="muted">Trim</span>
          <div class="vt-nudge-group">
            <button class="btn btn-secondary vt-icon-btn" data-nudge="edge" data-dir="-1" type="button" aria-label="Move selected trim edge to start" title="Selected edge to start">
              <span aria-hidden="true">|&#9664;</span>
            </button>
            <button class="btn btn-secondary vt-icon-btn" data-nudge="keyframe" data-dir="-1" type="button" aria-label="Move selected trim edge to previous keyframe" title="Selected edge to previous keyframe">
              <span aria-hidden="true">&#9664;&#9664;</span>
            </button>
            <button class="btn btn-secondary vt-icon-btn" data-nudge="frame" data-dir="-1" type="button" aria-label="Move selected trim edge backward one frame" title="Selected edge back one frame">
              <span aria-hidden="true">&#9664;</span>
            </button>
            <button class="btn btn-secondary vt-icon-btn" data-nudge="frame" data-dir="1" type="button" aria-label="Move selected trim edge forward one frame" title="Selected edge forward one frame">
              <span aria-hidden="true">&#9654;</span>
            </button>
            <button class="btn btn-secondary vt-icon-btn" data-nudge="keyframe" data-dir="1" type="button" aria-label="Move selected trim edge to next keyframe" title="Selected edge to next keyframe">
              <span aria-hidden="true">&#9654;&#9654;</span>
            </button>
            <button class="btn btn-secondary vt-icon-btn" data-nudge="edge" data-dir="1" type="button" aria-label="Move selected trim edge to end" title="Selected edge to end">
              <span aria-hidden="true">&#9654;|</span>
            </button>
          </div>
          <button class="btn btn-secondary btn-compact" id="snapToPlayheadBtn" type="button">Snap To Playhead</button>
          <span class="muted vt-trim-hint">Selected: <strong id="activeHandleLabel">2</strong></span>
        </div>
        <div id="singleTimes" class="vt-time-grid">
          <div class="vt-time-card">
            <span class="muted">Keep Start (In)</span>
            <strong id="inPoint">00:00:00.000</strong>
            <small>Everything before this is removed.</small>
          </div>
          <div class="vt-time-card">
            <span class="muted">Keep End (Out)</span>
            <strong id="outPoint">00:00:00.000</strong>
            <small>Everything after this is removed.</small>
          </div>
          <div class="vt-time-card">
            <span class="muted">Kept Duration</span>
            <strong id="duration">00:00:00.000</strong>
            <small>Total output length.</small>
          </div>
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
      this.bindRepeatButton(button, 'vt-playhead-nudge', button.dataset.playheadNudge || 'frame');
    });

    this.querySelectorAll('[data-nudge]').forEach((button) => {
      this.bindRepeatButton(button, 'vt-nudge-request', button.dataset.nudge || 'frame');
    });

    this.querySelector('#snapToPlayheadBtn').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('vt-snap-to-playhead', {
        bubbles: true,
        composed: true,
      }));
    });
  }

  disconnectedCallback() {
    this.releaseHold();
  }

  bindRepeatButton(button, eventName, mode) {
    const emit = () => {
      const direction = Number(button.dataset.dir || 0);
      this.dispatchEvent(new CustomEvent(eventName, {
        bubbles: true,
        composed: true,
        detail: { direction, mode },
      }));
    };

    button.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      this.startHold(button, emit);
    });

    button.addEventListener('click', (event) => {
      if (button.dataset.suppressClick === '1') {
        button.dataset.suppressClick = '';
        event.preventDefault();
        return;
      }
      emit();
    });
  }

  startHold(button, emit) {
    this.releaseHold();
    this.holdButton = button;
    button.dataset.suppressClick = '1';
    button.classList.add('is-holding');
    emit();

    this.holdTimer = window.setTimeout(() => {
      this.holdInterval = window.setInterval(() => emit(), this.holdIntervalMs);
    }, this.holdDelayMs);

    window.addEventListener('pointerup', this.releaseHoldBound);
    window.addEventListener('pointercancel', this.releaseHoldBound);
    window.addEventListener('blur', this.releaseHoldBound);
  }

  releaseHold() {
    window.clearTimeout(this.holdTimer);
    window.clearInterval(this.holdInterval);
    this.holdTimer = null;
    this.holdInterval = null;
    if (this.holdButton) {
      this.holdButton.classList.remove('is-holding');
      this.holdButton = null;
    }
    window.removeEventListener('pointerup', this.releaseHoldBound);
    window.removeEventListener('pointercancel', this.releaseHoldBound);
    window.removeEventListener('blur', this.releaseHoldBound);
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
        <div class="muted">Segment ${index + 1} (kept)</div>
        <div class="vt-time-grid">
          <div class="vt-time-card"><span class="muted">Start (In)</span><strong>${window.formatTimecode(seg.start)}</strong></div>
          <div class="vt-time-card"><span class="muted">End (Out)</span><strong>${window.formatTimecode(seg.end)}</strong></div>
          <div class="vt-time-card"><span class="muted">Duration</span><strong>${window.formatTimecode(Math.max(0, seg.end - seg.start))}</strong></div>
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
