/**
 * Edge Detection Operator Web Component
 * Handles edge detection operations using Canny and Sobel algorithms
 */
class EdgeDetectionOperator extends HTMLElement {
    constructor() {
        super();
        this.currentImage = null;
        this.vips = null;
        this.isProcessing = false;
        this.selectedMethod = 'canny';
        
        // Bind methods to preserve context
        this.applyEdgeDetection = this.applyEdgeDetection.bind(this);
        this.syncSliders = this.syncSliders.bind(this);
        this.switchMethod = this.switchMethod.bind(this);
        this.setPreset = this.setPreset.bind(this);
    }

    static get observedAttributes() {
        return ['disabled'];
    }

    connectedCallback() {
        this.render();
        this.bindEvents();
        this.updateDisabledState();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'disabled') {
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
                
                .methods-section {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: 6px;
                    padding: 1.25rem;
                    margin-bottom: 1.5rem;
                }
                
                .method-selector {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 1.5rem;
                }
                
                .method-radio {
                    display: none;
                }
                
                .method-label {
                    flex: 1;
                    padding: 0.5rem 1rem;
                    background: var(--bg-primary);
                    border: 2px solid var(--border-color);
                    border-radius: 4px;
                    cursor: pointer;
                    text-align: center;
                    transition: all 0.2s ease;
                    font-weight: 500;
                    font-size: 0.85rem;
                }
                
                .method-label:hover {
                    border-color: var(--primary-color);
                    background: var(--surface-light);
                }
                
                .method-radio:checked + .method-label {
                    background: var(--primary-color);
                    color: white;
                    border-color: var(--primary-color);
                }
                
                
                
                .controls-section {
                    display: grid;
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
                    font-size: 0.9rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
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
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: var(--primary-color);
                    cursor: pointer;
                    border: 3px solid white;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                    transition: all 0.2s ease;
                }
                
                .slider-container input[type="range"]::-webkit-slider-thumb:hover {
                    transform: scale(1.1);
                    box-shadow: 0 3px 8px rgba(0,0,0,0.3);
                }
                
                .slider-container input[type="range"]::-moz-range-thumb {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: var(--primary-color);
                    cursor: pointer;
                    border: 3px solid white;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                }
                
                .slider-container input[type="number"] {
                    width: 80px;
                    padding: 0.5rem;
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
                
                .value-display {
                    font-family: monospace;
                    color: var(--primary-color);
                    font-weight: 600;
                    min-width: 60px;
                    text-align: right;
                    font-size: 0.9rem;
                }
                
                .preset-values {
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
                    font-size: 0.75rem;
                    transition: all 0.2s ease;
                }
                
                .preset-btn:hover {
                    background: var(--primary-color);
                    color: white;
                    border-color: var(--primary-color);
                }
                
                .btn-enhanced {
                    padding: 0.75rem 1.5rem;
                    background: var(--primary-color);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 1rem;
                    font-weight: 600;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    margin-top: 1rem;
                }
                
                .btn-enhanced:hover:not(:disabled) {
                    background: var(--primary-hover, var(--primary-color));
                    transform: translateY(-1px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                }
                
                .btn-enhanced:disabled {
                    background: var(--surface-light);
                    color: var(--text-secondary);
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }
                
                
                .canny-controls {
                    display: block;
                }
                
                .sobel-controls {
                    display: none;
                }
                
                .sobel-controls.active {
                    display: block;
                }
                
                .canny-controls.active {
                    display: block;
                }
                
                @media (max-width: 768px) {
                    .method-selector {
                        flex-direction: column;
                        gap: 0.5rem;
                    }
                    
                    .slider-container {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 0.5rem;
                    }
                    
                    .slider-container input[type="number"] {
                        width: 100%;
                    }
                    
                    .value-display {
                        text-align: center;
                    }
                    
                    .preset-values {
                        justify-content: center;
                    }
                }
            </style>
            
            <div class="operator-container">
                <div class="operator-header">
                    <h3 class="operator-title">Edge Detection</h3>
                    <div class="operator-status" id="status"></div>
                </div>
                
                <div class="methods-section">
                    <div class="method-selector">
                        <input type="radio" id="cannyMethod" name="edgeMethod" value="canny" class="method-radio" checked>
                        <label for="cannyMethod" class="method-label">
                            Canny
                        </label>
                        
                        <input type="radio" id="sobelMethod" name="edgeMethod" value="sobel" class="method-radio">
                        <label for="sobelMethod" class="method-label">
                            Sobel
                        </label>
                    </div>
                    
                </div>
                
                <div class="controls-section">
                    <div id="cannyControls" class="canny-controls active">
                        <div class="control-group">
                            <label for="cannySigma">
                                Sigma
                            </label>
                            <div class="slider-container">
                                <input type="range" id="cannySigma" min="0.5" max="3.0" value="1.4" step="0.1">
                                <input type="number" id="cannySigmaNum" min="0.5" max="3.0" value="1.4" step="0.1">
                                <div class="value-display" id="sigmaValue">1.4</div>
                            </div>
                            <div class="preset-values">
                                <button class="preset-btn" data-sigma="0.5">Sharp (0.5)</button>
                                <button class="preset-btn" data-sigma="1.0">Normal (1.0)</button>
                                <button class="preset-btn" data-sigma="1.4">Default (1.4)</button>
                                <button class="preset-btn" data-sigma="2.0">Smooth (2.0)</button>
                                <button class="preset-btn" data-sigma="3.0">Very Smooth (3.0)</button>
                            </div>
                        </div>
                    </div>
                    
                    <div id="sobelControls" class="sobel-controls">
                        <div class="control-group">
                            <label>
                                Sobel (no parameters)
                            </label>
                        </div>
                    </div>
                    
                    <button id="applyEdgeDetectionBtn" class="btn-enhanced">
                        Apply Edge Detection
                    </button>
                </div>
                
            </div>
        `;
    }

    bindEvents() {
        // Method selection
        this.querySelectorAll('input[name="edgeMethod"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.switchMethod(e.target.value);
            });
        });

        // Canny sigma slider sync
        this.querySelector('#cannySigma')?.addEventListener('input', (e) => {
            this.syncSliders('sigma', e.target.value);
        });
        
        this.querySelector('#cannySigmaNum')?.addEventListener('input', (e) => {
            this.syncSliders('sigma', e.target.value);
        });

        // Apply button
        this.querySelector('#applyEdgeDetectionBtn')?.addEventListener('click', this.applyEdgeDetection);

        // Preset buttons
        this.querySelectorAll('.preset-btn[data-sigma]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setPreset('sigma', btn.dataset.sigma);
            });
        });
    }

    switchMethod(method) {
        this.selectedMethod = method;
        
        // Update controls visibility
        const cannyControls = this.querySelector('#cannyControls');
        const sobelControls = this.querySelector('#sobelControls');
        
        if (method === 'canny') {
            cannyControls?.classList.add('active');
            sobelControls?.classList.remove('active');
        } else {
            cannyControls?.classList.remove('active');
            sobelControls?.classList.add('active');
        }
    }

    syncSliders(type, value) {
        if (type === 'sigma') {
            const slider = this.querySelector('#cannySigma');
            const numberInput = this.querySelector('#cannySigmaNum');
            const display = this.querySelector('#sigmaValue');
            
            if (slider) slider.value = value;
            if (numberInput) numberInput.value = value;
            if (display) display.textContent = parseFloat(value).toFixed(1);
        }
    }

    setPreset(type, value) {
        if (type === 'sigma') {
            this.syncSliders('sigma', value);
        }
    }

    updateDisabledState() {
        const disabled = this.hasAttribute('disabled');
        const buttons = this.querySelectorAll('button');
        const inputs = this.querySelectorAll('input');
        
        buttons.forEach(btn => btn.disabled = disabled);
        inputs.forEach(input => input.disabled = disabled);
        
        if (disabled) {
            this.showStatus('Operator disabled');
        } else {
            this.showStatus('Ready');
        }
    }

    showStatus(message, type = 'info') {
        const statusEl = this.querySelector('#status');
        if (!statusEl) return;
        
        statusEl.textContent = message;
        statusEl.className = 'operator-status';
        
        if (type === 'processing') {
            statusEl.classList.add('processing');
        }
    }

    async applyEdgeDetection() {
        if (!this.currentImage || !this.vips || this.isProcessing) {
            return;
        }

        try {
            this.isProcessing = true;
            this.showStatus(`Applying ${this.selectedMethod} edge detection...`, 'processing');
            this.updateDisabledState();

            let edgeImage;
            let description;

            if (this.selectedMethod === 'canny') {
                const cannySigma = this.querySelector('#cannySigma');
                const sigma = parseFloat(cannySigma.value);
                
                console.log('Applying Canny edge detection with sigma:', sigma);
                
                // Apply Canny edge detection
                edgeImage = this.currentImage.canny({ sigma: sigma });
                description = `Canny edge detection (sigma: ${sigma})`;
                
            } else if (this.selectedMethod === 'sobel') {
                console.log('Applying Sobel edge detection');
                
                // Apply Sobel edge detection
                edgeImage = this.currentImage.sobel();
                description = 'Sobel edge detection';
            }
            
            // Emit custom event with the result
            this.dispatchEvent(new CustomEvent('operation-applied', {
                detail: {
                    type: this.selectedMethod + '-edge',
                    description: description,
                    image: edgeImage,
                    operatorName: 'edge-detection'
                },
                bubbles: true
            }));

            this.showStatus(`${this.selectedMethod.charAt(0).toUpperCase() + this.selectedMethod.slice(1)} edge detection applied successfully!`);
            
        } catch (error) {
            console.error('Edge detection failed:', error);
            this.dispatchEvent(new CustomEvent('operation-error', {
                detail: {
                    type: this.selectedMethod + '-edge',
                    error: error.message,
                    operatorName: 'edge-detection'
                },
                bubbles: true
            }));
            this.showStatus('Edge detection failed');
        } finally {
            this.isProcessing = false;
            this.updateDisabledState();
            
            // Clear status after 3 seconds
            setTimeout(() => this.showStatus('Ready'), 3000);
        }
    }

    // Public API methods
    setImage(image, vips) {
        this.currentImage = image;
        this.vips = vips;
        
        if (image && vips) {
            this.removeAttribute('disabled');
            this.showStatus('Ready');
        } else {
            this.setAttribute('disabled', '');
            this.showStatus('No image loaded');
        }
    }

    getState() {
        const cannySigma = this.querySelector('#cannySigma');
        
        return {
            method: this.selectedMethod,
            cannySigma: cannySigma?.value || '1.4'
        };
    }

    setState(state) {
        if (state.method) {
            this.selectedMethod = state.method;
            const methodRadio = this.querySelector(`input[value="${state.method}"]`);
            if (methodRadio) {
                methodRadio.checked = true;
                this.switchMethod(state.method);
            }
        }
        
        if (state.cannySigma) {
            this.syncSliders('sigma', state.cannySigma);
        }
    }

    reset() {
        // Reset to Canny method with default sigma
        this.selectedMethod = 'canny';
        const cannyRadio = this.querySelector('#cannyMethod');
        if (cannyRadio) {
            cannyRadio.checked = true;
            this.switchMethod('canny');
        }
        
        this.syncSliders('sigma', '1.4');
        
        this.showStatus('Reset to defaults');
        setTimeout(() => this.showStatus('Ready'), 2000);
    }
}

// Register the custom element
customElements.define('edge-detection-operator', EdgeDetectionOperator);