/**
 * Filters Operator Web Component
 * Handles various image filter operations
 */
class FiltersOperator extends HTMLElement {
    constructor() {
        super();
        this.currentImage = null;
        this.vips = null;
        this.isProcessing = false;
        
        // Bind methods to preserve context
        this.applySepia = this.applySepia.bind(this);
        this.applyVintage = this.applyVintage.bind(this);
        this.applyWarm = this.applyWarm.bind(this);
        this.applyCool = this.applyCool.bind(this);
        this.applyHighContrast = this.applyHighContrast.bind(this);
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
                
                .filters-grid {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }
                
                .filter-card {
                    flex: 1;
                    min-width: 120px;
                    text-align: center;
                }
                
                .btn-enhanced {
                    padding: 0.5rem 1rem;
                    background: var(--primary-color);
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.85rem;
                    font-weight: 500;
                    transition: all 0.2s ease;
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
                
                
                @media (max-width: 768px) {
                    .filters-grid {
                        grid-template-columns: 1fr;
                        gap: 1rem;
                    }
                    
                    .filter-card {
                        padding: 1rem;
                    }
                    
                    .filter-preview {
                        height: 50px;
                    }
                }
            </style>
            
            <div class="operator-container">
                <div class="operator-header">
                    <h3 class="operator-title">Filters</h3>
                    <div class="operator-status" id="status"></div>
                </div>
                
                <div class="filters-grid">
                    <div class="filter-card">
                        <button id="sepiaBtn" class="btn-enhanced">Sepia</button>
                    </div>
                    
                    <div class="filter-card">
                        <button id="vintageBtn" class="btn-enhanced">Vintage</button>
                    </div>
                    
                    <div class="filter-card">
                        <button id="warmBtn" class="btn-enhanced">Warm</button>
                    </div>
                    
                    <div class="filter-card">
                        <button id="coolBtn" class="btn-enhanced">Cool</button>
                    </div>
                    
                    <div class="filter-card">
                        <button id="contrastBtn" class="btn-enhanced">High Contrast</button>
                    </div>
                </div>
                
            </div>
        `;
    }

    bindEvents() {
        // Filter buttons
        this.querySelector('#sepiaBtn')?.addEventListener('click', this.applySepia);
        this.querySelector('#vintageBtn')?.addEventListener('click', this.applyVintage);
        this.querySelector('#warmBtn')?.addEventListener('click', this.applyWarm);
        this.querySelector('#coolBtn')?.addEventListener('click', this.applyCool);
        this.querySelector('#contrastBtn')?.addEventListener('click', this.applyHighContrast);
    }

    updateDisabledState() {
        const disabled = this.hasAttribute('disabled');
        const buttons = this.querySelectorAll('button');
        
        buttons.forEach(btn => btn.disabled = disabled);
        
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


    async applySepia() {
        if (!this.currentImage || !this.vips || this.isProcessing) {
            return;
        }

        try {
            this.isProcessing = true;
            this.showStatus('Applying sepia filter...', 'processing');
            this.updateDisabledState();

            console.log('Applying sepia filter');

            // Apply sepia using matrix transformation with alpha channel handling
            const sepiaMatrix = [
                [0.393, 0.769, 0.189],
                [0.349, 0.686, 0.168], 
                [0.272, 0.534, 0.131]
            ];
            
            let sepiaImage;
            if (this.currentImage.hasAlpha()) {
                // Separate alpha channel
                const withoutAlpha = this.currentImage.extractBand(0, { n: this.currentImage.bands - 1 });
                const alpha = this.currentImage.extractBand(this.currentImage.bands - 1);
                sepiaImage = withoutAlpha
                    .colourspace('srgb')
                    .recomb(sepiaMatrix)
                    .cast(this.vips.BandFormat.uchar)
                    .bandjoin(alpha);
            } else {
                sepiaImage = this.currentImage
                    .colourspace('srgb')
                    .recomb(sepiaMatrix)
                    .cast(this.vips.BandFormat.uchar);
            }
            
            // Emit custom event with the result
            this.dispatchEvent(new CustomEvent('operation-applied', {
                detail: {
                    type: 'sepia',
                    description: 'Sepia filter',
                    image: sepiaImage,
                    operatorName: 'filters'
                },
                bubbles: true
            }));

            this.showStatus('Sepia filter applied successfully!');
            
        } catch (error) {
            console.error('Sepia filter failed:', error);
            this.dispatchEvent(new CustomEvent('operation-error', {
                detail: {
                    type: 'sepia',
                    error: error.message,
                    operatorName: 'filters'
                },
                bubbles: true
            }));
            this.showStatus('Sepia filter failed');
        } finally {
            this.isProcessing = false;
            this.updateDisabledState();
            
            // Clear status after 3 seconds
            setTimeout(() => this.showStatus('Ready'), 3000);
        }
    }

    async applyVintage() {
        if (!this.currentImage || !this.vips || this.isProcessing) {
            return;
        }

        try {
            this.isProcessing = true;
            this.showStatus('Applying vintage filter...', 'processing');
            this.updateDisabledState();

            console.log('Applying vintage filter');

            // Apply vintage effect: reduce saturation, add warm tone, slight fade
            let vintageImage;
            if (this.currentImage.hasAlpha()) {
                // Separate alpha channel
                const withoutAlpha = this.currentImage.extractBand(0, { n: this.currentImage.bands - 1 });
                const alpha = this.currentImage.extractBand(this.currentImage.bands - 1);
                vintageImage = withoutAlpha
                    .colourspace('srgb')
                    .linear([0.9, 1.1, 0.8], [10, -5, 15]) // Warm tone adjustment
                    .multiply(0.85) // Fade effect
                    .add(20) // Lift shadows slightly
                    .bandjoin(alpha);
            } else {
                vintageImage = this.currentImage
                    .colourspace('srgb')
                    .linear([0.9, 1.1, 0.8], [10, -5, 15]) // Warm tone adjustment
                    .multiply(0.85) // Fade effect
                    .add(20); // Lift shadows slightly
            }
            
            // Emit custom event with the result
            this.dispatchEvent(new CustomEvent('operation-applied', {
                detail: {
                    type: 'vintage',
                    description: 'Vintage filter',
                    image: vintageImage,
                    operatorName: 'filters'
                },
                bubbles: true
            }));

            this.showStatus('Vintage filter applied successfully!');
            
        } catch (error) {
            console.error('Vintage filter failed:', error);
            this.dispatchEvent(new CustomEvent('operation-error', {
                detail: {
                    type: 'vintage',
                    error: error.message,
                    operatorName: 'filters'
                },
                bubbles: true
            }));
            this.showStatus('Vintage filter failed');
        } finally {
            this.isProcessing = false;
            this.updateDisabledState();
            
            // Clear status after 3 seconds
            setTimeout(() => this.showStatus('Ready'), 3000);
        }
    }

    async applyWarm() {
        if (!this.currentImage || !this.vips || this.isProcessing) {
            return;
        }

        try {
            this.isProcessing = true;
            this.showStatus('Applying warm filter...', 'processing');
            this.updateDisabledState();

            console.log('Applying warm filter');

            // Apply warm filter: enhance reds/yellows, reduce blues
            let warmImage;
            if (this.currentImage.hasAlpha()) {
                // Separate alpha channel
                const withoutAlpha = this.currentImage.extractBand(0, { n: this.currentImage.bands - 1 });
                const alpha = this.currentImage.extractBand(this.currentImage.bands - 1);
                warmImage = withoutAlpha
                    .colourspace('srgb')
                    .linear([1.15, 1.05, 0.9], [5, 2, -3]) // Boost warm tones, reduce cool
                    .bandjoin(alpha);
            } else {
                warmImage = this.currentImage
                    .colourspace('srgb')
                    .linear([1.15, 1.05, 0.9], [5, 2, -3]); // Boost warm tones, reduce cool
            }
            
            // Emit custom event with the result
            this.dispatchEvent(new CustomEvent('operation-applied', {
                detail: {
                    type: 'warm',
                    description: 'Warm filter',
                    image: warmImage,
                    operatorName: 'filters'
                },
                bubbles: true
            }));

            this.showStatus('Warm filter applied successfully!');
            
        } catch (error) {
            console.error('Warm filter failed:', error);
            this.dispatchEvent(new CustomEvent('operation-error', {
                detail: {
                    type: 'warm',
                    error: error.message,
                    operatorName: 'filters'
                },
                bubbles: true
            }));
            this.showStatus('Warm filter failed');
        } finally {
            this.isProcessing = false;
            this.updateDisabledState();
            
            // Clear status after 3 seconds
            setTimeout(() => this.showStatus('Ready'), 3000);
        }
    }

    async applyCool() {
        if (!this.currentImage || !this.vips || this.isProcessing) {
            return;
        }

        try {
            this.isProcessing = true;
            this.showStatus('Applying cool filter...', 'processing');
            this.updateDisabledState();

            console.log('Applying cool filter');

            // Apply cool filter: enhance blues/cyans, reduce warm tones
            let coolImage;
            if (this.currentImage.hasAlpha()) {
                // Separate alpha channel
                const withoutAlpha = this.currentImage.extractBand(0, { n: this.currentImage.bands - 1 });
                const alpha = this.currentImage.extractBand(this.currentImage.bands - 1);
                coolImage = withoutAlpha
                    .colourspace('srgb')
                    .linear([0.9, 1.05, 1.15], [-3, 2, 5]) // Reduce warm tones, boost cool
                    .bandjoin(alpha);
            } else {
                coolImage = this.currentImage
                    .colourspace('srgb')
                    .linear([0.9, 1.05, 1.15], [-3, 2, 5]); // Reduce warm tones, boost cool
            }
            
            // Emit custom event with the result
            this.dispatchEvent(new CustomEvent('operation-applied', {
                detail: {
                    type: 'cool',
                    description: 'Cool filter',
                    image: coolImage,
                    operatorName: 'filters'
                },
                bubbles: true
            }));

            this.showStatus('Cool filter applied successfully!');
            
        } catch (error) {
            console.error('Cool filter failed:', error);
            this.dispatchEvent(new CustomEvent('operation-error', {
                detail: {
                    type: 'cool',
                    error: error.message,
                    operatorName: 'filters'
                },
                bubbles: true
            }));
            this.showStatus('Cool filter failed');
        } finally {
            this.isProcessing = false;
            this.updateDisabledState();
            
            // Clear status after 3 seconds
            setTimeout(() => this.showStatus('Ready'), 3000);
        }
    }

    async applyHighContrast() {
        if (!this.currentImage || !this.vips || this.isProcessing) {
            return;
        }

        try {
            this.isProcessing = true;
            this.showStatus('Applying high contrast filter...', 'processing');
            this.updateDisabledState();

            console.log('Applying high contrast filter');

            // Apply high contrast: stretch dynamic range
            const contrastImage = this.currentImage
                .linear([1.5], [-64]) // Increase contrast, adjust midpoint
                .cast('uchar'); // Ensure proper clamping
            
            // Emit custom event with the result
            this.dispatchEvent(new CustomEvent('operation-applied', {
                detail: {
                    type: 'high-contrast',
                    description: 'High contrast filter',
                    image: contrastImage,
                    operatorName: 'filters'
                },
                bubbles: true
            }));

            this.showStatus('High contrast filter applied successfully!');
            
        } catch (error) {
            console.error('High contrast filter failed:', error);
            this.dispatchEvent(new CustomEvent('operation-error', {
                detail: {
                    type: 'high-contrast',
                    error: error.message,
                    operatorName: 'filters'
                },
                bubbles: true
            }));
            this.showStatus('High contrast filter failed');
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
        // Filters don't have persistent state - they're one-shot operations
        return {
            ready: !!this.currentImage
        };
    }

    setState(state) {
        // Filters don't have user-modifiable state to restore
    }

    reset() {
        // Filters don't need reset functionality - they're one-shot operations
        this.showStatus('Filters ready');
        setTimeout(() => this.showStatus('Ready'), 2000);
    }
}

// Register the custom element
customElements.define('filters-operator', FiltersOperator);