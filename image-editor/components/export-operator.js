/**
 * Export Operator Web Component
 * Handles image export and download functionality
 */
class ExportOperator extends HTMLElement {
    constructor() {
        super();
        this.currentImage = null;
        this.vips = null;
        this.isProcessing = false;
        this.selectedFormat = 'jpeg';
        this.quality = 85;
        
        // Bind methods to preserve context
        this.downloadImage = this.downloadImage.bind(this);
        this.handleFormatChange = this.handleFormatChange.bind(this);
        this.syncQualitySliders = this.syncQualitySliders.bind(this);
        this.setQualityPreset = this.setQualityPreset.bind(this);
    }

    static get observedAttributes() {
        return ['disabled'];
    }

    connectedCallback() {
        this.render();
        this.bindEvents();
        this.updateDisabledState();
        this.updateFormatOptions();
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
                
                .export-grid {
                    display: grid;
                    gap: 1.5rem;
                    margin-bottom: 1.5rem;
                }
                
                .control-section {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: 6px;
                    padding: 1.25rem;
                }
                
                .section-title {
                    font-weight: 600;
                    color: var(--text-primary);
                    margin: 0 0 0.75rem 0;
                    font-size: 0.9rem;
                }
                
                
                .control-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                }
                
                .control-group:last-child {
                    margin-bottom: 0;
                }
                
                .control-group label {
                    font-weight: 500;
                    color: var(--text-primary);
                    font-size: 0.9rem;
                }
                
                .format-selector {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                    gap: 0.5rem;
                }
                
                .format-option {
                    display: none;
                }
                
                .format-label {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 1rem 0.75rem;
                    background: var(--bg-primary);
                    border: 2px solid var(--border-color);
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-align: center;
                }
                
                .format-label:hover {
                    border-color: var(--primary-color);
                    background: var(--surface-light);
                }
                
                .format-option:checked + .format-label {
                    background: var(--primary-color);
                    color: white;
                    border-color: var(--primary-color);
                }
                
                .format-name {
                    font-weight: 600;
                    font-size: 0.9rem;
                    margin-bottom: 0.25rem;
                }
                
                .format-description {
                    font-size: 0.75rem;
                    opacity: 0.8;
                }
                
                .quality-control {
                    display: none;
                }
                
                .quality-control.show {
                    display: block;
                }
                
                .slider-container {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 0.75rem;
                }
                
