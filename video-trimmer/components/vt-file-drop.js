class VTFileDrop extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <section class="vt-panel vt-file-drop">
        <h3>Import video</h3>
        <div class="vt-drop-zone" id="dropZone">
          <p>Drag and drop a video file here</p>
          <p class="muted">or</p>
          <button class="btn" id="pickBtn" type="button">Choose file</button>
          <input id="fileInput" type="file" accept="video/*" hidden />
        </div>
        <div class="vt-status" id="status"></div>
      </section>
    `;

    const dropZone = this.querySelector('#dropZone');
    const input = this.querySelector('#fileInput');
    const pickBtn = this.querySelector('#pickBtn');

    pickBtn.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
      if (input.files?.[0]) this.#emitFile(input.files[0]);
    });

    ['dragenter', 'dragover'].forEach((eventName) => {
      dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropZone.classList.add('dragging');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropZone.classList.remove('dragging');
      });
    });

    dropZone.addEventListener('drop', (event) => {
      const file = event.dataTransfer?.files?.[0];
      if (file) this.#emitFile(file);
    });
  }

  setStatus(message, isError = false) {
    const status = this.querySelector('#status');
    status.textContent = message || '';
    status.classList.toggle('error', Boolean(isError));
  }

  #emitFile(file) {
    this.dispatchEvent(new CustomEvent('vt-file-selected', {
      bubbles: true,
      composed: true,
      detail: { file },
    }));
  }
}

customElements.define('vt-file-drop', VTFileDrop);
