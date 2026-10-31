export const videoAppMarkup = () => `
      <div class="vt-layout">
        <section class="vt-sidebar">
          <vt-file-drop></vt-file-drop>
          <vt-info-panel></vt-info-panel>
        </section>
        <section class="vt-editor">
          <vt-video-preview></vt-video-preview>
          <vt-timeline></vt-timeline>
          <vt-trim-controls></vt-trim-controls>
          <vt-convert-panel></vt-convert-panel>
          <vt-export-panel></vt-export-panel>
        </section>
      </div>
    `;

export const videoFileDropMarkup = () => `
      <section class="vt-panel vt-file-drop">
        <h2>Import video</h2>
        <div class="vt-drop-zone" id="dropZone">
          <p>Choose a video or drop one here.</p>
          <p class="muted">or</p>
          <button class="btn" id="pickBtn" type="button">Choose file</button>
          <input id="fileInput" type="file" accept="video/*" hidden />
        </div>
        <div class="vt-status" id="status"></div>
      </section>
    `;
