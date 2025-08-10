class ImageEditor {
    constructor() {
        this.vips = null;
        this.heif = null;
        this.originalImage = null;
        this.currentImage = null;
        this.operations = [];
        this.isProcessing = false;
        this.tabsEnabled = false;
        this.currentActiveTab = null;
        
        this.initializeElements();
        this.bindEvents();
        this.initializeLibraries();
    }

    initializeElements() {
        // Upload elements
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.uploadStatus = document.getElementById('uploadStatus');
        this.initialUploadSection = document.getElementById('initialUploadSection');
        this.initialUploadBtn = document.getElementById('initialUploadBtn');
        
        // Debug: Check if elements are found
        console.log('initializeElements - uploadArea:', this.uploadArea);
        console.log('initializeElements - fileInput:', this.fileInput);
        
        if (!this.uploadArea) {
            console.error('Upload area not found!');
        }
        if (!this.fileInput) {
            console.error('File input not found!');
        }

        // Metadata elements
        this.metadataSection = document.getElementById('metadataSection');
        this.basicMetadataDisplay = document.getElementById('basicMetadataDisplay');
        this.extendedMetadataDisplay = document.getElementById('extendedMetadataDisplay');
        this.copyMetadataTextBtn = document.getElementById('copyMetadataTextBtn');
        this.copyMetadataJsonBtn = document.getElementById('copyMetadataJsonBtn');
        this.copyExtendedTextBtn = document.getElementById('copyExtendedTextBtn');
        this.copyExtendedJsonBtn = document.getElementById('copyExtendedJsonBtn');
        this.copyAllMetadataBtn = document.getElementById('copyAllMetadataBtn');

        // Preview elements
        this.previewSection = document.getElementById('previewSection');
        this.originalImageEl = document.getElementById('originalImage');
        this.previewImageEl = document.getElementById('previewImage');
        this.originalMetadata = document.getElementById('originalMetadata');
        this.previewMetadata = document.getElementById('previewMetadata');

        // Operation elements
        this.operationsSection = document.getElementById('operationsSection');
        this.operationList = document.getElementById('operationList');
        this.operationListInline = document.getElementById('operationListInline');
        this.resetBtn = document.getElementById('resetBtn');
        this.uploadNewBtn = document.getElementById('uploadNewBtn');
        
        // Modal elements
        this.uploadModal = document.getElementById('uploadModal');
        this.modalOverlay = this.uploadModal?.querySelector('.modal-overlay');
        this.closeModalBtn = document.getElementById('closeModalBtn');
        
        // Operations control elements
        this.toggleOperationsBtn = document.getElementById('toggleOperationsBtn');
        this.operationsContent = document.getElementById('operationsContent');
        this.commonApplyBtn = document.getElementById('commonApplyBtn');

        // Control elements
        this.resizeWidth = document.getElementById('resizeWidth');
        this.resizeHeight = document.getElementById('resizeHeight');
        this.maintainAspect = document.getElementById('maintainAspect');
        this.cropX = document.getElementById('cropX');
        this.cropY = document.getElementById('cropY');
        this.cropWidth = document.getElementById('cropWidth');
        this.cropHeight = document.getElementById('cropHeight');
        this.smartCropWidth = document.getElementById('smartCropWidth');
        this.smartCropHeight = document.getElementById('smartCropHeight');
        this.smartCropMode = document.getElementById('smartCropMode');
        this.smartCropStrategy = document.getElementById('smartCropStrategy');
        this.thumbnailWidth = document.getElementById('thumbnailWidth');
        this.thumbnailHeight = document.getElementById('thumbnailHeight');
        this.thumbnailCrop = document.getElementById('thumbnailCrop');
        this.thumbnailNoRotate = document.getElementById('thumbnailNoRotate');
        this.thumbnailNoUpscale = document.getElementById('thumbnailNoUpscale');
        this.rotateAngle = document.getElementById('rotateAngle');
        this.customAngle = document.getElementById('customAngle');
        this.customAngleGroup = document.getElementById('customAngleGroup');
        this.grayscaleThreshold = document.getElementById('grayscaleThreshold');
        this.tintColor = document.getElementById('tintColor');
        this.tintOpacity = document.getElementById('tintOpacity');
        this.blurRadius = document.getElementById('blurRadius');
        this.sharpenSigma = document.getElementById('sharpenSigma');
        this.cannySigma = document.getElementById('cannySigma');
        this.exportFormat = document.getElementById('exportFormat');
        this.exportQuality = document.getElementById('exportQuality');
        this.qualityGroup = document.getElementById('qualityGroup');
        
    }

    bindEvents() {
        // Upload events
        console.log('Upload area:', this.uploadArea);
        console.log('File input:', this.fileInput);
        
        // Disable upload area until wasm-vips is loaded
        this.disableUpload();
        
        this.uploadArea.addEventListener('click', (e) => {
            console.log('Upload area clicked');
            console.log('File input element:', this.fileInput);
            console.log('File input style:', this.fileInput.style.display);
            
            // Try to trigger file picker
            try {
                this.fileInput.click();
                console.log('fileInput.click() executed successfully');
            } catch (error) {
                console.error('Error calling fileInput.click():', error);
            }
        });
        this.fileInput.addEventListener('change', (e) => this.handleFile(e.target.files[0]));
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));

        // Operation buttons (safely bind if they exist)
        this.bindIfExists('resizeBtn', 'click', () => this.applyResize());
        this.bindIfExists('cropBtn', 'click', () => this.applyCrop());
        this.bindIfExists('smartCropBtn', 'click', () => this.applySmartCrop());
        this.bindIfExists('thumbnailBtn', 'click', () => this.applyThumbnail());
        this.bindIfExists('rotateBtn', 'click', () => this.applyRotation());
        this.bindIfExists('flipHBtn', 'click', () => this.applyFlip('horizontal'));
        this.bindIfExists('flipVBtn', 'click', () => this.applyFlip('vertical'));
        this.bindIfExists('grayscaleBtn', 'click', () => this.applyGrayscale());
        this.bindIfExists('negateBtn', 'click', () => this.applyNegate());
        this.bindIfExists('tintBtn', 'click', () => this.applyTint());
        this.bindIfExists('sepiaBtn', 'click', () => this.applySepia());
        this.bindIfExists('vintageBtn', 'click', () => this.applyVintage());
        this.bindIfExists('warmBtn', 'click', () => this.applyWarm());
        this.bindIfExists('coolBtn', 'click', () => this.applyCool());
        this.bindIfExists('contrastBtn', 'click', () => this.applyHighContrast());
        this.bindIfExists('flattenBtn', 'click', () => this.applyFlatten());
        this.bindIfExists('unflattenBtn', 'click', () => this.applyUnflatten());
        this.bindIfExists('blurBtn', 'click', () => this.applyBlur());
        this.bindIfExists('sharpenBtn', 'click', () => this.applySharpen());
        this.bindIfExists('cannyBtn', 'click', () => this.applyCanny());
        this.bindIfExists('sobelBtn', 'click', () => this.applySobel());
        this.bindIfExists('downloadBtn', 'click', () => this.downloadImage());

        // Reset button
        this.resetBtn.addEventListener('click', () => this.resetToOriginal());
        
        // Upload new button - opens modal
        this.uploadNewBtn?.addEventListener('click', () => this.openUploadModal());
        
        // Initial upload button - opens modal
        this.initialUploadBtn?.addEventListener('click', () => this.openUploadModal());
        
        // Common apply button
        this.commonApplyBtn?.addEventListener('click', () => this.handleCommonApply());
        
        // Modal events
        this.closeModalBtn?.addEventListener('click', () => this.closeUploadModal());
        this.modalOverlay?.addEventListener('click', () => this.closeUploadModal());
        
        // Operations toggle
        this.toggleOperationsBtn?.addEventListener('click', () => this.toggleOperations());
        
        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.uploadModal && !this.uploadModal.classList.contains('hidden')) {
                this.closeUploadModal();
            }
        });

        // Copy metadata buttons
        this.copyMetadataTextBtn.addEventListener('click', () => this.copyMetadataText());
        this.copyMetadataJsonBtn.addEventListener('click', () => this.copyMetadataJson());
        this.copyExtendedTextBtn.addEventListener('click', () => this.copyExtendedText());
        this.copyExtendedJsonBtn.addEventListener('click', () => this.copyExtendedJson());
        this.copyAllMetadataBtn.addEventListener('click', () => this.copyAllMetadata());

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!btn.classList.contains('disabled')) {
                    this.switchTab(btn.dataset.tab);
                }
            });
        });

        // Sub-tab switching
        document.querySelectorAll('.sub-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchSubTab(btn.dataset.subtab, btn.closest('.tab-content'));
            });
        });

        // Toggle buttons
        const toggleOriginalBtn = document.getElementById('toggleOriginalBtn');
        const toggleMetadataBtn = document.getElementById('toggleMetadataBtn');
        
        if (toggleOriginalBtn) {
            toggleOriginalBtn.addEventListener('click', () => this.toggleOriginalImage());
        }
        
        if (toggleMetadataBtn) {
            toggleMetadataBtn.addEventListener('click', () => this.toggleMetadata());
        }

        // Range inputs and their number counterparts (bind conditionally)
        if (this.grayscaleThreshold) {
            this.grayscaleThreshold.addEventListener('input', (e) => {
                const numInput = document.getElementById('grayscaleThresholdNum');
                if (numInput) numInput.value = e.target.value;
            });
        }
        if (this.tintOpacity) {
            this.tintOpacity.addEventListener('input', (e) => {
                const numInput = document.getElementById('tintOpacityNum');
                if (numInput) numInput.value = e.target.value;
            });
        }
        if (this.exportQuality) {
            this.exportQuality.addEventListener('input', (e) => {
                const numInput = document.getElementById('exportQualityNum');
                if (numInput) numInput.value = e.target.value;
            });
        }
        if (this.blurRadius) {
            this.blurRadius.addEventListener('input', (e) => {
                const numInput = document.getElementById('blurRadiusNum');
                if (numInput) numInput.value = e.target.value;
            });
        }
        if (this.sharpenSigma) {
            this.sharpenSigma.addEventListener('input', (e) => {
                const numInput = document.getElementById('sharpenSigmaNum');
                if (numInput) numInput.value = e.target.value;
            });
        }
        if (this.cannySigma) {
            this.cannySigma.addEventListener('input', (e) => {
                const numInput = document.getElementById('cannySigmaNum');
                if (numInput) numInput.value = e.target.value;
            });
        }
        
        // Number inputs sync with sliders (bind conditionally)
        this.bindIfExists('grayscaleThresholdNum', 'input', (e) => {
            if (this.grayscaleThreshold) this.grayscaleThreshold.value = e.target.value;
        });
        this.bindIfExists('tintOpacityNum', 'input', (e) => {
            if (this.tintOpacity) this.tintOpacity.value = e.target.value;
        });
        this.bindIfExists('exportQualityNum', 'input', (e) => {
            if (this.exportQuality) this.exportQuality.value = e.target.value;
        });
        this.bindIfExists('blurRadiusNum', 'input', (e) => {
            if (this.blurRadius) this.blurRadius.value = e.target.value;
        });
        this.bindIfExists('sharpenSigmaNum', 'input', (e) => {
            if (this.sharpenSigma) this.sharpenSigma.value = e.target.value;
        });
        this.bindIfExists('cannySigmaNum', 'input', (e) => {
            if (this.cannySigma) this.cannySigma.value = e.target.value;
        });

        // Format change (bind conditionally)
        if (this.exportFormat) {
            this.exportFormat.addEventListener('change', () => this.updateQualityVisibility());
        }
        if (this.rotateAngle) {
            this.rotateAngle.addEventListener('change', () => this.updateCustomAngleVisibility());
        }

        // Aspect ratio maintenance (bind conditionally)
        if (this.resizeWidth) {
            this.resizeWidth.addEventListener('input', () => this.updateAspectRatio('width'));
        }
        if (this.resizeHeight) {
            this.resizeHeight.addEventListener('input', () => this.updateAspectRatio('height'));
        }
    }

    async initializeLibraries() {
        try {
            this.showStatus('Initializing image processing engines...', 'info');
            
            // Debug info
            console.log('crossOriginIsolated:', window.crossOriginIsolated);
            console.log('SharedArrayBuffer available:', typeof SharedArrayBuffer !== 'undefined');
            console.log('Vips available:', typeof Vips !== 'undefined');
            console.log('HeicTo available:', typeof HeicTo !== 'undefined');
            
            // Check if SharedArrayBuffer is available
            if (typeof SharedArrayBuffer === 'undefined') {
                throw new Error('SharedArrayBuffer is not available. Please serve with Cross-Origin-Embedder-Policy: require-corp and Cross-Origin-Opener-Policy: same-origin headers.');
            }
            
            // heic-to library doesn't need initialization, just check availability
            if (typeof HeicTo !== 'undefined') {
                this.heif = HeicTo;
                console.log('heic-to library available');
            } else {
                console.warn('heic-to not available - HEIC support will be limited');
            }
            
            // Check if Vips is available
            if (typeof Vips === 'undefined') {
                throw new Error('wasm-vips library failed to load.');
            }
            
            // Initialize VIPS with HEIF and SVG support
            console.log('Attempting Vips initialization with HEIF and SVG support...');
            this.vips = await Vips({
                locateFile: (path) => `node_modules/wasm-vips/lib/${path}`,
                dynamicLibraries: ['vips-heif.wasm', 'vips-resvg.wasm'],   // Load HEIF and SVG plugins
            });
            console.log('Vips initialized successfully:', this.vips);
            
            // Sanity check: are the plugins registered?
            const hasHeif = !!this.vips.Utils.typeFind('VipsOperation', 'heifload');
            const hasSvg = !!this.vips.Utils.typeFind('VipsOperation', 'svgload');
            console.log('vips-heif loaded?', hasHeif);
            console.log('vips-resvg loaded?', hasSvg);
            
            // Enable upload area now that libraries are ready
            this.enableUpload();
            
            this.showStatus('Image editor ready!', 'success');
        } catch (error) {
            this.showStatus('Failed to initialize image processing: ' + error.message, 'error');
            console.error('Library initialization failed:', error);
            console.error('Full error object:', error);
        }
    }
    

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            this.handleFile(file);
        }
    }

    async convertHeicToPng(file) {
        try {
            console.log('Converting HEIC to PNG using heic-to library...');
            
            // heic-to library has a very simple API - just pass the file directly
            const pngBlob = await this.heif({
                blob: file,
                type: "image/png",
                quality: 1.0  // Maximum quality
            });
            
            console.log('HEIC successfully converted to PNG');
            return pngBlob;
            
        } catch (error) {
            console.error('HEIC conversion failed:', error);
            throw new Error(`HEIC conversion failed: ${error.message}`);
        }
    }

    async handleFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            this.showStatus('Please select a valid image file.', 'error');
            return;
        }

        if (!this.vips) {
            this.showStatus('Image processing engine not ready. Please serve with proper CORS headers.', 'error');
            return;
        }

        try {
            this.showStatus('Loading image...', 'info');
            
            // Check for HEIC/HEIF files
            const isHeic = file.name.toLowerCase().endsWith('.heic') || 
                          file.name.toLowerCase().endsWith('.heif') ||
                          file.type === 'image/heic' || 
                          file.type === 'image/heif';
            
            let processedFile = file;
            let originalMetadataImage = null;
            
            if (isHeic && this.heif) {
                // First, extract metadata from original HEIC file using VIPS
                try {
                    this.showStatus('Processing HEIC file and extracting metadata...', 'info');
                    const originalBuffer = await file.arrayBuffer();
                    const originalUint8Array = new Uint8Array(originalBuffer);
                    
                    // Load original HEIC with VIPS for metadata only (this should work with HEIF plugin)
                    originalMetadataImage = this.vips.Image.newFromBuffer(originalUint8Array, '', {
                        access: 'sequential'
                    });
                    console.log('Successfully extracted metadata from original HEIC file using VIPS HEIF plugin');
                } catch (metadataError) {
                    console.warn('Could not extract metadata from original HEIC:', metadataError.message);
                    console.log('This might indicate the HEIF plugin is not working properly');
                }
                
                // Convert HEIC to PNG for processing (for pixel data)
                this.showStatus('Converting HEIC image to PNG format... This may take a moment.', 'info');
                const pngBlob = await this.convertHeicToPng(file);
                this.showStatus('HEIC conversion completed successfully, loading image...', 'info');
                processedFile = new File([pngBlob], file.name.replace(/\.(heic|heif)$/i, '.png'), {
                    type: 'image/png'
                });
                console.log('HEIC converted to PNG for image processing');
            } else if (isHeic) {
                throw new Error('HEIC file detected but heic-to library not available');
            }
            
            const buffer = await processedFile.arrayBuffer();
            const uint8Array = new Uint8Array(buffer);
            
            // Load image using vips
            console.log(`Loading ${file.type || 'unknown'} file into VIPS...`);
            this.originalImage = this.vips.Image.newFromBuffer(uint8Array);
            this.currentImage = this.originalImage.copy();
            
            // Debug: Check if we have metadata fields available
            console.log('Checking for available metadata fields...');
            try {
                const fieldsResult = this.originalImage.getFields();
                if (fieldsResult && typeof fieldsResult.size === 'function') {
                    console.log(`Found ${fieldsResult.size()} metadata fields in loaded image`);
                    if (fieldsResult.size() === 0) {
                        console.warn('No metadata fields found - may have been lost during processing');
                    }
                } else {
                    console.warn('Cannot access metadata fields');
                }
            } catch (e) {
                console.warn('Error checking metadata fields:', e.message);
            }
            
            // Store the metadata source image (original HEIC if available, otherwise processed)
            this.metadataSourceImage = originalMetadataImage || this.originalImage;
            
            // Display images and metadata
            await this.updateImageDisplay();
            await this.showMetadata();
            this.showImageControls();
            this.operations = [];
            this.updateOperationList();
            this.resetBtn.disabled = true;
            
            this.uploadArea.classList.add('has-image');
            this.showStatus('Image loaded successfully!', 'success');
            
        } catch (error) {
            console.error('Image loading failed:', error);
            let errorMessage = 'Failed to load image: ' + error.message;
            
            if (error.message.includes('HEIC')) {
                errorMessage = 'HEIC processing failed. The file may be corrupted or use an unsupported variant.';
            }
            
            this.showStatus(errorMessage, 'error');
        }
    }

    async updateImageDisplay() {
        try {
            // Convert images to display format - use PNG for better compatibility with HEIC/complex formats
            const originalBuffer = this.originalImage.writeToBuffer('.png');
            const currentBuffer = this.currentImage.writeToBuffer('.png');
            
            // Create blob URLs
            const originalBlob = new Blob([originalBuffer], { type: 'image/png' });
            const currentBlob = new Blob([currentBuffer], { type: 'image/png' });
            
            this.originalImageEl.src = URL.createObjectURL(originalBlob);
            this.previewImageEl.src = URL.createObjectURL(currentBlob);
            
            // Update crop controls with current image dimensions
            this.updateCropLimits();
            
        } catch (error) {
            console.error('Display conversion error:', error);
            this.showStatus('Failed to display image: ' + error.message, 'error');
        }
    }

    updateCropLimits() {
        const width = this.currentImage.width;
        const height = this.currentImage.height;
        
        this.cropWidth.max = width;
        this.cropHeight.max = height;
        this.cropX.max = width - 1;
        this.cropY.max = height - 1;
        
        this.cropWidth.placeholder = `${width}`;
        this.cropHeight.placeholder = `${height}`;
    }

    showImageControls() {
        this.previewSection.classList.remove('hidden');
        this.operationsSection.classList.remove('hidden');
        this.enableTabs();
        
        // Hide the initial upload section
        if (this.initialUploadSection) {
            this.initialUploadSection.classList.add('hidden');
        }
        
        // Close the upload modal if it's open
        this.closeUploadModal();
    }


    disableTabs() {
        this.tabsEnabled = false;
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.classList.add('disabled');
            tab.classList.remove('active');
        });
    }

    updateAspectRatio(changedField) {
        if (!this.maintainAspect.checked || !this.originalImage) return;
        
        const aspectRatio = this.originalImage.width / this.originalImage.height;
        
        if (changedField === 'width' && this.resizeWidth.value) {
            const newHeight = Math.round(parseInt(this.resizeWidth.value) / aspectRatio);
            this.resizeHeight.value = newHeight;
        } else if (changedField === 'height' && this.resizeHeight.value) {
            const newWidth = Math.round(parseInt(this.resizeHeight.value) * aspectRatio);
            this.resizeWidth.value = newWidth;
        }
    }

    updateCustomAngleVisibility() {
        if (this.rotateAngle.value === 'custom') {
            this.customAngleGroup.classList.remove('hidden');
        } else {
            this.customAngleGroup.classList.add('hidden');
        }
    }

    updateQualityVisibility() {
        const format = this.exportFormat.value;
        // PNG and TIFF don't typically use quality settings
        if (format === 'png' || format === 'tiff') {
            this.qualityGroup.classList.add('hidden');
        } else {
            this.qualityGroup.classList.remove('hidden');
        }
    }

    async applyOperation(operationFn, operationName) {
        if (this.isProcessing) return;
        
        try {
            this.isProcessing = true;
            this.showStatus(`Applying ${operationName}...`, 'info');
            
            
            const newImage = await operationFn(this.currentImage);
            
            this.currentImage = newImage;
            this.operations.push(operationName);
            
            await this.updateImageDisplay();
            await this.showMetadata(); // Update metadata after operation
            this.updateOperationList();
            this.resetBtn.disabled = false;
            
            this.showStatus(`${operationName} applied successfully!`, 'success');
            
        } catch (error) {
            this.showStatus(`Failed to apply ${operationName}: ${error.message}`, 'error');
        } finally {
            this.isProcessing = false;
        }
    }

    async applyResize() {
        const width = parseInt(this.resizeWidth.value) || null;
        const height = parseInt(this.resizeHeight.value) || null;
        
        if (!width && !height) {
            this.showStatus('Please specify width and/or height', 'error');
            return;
        }
        
        await this.applyOperation(
            (image) => image.resize(width / image.width, { vscale: height ? height / image.height : width / image.width }),
            `Resize to ${width || 'auto'}x${height || 'auto'}`
        );
    }

    async applyCrop() {
        const x = parseInt(this.cropX.value) || 0;
        const y = parseInt(this.cropY.value) || 0;
        const width = parseInt(this.cropWidth.value) || this.currentImage.width;
        const height = parseInt(this.cropHeight.value) || this.currentImage.height;
        
        console.log('Crop values:', { x, y, width, height });
        console.log('Image dimensions:', this.currentImage.width, 'x', this.currentImage.height);
        
        await this.applyOperation(
            (image) => {
                console.log('Attempting crop with crop():', x, y, width, height);
                return image.crop(x, y, width, height);
            },
            `Crop ${width}x${height} at (${x},${y})`
        );
    }

    async applySmartCrop() {
        const width = parseInt(this.smartCropWidth.value) || 500;
        const height = parseInt(this.smartCropHeight.value) || 500;
        const mode = this.smartCropMode.value;
        const strategy = this.smartCropStrategy.value;
        
        // Calculate description and target parameters outside the operation function
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
        
        await this.applyOperation(
            (image) => {
                // Create a buffer from the current image
                const buffer = image.writeToBuffer('.jpg', { Q: 95 });
                
                // Build options based on constraint mode
                const options = {
                    no_rotate: true,
                    crop: strategy
                };
                
                // Add height if specified
                if (targetHeight) {
                    options.height = targetHeight;
                }
                
                return this.vips.Image.thumbnailBuffer(buffer, targetWidth, options);
            },
            description
        );
    }

    async applyThumbnail() {
        const width = parseInt(this.thumbnailWidth.value) || 300;
        const height = parseInt(this.thumbnailHeight.value) || null;
        const cropStrategy = this.thumbnailCrop.value;
        const noRotate = this.thumbnailNoRotate.checked;
        const noUpscale = this.thumbnailNoUpscale.checked;
        
        await this.applyOperation(
            (image) => {
                // Create a buffer from the current image
                const buffer = image.writeToBuffer('.jpg', { Q: 95 });
                
                // Build options object
                const options = {
                    no_rotate: noRotate,
                    crop: cropStrategy
                };
                
                // Add height if specified
                if (height) {
                    options.height = height;
                }
                
                // Add no upscaling option if checked
                if (noUpscale) {
                    options.size = 'down';
                }
                
                // Use thumbnailBuffer method (static method)
                return this.vips.Image.thumbnailBuffer(buffer, width, options);
            },
            `Thumbnail ${width}${height ? `x${height}` : ''} (${cropStrategy}${noUpscale ? ', no upscale' : ''})`
        );
    }

    async applyRotation() {
        let angle;
        if (this.rotateAngle.value === 'custom') {
            angle = parseFloat(this.customAngle.value) || 0;
        } else {
            angle = parseInt(this.rotateAngle.value);
        }
        
        await this.applyOperation(
            (image) => image.rotate(angle),
            `Rotate ${angle}°`
        );
    }

    async applyFlip(direction) {
        console.log('Attempting flip:', direction);
        
        await this.applyOperation(
            (image) => {
                const flipDirection = direction === 'horizontal' ? 0 : 1; // 0 = horizontal, 1 = vertical
                console.log('Calling flip() with direction:', flipDirection);
                return image.flip(flipDirection);
            },
            `Flip ${direction}`
        );
    }

    async applyGrayscale() {
        const threshold = parseInt(this.grayscaleThreshold.value);
        
        await this.applyOperation(
            (image) => {
                const gray = image.colourspace('b-w');
                return gray.more(threshold).ifthenelse(255, 0);
            },
            `Grayscale (threshold: ${threshold})`
        );
    }

    async applyNegate() {
        await this.applyOperation(
            (image) => image.invert(),
            'Negate colors'
        );
    }

    async applyTint() {
        const color = this.tintColor.value;
        const opacity = parseInt(this.tintOpacity.value) / 100;
        
        console.log('Tint values:', { color, opacity });
        
        // Convert hex to RGB then to LAB for proper tinting
        const r = parseInt(color.substr(1, 2), 16);
        const g = parseInt(color.substr(3, 2), 16);
        const b = parseInt(color.substr(5, 2), 16);
        
        await this.applyOperation(
            (image) => {
                console.log('Applying LAB-based tint with RGB:', r, g, b, 'opacity:', opacity);
                
                // Get original colorspace
                const originalColorspace = image.interpretation;
                console.log('Original colorspace:', originalColorspace);
                
                // Create a small RGB image to convert to LAB for the tint color
                const tintRgb = this.vips.Image.black(1, 1, { bands: 3 }).add([r, g, b]);
                const tintLab = tintRgb.colourspace('lab');
                
                // Extract LAB values from the tint color
                const labPixel = tintLab.getpoint(0, 0);
                const tintChroma = [labPixel[1], labPixel[2]]; // A and B channels
                
                console.log('Tint LAB chroma:', tintChroma);
                
                // Convert image to LAB and extract luminance
                const imageLab = image.colourspace('lab');
                const luminance = imageLab.extractBand(0);
                
                // Create tinted version by combining original L with tint chroma
                const tinted = luminance.bandjoin(tintChroma)
                    .copy({ interpretation: 'lab' })
                    .colourspace(originalColorspace);
                
                // Handle alpha channel if present
                let result = tinted;
                if (image.hasAlpha()) {
                    const alpha = image.extractBand(image.bands - 1);
                    result = result.bandjoin(alpha);
                }
                
                // Blend based on opacity
                if (opacity < 1.0) {
                    result = image.linear([1 - opacity], [0]).add(result.linear([opacity], [0]));
                }
                
                return result;
            },
            `Tint ${color} (${Math.round(opacity * 100)}%)`
        );
    }

    async applySepia() {
        await this.applyOperation(
            (image) => {
                // Classic sepia matrix from the example
                const matrix = [
                    [0.3588, 0.7044, 0.1368],
                    [0.2990, 0.5870, 0.1140],
                    [0.2392, 0.4696, 0.0912]
                ];
                return image.recomb(matrix).cast('uchar');
            },
            'Sepia filter'
        );
    }

    async applyVintage() {
        await this.applyOperation(
            (image) => {
                // Vintage effect: slightly desaturated with warm tone
                const matrix = [
                    [0.6, 0.3, 0.1],
                    [0.2, 0.7, 0.1],
                    [0.1, 0.2, 0.7]
                ];
                return image.recomb(matrix).cast('uchar').linear([0.9], [10]);
            },
            'Vintage filter'
        );
    }

    async applyWarm() {
        await this.applyOperation(
            (image) => {
                // Warm filter: enhance reds and yellows
                const matrix = [
                    [1.1, 0.05, 0.0],
                    [0.0, 1.0, 0.0],
                    [0.0, 0.0, 0.8]
                ];
                return image.recomb(matrix).cast('uchar');
            },
            'Warm filter'
        );
    }

    async applyCool() {
        await this.applyOperation(
            (image) => {
                // Cool filter: enhance blues
                const matrix = [
                    [0.8, 0.0, 0.0],
                    [0.0, 0.9, 0.1],
                    [0.0, 0.05, 1.2]
                ];
                return image.recomb(matrix).cast('uchar');
            },
            'Cool filter'
        );
    }

    async applyHighContrast() {
        await this.applyOperation(
            (image) => {
                // High contrast: boost contrast and saturation
                const matrix = [
                    [1.4, -0.2, -0.2],
                    [-0.1, 1.3, -0.2],
                    [-0.1, -0.2, 1.4]
                ];
                return image.recomb(matrix).cast('uchar');
            },
            'High contrast filter'
        );
    }

    async applyFlatten() {
        await this.applyOperation(
            (image) => image.flatten(),
            'Flatten (remove alpha)'
        );
    }

    async applyUnflatten() {
        await this.applyOperation(
            (image) => image.bandjoin(255),
            'Add alpha channel'
        );
    }

    async applyBlur() {
        const radius = parseFloat(this.blurRadius.value);
        
        await this.applyOperation(
            (image) => image.gaussblur(radius),
            `Blur (radius: ${radius})`
        );
    }

    async applySharpen() {
        const sigma = parseFloat(this.sharpenSigma.value);
        
        await this.applyOperation(
            (image) => image.sharpen({ sigma: sigma }),
            `Sharpen (sigma: ${sigma})`
        );
    }

    async applyCanny() {
        const sigma = parseFloat(this.cannySigma.value);
        
        await this.applyOperation(
            (image) => {
                // Ensure the image is in RGB format for edge detection
                let workingImage = image;
                if (image.interpretation !== 'srgb') {
                    workingImage = image.colourspace('srgb');
                }
                
                // Convert to grayscale if it's not already
                if (workingImage.bands > 1) {
                    workingImage = workingImage.colourspace('b-w');
                }
                
                // Apply Canny edge detector
                let result = workingImage.canny({
                    sigma: sigma,
                    precision: 'integer'
                });
                // Scale the output up to make it visible (Canny makes a float image)
                return result.multiply(64);
            },
            `Canny Edge Detection (sigma: ${sigma})`
        );
    }

    async applySobel() {
        await this.applyOperation(
            (image) => image.sobel(),
            'Sobel Edge Detection'
        );
    }



    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : null;
    }


    async toggleMetadata() {
        const isVisible = !this.originalMetadata.classList.contains('hidden');
        
        if (isVisible) {
            this.originalMetadata.classList.add('hidden');
            this.previewMetadata.classList.add('hidden');
        } else {
            await this.showMetadata();
            this.originalMetadata.classList.remove('hidden');
            this.previewMetadata.classList.remove('hidden');
        }
    }

    async showMetadata() {
        // Use metadata source image (original HEIC) for metadata extraction when available
        const metadataImage = this.metadataSourceImage || this.currentImage;
        
        this.basicMetadataJson = this.getImageMetadata(metadataImage);
        this.extendedMetadataJson = await this.getExtendedMetadata(metadataImage);
        
        // Parse the JSON and create readable displays
        try {
            const basicData = JSON.parse(this.basicMetadataJson);
            this.basicMetadataDisplay.innerHTML = this.createReadableDisplay(basicData);
        } catch (e) {
            this.basicMetadataDisplay.textContent = this.basicMetadataJson;
        }
        
        try {
            const extendedData = JSON.parse(this.extendedMetadataJson);
            this.extendedMetadataDisplay.innerHTML = this.createReadableDisplay(extendedData);
        } catch (e) {
            this.extendedMetadataDisplay.textContent = this.extendedMetadataJson;
        }
        
        // Also update the toggle metadata sections if they exist
        if (this.originalMetadata && this.previewMetadata) {
            // Show original HEIC metadata vs current processed metadata
            const originalMeta = this.getImageMetadata(metadataImage);
            const currentMeta = this.getImageMetadata(this.currentImage);
            
            this.originalMetadata.textContent = originalMeta;
            this.previewMetadata.textContent = currentMeta;
        }
    }

    createReadableDisplay(data) {
        let html = '';
        
        function processValue(key, value, indent = 0) {
            if (typeof value === 'object' && value !== null) {
                // Section header with proper spacing
                html += `<div style="margin: ${indent === 0 ? '0 0 0.5rem 0' : '0.75rem 0 0.25rem 0'}; padding-left: ${indent * 20}px"><strong>${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong></div>`;
                for (const [subKey, subValue] of Object.entries(value)) {
                    processValue(subKey, subValue, indent + 1);
                }
                // Add spacing after each section
                if (indent === 0) {
                    html += `<div style="margin-bottom: 1rem"></div>`;
                }
            } else {
                const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                html += `<div style="margin: 0.1rem 0; padding-left: ${indent * 20}px"><span style="color: var(--text-secondary); font-weight: 500">${displayKey}:</span> <span>${value}</span></div>`;
            }
        }
        
        for (const [key, value] of Object.entries(data)) {
            processValue(key, value);
        }
        
        return html;
    }

    createTextDisplay(data) {
        let text = '';
        
        function processValue(key, value, indent = 0) {
            const spacing = '  '.repeat(indent);
            
            if (typeof value === 'object' && value !== null) {
                text += `${spacing}${key.toUpperCase()}:\n`;
                for (const [subKey, subValue] of Object.entries(value)) {
                    processValue(subKey, subValue, indent + 1);
                }
                if (indent === 0) text += '\n';
            } else {
                const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                text += `${spacing}${displayKey}: ${value}\n`;
            }
        }
        
        for (const [key, value] of Object.entries(data)) {
            processValue(key, value);
        }
        
        return text.trim();
    }

    getImageMetadata(image, label = '') {
        const metadataObject = {};
        
        // Basic image properties - using only properties we know work
        metadataObject.dimensions = {
            width: image.width,
            height: image.height,
            megapixels: Math.round((image.width * image.height) / 1000000 * 100) / 100
        };
        
        metadataObject.format = {
            bands: image.bands,
            format: image.format,
            colorspace: image.interpretation,
            uncompressed_size_kb: Math.round((image.width * image.height * image.bands) / 1024)
        };

        // Try optional properties safely
        try {
            metadataObject.resolution = {
                x: image.xres(),
                y: image.yres(),
                unit: "pixels/mm"
            };
        } catch (e) {
            // Resolution not available
        }

        try {
            const hasAlpha = image.bands === 4 || image.bands === 2; // estimate based on bands
            metadataObject.format.has_alpha = hasAlpha;
        } catch (e) {
            // Alpha detection not available
        }
        
        return JSON.stringify(metadataObject, null, 2);
    }

    async getExtendedMetadata(image) {
        try {
            console.log('Using ExifReader to parse all metadata...');
            
            // Check if ExifReader is available
            if (typeof ExifReader === 'undefined') {
                console.error('ExifReader is not available');
                return 'ExifReader library not loaded';
            }

            // Get the original image buffer to parse with ExifReader
            // We need to get the original image data, not the processed VIPS image
            let imageBuffer = null;
            
            // Try to get the buffer from the stored file or convert current image
            try {
                // Convert current VIPS image to buffer for metadata extraction
                imageBuffer = image.writeToBuffer('.jpg', { Q: 95 });
                console.log('Got image buffer for ExifReader, size:', imageBuffer.length);
            } catch (e) {
                console.error('Failed to get image buffer:', e);
                return 'Failed to get image data for metadata parsing';
            }

            // Convert to ArrayBuffer
            const arrayBuffer = imageBuffer.buffer.slice(imageBuffer.byteOffset, imageBuffer.byteOffset + imageBuffer.byteLength);

            // Parse all metadata with ExifReader
            const tags = ExifReader.load(arrayBuffer, {
                expanded: true,
                includeUnknown: true
            });

            console.log('ExifReader parsed tags:', tags);

            // Organize metadata by categories
            const metadataObject = {};

            // Extract EXIF data
            if (tags.exif) {
                metadataObject.exif = {};
                Object.entries(tags.exif).forEach(([key, value]) => {
                    if (value && value.description !== undefined) {
                        metadataObject.exif[key] = value.description;
                    }
                });
            }

            // Extract IPTC data
            if (tags.iptc) {
                metadataObject.iptc = {};
                Object.entries(tags.iptc).forEach(([key, value]) => {
                    if (value && value.description !== undefined) {
                        metadataObject.iptc[key] = value.description;
                    }
                });
            }

            // Extract XMP data
            if (tags.xmp) {
                metadataObject.xmp = {};
                Object.entries(tags.xmp).forEach(([key, value]) => {
                    if (value && value.description !== undefined) {
                        metadataObject.xmp[key] = value.description;
                    }
                });
            }

            // Extract ICC profile data
            if (tags.icc) {
                metadataObject.icc = {};
                Object.entries(tags.icc).forEach(([key, value]) => {
                    if (value && value.description !== undefined) {
                        metadataObject.icc[key] = value.description;
                    }
                });
            }

            // Extract other metadata sections
            Object.entries(tags).forEach(([section, sectionData]) => {
                if (!['exif', 'iptc', 'xmp', 'icc'].includes(section) && typeof sectionData === 'object') {
                    const sectionEntries = {};
                    let hasEntries = false;
                    
                    Object.entries(sectionData).forEach(([key, value]) => {
                        if (value && value.description !== undefined) {
                            sectionEntries[key] = value.description;
                            hasEntries = true;
                        }
                    });
                    
                    if (hasEntries) {
                        metadataObject[section] = sectionEntries;
                    }
                }
            });

            // Add summary info
            const summaryInfo = {
                total_sections: Object.keys(metadataObject).length,
                parsed_with: 'ExifReader',
                supported_formats: 'EXIF, IPTC, XMP, ICC, and more'
            };

            metadataObject._summary = summaryInfo;

            // Convert to pretty JSON string
            return JSON.stringify(metadataObject, null, 2);
            
        } catch (e) {
            console.error('ExifReader metadata extraction failed:', e);
            return JSON.stringify({
                error: 'Metadata extraction failed',
                message: e.message,
                fallback: 'Could not parse image metadata'
            }, null, 2);
        }
    }

    parseExifPreview(exifData) {
        // Simple EXIF preview parser - looks for common ASCII strings
        const fields = [];
        try {
            // Look for common EXIF strings (this is a simplified preview)
            const commonTags = [
                'Make', 'Model', 'DateTime', 'Software', 'Artist', 'Copyright',
                'ImageDescription', 'Orientation', 'XResolution', 'YResolution',
                'ResolutionUnit', 'ExposureTime', 'FNumber', 'ISO', 'Flash'
            ];
            
            // Very basic string extraction for preview purposes
            // In a real implementation, you'd want a proper EXIF parser
            for (let i = 0; i < exifData.length - 10; i++) {
                const slice = exifData.slice(i, i + 50);
                commonTags.forEach(tag => {
                    if (slice.includes(tag)) {
                        // Try to extract value after tag
                        const tagStart = slice.indexOf(tag);
                        if (tagStart >= 0) {
                            const afterTag = slice.slice(tagStart + tag.length);
                            const match = afterTag.match(/[\x20-\x7E]+/); // ASCII printable chars
                            if (match && match[0].trim().length > 0) {
                                const value = match[0].trim().replace(/\0/g, '');
                                if (value && !fields.some(f => f.startsWith(tag))) {
                                    fields.push(`${tag}: ${value}`);
                                }
                            }
                        }
                    }
                });
            }
        } catch (e) {
            fields.push('EXIF preview parsing failed');
        }
        return fields;
    }

    parseIccProfile(profileData) {
        try {
            if (!profileData || profileData.length < 128) {
                return {
                    size_bytes: profileData?.length || 0,
                    status: "Invalid or too small"
                };
            }

            // Convert to Uint8Array if needed
            let bytes;
            if (profileData.buffer) {
                bytes = new Uint8Array(profileData.buffer);
            } else if (typeof profileData === 'string') {
                // If it's a string, convert to bytes
                bytes = new Uint8Array(profileData.length);
                for (let i = 0; i < profileData.length; i++) {
                    bytes[i] = profileData.charCodeAt(i);
                }
            } else {
                bytes = new Uint8Array(profileData);
            }
            
            console.log('ICC profile bytes length:', bytes.length);
            console.log('First 16 bytes:', Array.from(bytes.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '));

            // ICC profiles are binary data, we can read the header
            const dataView = new DataView(bytes.buffer);
            
            // Profile size (bytes 0-3, big endian)
            const profileSize = dataView.getUint32(0, false);
            
            // Preferred CMM type (bytes 4-7)
            const cmmType = String.fromCharCode(
                bytes[4], bytes[5], bytes[6], bytes[7]
            ).replace(/\0/g, '');
            
            // Profile version (bytes 8-11)
            const majorVersion = bytes[8];
            const minorVersion = bytes[9];
            
            // Device class (bytes 12-15)
            const deviceClass = String.fromCharCode(
                bytes[12], bytes[13], bytes[14], bytes[15]
            ).replace(/\0/g, '');
            
            // Data color space (bytes 16-19)
            const colorSpace = String.fromCharCode(
                bytes[16], bytes[17], bytes[18], bytes[19]
            ).replace(/\0/g, '');
            
            // Profile connection space (bytes 20-23)
            const pcs = String.fromCharCode(
                bytes[20], bytes[21], bytes[22], bytes[23]
            ).replace(/\0/g, '');
            
            // Primary platform (bytes 40-43)
            const platform = String.fromCharCode(
                bytes[40], bytes[41], bytes[42], bytes[43]
            ).replace(/\0/g, '');

            const deviceClassNames = {
                'scnr': 'Input device (scanner/camera)',
                'mntr': 'Display device (monitor)', 
                'prtr': 'Output device (printer)',
                'link': 'Device link profile',
                'spac': 'Color space profile',
                'abst': 'Abstract profile',
                'nmcl': 'Named color profile'
            };

            const colorSpaceNames = {
                'RGB ': 'RGB',
                'CMYK': 'CMYK', 
                'GRAY': 'Grayscale',
                'LAB ': 'CIELAB',
                'XYZ ': 'CIEXYZ'
            };

            return {
                size_bytes: profileData.length,
                profile_size: profileSize,
                cmm_type: cmmType || 'Unknown',
                version: `${majorVersion}.${minorVersion}`,
                device_class: deviceClassNames[deviceClass] || deviceClass || 'Unknown',
                color_space: colorSpaceNames[colorSpace] || colorSpace || 'Unknown', 
                connection_space: pcs || 'Unknown',
                platform: platform || 'Unknown'
            };
            
        } catch (e) {
            console.log('Error parsing ICC profile:', e);
            return {
                size_bytes: profileData?.length || 0,
                status: "Could not parse header",
                error: e.message
            };
        }
    }


    copyMetadataText() {
        try {
            const basicData = JSON.parse(this.basicMetadataJson);
            const text = this.createTextDisplay(basicData);
            navigator.clipboard.writeText(text).then(() => {
                this.showStatus('Basic metadata copied as text!', 'success');
            });
        } catch (e) {
            navigator.clipboard.writeText(this.basicMetadataJson).then(() => {
                this.showStatus('Basic metadata copied!', 'success');
            });
        }
    }

    copyMetadataJson() {
        navigator.clipboard.writeText(this.basicMetadataJson).then(() => {
            this.showStatus('Basic metadata JSON copied to clipboard!', 'success');
        });
    }

    copyExtendedText() {
        try {
            const extendedData = JSON.parse(this.extendedMetadataJson);
            const text = this.createTextDisplay(extendedData);
            navigator.clipboard.writeText(text).then(() => {
                this.showStatus('Extended metadata copied as text!', 'success');
            });
        } catch (e) {
            navigator.clipboard.writeText(this.extendedMetadataJson).then(() => {
                this.showStatus('Extended metadata copied!', 'success');
            });
        }
    }

    copyExtendedJson() {
        navigator.clipboard.writeText(this.extendedMetadataJson).then(() => {
            this.showStatus('Extended metadata JSON copied to clipboard!', 'success');
        });
    }

    copyAllMetadata() {
        const basicData = JSON.parse(this.basicMetadataJson);
        const extendedData = JSON.parse(this.extendedMetadataJson);
        const combined = { basic: basicData, extended: extendedData };
        const allJson = JSON.stringify(combined, null, 2);
        
        navigator.clipboard.writeText(allJson).then(() => {
            this.showStatus('All metadata copied as JSON!', 'success');
        }).catch(() => {
            // Fallback - create a temporary textarea
            const temp = document.createElement('textarea');
            temp.value = allJson;
            document.body.appendChild(temp);
            temp.select();
            document.execCommand('copy');
            document.body.removeChild(temp);
            this.showStatus('All metadata copied as JSON!', 'success');
        });
    }

    async downloadImage() {
        if (!this.currentImage) return;
        
        try {
            const format = this.exportFormat.value;
            const quality = parseInt(this.exportQuality.value);
            
            
            let buffer;
            let mimeType;
            let extension;
            
            switch (format) {
                case 'jpeg':
                    buffer = this.currentImage.writeToBuffer('.jpg', { Q: quality });
                    mimeType = 'image/jpeg';
                    extension = 'jpg';
                    break;
                case 'png':
                    buffer = this.currentImage.writeToBuffer('.png');
                    mimeType = 'image/png';
                    extension = 'png';
                    break;
                case 'webp':
                    buffer = this.currentImage.writeToBuffer('.webp', { Q: quality });
                    mimeType = 'image/webp';
                    extension = 'webp';
                    break;
                case 'tiff':
                    buffer = this.currentImage.writeToBuffer('.tiff');
                    mimeType = 'image/tiff';
                    extension = 'tiff';
                    break;
            }
            
            // Generate unique filename
            const operationSummary = this.operations.length > 0 ? 
                this.operations.join('-').toLowerCase().replace(/[^a-z0-9-]/g, '') : 
                'processed';
            const guid = this.generateGUID();
            const filename = `${operationSummary}-${guid}.${extension}`;
            
            // Create download
            const blob = new Blob([buffer], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            
            URL.revokeObjectURL(url);
            this.showStatus(`Image downloaded as ${filename}`, 'success');
            
        } catch (error) {
            this.showStatus('Failed to download image: ' + error.message, 'error');
        }
    }

    generateGUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    resetToOriginal() {
        if (!this.originalImage) return;
        
        this.currentImage = this.originalImage.copy();
        this.operations = [];
        this.updateImageDisplay();
        this.updateOperationList();
        this.resetBtn.disabled = true;
        this.showStatus('Reset to original image', 'success');
    }

    updateOperationList() {
        if (this.operations.length === 0) {
            if (this.operationList) {
                this.operationList.innerHTML = '<span class="text-sm" style="color: var(--text-secondary);">No operations applied</span>';
            }
            if (this.operationListInline) {
                this.operationListInline.textContent = 'None';
            }
        } else {
            if (this.operationList) {
                this.operationList.innerHTML = this.operations
                    .map(op => `<span class="queue-item">${op}</span>`)
                    .join('');
            }
            if (this.operationListInline) {
                this.operationListInline.textContent = this.operations.join(', ');
            }
        }
    }

    showStatus(message, type) {
        let className = '';
        switch (type) {
            case 'error':
                className = 'error-text';
                break;
            case 'success':
                className = 'success-text';
                break;
            default:
                className = 'text-sm';
        }
        
        this.uploadStatus.innerHTML = `<div class="${className}">${message}</div>`;
        
        // Clear status after 5 seconds for success/info messages
        if (type !== 'error') {
            setTimeout(() => {
                this.uploadStatus.innerHTML = '';
            }, 5000);
        }
    }

    disableUpload() {
        this.uploadArea.style.opacity = '0.5';
        this.uploadArea.style.cursor = 'not-allowed';
        this.uploadArea.style.pointerEvents = 'none';
        
        // Update text to show loading state
        const uploadText = this.uploadArea.querySelector('p');
        if (uploadText) {
            uploadText.textContent = 'Loading image processing engine...';
        }
    }

    enableUpload() {
        this.uploadArea.style.opacity = '1';
        this.uploadArea.style.cursor = 'pointer';
        this.uploadArea.style.pointerEvents = 'auto';
        
        // Restore original text
        const uploadText = this.uploadArea.querySelector('p');
        if (uploadText) {
            uploadText.textContent = 'Click to select an image or drag and drop here';
        }
    }

    // Tab switching functionality
    switchTab(tabId) {
        if (!this.tabsEnabled) return;
        
        // Remove active class from all tabs and content
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding content
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        const contentElement = document.getElementById(`${tabId}-tab`);
        if (contentElement) {
            contentElement.classList.add('active');
        }
        
        // Track current active tab and update apply button
        this.currentActiveTab = tabId;
        this.updateApplyButton();
    }

    switchSubTab(subtabId, parentTab) {
        // Remove active class from all sub-tabs and sub-content within this parent tab
        parentTab.querySelectorAll('.sub-tab-btn').forEach(btn => btn.classList.remove('active'));
        parentTab.querySelectorAll('.sub-tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked sub-tab and corresponding content
        parentTab.querySelector(`[data-subtab="${subtabId}"]`).classList.add('active');
        parentTab.querySelector(`#${subtabId}`).classList.add('active');
    }

    // Toggle original image visibility
    toggleOriginalImage() {
        const container = document.getElementById('originalImageContainer');
        const previewContainer = document.querySelector('.image-preview-container');
        const btn = document.getElementById('toggleOriginalBtn');
        
        if (container.classList.contains('collapsed')) {
            container.classList.remove('collapsed');
            previewContainer.classList.remove('original-collapsed');
            btn.textContent = 'Hide Original';
        } else {
            container.classList.add('collapsed');
            previewContainer.classList.add('original-collapsed');
            btn.textContent = 'Show Original';
        }
    }

    // Toggle metadata visibility
    toggleMetadata() {
        const content = document.getElementById('metadataContent');
        const btn = document.getElementById('toggleMetadataBtn');
        
        if (content.classList.contains('collapsed')) {
            content.classList.remove('collapsed');
            btn.textContent = 'Hide Metadata';
        } else {
            content.classList.add('collapsed');
            btn.textContent = 'Show Metadata';
        }
    }

    // Modal functionality
    openUploadModal() {
        if (this.uploadModal) {
            this.uploadModal.classList.remove('hidden');
        }
    }

    closeUploadModal() {
        if (this.uploadModal) {
            this.uploadModal.classList.add('hidden');
        }
    }

    // Operations toggle functionality
    toggleOperations() {
        if (this.operationsContent && this.toggleOperationsBtn) {
            const isCollapsed = this.operationsContent.classList.contains('collapsed');
            if (isCollapsed) {
                this.operationsContent.classList.remove('collapsed');
                this.toggleOperationsBtn.textContent = 'Hide Controls';
            } else {
                this.operationsContent.classList.add('collapsed');
                this.toggleOperationsBtn.textContent = 'Show Controls';
            }
        }
    }

    // Helper method to safely bind events if element exists
    bindIfExists(elementId, eventType, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(eventType, handler);
        }
    }

    // Override the enableTabs method to make metadata the default
    enableTabs() {
        this.tabsEnabled = true;
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.classList.remove('disabled');
        });
        
        // Set metadata as the default active tab
        if (tabs.length > 0) {
            this.switchTab('metadata');
        }
    }

    updateApplyButton() {
        if (!this.commonApplyBtn) return;
        
        // Disable for metadata and export tabs (they don't need apply)
        const nonApplyTabs = ['metadata', 'export'];
        
        if (this.currentActiveTab && !nonApplyTabs.includes(this.currentActiveTab)) {
            this.commonApplyBtn.disabled = false;
            this.commonApplyBtn.textContent = this.getApplyButtonText(this.currentActiveTab);
        } else {
            this.commonApplyBtn.disabled = true;
            this.commonApplyBtn.textContent = 'Apply Operation';
        }
    }

    getApplyButtonText(tabId) {
        const buttonTexts = {
            'crop': 'Apply Crop',
            'resize': 'Apply Resize',
            'rotate-flip': 'Apply Transform',
            'blur-sharpen': 'Apply Effect',
            'tint-grayscale': 'Apply Color Effect',
            'filters': 'Apply Filter',
            'edge-detection': 'Apply Edge Detection'
        };
        return buttonTexts[tabId] || 'Apply Operation';
    }

    async handleCommonApply() {
        if (!this.currentActiveTab || this.isProcessing) return;
        
        try {
            switch (this.currentActiveTab) {
                case 'crop':
                    await this.handleCropApply();
                    break;
                case 'resize':
                    await this.applyResize();
                    break;
                case 'rotate-flip':
                    await this.handleRotateFlipApply();
                    break;
                case 'blur-sharpen':
                    await this.handleBlurSharpenApply();
                    break;
                case 'tint-grayscale':
                    await this.handleTintGrayscaleApply();
                    break;
                case 'filters':
                    await this.handleFiltersApply();
                    break;
                case 'edge-detection':
                    await this.handleEdgeDetectionApply();
                    break;
                default:
                    console.warn('Unknown tab:', this.currentActiveTab);
            }
        } catch (error) {
            console.error('Apply operation failed:', error);
            this.showStatus(`Failed to apply operation: ${error.message}`, 'error');
        }
    }

    async handleCropApply() {
        // Check if smart crop or manual crop is active
        const activeSubTab = document.querySelector('#crop-tab .sub-tab-btn.active')?.dataset.subtab;
        if (activeSubTab === 'smart-crop') {
            await this.applySmartCrop();
        } else {
            await this.applyCrop();
        }
    }

    async handleRotateFlipApply() {
        // For rotate/flip, we'll apply rotation if angle is set
        const rotateAngle = document.getElementById('rotateAngle').value;
        
        if (rotateAngle && rotateAngle !== 'custom') {
            await this.applyRotation();
        } else if (rotateAngle === 'custom') {
            const customAngle = document.getElementById('customAngle').value;
            if (customAngle) {
                await this.applyRotation();
            }
        }
        // Note: Flip buttons will still work directly since they're simple one-click operations
    }

    async handleBlurSharpenApply() {
        // Apply blur or sharpen based on current slider values - prioritize blur
        const blurRadius = parseFloat(document.getElementById('blurRadius').value);
        const sharpenSigma = parseFloat(document.getElementById('sharpenSigma').value);
        
        if (blurRadius > 0.1) {
            await this.applyBlur();
        } else if (sharpenSigma > 1.0) {
            await this.applySharpen();
        } else {
            this.showStatus('Please adjust blur or sharpen values to apply effect', 'error');
        }
    }

    async handleTintGrayscaleApply() {
        // Check active sub-tab
        const activeSubTab = document.querySelector('#tint-grayscale-tab .sub-tab-btn.active')?.dataset.subtab;
        if (activeSubTab === 'tint') {
            await this.applyTint();
        } else if (activeSubTab === 'grayscale') {
            await this.applyGrayscale();
        } else {
            this.showStatus('Please select a color effect to apply', 'error');
        }
    }

    async handleFiltersApply() {
        // For now, let's use the first available filter as default
        // In a real implementation, you might want radio buttons to select which filter
        await this.applySepia();
    }

    async handleEdgeDetectionApply() {
        const edgeType = document.querySelector('input[name="edgeDetection"]:checked')?.value;
        if (edgeType === 'canny') {
            await this.applyCanny();
        } else if (edgeType === 'sobel') {
            await this.applySobel();
        } else {
            this.showStatus('Please select an edge detection method', 'error');
        }
    }
}

// Initialize the image editor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ImageEditor();
});