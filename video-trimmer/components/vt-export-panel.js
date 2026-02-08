class VTExportPanel extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <section class="vt-panel">
        <h3>Export</h3>
        <div class="vt-export-row">
          <button id="exportBtn" class="btn" type="button" disabled>Save Trimmed Video</button>
          <span id="operationBadge" class="vt-pill vt-pill-transmux">Transmux (fast)</span>
        </div>
        <button id="cancelBtn" class="btn btn-secondary" type="button" hidden>Cancel</button>
        <div class="vt-progress"><div id="progressBar"></div></div>
        <div id="warning" class="muted error"></div>
        <div id="message" class="muted"></div>
        <a id="download" class="btn" hidden download>Download output</a>
      </section>
    `;

    this.querySelector('#exportBtn').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('vt-export-request', { bubbles: true, composed: true }));
    });

    this.querySelector('#cancelBtn').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('vt-export-cancel', { bubbles: true, composed: true }));
    });
  }

  setReady(ready) {
    this.querySelector('#exportBtn').disabled = !ready;
  }

  setProgress(percent, message, indeterminate = false) {
    this.lastPercent = percent;
    this.lastMessage = message;
    this.lastIndeterminate = indeterminate;
    this.#renderProgress();
  }

  #renderProgress() {
    const bar = this.querySelector('#progressBar');
    if (this.lastIndeterminate || !Number.isFinite(this.lastPercent)) {
      bar.classList.add('indeterminate');
      bar.style.width = '45%';
    } else {
      bar.classList.remove('indeterminate');
      bar.style.width = `${Math.max(0, Math.min(100, this.lastPercent))}%`;
    }
    const elapsed = this.startedAt ? ` (${this.#formatElapsed(Date.now() - this.startedAt)})` : '';
    this.querySelector('#message').textContent = `${this.lastMessage || ''}${elapsed}`;
  }

  setExporting(exporting) {
    if (exporting) {
      this.startedAt = Date.now();
      this.elapsedTimer = window.setInterval(() => this.#renderProgress(), 250);
    } else {
      this.startedAt = null;
      window.clearInterval(this.elapsedTimer);
      this.elapsedTimer = null;
    }
    this.querySelector('#cancelBtn').hidden = !exporting;
    this.querySelector('#exportBtn').disabled = exporting;
  }

  setOperationBadge(operation) {
    const badge = this.querySelector('#operationBadge');
    const isTranscode = operation === 'transcode';
    badge.className = `vt-pill ${isTranscode ? 'vt-pill-transcode' : 'vt-pill-transmux'}`;
    badge.textContent = isTranscode ? 'Transcode (slower)' : 'Transmux (fast)';
  }

  setWarning(message = '') {
    this.querySelector('#warning').textContent = message;
  }

  showDownload(blob, filename) {
    const link = this.querySelector('#download');
    if (this.downloadUrl) URL.revokeObjectURL(this.downloadUrl);
    this.downloadUrl = URL.createObjectURL(blob);
    link.href = this.downloadUrl;
    link.download = filename;
    link.hidden = false;
    link.textContent = `Download ${filename}`;
  }

  hideDownload() {
    const link = this.querySelector('#download');
    link.hidden = true;
  }

  #formatElapsed(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}

customElements.define('vt-export-panel', VTExportPanel);
