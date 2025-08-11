/**
 * Crop Operator Web Component
 * Handles manual and smart crop operations for images
 */
class CropOperator extends HTMLElement {
    constructor() {
        super();
        this.currentImage = null;
        this.vips = null;
        this.isProcessing = false;
        this.activeTab = 'manual-crop';
        
        // Bind methods to preserve context
        this.switchSubTab = this.switchSubTab.bind(this);
        this.applyManualCrop = this.applyManualCrop.bind(this);
        this.applySmartCrop = this.applySmartCrop.bind(this);
        this.updateCropLimits = this.updateCropLimits.bind(this);
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
                    padding: 0.5rem 1rem;
                    background: transparent;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    transition: all 0.2s ease;
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
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
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
                
                .control-group input,
                .control-group select {
                    padding: 0.5rem;
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    background: var(--bg-primary);
                    color: var(--text-primary);
                    font-size: 0.9rem;
                }
                
                .control-group input:focus,
                .control-group select:focus {
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
                
                .image-info {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    padding: 0.75rem;
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    margin-bottom: 1rem;
                }
                
                @media (max-width: 768px) {
                    .operation-controls {
                        grid-template-columns: 1fr;
                        align-items: stretch;
                    }
                    
                    .control-group {
                        min-width: unset;
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
                    <h3 class="operator-title">Crop Operations</h3>
                    <div class="operator-status" id="status"></div>
                </div>
                
                <div class="image-info" id="imageInfo" style="display: none;">
                    Current image dimensions: <span id="imageDimensions"></span>
                </div>
                
                <!-- Sub-tabs for crop types -->
                <div class="sub-tabs">
                    <button class="sub-tab-btn active" data-subtab="manual-crop">Manual Crop</button>
                    <button class="sub-tab-btn" data-subtab="smart-crop">Smart Crop</button>
                </div>

                <!-- Manual Crop -->
                <div id="manual-crop" class="sub-tab-content active">
                    <div class="operation-controls">
                        <div class="control-group">
                            <label for="cropX">X Position</label>
                            <input type="number" id="cropX" min="0" placeholder="0" />
                        </div>
                        <div class="control-group">
                            <label for="cropY">Y Position</label>
                            <input type="number" id="cropY" min="0" placeholder="0" />
                        </div>
                        <div class="control-group">
                            <label for="cropWidth">Width</label>
                            <input type="number" id="cropWidth" min="1" placeholder="Full width" />
                        </div>
                        <div class="control-group">
                            <label for="cropHeight">Height</label>
                            <input type="number" id="cropHeight" min="1" placeholder="Full height" />
                        </div>
                        <div class="control-group">
                            <button id="applyManualCropBtn" class="btn-enhanced">Apply Crop</button>
                        </div>
                    </div>
                </div>

                <!-- Smart Crop -->
                <div id="smart-crop" class="sub-tab-content">
                    <div class="operation-controls">
                        <div class="control-group">
                            <label for="smartCropWidth">Target Width</label>
                            <input type="number" id="smartCropWidth" min="50" max="5000" placeholder="500" />
                        </div>
                        <div class="control-group">
                            <label for="smartCropHeight">Target Height</label>
                            <input type="number" id="smartCropHeight" min="50" max="5000" placeholder="500" />
                        </div>
                        <div class="control-group">
                            <label for="smartCropMode">Mode</label>
                            <select id="smartCropMode">
                                <option value="both">Both Dimensions</option>
                                <option value="width">Width Only</option>
                                <option value="height">Height Only</option>
                            </select>
                        </div>
                        <div class="control-group">
                            <label for="smartCropStrategy">Strategy</label>
                            <select id="smartCropStrategy">
                                <option value="attention">Attention (Smart)</option>
                                <option value="entropy">Entropy</option>
                                <option value="centre">Centre</option>
                                <option value="high">High</option>
                                <option value="low">Low</option>
                            </select>
                        </div>
                        <div class="control-group">
                            <button id="applySmartCropBtn" class="btn-enhanced">Apply Smart Crop</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Sub-tab buttons
        this.querySelectorAll('.sub-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchSubTab(btn.dataset.subtab);
            });
        });

        // Crop buttons
        const applyManualCropBtn = this.querySelector('#applyManualCropBtn');
        const applySmartCropBtn = this.querySelector('#applySmartCropBtn');

        applyManualCropBtn?.addEventListener('click', this.applyManualCrop);
        applySmartCropBtn?.addEventListener('click', this.applySmartCrop);
    }

