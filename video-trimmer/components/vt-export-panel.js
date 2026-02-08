class VTExportPanel extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <section class="vt-panel">
        <h3>Export</h3>
        <button id="exportBtn" class="btn" type="button" disabled>Save Trimmed Video</button>
        <button id="cancelBtn" class="btn btn-secondary" type="button" hidden>Cancel</button>
        <div class="vt-progress"><div id="progressBar"></div></div>
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

  setProgress(percent, message) {
    this.querySelector('#progressBar').style.width = `${percent}%`;
    this.querySelector('#message').textContent = message || '';
  }

  setExporting(exporting) {
    this.querySelector('#cancelBtn').hidden = !exporting;
    this.querySelector('#exportBtn').disabled = exporting;
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
}

customElements.define('vt-export-panel', VTExportPanel);
