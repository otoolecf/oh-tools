/**
 * Resize Operator Web Component
 * Handles image resizing operations with aspect ratio control
 */
class ResizeOperator extends HTMLElement {
  constructor() {
    super();
    this.currentImage = null;
    this.vips = null;
    this.isProcessing = false;
    this.originalAspectRatio = 1;

    // Bind methods to preserve context
    this.applyResize = this.applyResize.bind(this);
    this.updateAspectRatio = this.updateAspectRatio.bind(this);
    this.handleWidthChange = this.handleWidthChange.bind(this);
    this.handleHeightChange = this.handleHeightChange.bind(this);
    this.handleAspectToggle = this.handleAspectToggle.bind(this);
    this.presetResize = this.presetResize.bind(this);
  }

  static get observedAttributes() {
    return ["disabled"];
  }

  connectedCallback() {
    this.render();
    this.bindEvents();
    this.updateDisabledState();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "disabled") {
      this.updateDisabledState();
    }
  }

  render() {
    this.innerHTML = `
            <style>
                :host {
                    display: block;
                }
                
                .operator-container {
                    background: var(--bg-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    padding: 1.5rem;
                }
                
                .operator-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 1.5rem;
                }
                
                .operator-title {
                    margin: 0;
                    color: var(--text-primary);
                    font-size: 1.1rem;
                    font-weight: 600;
                }
                
                .operator-status {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    font-style: italic;
                }
                
                .operator-status.processing {
                    color: var(--primary-color);
                }
                
                .image-info {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    padding: 0.75rem;
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    margin-bottom: 1rem;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                }
                
                .info-item {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }
                
                .info-label {
                    font-weight: 500;
                    color: var(--text-primary);
                }
                
                .info-value {
                    font-family: monospace;
                    color: var(--primary-color);
                }
                
                .operation-controls {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 1rem;
                    align-items: end;
                    margin-bottom: 1rem;
                }
                
                .control-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    min-width: 140px;
                }
                
                .control-group label {
                    font-weight: 500;
                    color: var(--text-primary);
                    font-size: 0.9rem;
                }
                
                .control-group.checkbox {
                    flex-direction: row;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .control-group.checkbox label {
                    margin: 0;
                    font-size: 0.9rem;
                    cursor: pointer;
                }
                
                .control-group input[type="number"] {
                    padding: 0.5rem;
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    background: var(--bg-primary);
                    color: var(--text-primary);
                    font-size: 0.9rem;
                }
                
                .control-group input[type="number"]:focus {
                    outline: none;
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 2px var(--primary-color)20;
                }
                
                .control-group input[type="checkbox"] {
                    width: 16px;
                    height: 16px;
                    accent-color: var(--primary-color);
                }
                
                .btn-enhanced {
                    padding: 0.5rem 1rem;
                    background: var(--primary-color);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    font-weight: 500;
                    transition: all 0.2s ease;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                
                .btn-enhanced:hover:not(:disabled) {
                    background: var(--primary-hover, var(--primary-color));
                    transform: translateY(-1px);
                    box-shadow: 0 4px 6px rgba(0,0,0,0.15);
                }
                
                .btn-enhanced:disabled {
                    background: var(--surface-light);
                    color: var(--text-secondary);
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }
                
                .btn-secondary {
                    padding: 0.4rem 0.8rem;
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    transition: all 0.2s ease;
                }
                
                .btn-secondary:hover:not(:disabled) {
                    background: var(--bg-primary);
                    border-color: var(--primary-color);
                }
                
                .btn-secondary:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                .preset-buttons {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                    margin-top: 0.5rem;
                }
                
                .aspect-indicator {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    font-style: italic;
                    margin-top: 0.25rem;
                }
                
                .link-icon {
                    display: inline-block;
                    width: 16px;
                    height: 16px;
                    margin-left: 0.5rem;
                    opacity: 0.6;
                    transition: opacity 0.2s ease;
                }
                
                .link-icon.active {
                    opacity: 1;
                    color: var(--primary-color);
                }
                
                @media (max-width: 768px) {
                    .operation-controls {
                        align-items: stretch;
                    }
                    
                    .control-group {
                        min-width: unset;
                    }
                    
                    .image-info {
                        grid-template-columns: 1fr;
                        text-align: center;
                    }
                    
                    .preset-buttons {
                        justify-content: center;
                    }
                }
            </style>
            
            <div class="operator-container">
                <div class="operator-header">
                    <h3 class="operator-title">Resize</h3>
                    <div class="operator-status" id="status"></div>
                </div>
                
                <div class="image-info" id="imageInfo" style="display: none;">
                    <div class="info-item">
                        <div class="info-label">Current Size</div>
                        <div class="info-value" id="currentSize"></div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Aspect Ratio</div>
                        <div class="info-value" id="currentAspect"></div>
                    </div>
                </div>
                
                <div class="operation-controls">
                    <div class="control-group">
                        <label for="resizeWidth">Width (px)</label>
                        <input type="number" id="resizeWidth" min="1" max="10000" placeholder="Auto" />
                        <div class="preset-buttons">
                            <button class="btn-secondary" data-width="800">800px</button>
                            <button class="btn-secondary" data-width="1200">1200px</button>
                            <button class="btn-secondary" data-width="1920">1920px</button>
                        </div>
                    </div>
                    
                    <div class="control-group">
                        <label for="resizeHeight">Height (px)</label>
                        <input type="number" id="resizeHeight" min="1" max="10000" placeholder="Auto" />
                        <div class="preset-buttons">
                            <button class="btn-secondary" data-height="600">600px</button>
                            <button class="btn-secondary" data-height="800">800px</button>
                            <button class="btn-secondary" data-height="1080">1080px</button>
                        </div>
                    </div>
                    
                    <div class="control-group checkbox">
                        <input type="checkbox" id="maintainAspect" checked />
                        <label for="maintainAspect">
                            Maintain aspect ratio
                            <span class="link-icon" id="linkIcon">🔗</span>
                        </label>
                        <div class="aspect-indicator" id="aspectIndicator">Linked</div>
                    </div>
                    
                    <div class="control-group">
                        <button id="applyResizeBtn" class="btn-enhanced">Apply Resize</button>
                    </div>
                </div>
            </div>
        `;
  }

  bindEvents() {
    const resizeWidthInput = this.querySelector("#resizeWidth");
    const resizeHeightInput = this.querySelector("#resizeHeight");
    const maintainAspectCheckbox = this.querySelector("#maintainAspect");
    const applyResizeBtn = this.querySelector("#applyResizeBtn");

    // Main inputs
    resizeWidthInput?.addEventListener("input", this.handleWidthChange);
    resizeHeightInput?.addEventListener("input", this.handleHeightChange);
    maintainAspectCheckbox?.addEventListener("change", this.handleAspectToggle);
    applyResizeBtn?.addEventListener("click", this.applyResize);

    // Preset buttons
    this.querySelectorAll(".btn-secondary[data-width]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const width = btn.dataset.width;
        this.presetResize(parseInt(width), null);
      });
    });

    this.querySelectorAll(".btn-secondary[data-height]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const height = btn.dataset.height;
        this.presetResize(null, parseInt(height));
      });
    });
  }

  handleWidthChange() {
    this.updateAspectRatio("width");
  }

  handleHeightChange() {
    this.updateAspectRatio("height");
  }

  handleAspectToggle() {
    const maintainAspect = this.querySelector("#maintainAspect");
    const linkIcon = this.querySelector("#linkIcon");
    const aspectIndicator = this.querySelector("#aspectIndicator");

    if (maintainAspect.checked) {
      linkIcon.classList.add("active");
      aspectIndicator.textContent = "Linked";
      // Re-calculate based on current width
      this.updateAspectRatio("width");
    } else {
      linkIcon.classList.remove("active");
      aspectIndicator.textContent = "Independent";
    }
  }

  updateAspectRatio(changedField) {
    const maintainAspect = this.querySelector("#maintainAspect");
    const resizeWidth = this.querySelector("#resizeWidth");
    const resizeHeight = this.querySelector("#resizeHeight");

    if (!maintainAspect.checked || !this.currentImage) return;

    const aspectRatio = this.originalAspectRatio;

    if (changedField === "width" && resizeWidth.value) {
      const newHeight = Math.round(parseInt(resizeWidth.value) / aspectRatio);
      resizeHeight.value = newHeight;
    } else if (changedField === "height" && resizeHeight.value) {
      const newWidth = Math.round(parseInt(resizeHeight.value) * aspectRatio);
      resizeWidth.value = newWidth;
    }
  }

  presetResize(width, height) {
    const resizeWidth = this.querySelector("#resizeWidth");
    const resizeHeight = this.querySelector("#resizeHeight");

    if (width) {
      resizeWidth.value = width;
      this.updateAspectRatio("width");
    }
    if (height) {
      resizeHeight.value = height;
      this.updateAspectRatio("height");
    }
  }

  updateDisabledState() {
    const disabled = this.hasAttribute("disabled");
    const buttons = this.querySelectorAll("button");
    const inputs = this.querySelectorAll("input");

    buttons.forEach((btn) => (btn.disabled = disabled));
    inputs.forEach((input) => (input.disabled = disabled));

    if (disabled) {
      this.showStatus("Operator disabled");
    } else {
      this.showStatus("");
    }
  }

  updateImageInfo() {
    if (!this.currentImage) return;

    const width = this.currentImage.width;
    const height = this.currentImage.height;
    this.originalAspectRatio = width / height;

    const currentSize = this.querySelector("#currentSize");
    const currentAspect = this.querySelector("#currentAspect");
    const imageInfo = this.querySelector("#imageInfo");

    if (currentSize) {
      currentSize.textContent = `${width} × ${height} px`;
    }
    if (currentAspect) {
      currentAspect.textContent = `${this.originalAspectRatio.toFixed(3)}:1`;
    }
    if (imageInfo) {
      imageInfo.style.display = "grid";
    }
  }

  showStatus(message, type = "info") {
    const statusEl = this.querySelector("#status");
    if (!statusEl) return;

    statusEl.textContent = message;
    statusEl.className = "operator-status";

    if (type === "processing") {
      statusEl.classList.add("processing");
    }
  }

  async applyResize() {
    if (!this.currentImage || !this.vips || this.isProcessing) {
      return;
    }

    try {
      this.isProcessing = true;
      this.showStatus("Applying resize...", "processing");
      this.updateDisabledState();

      const resizeWidth = this.querySelector("#resizeWidth");
      const resizeHeight = this.querySelector("#resizeHeight");

      const width = parseInt(resizeWidth.value) || null;
      const height = parseInt(resizeHeight.value) || null;

      if (!width && !height) {
        this.showStatus("Please specify width and/or height");
        return;
      }

      console.log("Resize values:", { width, height });
      console.log(
        "Current image dimensions:",
        this.currentImage.width,
        "x",
        this.currentImage.height
      );

      // Apply resize using VIPS
      const resizedImage = this.currentImage.resize(
        width / this.currentImage.width,
        {
          vscale: height
            ? height / this.currentImage.height
            : width / this.currentImage.width,
        }
      );

      // Emit custom event with the result
      this.dispatchEvent(
        new CustomEvent("operation-applied", {
          detail: {
            type: "resize",
            description: `Resize to ${width || "auto"}x${height || "auto"}`,
            image: resizedImage,
            operatorName: "resize",
          },
          bubbles: true,
        })
      );

      this.showStatus("Resize applied successfully!");
    } catch (error) {
      console.error("Resize failed:", error);
      this.dispatchEvent(
        new CustomEvent("operation-error", {
          detail: {
            type: "resize",
            error: error.message,
            operatorName: "resize",
          },
          bubbles: true,
        })
      );
      this.showStatus("Resize failed");
    } finally {
      this.isProcessing = false;
      this.updateDisabledState();

      // Clear status after 3 seconds
      setTimeout(() => this.showStatus(""), 3000);
    }
  }

  // Public API methods
  setImage(image, vips) {
    this.currentImage = image;
    this.vips = vips;

    if (image && vips) {
      this.removeAttribute("disabled");
      this.updateImageInfo();
      this.showStatus("Ready");
    } else {
      this.setAttribute("disabled", "");
      this.showStatus("No image loaded");
    }
  }

  getState() {
    const resizeWidth = this.querySelector("#resizeWidth");
    const resizeHeight = this.querySelector("#resizeHeight");
    const maintainAspect = this.querySelector("#maintainAspect");

    return {
      width: resizeWidth?.value || "",
      height: resizeHeight?.value || "",
      maintainAspect: maintainAspect?.checked || false,
    };
  }

  setState(state) {
    const resizeWidth = this.querySelector("#resizeWidth");
    const resizeHeight = this.querySelector("#resizeHeight");
    const maintainAspect = this.querySelector("#maintainAspect");

    if (resizeWidth && state.width) {
      resizeWidth.value = state.width;
    }
    if (resizeHeight && state.height) {
      resizeHeight.value = state.height;
    }
    if (maintainAspect && state.maintainAspect !== undefined) {
      maintainAspect.checked = state.maintainAspect;
      this.handleAspectToggle();
    }
  }

  reset() {
    const resizeWidth = this.querySelector("#resizeWidth");
    const resizeHeight = this.querySelector("#resizeHeight");
    const maintainAspect = this.querySelector("#maintainAspect");

    if (resizeWidth) resizeWidth.value = "";
    if (resizeHeight) resizeHeight.value = "";
    if (maintainAspect) {
      maintainAspect.checked = true;
      this.handleAspectToggle();
    }

    this.showStatus("Reset to defaults");
    setTimeout(() => this.showStatus(""), 2000);
  }
}

// Register the custom element
customElements.define("resize-operator", ResizeOperator);