                .slider-container input[type="range"] {
                    flex: 1;
                    height: 8px;
                    border-radius: 4px;
                    background: linear-gradient(to right, #ff4444 0%, #ffff44 50%, #44ff44 100%);
                    outline: none;
                    transition: all 0.2s ease;
                }
                
                .slider-container input[type="range"]::-webkit-slider-thumb {
                    appearance: none;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: var(--primary-color);
                    cursor: pointer;
                    border: 3px solid white;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    transition: all 0.2s ease;
                }
                
                .slider-container input[type="range"]::-webkit-slider-thumb:hover {
                    transform: scale(1.1);
                    box-shadow: 0 3px 8px rgba(0,0,0,0.4);
                }
                
                .slider-container input[type="range"]::-moz-range-thumb {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: var(--primary-color);
                    cursor: pointer;
                    border: 3px solid white;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
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
                
                .quality-indicator {
                    font-family: monospace;
                    color: var(--primary-color);
                    font-weight: 600;
                    min-width: 50px;
                    text-align: right;
                    font-size: 0.9rem;
                }
                
                .quality-presets {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
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
                
                .image-preview {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: 6px;
                    padding: 1rem;
                }
                
                .preview-stats {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }
                
                .stat-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 0.75rem;
                    background: var(--surface-light);
                    border-radius: 4px;
                }
                
                .stat-label {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    margin-bottom: 0.25rem;
                }
                
                .stat-value {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: var(--primary-color);
                    font-family: monospace;
                }
                
                .file-info {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    text-align: center;
                    line-height: 1.4;
                }
                
                .btn-download {
                    padding: 1rem 2rem;
                    background: var(--primary-color);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 1.1rem;
                    font-weight: 600;
                    transition: all 0.2s ease;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    width: 100%;
                    margin-top: 1.5rem;
                }
                
                .btn-download:hover:not(:disabled) {
                    background: var(--primary-hover, var(--primary-color));
                    transform: translateY(-2px);
                    box-shadow: 0 6px 12px rgba(0,0,0,0.15);
                }
                
                .btn-download:disabled {
                    background: var(--surface-light);
                    color: var(--text-secondary);
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }
                
                
                
                @media (max-width: 768px) {
                    .format-selector {
                        grid-template-columns: 1fr 1fr;
                    }
                    
                    .preview-stats {
                        grid-template-columns: 1fr;
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
                    
                    .quality-indicator {
                        text-align: center;
                    }
                    
                    .quality-presets {
                        justify-content: center;
                    }
                    
                    .btn-download {
                        padding: 0.75rem 1.5rem;
                        font-size: 1rem;
                    }
                }
            </style>
            
            <div class="operator-container">
                <div class="operator-header">
                    <h3 class="operator-title">Export & Download</h3>
                    <div class="operator-status" id="status"></div>
                </div>
                
                <div class="export-grid">
                    <div class="control-section">
                        <h4 class="section-title">
                            Format
                        </h4>
                        
                        <div class="control-group">
                            <div class="format-selector">
                                <input type="radio" id="formatJpeg" name="exportFormat" value="jpeg" class="format-option" checked>
                                <label for="formatJpeg" class="format-label">
                                    <div class="format-name">JPEG</div>
                                    <div class="format-description">Compressed, small size</div>
                                </label>
                                
                                <input type="radio" id="formatPng" name="exportFormat" value="png" class="format-option">
                                <label for="formatPng" class="format-label">
                                    <div class="format-name">PNG</div>
                                    <div class="format-description">Lossless, transparency</div>
                                </label>
                                
                                <input type="radio" id="formatWebp" name="exportFormat" value="webp" class="format-option">
                                <label for="formatWebp" class="format-label">
                                    <div class="format-name">WebP</div>
                                    <div class="format-description">Modern, efficient</div>
                                </label>
                                
                                <input type="radio" id="formatTiff" name="exportFormat" value="tiff" class="format-option">
                                <label for="formatTiff" class="format-label">
                                    <div class="format-name">TIFF</div>
                                    <div class="format-description">Professional, archival</div>
                                </label>
                            </div>
                        </div>
                        
                        <div class="quality-control show" id="qualityGroup">
                            <div class="control-group">
                                <label for="exportQuality">Quality (%)</label>
                                <div class="slider-container">
                                    <input type="range" id="exportQuality" min="10" max="100" value="85">
                                    <input type="number" id="exportQualityNum" min="10" max="100" value="85">
                                    <div class="quality-indicator" id="qualityValue">85%</div>
                                </div>
                                <div class="quality-presets">
                                    <button class="preset-btn" data-quality="95">Maximum (95%)</button>
                                    <button class="preset-btn" data-quality="85">High (85%)</button>
                                    <button class="preset-btn" data-quality="75">Good (75%)</button>
                                    <button class="preset-btn" data-quality="60">Medium (60%)</button>
                                    <button class="preset-btn" data-quality="40">Low (40%)</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="image-preview">
                        <h4 class="section-title">
                            Preview
                        </h4>
                        
                        <div class="preview-stats">
                            <div class="stat-item">
                                <div class="stat-label">Estimated Size</div>
                                <div class="stat-value" id="fileSizeEstimate">--</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-label">Dimensions</div>
                                <div class="stat-value" id="imageDimensions">--</div>
                            </div>
                        </div>
                        
                        <div class="file-info" id="formatInfo">
                            Select an image to see export information
                        </div>
                    </div>
                </div>
                
                <button id="downloadBtn" class="btn-download">
                    Download Image
                </button>
                
            </div>
        `;
    }

    bindEvents() {
        // Format selection
        this.querySelectorAll('input[name="exportFormat"]').forEach(radio => {
            radio.addEventListener('change', this.handleFormatChange);
        });

        // Quality slider sync
        this.querySelector('#exportQuality')?.addEventListener('input', (e) => {
            this.syncQualitySliders(e.target.value);
        });
        
        this.querySelector('#exportQualityNum')?.addEventListener('input', (e) => {
            this.syncQualitySliders(e.target.value);
        });

        // Download button
        this.querySelector('#downloadBtn')?.addEventListener('click', this.downloadImage);

        // Quality presets
        this.querySelectorAll('.preset-btn[data-quality]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setQualityPreset(btn.dataset.quality);
            });
        });
    }

    handleFormatChange(e) {
        this.selectedFormat = e.target.value;
        this.updateFormatOptions();
        this.updatePreview();
    }

    updateFormatOptions() {
        const qualityGroup = this.querySelector('#qualityGroup');
        
        // Show quality controls for formats that support quality setting
        if (['jpeg', 'webp'].includes(this.selectedFormat)) {
            qualityGroup?.classList.add('show');
        } else {
            qualityGroup?.classList.remove('show');
        }
        
        this.updateFormatInfo();
    }

    updateFormatInfo() {
        const formatInfo = this.querySelector('#formatInfo');
        if (!formatInfo) return;
        
        const formatDescriptions = {
            'jpeg': 'JPEG format with adjustable quality. Higher quality means larger file size but better image fidelity.',
            'png': 'PNG format with lossless compression. Supports transparency and maintains perfect quality.',
            'webp': 'WebP format with efficient compression. Modern format with adjustable quality and transparency support.',
            'tiff': 'TIFF format for professional use. Uncompressed, maintains maximum quality and color depth.'
        };
        
        if (this.currentImage) {
            formatInfo.textContent = formatDescriptions[this.selectedFormat] || 'Selected format information';
        } else {
            formatInfo.textContent = 'Select an image to see export information';
        }
    }

    syncQualitySliders(value) {
        const slider = this.querySelector('#exportQuality');
        const numberInput = this.querySelector('#exportQualityNum');
        const indicator = this.querySelector('#qualityValue');
        
        this.quality = parseInt(value);
        
        if (slider) slider.value = value;
        if (numberInput) numberInput.value = value;
        if (indicator) indicator.textContent = `${value}%`;
        
        this.updatePreview();
    }

    setQualityPreset(quality) {
        this.syncQualitySliders(quality);
    }

    updatePreview() {
        if (!this.currentImage) return;
        
        const sizeEstimate = this.querySelector('#fileSizeEstimate');
        const dimensions = this.querySelector('#imageDimensions');
        
        // Update dimensions
        if (dimensions) {
            dimensions.textContent = `${this.currentImage.width} × ${this.currentImage.height}`;
        }
        
        // Estimate file size based on format and quality
        if (sizeEstimate) {
            const pixels = this.currentImage.width * this.currentImage.height;
            let estimatedSize;
            
            switch (this.selectedFormat) {
                case 'jpeg':
                    // JPEG size estimate based on quality
                    const jpegRatio = (this.quality / 100) * 0.3; // Rough compression ratio
                    estimatedSize = pixels * 3 * jpegRatio;
                    break;
                case 'png':
                    // PNG is typically larger due to lossless compression
                    estimatedSize = pixels * 2.5;
                    break;
                case 'webp':
                    // WebP is more efficient than JPEG
                    const webpRatio = (this.quality / 100) * 0.2;
                    estimatedSize = pixels * 3 * webpRatio;
                    break;
                case 'tiff':
                    // TIFF uncompressed
                    estimatedSize = pixels * 3;
                    break;
                default:
                    estimatedSize = pixels * 2;
            }
            
            sizeEstimate.textContent = this.formatFileSize(estimatedSize);
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
            this.showStatus('Ready to export');
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

    async downloadImage() {
        if (!this.currentImage || !this.vips || this.isProcessing) {
            return;
        }

        try {
            this.isProcessing = true;
            this.showStatus('Preparing download...', 'processing');
            this.updateDisabledState();

            console.log(`Exporting image as ${this.selectedFormat.toUpperCase()}`);
            
            let exportedBuffer;
            let filename;
            
            switch (this.selectedFormat) {
                case 'jpeg':
                    exportedBuffer = await this.currentImage.writeToBuffer('.jpg', { Q: this.quality });
                    filename = `image_export.jpg`;
                    break;
                case 'png':
                    exportedBuffer = await this.currentImage.writeToBuffer('.png');
                    filename = `image_export.png`;
                    break;
                case 'webp':
                    exportedBuffer = await this.currentImage.writeToBuffer('.webp', { Q: this.quality });
                    filename = `image_export.webp`;
                    break;
                case 'tiff':
                    exportedBuffer = await this.currentImage.writeToBuffer('.tiff');
                    filename = `image_export.tiff`;
                    break;
                default:
                    throw new Error(`Unsupported format: ${this.selectedFormat}`);
            }

            // Create download link
            const blob = new Blob([exportedBuffer], { type: `image/${this.selectedFormat}` });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Clean up the URL
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
            this.showStatus(`${this.selectedFormat.toUpperCase()} exported successfully!`);
            
            // Emit custom event to notify about successful export
            this.dispatchEvent(new CustomEvent('export-completed', {
                detail: {
                    format: this.selectedFormat,
                    filename: filename,
                    size: exportedBuffer.length,
                    quality: this.selectedFormat === 'jpeg' || this.selectedFormat === 'webp' ? this.quality : null
                },
                bubbles: true
            }));
            
        } catch (error) {
            console.error('Export failed:', error);
            this.dispatchEvent(new CustomEvent('export-error', {
                detail: {
                    format: this.selectedFormat,
                    error: error.message
                },
                bubbles: true
            }));
            this.showStatus('Export failed');
        } finally {
            this.isProcessing = false;
            this.updateDisabledState();
            
            // Clear status after 3 seconds
            setTimeout(() => this.showStatus('Ready to export'), 3000);
        }
    }

    // Public API methods
    setImage(image, vips) {
        this.currentImage = image;
        this.vips = vips;
        
        if (image && vips) {
            this.removeAttribute('disabled');
            this.updatePreview();
            this.updateFormatInfo();
            this.showStatus('Ready to export');
        } else {
            this.setAttribute('disabled', '');
            this.showStatus('No image loaded');
        }
    }

    getState() {
        return {
            format: this.selectedFormat,
            quality: this.quality
        };
    }

    setState(state) {
        if (state.format) {
            this.selectedFormat = state.format;
            const formatRadio = this.querySelector(`input[value="${state.format}"]`);
            if (formatRadio) {
                formatRadio.checked = true;
                this.updateFormatOptions();
            }
        }
        
        if (state.quality) {
            this.syncQualitySliders(state.quality);
        }
    }

    reset() {
        // Reset to JPEG format with 85% quality
        this.selectedFormat = 'jpeg';
        const jpegRadio = this.querySelector('#formatJpeg');
        if (jpegRadio) {
            jpegRadio.checked = true;
            this.updateFormatOptions();
        }
        
        this.syncQualitySliders('85');
        
        this.showStatus('Reset to defaults');
        setTimeout(() => this.showStatus('Ready to export'), 2000);
    }
}

// Register the custom element
customElements.define('export-operator', ExportOperator);