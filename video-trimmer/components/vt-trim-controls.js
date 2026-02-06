class VTTrimControls extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <section class="vt-panel vt-timecodes">
        <h3>Trim Selection</h3>
        <div class="vt-time-grid">
          <div><span class="muted">In</span><strong id="inPoint">00:00:00.000</strong></div>
          <div><span class="muted">Out</span><strong id="outPoint">00:00:00.000</strong></div>
          <div><span class="muted">Duration</span><strong id="duration">00:00:00.000</strong></div>
        </div>
      </section>
    `;
  }

  updateTimes(inUs, outUs) {
    this.querySelector('#inPoint').textContent = window.formatTimecode(inUs);
    this.querySelector('#outPoint').textContent = window.formatTimecode(outUs);
    this.querySelector('#duration').textContent = window.formatTimecode(Math.max(0, outUs - inUs));
  }
}

customElements.define('vt-trim-controls', VTTrimControls);
