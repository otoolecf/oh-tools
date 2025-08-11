/**
 * Blur/Sharpen Operator Web Component
 * Handles blur and sharpen operations for images
 */
console.log('blur-sharpen-operator.js script loading...');
class BlurSharpenOperator extends HTMLElement {
    constructor() {
        super();
        this.currentImage = null;
        this.vips = null;
        this.isProcessing = false;
        
        // Bind methods to preserve context
        this.applyBlur = this.applyBlur.bind(this);
        this.applySharpen = this.applySharpen.bind(this);
        this.syncSliders = this.syncSliders.bind(this);
        this.resetToDefaults = this.resetToDefaults.bind(this);
    }

    static get observedAttributes() {
        return ['disabled'];
    }

    connectedCallback() {
        console.log('BlurSharpenOperator connected');
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
        console.log('BlurSharpenOperator rendering');
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
                
                .effects-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                }
                
                .effect-section {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: 6px;
                    padding: 1rem;
                }
                
                .effect-title {
                    margin: 0 0 0.5rem 0;
                    color: var(--text-primary);
                    font-size: 0.9rem;
                    font-weight: 600;
                }
                
                .control-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                }
                
                .control-group label {
                    font-weight: 500;
                    color: var(--text-primary);
                    font-size: 0.9rem;
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
                
                .value-indicator {
                    font-family: monospace;
                    color: var(--primary-color);
                    font-weight: 600;
                    min-width: 45px;
                    text-align: right;
                }
                
                .btn-enhanced {
                    padding: 0.6rem 1.2rem;
                    background: var(--primary-color);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    font-weight: 500;
                    transition: all 0.2s ease;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    width: 100%;
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
                    background: var(--bg-primary);
                    color: var(--text-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    transition: all 0.2s ease;
                    width: 100%;
                    margin-top: 0.5rem;
                }
                
                .btn-secondary:hover:not(:disabled) {
                    background: var(--bg-secondary);
                    border-color: var(--primary-color);
                }
                
                
                .preset-values {
                    display: flex;
                    gap: 0.25rem;
                    margin-top: 0.5rem;
                }
                
                .preset-btn {
                    padding: 0.2rem 0.4rem;
                    background: var(--bg-primary);
                    color: var(--text-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 0.7rem;
                    transition: all 0.2s ease;
                }
                
                .preset-btn:hover {
                    background: var(--primary-color);
                    color: white;
                    border-color: var(--primary-color);
                }
                
                @media (max-width: 768px) {
                    .effects-grid {
                        grid-template-columns: 1fr;
                        gap: 1.5rem;
                    }
                    
                    .slider-container {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 0.5rem;
                    }
                    
                    .slider-container input[type="number"] {
                        width: 100%;
                    }
                    
                    .value-indicator {
                        text-align: center;
                    }
                }
            </style>
            
            <div class="operator-container">
                <div class="operator-header">
                    <h3 class="operator-title">Blur/Sharpen</h3>
                    <div class="operator-status" id="status"></div>
                </div>
                
                <div class="effects-grid">
                    <!-- Blur Section -->
                    <div class="effect-section">
                        <h4 class="effect-title">Blur</h4>
                        
                        <div class="control-group">
                            <label for="blurRadius">Blur Radius</label>
                            <div class="slider-container">
                                <input type="range" id="blurRadius" min="0.1" max="10.0" value="2.0" step="0.1" />
                                <input type="number" id="blurRadiusNum" min="0.1" max="10.0" value="2.0" step="0.1" />
                            </div>
                            <div class="preset-values">
                                <button class="preset-btn" data-blur="0.5">Subtle</button>
                                <button class="preset-btn" data-blur="2.0">Medium</button>
                                <button class="preset-btn" data-blur="5.0">Strong</button>
                                <button class="preset-btn" data-blur="8.0">Heavy</button>
                            </div>
                        </div>
                        
                        <button id="applyBlurBtn" class="btn-enhanced">Apply Blur</button>
                        
                    </div>
                    
                    <!-- Sharpen Section -->
                    <div class="effect-section">
                        <h4 class="effect-title">Sharpen</h4>
                        
                        <div class="control-group">
                            <label for="sharpenSigma">Sharpen Intensity</label>
                            <div class="slider-container">
                                <input type="range" id="sharpenSigma" min="1.0" max="10.0" value="3.0" step="0.1" />
                                <input type="number" id="sharpenSigmaNum" min="1.0" max="10.0" value="3.0" step="0.1" />
                            </div>
                            <div class="preset-values">
                                <button class="preset-btn" data-sharpen="1.5">Gentle</button>
                                <button class="preset-btn" data-sharpen="3.0">Normal</button>
                                <button class="preset-btn" data-sharpen="6.0">Strong</button>
                                <button class="preset-btn" data-sharpen="9.0">Intense</button>
                            </div>
                        </div>
                        
                        <button id="applySharpenBtn" class="btn-enhanced">Apply Sharpen</button>
                        
                    </div>
                </div>
                
                <button id="resetDefaultsBtn" class="btn-secondary" style="margin-top: 1rem;">Reset to Defaults</button>
            </div>
        `;
    }

    bindEvents() {
        // Slider sync events
        this.querySelector('#blurRadius')?.addEventListener('input', (e) => {
            this.syncSliders('blur', e.target.value);
        });
        
        this.querySelector('#blurRadiusNum')?.addEventListener('input', (e) => {
            this.syncSliders('blur', e.target.value);
        });
        
        this.querySelector('#sharpenSigma')?.addEventListener('input', (e) => {
            this.syncSliders('sharpen', e.target.value);
        });
        
        this.querySelector('#sharpenSigmaNum')?.addEventListener('input', (e) => {
            this.syncSliders('sharpen', e.target.value);
        });

        // Apply buttons
        this.querySelector('#applyBlurBtn')?.addEventListener('click', this.applyBlur);
        this.querySelector('#applySharpenBtn')?.addEventListener('click', this.applySharpen);
        this.querySelector('#resetDefaultsBtn')?.addEventListener('click', this.resetToDefaults);

        // Preset buttons
        this.querySelectorAll('.preset-btn[data-blur]').forEach(btn => {
            btn.addEventListener('click', () => {
                const value = btn.dataset.blur;
                this.syncSliders('blur', value);
            });
        });

        this.querySelectorAll('.preset-btn[data-sharpen]').forEach(btn => {
            btn.addEventListener('click', () => {
                const value = btn.dataset.sharpen;
                this.syncSliders('sharpen', value);
            });
        });
    }

    syncSliders(type, value) {
        if (type === 'blur') {
            const slider = this.querySelector('#blurRadius');
            const numberInput = this.querySelector('#blurRadiusNum');
            
            if (slider) slider.value = value;
            if (numberInput) numberInput.value = value;
        } else if (type === 'sharpen') {
            const slider = this.querySelector('#sharpenSigma');
            const numberInput = this.querySelector('#sharpenSigmaNum');
            
            if (slider) slider.value = value;
            if (numberInput) numberInput.value = value;
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
            this.showStatus('');
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

    async applyBlur() {
        if (!this.currentImage || !this.vips || this.isProcessing) {
            return;
        }

        try {
            this.isProcessing = true;
            this.showStatus('Applying blur...', 'processing');
            this.updateDisabledState();

            const blurRadius = this.querySelector('#blurRadius');
            const radius = parseFloat(blurRadius.value);

            console.log('Blur values:', { radius });

            // Apply blur using VIPS gaussblur
            const blurredImage = this.currentImage.gaussblur(radius);
            
            // Emit custom event with the result
            this.dispatchEvent(new CustomEvent('operation-applied', {
                detail: {
                    type: 'blur',
                    description: `Blur (radius: ${radius})`,
                    image: blurredImage,
                    operatorName: 'blur-sharpen'
                },
                bubbles: true
            }));

            this.showStatus('Blur applied successfully!');
            
        } catch (error) {
            console.error('Blur failed:', error);
            this.dispatchEvent(new CustomEvent('operation-error', {
                detail: {
                    type: 'blur',
                    error: error.message,
                    operatorName: 'blur-sharpen'
                },
                bubbles: true
            }));
            this.showStatus('Blur failed');
        } finally {
            this.isProcessing = false;
            this.updateDisabledState();
            
            // Clear status after 3 seconds
            setTimeout(() => this.showStatus(''), 3000);
        }
    }

    async applySharpen() {
        if (!this.currentImage || !this.vips || this.isProcessing) {
            return;
        }

        try {
            this.isProcessing = true;
            this.showStatus('Applying sharpen...', 'processing');
            this.updateDisabledState();

            const sharpenSigma = this.querySelector('#sharpenSigma');
            const sigma = parseFloat(sharpenSigma.value);

            console.log('Sharpen values:', { sigma });

            // Apply sharpen using VIPS sharpen
            const sharpenedImage = this.currentImage.sharpen({ sigma: sigma });
            
            // Emit custom event with the result
            this.dispatchEvent(new CustomEvent('operation-applied', {
                detail: {
                    type: 'sharpen',
                    description: `Sharpen (sigma: ${sigma})`,
                    image: sharpenedImage,
                    operatorName: 'blur-sharpen'
                },
                bubbles: true
            }));

            this.showStatus('Sharpen applied successfully!');
            
        } catch (error) {
            console.error('Sharpen failed:', error);
            this.dispatchEvent(new CustomEvent('operation-error', {
                detail: {
                    type: 'sharpen',
                    error: error.message,
                    operatorName: 'blur-sharpen'
                },
                bubbles: true
            }));
            this.showStatus('Sharpen failed');
        } finally {
            this.isProcessing = false;
            this.updateDisabledState();
            
            // Clear status after 3 seconds
            setTimeout(() => this.showStatus(''), 3000);
        }
    }

    resetToDefaults() {
        this.syncSliders('blur', '2.0');
        this.syncSliders('sharpen', '3.0');
        this.showStatus('Reset to defaults');
        setTimeout(() => this.showStatus(''), 2000);
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
        const blurRadius = this.querySelector('#blurRadius');
        const sharpenSigma = this.querySelector('#sharpenSigma');
        
        return {
            blurRadius: blurRadius?.value || '2.0',
            sharpenSigma: sharpenSigma?.value || '3.0'
        };
    }

    setState(state) {
        if (state.blurRadius) {
            this.syncSliders('blur', state.blurRadius);
        }
        if (state.sharpenSigma) {
            this.syncSliders('sharpen', state.sharpenSigma);
        }
    }

    reset() {
        this.resetToDefaults();
    }
}

// Register the custom element
console.log('Attempting to define blur-sharpen-operator');
customElements.define('blur-sharpen-operator', BlurSharpenOperator);
console.log('blur-sharpen-operator defined successfully');