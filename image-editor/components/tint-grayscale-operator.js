/**
 * Tint/Grayscale Operator Web Component
 * Handles tint and grayscale operations for images
 */
class TintGrayscaleOperator extends HTMLElement {
  constructor() {
    super();
    this.currentImage = null;
    this.vips = null;
    this.isProcessing = false;
    this.activeTab = "tint";

    // Bind methods to preserve context
    this.switchSubTab = this.switchSubTab.bind(this);
    this.applyTint = this.applyTint.bind(this);
    this.applyGrayscale = this.applyGrayscale.bind(this);
    this.syncSliders = this.syncSliders.bind(this);
    this.setColorPreset = this.setColorPreset.bind(this);
    this.setGrayscalePreset = this.setGrayscalePreset.bind(this);
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
                    padding: 1rem;
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
                
                /* Sub-tabs */
                .sub-tabs {
                    display: flex;
                    gap: 0.25rem;
                    margin-bottom: 1.5rem;
                    background: var(--bg-secondary);
                    padding: 0.25rem;
                    border-radius: 6px;
                }
                
                .sub-tab-btn {
                    flex: 1;
                    padding: 0.6rem 1rem;
                    background: transparent;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                    transition: all 0.2s ease;
                    font-weight: 500;
                }
                
                .sub-tab-btn:hover {
                    background: var(--bg-primary);
                }
                
                .sub-tab-btn.active {
                    background: var(--primary-color);
                    color: white;
                }
                
                .sub-tab-content {
                    display: none;
                }
                
                .sub-tab-content.active {
                    display: block;
                }
                
                .operation-controls {
                    display: flex;
                    gap: 1.5rem;
                }
                
                .control-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                
                .control-group label {
                    font-weight: 500;
                    color: var(--text-primary);
                    font-size: 0.95rem;
                }
                
                .color-control {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: 6px;
                }
                
                .color-picker-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .color-picker {
                    width: 60px;
                    height: 60px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                    transition: all 0.2s ease;
                }
                
                .color-picker:hover {
                    transform: scale(1.05);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
                }
                
                .color-value {
                    font-family: monospace;
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    background: var(--bg-primary);
                    padding: 0.25rem 0.5rem;
                    border-radius: 3px;
                    border: 1px solid var(--border-color);
                }
                
                .opacity-control {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .opacity-label {
                    font-size: 0.9rem;
                    color: var(--text-primary);
                    font-weight: 500;
                }
                
                .slider-container {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                
                .slider-container input[type="range"] {
                    flex: 1;
                    height: 6px;
                    border-radius: 3px;
                    background: var(--bg-primary);
                    outline: none;
                    transition: all 0.2s ease;
                }
                
                .slider-container input[type="range"]::-webkit-slider-thumb {
                    appearance: none;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: var(--primary-color);
                    cursor: pointer;
                    border: 2px solid white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    transition: all 0.2s ease;
                }
                
                .slider-container input[type="range"]::-webkit-slider-thumb:hover {
                    transform: scale(1.1);
                    box-shadow: 0 3px 6px rgba(0,0,0,0.3);
                }
                
                .slider-container input[type="range"]::-moz-range-thumb {
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: var(--primary-color);
                    cursor: pointer;
                    border: 2px solid white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                
                .slider-container input[type="number"] {
                    width: 70px;
                    padding: 0.4rem;
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    background: var(--bg-primary);
                    color: var(--text-primary);
                    font-size: 0.85rem;
                    text-align: center;
                }
                
                .slider-container input[type="number"]:focus {
                    outline: none;
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 2px var(--primary-color)20;
                }
                
                .btn-enhanced {
                    padding: 0.6rem 1.5rem;
                    background: var(--primary-color);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.95rem;
                    font-weight: 500;
                    transition: all 0.2s ease;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    align-self: center;
                    min-width: 140px;
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
                
                .preset-colors {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(40px, 1fr));
                    gap: 0.5rem;
                    margin-top: 0.5rem;
                }
                
                .preset-color {
                    width: 40px;
                    height: 40px;
                    border: 2px solid var(--border-color);
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    position: relative;
                }
                
                .preset-color:hover {
                    transform: scale(1.1);
                    border-color: var(--primary-color);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                }
                
                .preset-color::after {
                    content: attr(title);
                    position: absolute;
                    bottom: -20px;
                    left: 50%;
                    transform: translateX(-50%);
                    font-size: 0.7rem;
                    color: var(--text-secondary);
                    white-space: nowrap;
                }
                
                .preset-buttons {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                    margin-top: 0.5rem;
                }
                
                .preset-btn {
                    padding: 0.3rem 0.6rem;
                    background: var(--bg-primary);
                    color: var(--text-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    transition: all 0.2s ease;
                }
                
                .preset-btn:hover {
                    background: var(--primary-color);
                    color: white;
                    border-color: var(--primary-color);
                }
                
                
                @media (max-width: 768px) {
                    .color-control {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 1rem;
                    }
                    
                    .color-picker-container {
                        align-self: center;
                    }
                    
                    .slider-container {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 0.5rem;
                    }
                    
                    .slider-container input[type="number"] {
                        width: 100%;
                    }
                    
                    .preset-colors {
                        grid-template-columns: repeat(6, 1fr);
                    }
                    
                    .sub-tabs {
                        flex-direction: column;
                        gap: 0.25rem;
                    }
                    
                    .sub-tab-btn {
                        flex: none;
                    }
                }
            </style>
            
            <div class="operator-container">
                <div class="operator-header">
                    <h3 class="operator-title">Tint/Grayscale</h3>
                    <div class="operator-status" id="status"></div>
                </div>
                
                <!-- Sub-tabs -->
                <div class="sub-tabs">
                    <button class="sub-tab-btn active" data-subtab="tint">Tint</button>
                    <button class="sub-tab-btn" data-subtab="grayscale">Grayscale</button>
                </div>

                <!-- Tint Tab -->
                <div id="tint" class="sub-tab-content active">
                    <div class="operation-controls">
                        <div class="control-group">
                            <label>Color & Opacity</label>
                            <div class="color-control">
                                <div class="color-picker-container">
                                    <input type="color" id="tintColor" class="color-picker" value="#ff0000" />
                                    <div class="color-value" id="colorValue">#FF0000</div>
                                </div>
                                <div class="opacity-control">
                                    <div class="opacity-label">Opacity</div>
                                    <div class="slider-container">
                                        <input type="range" id="tintOpacity" min="0" max="100" value="50" />
                                        <input type="number" id="tintOpacityNum" min="0" max="100" value="50" />
                                        <span>%</span>
                                    </div>
                                </div>
                            </div>
                            <div class="preset-colors">
                                <div class="preset-color" style="background: #ff0000" data-color="#ff0000" title="Red"></div>
                                <div class="preset-color" style="background: #ff8800" data-color="#ff8800" title="Orange"></div>
                                <div class="preset-color" style="background: #ffff00" data-color="#ffff00" title="Yellow"></div>
                                <div class="preset-color" style="background: #00ff00" data-color="#00ff00" title="Green"></div>
                                <div class="preset-color" style="background: #00ffff" data-color="#00ffff" title="Cyan"></div>
                                <div class="preset-color" style="background: #0088ff" data-color="#0088ff" title="Blue"></div>
                                <div class="preset-color" style="background: #8800ff" data-color="#8800ff" title="Purple"></div>
                                <div class="preset-color" style="background: #ff0088" data-color="#ff0088" title="Magenta"></div>
                            </div>
                        </div>
                        
                        <button id="applyTintBtn" class="btn-enhanced">Apply Tint</button>
                        
                    </div>
                </div>

                <!-- Grayscale Tab -->
                <div id="grayscale" class="sub-tab-content">
                    <div class="operation-controls">
                        <div class="control-group">
                            <label for="grayscaleThreshold">Threshold</label>
                            <div class="slider-container">
                                <input type="range" id="grayscaleThreshold" min="0" max="255" value="128" />
                                <input type="number" id="grayscaleThresholdNum" min="0" max="255" value="128" />
                            </div>
                            <div class="preset-buttons">
                                <button class="preset-btn" data-threshold="64">High Contrast</button>
                                <button class="preset-btn" data-threshold="128">Balanced</button>
                                <button class="preset-btn" data-threshold="192">Soft</button>
                                <button class="preset-btn" data-threshold="0">Pure B&W</button>
                            </div>
                        </div>
                        
                        <button id="applyGrayscaleBtn" class="btn-enhanced">Apply Grayscale</button>
                        
                    </div>
                </div>
            </div>
        `;
  }

  bindEvents() {
    // Sub-tab buttons
    this.querySelectorAll(".sub-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.switchSubTab(btn.dataset.subtab);
      });
    });

    // Color picker
    const tintColor = this.querySelector("#tintColor");
    tintColor?.addEventListener("input", (e) => {
      const colorValue = this.querySelector("#colorValue");
      if (colorValue) colorValue.textContent = e.target.value.toUpperCase();
    });

    // Opacity slider sync
    this.querySelector("#tintOpacity")?.addEventListener("input", (e) => {
      this.syncSliders("opacity", e.target.value);
    });

    this.querySelector("#tintOpacityNum")?.addEventListener("input", (e) => {
      this.syncSliders("opacity", e.target.value);
    });

    // Grayscale threshold slider sync
    this.querySelector("#grayscaleThreshold")?.addEventListener(
      "input",
      (e) => {
        this.syncSliders("threshold", e.target.value);
      }
    );

    this.querySelector("#grayscaleThresholdNum")?.addEventListener(
      "input",
      (e) => {
        this.syncSliders("threshold", e.target.value);
      }
    );

    // Apply buttons
    this.querySelector("#applyTintBtn")?.addEventListener(
      "click",
      this.applyTint
    );
    this.querySelector("#applyGrayscaleBtn")?.addEventListener(
      "click",
      this.applyGrayscale
    );

    // Preset color buttons
    this.querySelectorAll(".preset-color").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.setColorPreset(btn.dataset.color);
      });
    });

    // Preset threshold buttons
    this.querySelectorAll(".preset-btn[data-threshold]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.setGrayscalePreset(btn.dataset.threshold);
      });
    });
  }

  switchSubTab(subtabId) {
    // Remove active class from all sub-tabs and sub-content
    this.querySelectorAll(".sub-tab-btn").forEach((btn) =>
      btn.classList.remove("active")
    );
    this.querySelectorAll(".sub-tab-content").forEach((content) =>
      content.classList.remove("active")
    );

    // Add active class to clicked sub-tab and corresponding content
    this.querySelector(`[data-subtab="${subtabId}"]`).classList.add("active");
    this.querySelector(`#${subtabId}`).classList.add("active");

    this.activeTab = subtabId;
  }

  syncSliders(type, value) {
    if (type === "opacity") {
      const slider = this.querySelector("#tintOpacity");
      const numberInput = this.querySelector("#tintOpacityNum");

      if (slider) slider.value = value;
      if (numberInput) numberInput.value = value;
    } else if (type === "threshold") {
      const slider = this.querySelector("#grayscaleThreshold");
      const numberInput = this.querySelector("#grayscaleThresholdNum");

      if (slider) slider.value = value;
      if (numberInput) numberInput.value = value;
    }
  }

  setColorPreset(color) {
    const tintColor = this.querySelector("#tintColor");
    const colorValue = this.querySelector("#colorValue");

    if (tintColor) tintColor.value = color;
    if (colorValue) colorValue.textContent = color.toUpperCase();
  }

  setGrayscalePreset(threshold) {
    this.syncSliders("threshold", threshold);
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

  showStatus(message, type = "info") {
    const statusEl = this.querySelector("#status");
    if (!statusEl) return;

    statusEl.textContent = message;
    statusEl.className = "operator-status";

    if (type === "processing") {
      statusEl.classList.add("processing");
    }
  }

  async applyTint() {
    if (!this.currentImage || !this.vips || this.isProcessing) {
      return;
    }

    try {
      this.isProcessing = true;
      this.showStatus("Applying tint...", "processing");
      this.updateDisabledState();

      const tintColor = this.querySelector("#tintColor");
      const tintOpacity = this.querySelector("#tintOpacity");

      const color = tintColor.value;
      const opacity = parseInt(tintOpacity.value) / 100;

      console.log("Tint values:", { color, opacity });

      // Convert hex to RGB then to LAB for proper tinting
      const r = parseInt(color.substr(1, 2), 16);
      const g = parseInt(color.substr(3, 2), 16);
      const b = parseInt(color.substr(5, 2), 16);

      // Apply tint using VIPS LAB-based tinting (same logic as original)
      const tintedImage =
        this.currentImage
          .colourspace("srgb")
          .call("tint_lab", [r, g, b, opacity]) ||
        (await this.applyTintFallback(this.currentImage, r, g, b, opacity));

      // Emit custom event with the result
      this.dispatchEvent(
        new CustomEvent("operation-applied", {
          detail: {
            type: "tint",
            description: `Tint ${color} (${Math.round(opacity * 100)}%)`,
            image: tintedImage,
            operatorName: "tint-grayscale",
          },
          bubbles: true,
        })
      );

      this.showStatus("Tint applied successfully!");
    } catch (error) {
      console.error("Tint failed:", error);
      this.dispatchEvent(
        new CustomEvent("operation-error", {
          detail: {
            type: "tint",
            error: error.message,
            operatorName: "tint-grayscale",
          },
          bubbles: true,
        })
      );
      this.showStatus("Tint failed");
    } finally {
      this.isProcessing = false;
      this.updateDisabledState();

      // Clear status after 3 seconds
      setTimeout(() => this.showStatus(""), 3000);
    }
  }

  async applyTintFallback(image, r, g, b, opacity) {
    // Fallback implementation using the original logic
    console.log(
      "Applying LAB-based tint with RGB:",
      r,
      g,
      b,
      "opacity:",
      opacity
    );

    // Get original colorspace
    const originalColorspace = image.interpretation;
    console.log("Original colorspace:", originalColorspace);

    // Create a small RGB image to convert to LAB for the tint color
    const tintRgb = this.vips.Image.black(1, 1, { bands: 3 }).add([r, g, b]);
    const tintLab = tintRgb.colourspace("lab");

    // Extract LAB values from the tint color
    const labPixel = tintLab.getpoint(0, 0);
    const tintChroma = [labPixel[1], labPixel[2]]; // A and B channels

    console.log("Tint LAB chroma:", tintChroma);

    // Convert image to LAB and extract luminance
    const imageLab = image.colourspace("lab");
    const luminance = imageLab.extractBand(0);

    // Create tinted version by combining original L with tint chroma
    const tinted = luminance
      .bandjoin(tintChroma)
      .copy({ interpretation: "lab" })
      .colourspace(originalColorspace);

    // Handle alpha channel if present
    let result = tinted;
    if (image.hasAlpha()) {
      const alpha = image.extractBand(image.bands - 1);
      result = result.bandjoin(alpha);
    }

    // Blend based on opacity
    if (opacity < 1.0) {
      result = image
        .linear([1 - opacity], [0])
        .add(result.linear([opacity], [0]));
    }

    return result;
  }

  async applyGrayscale() {
    if (!this.currentImage || !this.vips || this.isProcessing) {
      return;
    }

    try {
      this.isProcessing = true;
      this.showStatus("Applying grayscale...", "processing");
      this.updateDisabledState();

      const grayscaleThreshold = this.querySelector("#grayscaleThreshold");
      const threshold = parseInt(grayscaleThreshold.value);

      console.log("Grayscale values:", { threshold });

      // Apply grayscale using VIPS
      const gray = this.currentImage.colourspace("b-w");
      const grayscaleImage = gray.more(threshold).ifthenelse(255, 0);

      // Emit custom event with the result
      this.dispatchEvent(
        new CustomEvent("operation-applied", {
          detail: {
            type: "grayscale",
            description: `Grayscale (threshold: ${threshold})`,
            image: grayscaleImage,
            operatorName: "tint-grayscale",
          },
          bubbles: true,
        })
      );

      this.showStatus("Grayscale applied successfully!");
    } catch (error) {
      console.error("Grayscale failed:", error);
      this.dispatchEvent(
        new CustomEvent("operation-error", {
          detail: {
            type: "grayscale",
            error: error.message,
            operatorName: "tint-grayscale",
          },
          bubbles: true,
        })
      );
      this.showStatus("Grayscale failed");
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
      this.showStatus("Ready");
    } else {
      this.setAttribute("disabled", "");
      this.showStatus("No image loaded");
    }
  }

  getState() {
    const tintColor = this.querySelector("#tintColor");
    const tintOpacity = this.querySelector("#tintOpacity");
    const grayscaleThreshold = this.querySelector("#grayscaleThreshold");

    return {
      activeTab: this.activeTab,
      tintColor: tintColor?.value || "#ff0000",
      tintOpacity: tintOpacity?.value || "50",
      grayscaleThreshold: grayscaleThreshold?.value || "128",
    };
  }

  setState(state) {
    if (state.activeTab) {
      this.switchSubTab(state.activeTab);
    }

    if (state.tintColor) {
      this.setColorPreset(state.tintColor);
    }

    if (state.tintOpacity) {
      this.syncSliders("opacity", state.tintOpacity);
    }

    if (state.grayscaleThreshold) {
      this.syncSliders("threshold", state.grayscaleThreshold);
    }
  }

  reset() {
    // Reset tint
    this.setColorPreset("#ff0000");
    this.syncSliders("opacity", "50");

    // Reset grayscale
    this.syncSliders("threshold", "128");

    // Reset to tint tab
    this.switchSubTab("tint");

    this.showStatus("Reset to defaults");
    setTimeout(() => this.showStatus(""), 2000);
  }
}

// Register the custom element
customElements.define("tint-grayscale-operator", TintGrayscaleOperator);