    switchSubTab(subtabId) {
        // Remove active class from all sub-tabs and sub-content
        this.querySelectorAll('.sub-tab-btn').forEach(btn => btn.classList.remove('active'));
        this.querySelectorAll('.sub-tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked sub-tab and corresponding content
        this.querySelector(`[data-subtab="${subtabId}"]`).classList.add('active');
        this.querySelector(`#${subtabId}`).classList.add('active');
        
        this.activeTab = subtabId;
    }

    updateDisabledState() {
        const disabled = this.hasAttribute('disabled');
        const buttons = this.querySelectorAll('button');
        const inputs = this.querySelectorAll('input, select');
        
        buttons.forEach(btn => btn.disabled = disabled);
        inputs.forEach(input => input.disabled = disabled);
        
        if (disabled) {
            this.showStatus('Operator disabled');
        } else {
            this.showStatus('');
        }
    }

    updateCropLimits() {
        if (!this.currentImage) return;
        
        const width = this.currentImage.width;
        const height = this.currentImage.height;
        
        const cropWidth = this.querySelector('#cropWidth');
        const cropHeight = this.querySelector('#cropHeight');
        const cropX = this.querySelector('#cropX');
        const cropY = this.querySelector('#cropY');
        const imageDimensions = this.querySelector('#imageDimensions');
        const imageInfo = this.querySelector('#imageInfo');
        
        if (cropWidth) {
            cropWidth.max = width;
            cropWidth.placeholder = `${width}`;
        }
        if (cropHeight) {
            cropHeight.max = height;
            cropHeight.placeholder = `${height}`;
        }
        if (cropX) {
            cropX.max = width - 1;
        }
        if (cropY) {
            cropY.max = height - 1;
        }
        if (imageDimensions) {
            imageDimensions.textContent = `${width} × ${height} pixels`;
        }
        if (imageInfo) {
            imageInfo.style.display = 'block';
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

    async applyManualCrop() {
        if (!this.currentImage || !this.vips || this.isProcessing) {
            return;
        }

        try {
            this.isProcessing = true;
            this.showStatus('Applying manual crop...', 'processing');
            this.updateDisabledState();

            const cropX = this.querySelector('#cropX');
            const cropY = this.querySelector('#cropY');
            const cropWidth = this.querySelector('#cropWidth');
            const cropHeight = this.querySelector('#cropHeight');

            const x = parseInt(cropX.value) || 0;
            const y = parseInt(cropY.value) || 0;
            const width = parseInt(cropWidth.value) || this.currentImage.width;
            const height = parseInt(cropHeight.value) || this.currentImage.height;

            console.log('Manual crop values:', { x, y, width, height });
            console.log('Image dimensions:', this.currentImage.width, 'x', this.currentImage.height);

            // Apply crop using VIPS
            const croppedImage = this.currentImage.crop(x, y, width, height);
            
            // Emit custom event with the result
            this.dispatchEvent(new CustomEvent('operation-applied', {
                detail: {
                    type: 'manual-crop',
                    description: `Crop ${width}x${height} at (${x},${y})`,
                    image: croppedImage,
                    operatorName: 'crop'
                },
                bubbles: true
            }));

            this.showStatus('Manual crop applied successfully!');
            
        } catch (error) {
            console.error('Manual crop failed:', error);
            this.dispatchEvent(new CustomEvent('operation-error', {
                detail: {
                    type: 'manual-crop',
                    error: error.message,
                    operatorName: 'crop'
                },
                bubbles: true
            }));
            this.showStatus('Manual crop failed');
        } finally {
            this.isProcessing = false;
            this.updateDisabledState();
            
            // Clear status after 3 seconds
            setTimeout(() => this.showStatus(''), 3000);
        }
    }

    async applySmartCrop() {
        if (!this.currentImage || !this.vips || this.isProcessing) {
            return;
        }

        try {
            this.isProcessing = true;
            this.showStatus('Applying smart crop...', 'processing');
            this.updateDisabledState();

            const smartCropWidth = this.querySelector('#smartCropWidth');
            const smartCropHeight = this.querySelector('#smartCropHeight');
            const smartCropMode = this.querySelector('#smartCropMode');
            const smartCropStrategy = this.querySelector('#smartCropStrategy');

            const width = parseInt(smartCropWidth.value) || 500;
            const height = parseInt(smartCropHeight.value) || 500;
            const mode = smartCropMode.value;
            const strategy = smartCropStrategy.value;

            // Calculate description and target parameters
            let description, targetWidth, targetHeight = null;
            
            switch (mode) {
                case 'width':
                    targetWidth = width;
                    description = `Smart Crop ${width}px width (${strategy})`;
                    break;
                case 'height':
                    targetWidth = height;
                    targetHeight = height;
                    description = `Smart Crop ${height}px height (${strategy})`;
                    break;
                case 'both':
                default:
                    targetWidth = width;
                    targetHeight = height;
                    description = `Smart Crop ${width}x${height} (${strategy})`;
                    break;
            }

            // Apply smart crop using VIPS thumbnail
            const buffer = this.currentImage.writeToBuffer('.jpg', { Q: 95 });
            
            // Build options based on constraint mode
            const options = {
                no_rotate: true,
                crop: strategy
            };
            
            // Add height if specified
            if (targetHeight) {
                options.height = targetHeight;
            }
            
            const smartCroppedImage = this.vips.Image.thumbnailBuffer(buffer, targetWidth, options);
            
            // Emit custom event with the result
            this.dispatchEvent(new CustomEvent('operation-applied', {
                detail: {
                    type: 'smart-crop',
                    description: description,
                    image: smartCroppedImage,
                    operatorName: 'crop'
                },
                bubbles: true
            }));

            this.showStatus('Smart crop applied successfully!');
            
        } catch (error) {
            console.error('Smart crop failed:', error);
            this.dispatchEvent(new CustomEvent('operation-error', {
                detail: {
                    type: 'smart-crop',
                    error: error.message,
                    operatorName: 'crop'
                },
                bubbles: true
            }));
            this.showStatus('Smart crop failed');
        } finally {
            this.isProcessing = false;
            this.updateDisabledState();
            
            // Clear status after 3 seconds
            setTimeout(() => this.showStatus(''), 3000);
        }
    }

    // Public API methods
    setImage(image, vips) {
        this.currentImage = image;
        this.vips = vips;
        
        if (image && vips) {
            this.removeAttribute('disabled');
            this.updateCropLimits();
            this.showStatus('Ready');
        } else {
            this.setAttribute('disabled', '');
            this.showStatus('No image loaded');
        }
    }

    getState() {
        const cropX = this.querySelector('#cropX');
        const cropY = this.querySelector('#cropY');
        const cropWidth = this.querySelector('#cropWidth');
        const cropHeight = this.querySelector('#cropHeight');
        const smartCropWidth = this.querySelector('#smartCropWidth');
        const smartCropHeight = this.querySelector('#smartCropHeight');
        const smartCropMode = this.querySelector('#smartCropMode');
        const smartCropStrategy = this.querySelector('#smartCropStrategy');
        
        return {
            activeTab: this.activeTab,
            manualCrop: {
                x: cropX?.value || '0',
                y: cropY?.value || '0',
                width: cropWidth?.value || '',
                height: cropHeight?.value || ''
            },
            smartCrop: {
                width: smartCropWidth?.value || '500',
                height: smartCropHeight?.value || '500',
                mode: smartCropMode?.value || 'both',
                strategy: smartCropStrategy?.value || 'attention'
            }
        };
    }

    setState(state) {
        if (state.activeTab) {
            this.switchSubTab(state.activeTab);
        }
        
        if (state.manualCrop) {
            const cropX = this.querySelector('#cropX');
            const cropY = this.querySelector('#cropY');
            const cropWidth = this.querySelector('#cropWidth');
            const cropHeight = this.querySelector('#cropHeight');
            
            if (cropX) cropX.value = state.manualCrop.x;
            if (cropY) cropY.value = state.manualCrop.y;
            if (cropWidth) cropWidth.value = state.manualCrop.width;
            if (cropHeight) cropHeight.value = state.manualCrop.height;
        }
        
        if (state.smartCrop) {
            const smartCropWidth = this.querySelector('#smartCropWidth');
            const smartCropHeight = this.querySelector('#smartCropHeight');
            const smartCropMode = this.querySelector('#smartCropMode');
            const smartCropStrategy = this.querySelector('#smartCropStrategy');
            
            if (smartCropWidth) smartCropWidth.value = state.smartCrop.width;
            if (smartCropHeight) smartCropHeight.value = state.smartCrop.height;
            if (smartCropMode) smartCropMode.value = state.smartCrop.mode;
            if (smartCropStrategy) smartCropStrategy.value = state.smartCrop.strategy;
        }
    }

    reset() {
        // Reset manual crop
        const cropX = this.querySelector('#cropX');
        const cropY = this.querySelector('#cropY');
        const cropWidth = this.querySelector('#cropWidth');
        const cropHeight = this.querySelector('#cropHeight');
        
        if (cropX) cropX.value = '0';
        if (cropY) cropY.value = '0';
        if (cropWidth) cropWidth.value = '';
        if (cropHeight) cropHeight.value = '';
        
        // Reset smart crop
        const smartCropWidth = this.querySelector('#smartCropWidth');
        const smartCropHeight = this.querySelector('#smartCropHeight');
        const smartCropMode = this.querySelector('#smartCropMode');
        const smartCropStrategy = this.querySelector('#smartCropStrategy');
        
        if (smartCropWidth) smartCropWidth.value = '500';
        if (smartCropHeight) smartCropHeight.value = '500';
        if (smartCropMode) smartCropMode.value = 'both';
        if (smartCropStrategy) smartCropStrategy.value = 'attention';
        
        // Reset to manual crop tab
        this.switchSubTab('manual-crop');
        
        this.showStatus('Reset to defaults');
        setTimeout(() => this.showStatus(''), 2000);
    }
}

// Register the custom element
customElements.define('crop-operator', CropOperator);