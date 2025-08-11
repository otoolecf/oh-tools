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

        // Metadata elements (now handled by web component)
        // this.metadataSection = document.getElementById('metadataSection');
        // this.basicMetadataDisplay = document.getElementById('basicMetadataDisplay');
        // this.extendedMetadataDisplay = document.getElementById('extendedMetadataDisplay');
        // this.copyMetadataTextBtn = document.getElementById('copyMetadataTextBtn');
        // this.copyMetadataJsonBtn = document.getElementById('copyMetadataJsonBtn');
        // this.copyExtendedTextBtn = document.getElementById('copyExtendedTextBtn');
        // this.copyExtendedJsonBtn = document.getElementById('copyExtendedJsonBtn');
        // this.copyAllMetadataBtn = document.getElementById('copyAllMetadataBtn');

        // Preview elements
        this.previewSection = document.getElementById('previewSection');
        this.originalImageEl = document.getElementById('originalImage');
        this.previewImageEl = document.getElementById('previewImage');
        this.originalMetadata = document.getElementById('originalMetadata');
        this.previewMetadata = document.getElementById('previewMetadata');

        // Operation elements
        this.operationsSection = document.getElementById('operationsSection');
        this.operationList = document.getElementById('operationList');
        this.operationTagsContainer = document.getElementById('operationTagsContainer');
        this.resetBtn = document.getElementById('resetBtn');
        this.uploadNewBtn = document.getElementById('uploadNewBtn');
        
        // Modal elements
        this.uploadModal = document.getElementById('uploadModal');
        this.modalOverlay = this.uploadModal?.querySelector('.modal-overlay');
        this.closeModalBtn = document.getElementById('closeModalBtn');
        
        // Operations control elements
        this.toggleOperationsBtn = document.getElementById('toggleOperationsBtn');
        this.operationsContent = document.getElementById('operationsContent');

        // Control elements
        // Resize elements now handled by web component
        // this.resizeWidth = document.getElementById('resizeWidth');
        // this.resizeHeight = document.getElementById('resizeHeight');
        // this.maintainAspect = document.getElementById('maintainAspect');
        // Crop elements now handled by web component
        // this.cropX = document.getElementById('cropX');
        // this.cropY = document.getElementById('cropY');
        // this.cropWidth = document.getElementById('cropWidth');
        // this.cropHeight = document.getElementById('cropHeight');
        // this.smartCropWidth = document.getElementById('smartCropWidth');
        // this.smartCropHeight = document.getElementById('smartCropHeight');
        // this.smartCropMode = document.getElementById('smartCropMode');
        // this.smartCropStrategy = document.getElementById('smartCropStrategy');
        this.thumbnailWidth = document.getElementById('thumbnailWidth');
        this.thumbnailHeight = document.getElementById('thumbnailHeight');
        this.thumbnailCrop = document.getElementById('thumbnailCrop');
        this.thumbnailNoRotate = document.getElementById('thumbnailNoRotate');
        this.thumbnailNoUpscale = document.getElementById('thumbnailNoUpscale');
        // rotateAngle, customAngle, customAngleGroup now handled by web component
        // Tint/grayscale elements now handled by web component
        // this.grayscaleThreshold = document.getElementById('grayscaleThreshold');
        // this.tintColor = document.getElementById('tintColor');
        // this.tintOpacity = document.getElementById('tintOpacity');
        // Blur/sharpen elements now handled by web component
        // this.blurRadius = document.getElementById('blurRadius');
        // this.sharpenSigma = document.getElementById('sharpenSigma');
        // this.cannySigma = document.getElementById('cannySigma'); // Now handled by web component
        // Export elements now handled by web component
        // this.exportFormat = document.getElementById('exportFormat');
        // this.exportQuality = document.getElementById('exportQuality');
        // this.qualityGroup = document.getElementById('qualityGroup');
        
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
        // Resize operations now handled by web component
        // this.bindIfExists('resizeBtn', 'click', () => this.applyResize());
        // Crop operations now handled by web component
        // this.bindIfExists('cropBtn', 'click', () => this.applyCrop());
        // this.bindIfExists('smartCropBtn', 'click', () => this.applySmartCrop());
        this.bindIfExists('thumbnailBtn', 'click', () => this.applyThumbnail());
        // Rotate/flip operations now handled by web component
        // this.bindIfExists('rotateBtn', 'click', () => this.applyRotation());
        // this.bindIfExists('flipHBtn', 'click', () => this.applyFlip('horizontal'));
        // this.bindIfExists('flipVBtn', 'click', () => this.applyFlip('vertical'));
        // Tint/grayscale operations now handled by web component
        // this.bindIfExists('grayscaleBtn', 'click', () => this.applyGrayscale());
        this.bindIfExists('negateBtn', 'click', () => this.applyNegate());
        // this.bindIfExists('tintBtn', 'click', () => this.applyTint());
        // Filter buttons now handled by web component
        // this.bindIfExists('sepiaBtn', 'click', () => this.applySepia());
        // this.bindIfExists('vintageBtn', 'click', () => this.applyVintage());
        // this.bindIfExists('warmBtn', 'click', () => this.applyWarm());
        // this.bindIfExists('coolBtn', 'click', () => this.applyCool());
        // this.bindIfExists('contrastBtn', 'click', () => this.applyHighContrast());
        this.bindIfExists('flattenBtn', 'click', () => this.applyFlatten());
        this.bindIfExists('unflattenBtn', 'click', () => this.applyUnflatten());
        // Blur/sharpen operations now handled by web component
        // this.bindIfExists('blurBtn', 'click', () => this.applyBlur());
        // this.bindIfExists('sharpenBtn', 'click', () => this.applySharpen());
        // Edge detection buttons now handled by web component
        // this.bindIfExists('cannyBtn', 'click', () => this.applyCanny());
        // this.bindIfExists('sobelBtn', 'click', () => this.applySobel());
        // Download button now handled by web component
        // this.bindIfExists('downloadBtn', 'click', () => this.downloadImage());

        // Reset button
        this.resetBtn.addEventListener('click', () => this.resetToOriginal());
        
        // Upload new button - opens modal
        this.uploadNewBtn?.addEventListener('click', () => this.openUploadModal());
        
        // Initial upload button - opens modal
        this.initialUploadBtn?.addEventListener('click', () => this.openUploadModal());
        
        // Common apply button
        
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

        // Copy metadata buttons now handled by web component
        // this.copyMetadataTextBtn.addEventListener('click', () => this.copyMetadataText());
        // this.copyMetadataJsonBtn.addEventListener('click', () => this.copyMetadataJson());
        // this.copyExtendedTextBtn.addEventListener('click', () => this.copyExtendedText());
        // this.copyExtendedJsonBtn.addEventListener('click', () => this.copyExtendedJson());
        // this.copyAllMetadataBtn.addEventListener('click', () => this.copyAllMetadata());

        // Individual apply buttons (crop now handled by web component)
        // document.getElementById('applyCropBtn')?.addEventListener('click', () => this.applyCrop());
        // document.getElementById('applySmartCropBtn')?.addEventListener('click', () => this.applySmartCrop());
        // document.getElementById('applyResizeBtn')?.addEventListener('click', () => this.applyResize());
        // applyRotateBtn is now handled by the web component
        // document.getElementById('applyBlurBtn')?.addEventListener('click', () => this.applyBlur());
        // document.getElementById('applySharpenBtn')?.addEventListener('click', () => this.applySharpen());
        // document.getElementById('applyTintBtn')?.addEventListener('click', () => this.applyTint());
        // document.getElementById('applyGrayscaleBtn')?.addEventListener('click', () => this.applyGrayscale());
        // document.getElementById('applyEdgeDetectionBtn')?.addEventListener('click', () => this.handleEdgeDetectionApply()); // Now handled by web component

        // Individual operation buttons (filters, etc.) - now handled by web component
        // document.getElementById('sepiaBtn')?.addEventListener('click', () => this.applySepia());
        // document.getElementById('vintageBtn')?.addEventListener('click', () => this.applyVintage());
        // document.getElementById('warmBtn')?.addEventListener('click', () => this.applyWarm());
        // document.getElementById('coolBtn')?.addEventListener('click', () => this.applyCool());
        // document.getElementById('contrastBtn')?.addEventListener('click', () => this.applyContrast());
        // document.getElementById('downloadBtn')?.addEventListener('click', () => this.downloadImage()); // Now handled by web component

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

        // Tint/grayscale slider sync now handled by web component
        // if (this.grayscaleThreshold) {
        //     this.grayscaleThreshold.addEventListener('input', (e) => {
        //         const numInput = document.getElementById('grayscaleThresholdNum');
        //         if (numInput) numInput.value = e.target.value;
        //     });
        // }
        // if (this.tintOpacity) {
        //     this.tintOpacity.addEventListener('input', (e) => {
        //         const numInput = document.getElementById('tintOpacityNum');
        //         if (numInput) numInput.value = e.target.value;
        //     });
        // }
        // Export quality slider sync now handled by web component
        // if (this.exportQuality) {
        //     this.exportQuality.addEventListener('input', (e) => {
        //         const numInput = document.getElementById('exportQualityNum');
        //         if (numInput) numInput.value = e.target.value;
        //     });
        // }
        // Blur/sharpen slider sync now handled by web component
        // if (this.blurRadius) {
        //     this.blurRadius.addEventListener('input', (e) => {
        //         const numInput = document.getElementById('blurRadiusNum');
        //         if (numInput) numInput.value = e.target.value;
        //     });
        // }
        // if (this.sharpenSigma) {
        //     this.sharpenSigma.addEventListener('input', (e) => {
        //         const numInput = document.getElementById('sharpenSigmaNum');
        //         if (numInput) numInput.value = e.target.value;
        //     });
        // }
        // Canny sigma slider sync now handled by web component
        // if (this.cannySigma) {
        //     this.cannySigma.addEventListener('input', (e) => {
        //         const numInput = document.getElementById('cannySigmaNum');
        //         if (numInput) numInput.value = e.target.value;
        //     });
        // }
        
        // Tint/grayscale number input sync now handled by web component
        // this.bindIfExists('grayscaleThresholdNum', 'input', (e) => {
        //     if (this.grayscaleThreshold) this.grayscaleThreshold.value = e.target.value;
        // });
        // this.bindIfExists('tintOpacityNum', 'input', (e) => {
        //     if (this.tintOpacity) this.tintOpacity.value = e.target.value;
        // });
        // this.bindIfExists('exportQualityNum', 'input', (e) => {
        //     if (this.exportQuality) this.exportQuality.value = e.target.value;
        // }); // Now handled by web component
        // Blur/sharpen number input sync now handled by web component
        // this.bindIfExists('blurRadiusNum', 'input', (e) => {
        //     if (this.blurRadius) this.blurRadius.value = e.target.value;
        // });
        // this.bindIfExists('sharpenSigmaNum', 'input', (e) => {
        //     if (this.sharpenSigma) this.sharpenSigma.value = e.target.value;
        // });
        // this.bindIfExists('cannySigmaNum', 'input', (e) => {
        //     if (this.cannySigma) this.cannySigma.value = e.target.value;
        // }); // Now handled by web component

        // Format change now handled by web component
        // if (this.exportFormat) {
        //     this.exportFormat.addEventListener('change', () => this.updateQualityVisibility());
        // }
        // rotateAngle now handled by web component
        // if (this.rotateAngle) {
        //     this.rotateAngle.addEventListener('change', () => this.updateCustomAngleVisibility());
        // }
        
        // Listen for web component events
        this.setupWebComponentListeners();

        // Aspect ratio maintenance now handled by web component
        // if (this.resizeWidth) {
        //     this.resizeWidth.addEventListener('input', () => this.updateAspectRatio('width'));
        // }
        // if (this.resizeHeight) {
        //     this.resizeHeight.addEventListener('input', () => this.updateAspectRatio('height'));
        // }
    }

    setupWebComponentListeners() {
        // Listen for operation events from web components
        document.addEventListener('operation-applied', (event) => {
            this.handleWebComponentOperation(event.detail);
        });
        
        document.addEventListener('operation-error', (event) => {
            this.showStatus(`${event.detail.operatorName} error: ${event.detail.error}`, 'error');
        });
    }

    async handleWebComponentOperation(detail) {
        try {
            console.log('Web component operation:', detail);
            
            // Update the current image
            this.currentImage = detail.image;
            
            // Add to operations list
            this.operations.push(detail.description);
            
            // Update display and metadata
            await this.updateImageDisplay();
            // Metadata now handled by web component during initialization
            this.updateOperationList();
            this.resetBtn.disabled = false;
            
            this.showStatus(`${detail.description} applied successfully!`, 'success');
            
        } catch (error) {
            console.error('Failed to process web component operation:', error);
            this.showStatus(`Failed to apply ${detail.description}: ${error.message}`, 'error');
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
            
            // Check for TIFF files
            const isTiff = file.name.toLowerCase().endsWith('.tiff') || 
                          file.name.toLowerCase().endsWith('.tif') ||
                          file.type === 'image/tiff';
            
            let processedFile = file;
            let originalFileBuffer = null;
            
            // Store the original buffer for metadata extraction
            this.showStatus('Processing file and extracting metadata...', 'info');
            originalFileBuffer = await file.arrayBuffer();
            console.log('Stored original file buffer for metadata extraction');
            
            // For HEIC files, convert to a more standard format
            if (isHeic) {
                console.log('Converting HEIC file...');
            }
            
            if (isHeic && this.heif) {
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
            
            // Store the original file buffer for metadata extraction
            this.originalFileBuffer = originalFileBuffer;
            
            // Display images and metadata
            await this.updateImageDisplay();
            // Metadata now handled by web component during initialization
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
            
            // Crop controls now handled by web component
            
        } catch (error) {
            console.error('Display conversion error:', error);
            this.showStatus('Failed to display image: ' + error.message, 'error');
        }
    }

    // updateCropLimits now handled by web component

    showImageControls() {
        this.previewSection.classList.remove('hidden');
        this.operationsSection.classList.remove('hidden');
        this.enableTabs();
        
        // Initialize web components with image data
        this.initializeWebComponents();
        
        // Hide the initial upload section
        if (this.initialUploadSection) {
            this.initialUploadSection.classList.add('hidden');
        }
        
        // Close the upload modal if it's open
        this.closeUploadModal();
    }

    initializeWebComponents() {
        // Initialize the rotate-flip operator
        const rotateFlipOperator = document.getElementById('rotateFlipOperator');
        if (rotateFlipOperator && this.currentImage && this.vips) {
            rotateFlipOperator.setImage(this.currentImage, this.vips);
        }
        
        // Initialize the crop operator
        const cropOperator = document.getElementById('cropOperator');
        if (cropOperator && this.currentImage && this.vips) {
            cropOperator.setImage(this.currentImage, this.vips);
        }
        
        // Initialize the resize operator
        const resizeOperator = document.getElementById('resizeOperator');
        if (resizeOperator && this.currentImage && this.vips) {
            resizeOperator.setImage(this.currentImage, this.vips);
        }
        
        // Initialize the blur-sharpen operator
        const blurSharpenOperator = document.getElementById('blurSharpenOperator');
        if (blurSharpenOperator && this.currentImage && this.vips) {
            blurSharpenOperator.setImage(this.currentImage, this.vips);
        }
        
        // Initialize the tint-grayscale operator
        const tintGrayscaleOperator = document.getElementById('tintGrayscaleOperator');
        if (tintGrayscaleOperator && this.currentImage && this.vips) {
            tintGrayscaleOperator.setImage(this.currentImage, this.vips);
        }
        
        // Initialize the metadata operator
        const metadataOperator = document.getElementById('metadataOperator');
        if (metadataOperator && this.currentImage && this.vips) {
            if (this.originalFileBuffer) {
                metadataOperator.setImageWithBuffer(this.currentImage, this.vips, this.originalFileBuffer);
            } else {
                metadataOperator.setImage(this.currentImage, this.vips);
            }
        }
        
        // Initialize the filters operator
        const filtersOperator = document.getElementById('filtersOperator');
        if (filtersOperator && this.currentImage && this.vips) {
            filtersOperator.setImage(this.currentImage, this.vips);
        }
        
        // Initialize the edge detection operator
        const edgeDetectionOperator = document.getElementById('edgeDetectionOperator');
        if (edgeDetectionOperator && this.currentImage && this.vips) {
            edgeDetectionOperator.setImage(this.currentImage, this.vips);
        }
        
        // Initialize the export operator
        const exportOperator = document.getElementById('exportOperator');
        if (exportOperator && this.currentImage && this.vips) {
            exportOperator.setImage(this.currentImage, this.vips);
        }
    }


    disableTabs() {
        this.tabsEnabled = false;
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.classList.add('disabled');
            tab.classList.remove('active');
        });
    }

    // updateAspectRatio now handled by web component

    // updateCustomAngleVisibility now handled by web component

    // OLD EXPORT METHOD - Now handled by export-operator web component
    /*
    updateQualityVisibility() {
        const format = this.exportFormat.value;
        // PNG and TIFF don't typically use quality settings
        if (format === 'png' || format === 'tiff') {
            this.qualityGroup.classList.add('hidden');
        } else {
            this.qualityGroup.classList.remove('hidden');
        }
    }
    */

    disableAllOperationButtons() {
        // Get all buttons that trigger operations
        const operationButtons = document.querySelectorAll(
            '.btn-enhanced, .tab-btn:not(.disabled), #flipHBtn, #flipVBtn, #resetBtn, #uploadNewBtn'
        );
        
        operationButtons.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.6';
            btn.style.cursor = 'not-allowed';
        });
    }

    enableAllOperationButtons() {
        // Re-enable all operation buttons
        const operationButtons = document.querySelectorAll(
            '.btn-enhanced, .tab-btn:not(.disabled), #flipHBtn, #flipVBtn, #uploadNewBtn'
        );
        
        operationButtons.forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        });
        
        // Reset button stays enabled only if there are operations
        if (this.resetBtn) {
            this.resetBtn.disabled = this.operations.length === 0;
        }
    }

    async applyOperation(operationFn, operationName) {
        if (this.isProcessing) return;
        
        try {
            this.isProcessing = true;
            this.disableAllOperationButtons();
            this.showStatus(`Applying ${operationName}...`, 'info');
            
            
            const newImage = await operationFn(this.currentImage);
            
            this.currentImage = newImage;
            this.operations.push(operationName);
            
            await this.updateImageDisplay();
            // Metadata automatically updates with new image in web component
            this.updateOperationList();
            this.resetBtn.disabled = false;
            
            this.showStatus(`${operationName} applied successfully!`, 'success');
            
        } catch (error) {
            this.showStatus(`Failed to apply ${operationName}: ${error.message}`, 'error');
        } finally {
            this.isProcessing = false;
            this.enableAllOperationButtons();
        }
    }

    // applyResize now handled by web component

    // applyCrop and applySmartCrop now handled by web component

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

    // applyRotation and applyFlip now handled by web component

    // applyGrayscale and applyTint now handled by web component

    async applyNegate() {
        await this.applyOperation(
            (image) => image.invert(),
            'Negate colors'
        );
    }

    // OLD FILTER METHODS - Now handled by filters-operator web component
    /*
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
    */

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

    // applyBlur and applySharpen now handled by web component

    // OLD EDGE DETECTION METHODS - Now handled by edge-detection-operator web component
    /*
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
    */



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
            // Metadata display now handled by web component
            this.originalMetadata.classList.remove('hidden');
            this.previewMetadata.classList.remove('hidden');
        }
    }

    // OLD METADATA METHODS - Now handled by metadata-operator web component
    /*
    async showMetadata() {
        // Use original image for basic metadata (VIPS-based)
        this.basicMetadataJson = this.getImageMetadata(this.originalImage);
        
        // Use original file buffer for extended metadata when available, otherwise use current image
        this.extendedMetadataJson = await this.getExtendedMetadata(this.originalFileBuffer || this.currentImage);
        
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
            // Show original vs current processed metadata
            const originalMeta = this.getImageMetadata(this.originalImage);
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

            let arrayBuffer = null;
            
            // Check if source is already an ArrayBuffer (original file)
            if (image instanceof ArrayBuffer) {
                console.log('Using original file buffer for metadata extraction');
                arrayBuffer = image;
            } else {
                // Source is a VIPS Image, convert to buffer
                console.log('Converting VIPS image to buffer for metadata extraction');
                try {
                    const imageBuffer = image.writeToBuffer('.jpg', { Q: 95 });
                    arrayBuffer = imageBuffer.buffer.slice(imageBuffer.byteOffset, imageBuffer.byteOffset + imageBuffer.byteLength);
                    console.log('Got image buffer for ExifReader, size:', arrayBuffer.byteLength);
                } catch (e) {
                    console.error('Failed to get image buffer:', e);
                    return 'Failed to get image data for metadata parsing';
                }
            }

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
    */

    // OLD DOWNLOAD METHOD - Now handled by export-operator web component
    /*
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
    */

    generateGUID() {
        // Use browser's built-in crypto API for secure UUID generation
        if (crypto && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Fallback for older browsers
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
        
        // Reset web components
        const rotateFlipOperator = document.getElementById('rotateFlipOperator');
        if (rotateFlipOperator) {
            rotateFlipOperator.setImage(this.currentImage, this.vips);
            rotateFlipOperator.reset();
        }
        
        const cropOperator = document.getElementById('cropOperator');
        if (cropOperator) {
            cropOperator.setImage(this.currentImage, this.vips);
            cropOperator.reset();
        }
        
        const resizeOperator = document.getElementById('resizeOperator');
        if (resizeOperator) {
            resizeOperator.setImage(this.currentImage, this.vips);
            resizeOperator.reset();
        }
        
        const blurSharpenOperator = document.getElementById('blurSharpenOperator');
        if (blurSharpenOperator) {
            blurSharpenOperator.setImage(this.currentImage, this.vips);
            blurSharpenOperator.reset();
        }
        
        const tintGrayscaleOperator = document.getElementById('tintGrayscaleOperator');
        if (tintGrayscaleOperator) {
            tintGrayscaleOperator.setImage(this.currentImage, this.vips);
            tintGrayscaleOperator.reset();
        }
        
        const metadataOperator = document.getElementById('metadataOperator');
        if (metadataOperator) {
            if (this.originalFileBuffer) {
                metadataOperator.setImageWithBuffer(this.currentImage, this.vips, this.originalFileBuffer);
            } else {
                metadataOperator.setImage(this.currentImage, this.vips);
            }
            metadataOperator.reset();
        }
        
        const filtersOperator = document.getElementById('filtersOperator');
        if (filtersOperator) {
            filtersOperator.setImage(this.currentImage, this.vips);
            filtersOperator.reset();
        }
        
        const edgeDetectionOperator = document.getElementById('edgeDetectionOperator');
        if (edgeDetectionOperator) {
            edgeDetectionOperator.setImage(this.currentImage, this.vips);
            edgeDetectionOperator.reset();
        }
        
        const exportOperator = document.getElementById('exportOperator');
        if (exportOperator) {
            exportOperator.setImage(this.currentImage, this.vips);
            exportOperator.reset();
        }
        
        this.showStatus('Reset to original image', 'success');
    }

    getOperationTag(operation) {
        const opLower = operation.toLowerCase();
        
        // Transform detailed operation names into concise tags
        if (opLower.includes('flip horizontal')) return 'flip horizontal';
        if (opLower.includes('flip vertical')) return 'flip vertical';
        if (opLower.includes('rotate') && opLower.includes('90')) return 'rotate 90°';
        if (opLower.includes('rotate') && opLower.includes('180')) return 'rotate 180°';
        if (opLower.includes('rotate') && opLower.includes('270')) return 'rotate 270°';
        if (opLower.includes('rotate')) return 'rotate';
        
        if (opLower.includes('smart crop')) {
            // Extract dimensions if present: "Smart Crop 500x300 (attention)" -> "smart crop 500×300"
            const match = operation.match(/(\d+)x(\d+)/i);
            if (match) return `smart crop ${match[1]}×${match[2]}`;
            return 'smart crop';
        }
        if (opLower.includes('manual crop') || opLower.includes('crop')) {
            // Extract dimensions if present
            const match = operation.match(/(\d+)x(\d+)/i);
            if (match) return `crop ${match[1]}×${match[2]}`;
            return 'crop';
        }
        
        if (opLower.includes('resize')) {
            // Extract dimensions: "Resize 800x600" -> "resize 800×600"
            const match = operation.match(/(\d+)x(\d+)/i);
            if (match) return `resize ${match[1]}×${match[2]}`;
            return 'resize';
        }
        
        if (opLower.includes('blur')) return 'blur';
        if (opLower.includes('sharpen')) return 'sharpen';
        if (opLower.includes('tint')) return 'tint';
        if (opLower.includes('grayscale')) return 'grayscale';
        if (opLower.includes('sepia')) return 'sepia';
        if (opLower.includes('vintage')) return 'vintage';
        if (opLower.includes('warm')) return 'warm';
        if (opLower.includes('cool')) return 'cool';
        if (opLower.includes('contrast')) return 'contrast';
        if (opLower.includes('canny')) return 'canny';
        if (opLower.includes('sobel')) return 'sobel';
        
        // Fallback: return the operation as-is but truncated
        return operation.length > 20 ? operation.substring(0, 17) + '...' : operation;
    }

    updateOperationList() {
        if (this.operations.length === 0) {
            if (this.operationList) {
                this.operationList.innerHTML = '<span class="text-sm" style="color: var(--text-secondary);">No operations applied</span>';
            }
            if (this.operationTagsContainer) {
                this.operationTagsContainer.innerHTML = '<span class="operation-tag-placeholder">None</span>';
            }
        } else {
            if (this.operationList) {
                this.operationList.innerHTML = this.operations
                    .map(op => `<span class="queue-item">${op}</span>`)
                    .join('');
            }
            if (this.operationTagsContainer) {
                // Create individual tags for each operation (no deduplication)
                this.operationTagsContainer.innerHTML = this.operations
                    .map(op => `<span class="operation-tag">${this.getOperationTag(op)}</span>`)
                    .join('');
            }
        }
    }

    // OLD EDGE DETECTION HANDLER - Now handled by web component
    /*
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
    */

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
        
        // Disable initial upload button
        if (this.initialUploadBtn) {
            this.initialUploadBtn.disabled = true;
            this.initialUploadBtn.style.opacity = '0.5';
            this.initialUploadBtn.style.cursor = 'not-allowed';
            this.initialUploadBtn.textContent = 'Loading...';
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
        
        // Enable initial upload button
        if (this.initialUploadBtn) {
            this.initialUploadBtn.disabled = false;
            this.initialUploadBtn.style.opacity = '1';
            this.initialUploadBtn.style.cursor = 'pointer';
            this.initialUploadBtn.textContent = 'Choose Image';
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
            'metadata': 'Copy All as JSON',
            'export': 'Export'
        };
        return buttonTexts[tabId] || 'Apply';
    }

    async handleCommonApply() {
        if (!this.currentActiveTab || this.isProcessing) return;
        
        try {
            switch (this.currentActiveTab) {
                case 'crop':
                    // Now handled by web component
                    break;
                case 'resize':
                    // Now handled by web component
                    break;
                case 'rotate-flip':
                    // Now handled by web component
                    break;
                case 'blur-sharpen':
                    // Now handled by web component
                    break;
                case 'tint-grayscale':
                    // Now handled by web component
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

    // handleCropApply now handled by web component

    // handleRotateFlipApply now handled by web component

    // handleBlurSharpenApply now handled by web component

    // handleTintGrayscaleApply now handled by web component

    async handleFiltersApply() {
        // For now, let's use the first available filter as default
        // In a real implementation, you might want radio buttons to select which filter
        await this.applySepia();
    }

    // OLD EDGE DETECTION HANDLER - Now handled by web component
    /*
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
    */
}

// Initialize the image editor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ImageEditor();
});