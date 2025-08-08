class ImageEditor {
    constructor() {
        this.vips = null;
        this.originalImage = null;
        this.currentImage = null;
        this.operations = [];
        this.isProcessing = false;
        
        this.initializeElements();
        this.bindEvents();
        this.initializeVips();
    }

    initializeElements() {
        // Upload elements
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.uploadStatus = document.getElementById('uploadStatus');
        
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
        this.metadataDisplay = document.getElementById('metadataDisplay');
        this.extendedMetadataDisplay = document.getElementById('extendedMetadataDisplay');
        this.copyMetadataBtn = document.getElementById('copyMetadataBtn');
        this.copyExtendedBtn = document.getElementById('copyExtendedBtn');
        this.copyAllMetadataBtn = document.getElementById('copyAllMetadataBtn');

        // Preview elements
        this.previewSection = document.getElementById('previewSection');
        this.originalImageEl = document.getElementById('originalImage');
        this.previewImageEl = document.getElementById('previewImage');
        this.originalMetadata = document.getElementById('originalMetadata');
        this.previewMetadata = document.getElementById('previewMetadata');

        // Operation elements
        this.operationsPanel = document.getElementById('operationsPanel');
        this.operationList = document.getElementById('operationList');
        this.resetBtn = document.getElementById('resetBtn');

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

        // Operation buttons
        document.getElementById('resizeBtn').addEventListener('click', () => this.applyResize());
        document.getElementById('cropBtn').addEventListener('click', () => this.applyCrop());
        document.getElementById('smartCropBtn').addEventListener('click', () => this.applySmartCrop());
        document.getElementById('thumbnailBtn').addEventListener('click', () => this.applyThumbnail());
        document.getElementById('rotateBtn').addEventListener('click', () => this.applyRotation());
        document.getElementById('flipHBtn').addEventListener('click', () => this.applyFlip('horizontal'));
        document.getElementById('flipVBtn').addEventListener('click', () => this.applyFlip('vertical'));
        document.getElementById('grayscaleBtn').addEventListener('click', () => this.applyGrayscale());
        document.getElementById('negateBtn').addEventListener('click', () => this.applyNegate());
        document.getElementById('tintBtn').addEventListener('click', () => this.applyTint());
        document.getElementById('sepiaBtn').addEventListener('click', () => this.applySepia());
        document.getElementById('vintageBtn').addEventListener('click', () => this.applyVintage());
        document.getElementById('warmBtn').addEventListener('click', () => this.applyWarm());
        document.getElementById('coolBtn').addEventListener('click', () => this.applyCool());
        document.getElementById('contrastBtn').addEventListener('click', () => this.applyHighContrast());
        document.getElementById('flattenBtn').addEventListener('click', () => this.applyFlatten());
        document.getElementById('unflattenBtn').addEventListener('click', () => this.applyUnflatten());
        document.getElementById('blurBtn').addEventListener('click', () => this.applyBlur());
        document.getElementById('sharpenBtn').addEventListener('click', () => this.applySharpen());
        document.getElementById('cannyBtn').addEventListener('click', () => this.applyCanny());
        document.getElementById('sobelBtn').addEventListener('click', () => this.applySobel());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadImage());

        // Reset button
        this.resetBtn.addEventListener('click', () => this.resetToOriginal());

        // Copy metadata buttons
        this.copyMetadataBtn.addEventListener('click', () => this.copyMetadata());
        this.copyExtendedBtn.addEventListener('click', () => this.copyExtendedMetadata());
        this.copyAllMetadataBtn.addEventListener('click', () => this.copyAllMetadata());

        // Range inputs and their number counterparts
        this.grayscaleThreshold.addEventListener('input', (e) => {
            document.getElementById('grayscaleThresholdNum').value = e.target.value;
        });
        this.tintOpacity.addEventListener('input', (e) => {
            document.getElementById('tintOpacityNum').value = e.target.value;
        });
        this.exportQuality.addEventListener('input', (e) => {
            document.getElementById('exportQualityNum').value = e.target.value;
        });
        this.blurRadius.addEventListener('input', (e) => {
            document.getElementById('blurRadiusNum').value = e.target.value;
        });
        this.sharpenSigma.addEventListener('input', (e) => {
            document.getElementById('sharpenSigmaNum').value = e.target.value;
        });
        this.cannySigma.addEventListener('input', (e) => {
            document.getElementById('cannySigmaNum').value = e.target.value;
        });
        
        // Number inputs sync with sliders
        document.getElementById('grayscaleThresholdNum').addEventListener('input', (e) => {
            this.grayscaleThreshold.value = e.target.value;
        });
        document.getElementById('tintOpacityNum').addEventListener('input', (e) => {
            this.tintOpacity.value = e.target.value;
        });
        document.getElementById('exportQualityNum').addEventListener('input', (e) => {
            this.exportQuality.value = e.target.value;
        });
        document.getElementById('blurRadiusNum').addEventListener('input', (e) => {
            this.blurRadius.value = e.target.value;
        });
        document.getElementById('sharpenSigmaNum').addEventListener('input', (e) => {
            this.sharpenSigma.value = e.target.value;
        });
        document.getElementById('cannySigmaNum').addEventListener('input', (e) => {
            this.cannySigma.value = e.target.value;
        });

        // Format change
        this.exportFormat.addEventListener('change', () => this.updateQualityVisibility());
        this.rotateAngle.addEventListener('change', () => this.updateCustomAngleVisibility());

        // Aspect ratio maintenance
        this.resizeWidth.addEventListener('input', () => this.updateAspectRatio('width'));
        this.resizeHeight.addEventListener('input', () => this.updateAspectRatio('height'));
    }

    async initializeVips() {
        try {
            this.showStatus('Initializing image processing engine...', 'info');
            
            // Debug info
            console.log('crossOriginIsolated:', window.crossOriginIsolated);
            console.log('SharedArrayBuffer available:', typeof SharedArrayBuffer !== 'undefined');
            console.log('Vips available:', typeof Vips !== 'undefined');
            
            // Check if SharedArrayBuffer is available
            if (typeof SharedArrayBuffer === 'undefined') {
                throw new Error('SharedArrayBuffer is not available. Please serve with Cross-Origin-Embedder-Policy: require-corp and Cross-Origin-Opener-Policy: same-origin headers.');
            }
            
            // Check if Vips is available
            if (typeof Vips === 'undefined') {
                throw new Error('wasm-vips library failed to load.');
            }
            
            // Simple initialization as per wasm-vips docs
            console.log('Attempting Vips initialization...');
            this.vips = await Vips();
            console.log('Vips initialized successfully:', this.vips);
            
            // Enable upload area now that wasm-vips is ready
            this.enableUpload();
            
            this.showStatus('Image editor ready!', 'success');
        } catch (error) {
            this.showStatus('Failed to initialize image processing: ' + error.message, 'error');
            console.error('Vips initialization failed:', error);
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
            
            const buffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(buffer);
            
            // Load image using vips
            this.originalImage = this.vips.Image.newFromBuffer(uint8Array);
            this.currentImage = this.originalImage.copy();
            
            // Display images and metadata
            await this.updateImageDisplay();
            this.showMetadata();
            this.showImageControls();
            this.operations = [];
            this.updateOperationList();
            this.resetBtn.disabled = true;
            
            this.uploadArea.classList.add('has-image');
            this.showStatus('Image loaded successfully!', 'success');
            
        } catch (error) {
            this.showStatus('Failed to load image: ' + error.message, 'error');
            console.error('Image loading failed:', error);
        }
    }

    async updateImageDisplay() {
        try {
            // Convert images to display format
            const originalBuffer = this.originalImage.writeToBuffer('.jpg', { Q: 90 });
            const currentBuffer = this.currentImage.writeToBuffer('.jpg', { Q: 90 });
            
            // Create blob URLs
            const originalBlob = new Blob([originalBuffer], { type: 'image/jpeg' });
            const currentBlob = new Blob([currentBuffer], { type: 'image/jpeg' });
            
            this.originalImageEl.src = URL.createObjectURL(originalBlob);
            this.previewImageEl.src = URL.createObjectURL(currentBlob);
            
            // Update crop controls with current image dimensions
            this.updateCropLimits();
            
        } catch (error) {
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
        this.metadataSection.classList.remove('hidden');
        this.previewSection.classList.remove('hidden');
        this.operationsPanel.classList.remove('hidden');
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
            this.showMetadata(); // Update metadata after operation
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
                // Apply Canny edge detector
                let result = image.canny({
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


    toggleMetadata() {
        const isVisible = !this.originalMetadata.classList.contains('hidden');
        
        if (isVisible) {
            this.originalMetadata.classList.add('hidden');
            this.previewMetadata.classList.add('hidden');
        } else {
            this.showMetadata();
            this.originalMetadata.classList.remove('hidden');
            this.previewMetadata.classList.remove('hidden');
        }
    }

    showMetadata() {
        const metadata = this.getImageMetadata(this.currentImage);
        const extendedMetadata = this.getExtendedMetadata(this.currentImage);
        
        this.metadataDisplay.value = metadata;
        this.extendedMetadataDisplay.value = extendedMetadata;
        
        // Also update the toggle metadata sections if they exist
        if (this.originalMetadata && this.previewMetadata) {
            const originalMeta = this.getImageMetadata(this.originalImage, 'Original');
            const currentMeta = this.getImageMetadata(this.currentImage, 'Current');
            
            this.originalMetadata.textContent = originalMeta;
            this.previewMetadata.textContent = currentMeta;
        }
    }

    getImageMetadata(image, label = '') {
        const metadata = [];
        
        if (label) {
            metadata.push(`${label} Image Metadata:`);
        } else {
            metadata.push('Image Metadata:');
        }
        
        // Basic image properties - using only properties we know work
        metadata.push(
            `Dimensions: ${image.width} x ${image.height} pixels`,
            `Bands: ${image.bands}`,
            `Format: ${image.format}`,
            `Colorspace: ${image.interpretation}`,
            `Size: ${Math.round((image.width * image.height * image.bands) / 1024)} KB (uncompressed)`
        );

        // Try optional properties safely
        try {
            metadata.push(`Resolution: ${image.xres()} x ${image.yres()} pixels/mm`);
        } catch (e) {
            // Resolution not available
        }

        try {
            const hasAlpha = image.bands === 4 || image.bands === 2; // estimate based on bands
            metadata.push(`Has alpha channel: ${hasAlpha} (estimated)`);
        } catch (e) {
            // Alpha detection not available
        }

        return metadata.join('\n');
    }

    getExtendedMetadata(image) {
        const metadata = [];
        
        try {
            metadata.push('Extended Image Properties:');
            
            // First, inspect the main image object
            const props = Object.getOwnPropertyNames(image);
            const methods = props.filter(prop => typeof image[prop] === 'function');
            
            // Check if the 'l' property contains the actual libvips object
            if (image.l) {
                metadata.push('', 'Inspecting internal libvips object (image.l):');
                
                try {
                    const internalProps = Object.getOwnPropertyNames(image.l);
                    metadata.push(`Internal object has ${internalProps.length} properties`);
                    
                    // Show some key internal properties
                    internalProps.slice(0, 30).forEach(prop => {
                        try {
                            const value = image.l[prop];
                            if (value !== undefined && value !== null) {
                                if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                                    metadata.push(`  ${prop}: ${value}`);
                                } else if (typeof value === 'object' && value.constructor === Array) {
                                    metadata.push(`  ${prop}: [Array length: ${value.length}]`);
                                } else {
                                    metadata.push(`  ${prop}: [${typeof value}]`);
                                }
                            }
                        } catch (e) {
                            metadata.push(`  ${prop}: [error accessing]`);
                        }
                    });
                    
                    if (internalProps.length > 30) {
                        metadata.push(`  ... and ${internalProps.length - 30} more internal properties`);
                    }
                } catch (e) {
                    metadata.push('  Error inspecting internal object:', e.message);
                }
            }
            
            // Show available methods on the main image object
            if (methods.length > 0) {
                metadata.push('', 'Available image methods:');
                methods.slice(0, 20).forEach(method => {
                    metadata.push(`  ${method}()`);
                });
                if (methods.length > 20) {
                    metadata.push(`  ... and ${methods.length - 20} more methods`);
                }
            }
            
            // Try some common metadata access methods
            metadata.push('', 'Extracting metadata fields:');
            
            try {
                if (typeof image.getFields === 'function') {
                    const fieldsResult = image.getFields();
                    metadata.push(`getFields() returned: ${typeof fieldsResult}`);
                    
                    if (fieldsResult && typeof fieldsResult === 'object') {
                        // Try to extract the actual fields array
                        const fieldProps = Object.getOwnPropertyNames(fieldsResult);
                        metadata.push(`Fields object has properties: ${fieldProps.join(', ')}`);
                        
                        // The fields might be in a specific property
                        fieldProps.forEach(prop => {
                            try {
                                const value = fieldsResult[prop];
                                if (Array.isArray(value)) {
                                    metadata.push(`  ${prop}: [Array with ${value.length} metadata fields]`);
                                    value.forEach((field, index) => {
                                        if (index < 20) { // Limit display
                                            metadata.push(`    - ${field}`);
                                            
                                            // Try to get the value for this field
                                            try {
                                                if (typeof image.get === 'function') {
                                                    const fieldValue = image.get(field);
                                                    if (typeof fieldValue === 'string' && fieldValue.length < 200) {
                                                        metadata.push(`      = "${fieldValue}"`);
                                                    } else if (typeof fieldValue === 'number') {
                                                        metadata.push(`      = ${fieldValue}`);
                                                    } else {
                                                        metadata.push(`      = [${typeof fieldValue}]`);
                                                    }
                                                }
                                            } catch (e) {
                                                // Field value not accessible
                                            }
                                        }
                                    });
                                    if (value.length > 20) {
                                        metadata.push(`    ... and ${value.length - 20} more fields`);
                                    }
                                } else if (typeof value === 'string' || typeof value === 'number') {
                                    metadata.push(`  ${prop}: ${value}`);
                                } else {
                                    metadata.push(`  ${prop}: [${typeof value}]`);
                                }
                            } catch (e) {
                                metadata.push(`  ${prop}: [error accessing]`);
                            }
                        });
                    }
                }
            } catch (e) {
                metadata.push('Error extracting fields:', e.message);
            }
            
        } catch (e) {
            metadata.push('Extended metadata inspection failed');
            metadata.push('Error:', e.message);
        }

        return metadata.join('\n');
    }

    copyMetadata() {
        navigator.clipboard.writeText(this.metadataDisplay.value).then(() => {
            this.showStatus('Basic metadata copied to clipboard!', 'success');
        }).catch(() => {
            // Fallback for older browsers
            this.metadataDisplay.select();
            document.execCommand('copy');
            this.showStatus('Basic metadata copied to clipboard!', 'success');
        });
    }

    copyExtendedMetadata() {
        navigator.clipboard.writeText(this.extendedMetadataDisplay.value).then(() => {
            this.showStatus('Extended metadata copied to clipboard!', 'success');
        }).catch(() => {
            // Fallback for older browsers
            this.extendedMetadataDisplay.select();
            document.execCommand('copy');
            this.showStatus('Extended metadata copied to clipboard!', 'success');
        });
    }

    copyAllMetadata() {
        const allMetadata = `${this.metadataDisplay.value}\n\n${this.extendedMetadataDisplay.value}`;
        navigator.clipboard.writeText(allMetadata).then(() => {
            this.showStatus('All metadata copied to clipboard!', 'success');
        }).catch(() => {
            // Fallback - create a temporary textarea
            const temp = document.createElement('textarea');
            temp.value = allMetadata;
            document.body.appendChild(temp);
            temp.select();
            document.execCommand('copy');
            document.body.removeChild(temp);
            this.showStatus('All metadata copied to clipboard!', 'success');
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
            this.operationList.innerHTML = '<span class="text-sm" style="color: var(--text-secondary);">No operations applied</span>';
        } else {
            this.operationList.innerHTML = this.operations
                .map(op => `<span class="queue-item">${op}</span>`)
                .join('');
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
}

// Initialize the image editor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ImageEditor();
});