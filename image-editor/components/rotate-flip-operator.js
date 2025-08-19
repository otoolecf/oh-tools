/**
 * Rotate/Flip Operator Web Component
 * Handles rotation and flip operations for images
 */
class RotateFlipOperator extends HTMLElement {
  constructor() {
    super();
    this.currentImage = null;
    this.vips = null;
    this.isProcessing = false;

    // Bind methods to preserve context
    this.handleRotationChange = this.handleRotationChange.bind(this);
    this.applyRotation = this.applyRotation.bind(this);
    this.applyFlip = this.applyFlip.bind(this);
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
                
                .operation-controls {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 1rem;
                    align-items: end;
                }
                
                .control-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    min-width: 120px;
                }
                
                .control-group label {
                    font-weight: 500;
                    color: var(--text-primary);
                    font-size: 0.9rem;
                }
                
                .control-group select,
                .control-group input {
                    padding: 0.5rem;
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    background: var(--bg-primary);
                    color: var(--text-primary);
                    font-size: 0.9rem;
                }
                
                .control-group select:focus,
                .control-group input:focus {
                    outline: none;
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 2px var(--primary-color)20;
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
                    min-height: 40px;
                    white-space: nowrap;
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
                
                .hidden {
                    display: none !important;
                }
                
                .action-buttons {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }
                
                .action-buttons .btn-enhanced {
                    flex: 1;
                    min-width: 120px;
                }
                
                @media (max-width: 768px) {
                    .operation-controls {
                        align-items: stretch;
                    }
                    
                    .control-group {
                        min-width: unset;
                    }
                    
                    .action-buttons {
                        flex-direction: column;
                    }
                }
            </style>
            
            <div class="operator-container">
                <div class="operator-header">
                    <h3 class="operator-title">Rotate/Flip</h3>
                    <div class="operator-status" id="status"></div>
                </div>
                
                <div class="operation-controls">
                    <div class="control-group">
                        <label for="rotateAngle">Rotation</label>
                        <select id="rotateAngle">
                            <option value="90">90° Clockwise</option>
                            <option value="180">180°</option>
                            <option value="270">270° Clockwise</option>
                            <option value="custom">Custom Angle</option>
                        </select>
                    </div>
                    
                    <div class="control-group hidden" id="customAngleGroup">
                        <label for="customAngle">Custom Angle (degrees)</label>
                        <input type="number" id="customAngle" min="-360" max="360" step="0.1" placeholder="0" />
                    </div>
                    
                    <div class="control-group">
                        <div class="action-buttons">
                            <button id="applyRotateBtn" class="btn-enhanced">Apply Rotation</button>
                            <button id="flipHBtn" class="btn-enhanced">Flip Horizontal</button>
                            <button id="flipVBtn" class="btn-enhanced">Flip Vertical</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  bindEvents() {
    const rotateAngle = this.querySelector("#rotateAngle");
    const applyRotateBtn = this.querySelector("#applyRotateBtn");
    const flipHBtn = this.querySelector("#flipHBtn");
    const flipVBtn = this.querySelector("#flipVBtn");

    rotateAngle?.addEventListener("change", this.handleRotationChange);
    applyRotateBtn?.addEventListener("click", this.applyRotation);
    flipHBtn?.addEventListener("click", () => this.applyFlip("horizontal"));
    flipVBtn?.addEventListener("click", () => this.applyFlip("vertical"));
  }

  handleRotationChange() {
    const rotateAngle = this.querySelector("#rotateAngle");
    const customAngleGroup = this.querySelector("#customAngleGroup");

    if (rotateAngle.value === "custom") {
      customAngleGroup.classList.remove("hidden");
    } else {
      customAngleGroup.classList.add("hidden");
    }
  }

  updateDisabledState() {
    const disabled = this.hasAttribute("disabled");
    const buttons = this.querySelectorAll("button");
    const inputs = this.querySelectorAll("input, select");

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

  async applyRotation() {
    if (!this.currentImage || !this.vips || this.isProcessing) {
      return;
    }

    try {
      this.isProcessing = true;
      this.showStatus("Applying rotation...", "processing");
      this.updateDisabledState();

      const rotateAngle = this.querySelector("#rotateAngle");
      const customAngle = this.querySelector("#customAngle");

      let angle;
      if (rotateAngle.value === "custom") {
        angle = parseFloat(customAngle.value) || 0;
      } else {
        angle = parseInt(rotateAngle.value);
      }

      // Apply rotation using VIPS
      const rotatedImage = this.currentImage.rotate(angle);

      // Emit custom event with the result
      this.dispatchEvent(
        new CustomEvent("operation-applied", {
          detail: {
            type: "rotation",
            description: `Rotate ${angle}°`,
            image: rotatedImage,
            operatorName: "rotate-flip",
          },
          bubbles: true,
        })
      );

      this.showStatus("Rotation applied successfully!");
    } catch (error) {
      console.error("Rotation failed:", error);
      this.dispatchEvent(
        new CustomEvent("operation-error", {
          detail: {
            type: "rotation",
            error: error.message,
            operatorName: "rotate-flip",
          },
          bubbles: true,
        })
      );
      this.showStatus("Rotation failed");
    } finally {
      this.isProcessing = false;
      this.updateDisabledState();

      // Clear status after 3 seconds
      setTimeout(() => this.showStatus(""), 3000);
    }
  }

  async applyFlip(direction) {
    if (!this.currentImage || !this.vips || this.isProcessing) {
      return;
    }

    try {
      this.isProcessing = true;
      this.showStatus(`Applying ${direction} flip...`, "processing");
      this.updateDisabledState();

      // Apply flip using VIPS (0 = horizontal, 1 = vertical)
      const flipDirection = direction === "horizontal" ? 0 : 1;
      const flippedImage = this.currentImage.flip(flipDirection);

      // Emit custom event with the result
      this.dispatchEvent(
        new CustomEvent("operation-applied", {
          detail: {
            type: "flip",
            description: `Flip ${direction}`,
            image: flippedImage,
            operatorName: "rotate-flip",
          },
          bubbles: true,
        })
      );

      this.showStatus(`${direction} flip applied successfully!`);
    } catch (error) {
      console.error("Flip failed:", error);
      this.dispatchEvent(
        new CustomEvent("operation-error", {
          detail: {
            type: "flip",
            error: error.message,
            operatorName: "rotate-flip",
          },
          bubbles: true,
        })
      );
      this.showStatus("Flip failed");
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
    const rotateAngle = this.querySelector("#rotateAngle");
    const customAngle = this.querySelector("#customAngle");

    return {
      rotateAngle: rotateAngle?.value || "90",
      customAngle: customAngle?.value || "0",
    };
  }

  setState(state) {
    const rotateAngle = this.querySelector("#rotateAngle");
    const customAngle = this.querySelector("#customAngle");

    if (rotateAngle && state.rotateAngle) {
      rotateAngle.value = state.rotateAngle;
      this.handleRotationChange();
    }

    if (customAngle && state.customAngle) {
      customAngle.value = state.customAngle;
    }
  }

  reset() {
    const rotateAngle = this.querySelector("#rotateAngle");
    const customAngle = this.querySelector("#customAngle");
    const customAngleGroup = this.querySelector("#customAngleGroup");

    if (rotateAngle) rotateAngle.value = "90";
    if (customAngle) customAngle.value = "0";
    if (customAngleGroup) customAngleGroup.classList.add("hidden");

    this.showStatus("Reset to defaults");
    setTimeout(() => this.showStatus(""), 2000);
  }
}

// Register the custom element
customElements.define("rotate-flip-operator", RotateFlipOperator);
