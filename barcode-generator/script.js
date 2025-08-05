let currentSVG = null;

document.addEventListener('DOMContentLoaded', function() {
    // Clear any stored state on page load
    currentSVG = null;
    
    // Reset all form controls to default values
    document.getElementById('barcodeData').value = '123456789';
    document.getElementById('barcodeType').value = 'code128';
    document.getElementById('sizeMode').value = 'scale';
    document.getElementById('scale').value = '3';
    document.getElementById('scaleNumber').value = '3';
    document.getElementById('pixelSize').value = '200';
    document.getElementById('foregroundColor').value = '#000000';
    document.getElementById('foregroundColorText').value = '#000000';
    document.getElementById('backgroundColor').value = '#ffffff';
    document.getElementById('backgroundColorText').value = '#ffffff';
    document.getElementById('backgroundOpacity').value = '100';
    document.getElementById('opacityNumber').value = '100';
    document.getElementById('canvasSizeMode').value = 'auto';
    document.getElementById('canvasWidth').value = '400';
    document.getElementById('canvasHeight').value = '600';
    document.getElementById('fileFormat').value = 'png';
    
    const generateBtn = document.getElementById('generateBtn');
    const scaleSlider = document.getElementById('scale');
    const scaleNumber = document.getElementById('scaleNumber');
    const opacitySlider = document.getElementById('backgroundOpacity');
    const opacityNumber = document.getElementById('opacityNumber');
    const sizeMode = document.getElementById('sizeMode');
    const scaleGroup = document.getElementById('scaleGroup');
    const pixelGroup = document.getElementById('pixelGroup');
    const foregroundColor = document.getElementById('foregroundColor');
    const foregroundColorText = document.getElementById('foregroundColorText');
    const backgroundColor = document.getElementById('backgroundColor');
    const backgroundColorText = document.getElementById('backgroundColorText');
    const canvasSizeMode = document.getElementById('canvasSizeMode');
    const customSizeGroup = document.getElementById('customSizeGroup');
    
    // Sync scale slider and number input
    scaleSlider.addEventListener('input', function() {
        scaleNumber.value = this.value;
    });
    
    scaleNumber.addEventListener('input', function() {
        scaleSlider.value = this.value;
    });
    
    // Sync opacity slider and number input
    opacitySlider.addEventListener('input', function() {
        opacityNumber.value = this.value;
    });
    
    opacityNumber.addEventListener('input', function() {
        opacitySlider.value = this.value;
    });
    
    // Sync color picker and text input for foreground
    foregroundColor.addEventListener('input', function() {
        foregroundColorText.value = this.value;
    });
    
    foregroundColorText.addEventListener('input', function() {
        const color = parseColor(this.value);
        if (color) {
            foregroundColor.value = color;
        }
    });
    
    // Sync color picker and text input for background
    backgroundColor.addEventListener('input', function() {
        backgroundColorText.value = this.value;
    });
    
    backgroundColorText.addEventListener('input', function() {
        const color = parseColor(this.value);
        if (color) {
            backgroundColor.value = color;
        }
    });
    
    // Toggle between scale and pixel size
    sizeMode.addEventListener('change', function() {
        if (this.value === 'pixels') {
            scaleGroup.style.display = 'none';
            pixelGroup.style.display = 'flex';
        } else {
            scaleGroup.style.display = 'flex';
            pixelGroup.style.display = 'none';
        }
    });
    
    // Toggle between auto and custom canvas size
    canvasSizeMode.addEventListener('change', function() {
        if (this.value === 'custom') {
            customSizeGroup.style.display = 'flex';
        } else {
            customSizeGroup.style.display = 'none';
        }
        // Regenerate barcode when switching canvas size mode
        generateBarcode();
    });
    
    // Auto-regenerate when custom canvas dimensions change
    document.getElementById('canvasWidth').addEventListener('input', function() {
        if (canvasSizeMode.value === 'custom') {
            generateBarcode();
        }
    });
    
    document.getElementById('canvasHeight').addEventListener('input', function() {
        if (canvasSizeMode.value === 'custom') {
            generateBarcode();
        }
    });
    
    // Initialize UI visibility based on reset values
    // Since we reset sizeMode to 'scale', show scale group and hide pixel group
    scaleGroup.style.display = 'flex';
    pixelGroup.style.display = 'none';
    
    // Since we reset canvasSizeMode to 'auto', hide custom size group
    customSizeGroup.style.display = 'none';
    
    generateBtn.addEventListener('click', generateBarcode);
    
    document.getElementById('saveBtn').addEventListener('click', function() {
        const format = document.getElementById('fileFormat').value;
        downloadBarcode(format);
    });
    
    generateBarcode();
});

let isGenerating = false;

function generateBarcode() {
    if (isGenerating) {
        console.log('Already generating, skipping...');
        return;
    }
    isGenerating = true;
    
    const barcodeType = document.getElementById('barcodeType').value;
    const barcodeData = document.getElementById('barcodeData').value;
    const sizeMode = document.getElementById('sizeMode').value;
    const foregroundColor = document.getElementById('foregroundColor').value;
    const backgroundColor = document.getElementById('backgroundColor').value;
    const backgroundOpacity = parseInt(document.getElementById('backgroundOpacity').value) / 100;
    
    let scale;
    if (sizeMode === 'pixels') {
        const pixelSize = parseInt(document.getElementById('pixelSize').value);
        // Calculate scale based on desired pixel width
        // Base size for most barcodes is around 100 units, adjust scale accordingly
        scale = pixelSize / 100;
    } else {
        scale = parseFloat(document.getElementById('scale').value);
    }
    
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.classList.remove('show');
    
    if (!barcodeData) {
        showError('Please enter barcode data');
        return;
    }
    
    const canvas = document.getElementById('barcodeCanvas');
    
    // Ensure canvas has proper context and dimensions
    const ctx = canvas.getContext('2d');
    
    // First, generate barcode on temporary canvas to measure dimensions
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 800; // Large initial size for measurement
    tempCanvas.height = 400;
    
    try {
        const options = {
            bcid: barcodeType,
            text: barcodeData,
            scale: scale,
            height: 10,
            includetext: true,
            textxalign: 'center',
            padding: 10
        };
        
        // Set colors - bwip-js expects colors without # and in hex format
        options.barcolor = foregroundColor.substring(1);
        
        // Handle background transparency
        if (backgroundOpacity === 0) {
            // No background color for full transparency
        } else if (backgroundOpacity === 1) {
            // Full opacity - use solid background
            options.backgroundcolor = backgroundColor.substring(1);
        } else {
            // Partial transparency - don't set background, we'll handle it manually
        }
        
        if (barcodeType === 'qrcode' || barcodeType === 'datamatrix' || barcodeType === 'azteccode') {
            delete options.height;
            delete options.includetext;
        }
        
        console.log('Barcode options:', options);
        console.log('Background opacity:', backgroundOpacity, 'Type:', typeof backgroundOpacity);
        console.log('bwipjs available:', typeof bwipjs);
        console.log('bwipjs methods:', Object.keys(bwipjs));
        console.log('toCanvas method:', typeof bwipjs.toCanvas);
        console.log('canvas:', canvas);
        console.log('canvas dimensions:', canvas.width, 'x', canvas.height);
        
        try {
            console.log('About to call bwipjs.toCanvas synchronously...');
            
            // First generate barcode on temp canvas to measure its actual size
            bwipjs.toCanvas(tempCanvas, options);
            console.log('Barcode generated on temp canvas for measurement');
            
            // Get the actual barcode bounds by scanning the temp canvas
            const tempCtx = tempCanvas.getContext('2d');
            const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const data = imageData.data;
            
            let minX = tempCanvas.width, minY = tempCanvas.height;
            let maxX = 0, maxY = 0;
            
            // Scan for non-transparent pixels to find barcode bounds
            for (let y = 0; y < tempCanvas.height; y++) {
                for (let x = 0; x < tempCanvas.width; x++) {
                    const index = (y * tempCanvas.width + x) * 4;
                    const alpha = data[index + 3];
                    
                    // If pixel is not fully transparent, it's part of the barcode
                    if (alpha > 0) {
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                    }
                }
            }
            
            // Calculate barcode dimensions
            const barcodeWidth = maxX - minX + 1;
            const barcodeHeight = maxY - minY + 1;
            
            // Determine canvas size based on mode
            const canvasSizeMode = document.getElementById('canvasSizeMode').value;
            let canvasWidth, canvasHeight;
            
            if (canvasSizeMode === 'custom') {
                // Use custom dimensions
                canvasWidth = parseInt(document.getElementById('canvasWidth').value) || 400;
                canvasHeight = parseInt(document.getElementById('canvasHeight').value) || 600;
                
                // Check if barcode fits within custom dimensions
                const margin = 20; // Minimum margin
                if (barcodeWidth + margin > canvasWidth || barcodeHeight + margin > canvasHeight) {
                    console.warn('Barcode is larger than custom canvas dimensions');
                    // Show user warning
                    const originalWidth = parseInt(document.getElementById('canvasWidth').value) || 400;
                    const originalHeight = parseInt(document.getElementById('canvasHeight').value) || 600;
                    // Calculate the actual expanded dimensions
                    const expandedWidth = Math.max(canvasWidth, barcodeWidth + margin);
                    const expandedHeight = Math.max(canvasHeight, barcodeHeight + margin);
                    showWarning(`Barcode (${barcodeWidth}×${barcodeHeight}px) is larger than your custom canvas (${originalWidth}×${originalHeight}px). Canvas auto-expanded to ${expandedWidth}×${expandedHeight}px.`);
                    // Auto-expand canvas to fit barcode if it's too large
                    canvasWidth = expandedWidth;
                    canvasHeight = expandedHeight;
                }
            } else {
                // Auto-fit with padding
                const padding = 20;
                canvasWidth = barcodeWidth + (padding * 2);
                canvasHeight = barcodeHeight + (padding * 2);
            }
            
            // Set canvas size
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            
            // Clear the canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Calculate center position
            const centerX = (canvas.width - barcodeWidth) / 2;
            const centerY = (canvas.height - barcodeHeight) / 2;
            
            // Apply transparency to preview for partial opacity
            console.log('Checking transparency condition:', backgroundOpacity > 0 && backgroundOpacity < 1, 'opacity:', backgroundOpacity);
            if (backgroundOpacity > 0 && backgroundOpacity < 1) {
                console.log('Applying transparency effect...');
                
                // Create another temp canvas for barcode without background, same size as temp canvas
                const transparentCanvas = document.createElement('canvas');
                transparentCanvas.width = tempCanvas.width;
                transparentCanvas.height = tempCanvas.height;
                
                // Draw barcode with transparent background on temp canvas
                const transparentOptions = Object.assign({}, options);
                delete transparentOptions.backgroundcolor;
                
                // Generate barcode without background
                bwipjs.toCanvas(transparentCanvas, transparentOptions);
                
                // Get bounds of the transparent barcode (should be same as original)
                const transparentCtx = transparentCanvas.getContext('2d');
                const transparentImageData = transparentCtx.getImageData(0, 0, transparentCanvas.width, transparentCanvas.height);
                const transparentData = transparentImageData.data;
                
                let transMinX = transparentCanvas.width, transMinY = transparentCanvas.height;
                let transMaxX = 0, transMaxY = 0;
                
                // Find bounds of transparent barcode
                for (let y = 0; y < transparentCanvas.height; y++) {
                    for (let x = 0; x < transparentCanvas.width; x++) {
                        const index = (y * transparentCanvas.width + x) * 4;
                        const alpha = transparentData[index + 3];
                        
                        if (alpha > 0) {
                            transMinX = Math.min(transMinX, x);
                            transMinY = Math.min(transMinY, y);
                            transMaxX = Math.max(transMaxX, x);
                            transMaxY = Math.max(transMaxY, y);
                        }
                    }
                }
                
                // Use the transparent barcode bounds for sizing
                const transBarcodeWidth = transMaxX - transMinX + 1;
                const transBarcodeHeight = transMaxY - transMinY + 1;
                
                // Determine canvas size (same logic as above)
                let transCanvasWidth, transCanvasHeight;
                if (canvasSizeMode === 'custom') {
                    transCanvasWidth = parseInt(document.getElementById('canvasWidth').value) || 400;
                    transCanvasHeight = parseInt(document.getElementById('canvasHeight').value) || 600;
                    
                    // Check if barcode fits within custom dimensions
                    const margin = 20;
                    if (transBarcodeWidth + margin > transCanvasWidth || transBarcodeHeight + margin > transCanvasHeight) {
                        console.warn('Transparent barcode is larger than custom canvas dimensions');
                        // Show user warning
                        const originalWidth = parseInt(document.getElementById('canvasWidth').value) || 400;
                        const originalHeight = parseInt(document.getElementById('canvasHeight').value) || 600;
                        // Calculate the actual expanded dimensions
                        const transExpandedWidth = Math.max(transCanvasWidth, transBarcodeWidth + margin);
                        const transExpandedHeight = Math.max(transCanvasHeight, transBarcodeHeight + margin);
                        showWarning(`Barcode (${transBarcodeWidth}×${transBarcodeHeight}px) is larger than your custom canvas (${originalWidth}×${originalHeight}px). Canvas auto-expanded to ${transExpandedWidth}×${transExpandedHeight}px.`);
                        // Auto-expand canvas to fit barcode if it's too large
                        transCanvasWidth = transExpandedWidth;
                        transCanvasHeight = transExpandedHeight;
                    }
                } else {
                    const padding = 20;
                    transCanvasWidth = transBarcodeWidth + (padding * 2);
                    transCanvasHeight = transBarcodeHeight + (padding * 2);
                }
                
                // Resize canvas
                canvas.width = transCanvasWidth;
                canvas.height = transCanvasHeight;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Calculate center position based on canvas size
                const transCenterX = (canvas.width - transBarcodeWidth) / 2;
                const transCenterY = (canvas.height - transBarcodeHeight) / 2;
                
                // Convert hex to RGB and apply alpha for background
                const r = parseInt(backgroundColor.substring(1, 3), 16);
                const g = parseInt(backgroundColor.substring(3, 5), 16);
                const b = parseInt(backgroundColor.substring(5, 7), 16);
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${backgroundOpacity})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Draw the transparent barcode centered using the correct bounds
                ctx.drawImage(transparentCanvas, transMinX, transMinY, transBarcodeWidth, transBarcodeHeight, 
                             transCenterX, transCenterY, transBarcodeWidth, transBarcodeHeight);
            } else {
                // For full opacity or full transparency, draw barcode centered
                if (backgroundOpacity === 1) {
                    // Full background - generate on temp canvas then draw centered with background
                    const fullOpacityCanvas = document.createElement('canvas');
                    fullOpacityCanvas.width = tempCanvas.width;
                    fullOpacityCanvas.height = tempCanvas.height;
                    
                    // Generate barcode with background on temp canvas
                    bwipjs.toCanvas(fullOpacityCanvas, options);
                    
                    // Get the actual barcode bounds from the full opacity canvas
                    const fullCtx = fullOpacityCanvas.getContext('2d');
                    const fullImageData = fullCtx.getImageData(0, 0, fullOpacityCanvas.width, fullOpacityCanvas.height);
                    const fullData = fullImageData.data;
                    
                    let fullMinX = fullOpacityCanvas.width, fullMinY = fullOpacityCanvas.height;
                    let fullMaxX = 0, fullMaxY = 0;
                    
                    // Find bounds of the barcode with background
                    for (let y = 0; y < fullOpacityCanvas.height; y++) {
                        for (let x = 0; x < fullOpacityCanvas.width; x++) {
                            const index = (y * fullOpacityCanvas.width + x) * 4;
                            const alpha = fullData[index + 3];
                            
                            if (alpha > 0) {
                                fullMinX = Math.min(fullMinX, x);
                                fullMinY = Math.min(fullMinY, y);
                                fullMaxX = Math.max(fullMaxX, x);
                                fullMaxY = Math.max(fullMaxY, y);
                            }
                        }
                    }
                    
                    const fullBarcodeWidth = fullMaxX - fullMinX + 1;
                    const fullBarcodeHeight = fullMaxY - fullMinY + 1;
                    
                    // Clear main canvas and fill with background color
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = backgroundColor;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    // Calculate center position for the actual barcode size
                    const fullCenterX = (canvas.width - fullBarcodeWidth) / 2;
                    const fullCenterY = (canvas.height - fullBarcodeHeight) / 2;
                    
                    // Draw the barcode centered
                    ctx.drawImage(fullOpacityCanvas, fullMinX, fullMinY, fullBarcodeWidth, fullBarcodeHeight, 
                                 fullCenterX, fullCenterY, fullBarcodeWidth, fullBarcodeHeight);
                } else {
                    // Full transparency - draw barcode from temp canvas centered
                    ctx.drawImage(tempCanvas, minX, minY, barcodeWidth, barcodeHeight, 
                                 centerX, centerY, barcodeWidth, barcodeHeight);
                }
            }
            
            console.log('Barcode generated and centered successfully');
            isGenerating = false;
        } catch (bwipjsError) {
            console.error('Error calling bwipjs.toCanvas:', bwipjsError);
            showError('bwipjs error: ' + bwipjsError.message);
            isGenerating = false;
        }
        
    } catch (err) {
        showError('Error: ' + err.message);
    }
}


function createCanvasSVG() {
    try {
        // Convert canvas to SVG using data URL approach
        const canvas = document.getElementById('barcodeCanvas');
        const dataURL = canvas.toDataURL('image/png');
        currentSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
            <image href="${dataURL}" width="${canvas.width}" height="${canvas.height}"/>
        </svg>`;
        console.log('Created canvas-based SVG fallback');
    } catch (fallbackErr) {
        console.error('SVG fallback error:', fallbackErr);
        currentSVG = null;
    }
}

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    
    const rHex = r.toString(16).padStart(2, '0');
    const gHex = g.toString(16).padStart(2, '0');
    const bHex = b.toString(16).padStart(2, '0');
    const aHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
    
    return rHex + gHex + bHex + aHex;
}

function downloadBarcode(format) {
    const canvas = document.getElementById('barcodeCanvas');
    const barcodeType = document.getElementById('barcodeType').value;
    const barcodeData = document.getElementById('barcodeData').value;
    
    // Check if a barcode has been generated
    if (!canvas.width || !canvas.height) {
        showError('Please generate a barcode first');
        return;
    }
    
    // Generate a cleaner filename
    let cleanData = barcodeData;
    
    // If it's a URL, extract the domain
    if (cleanData.startsWith('http://') || cleanData.startsWith('https://')) {
        try {
            const url = new URL(cleanData);
            cleanData = url.hostname.replace('www.', '');
        } catch (e) {
            // If URL parsing fails, just clean it up
            cleanData = cleanData.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '_');
        }
    } else {
        // For non-URLs, keep alphanumeric and replace special chars with underscore
        cleanData = cleanData.replace(/[^a-zA-Z0-9]/g, '_');
    }
    
    // Limit length and remove trailing underscores
    cleanData = cleanData.substring(0, 20).replace(/_+$/, '');
    
    // Create timestamp for uniqueness
    const timestamp = new Date().toISOString().split('T')[0];
    
    const filename = `${barcodeType}_${cleanData}_${timestamp}`;
    
    if (format === 'svg') {
        // Reconstruct options from current form values
        const sizeMode = document.getElementById('sizeMode').value;
        const foregroundColor = document.getElementById('foregroundColor').value;
        const backgroundColor = document.getElementById('backgroundColor').value;
        const backgroundOpacity = parseInt(document.getElementById('backgroundOpacity').value) / 100;
        
        let scale;
        if (sizeMode === 'pixels') {
            const pixelSize = parseInt(document.getElementById('pixelSize').value);
            scale = pixelSize / 100;
        } else {
            scale = parseFloat(document.getElementById('scale').value);
        }
        
        const options = {
            bcid: barcodeType,
            text: barcodeData,
            scale: scale,
            height: 10,
            includetext: true,
            textxalign: 'center',
            padding: 10
        };
        
        // Set colors
        options.barcolor = foregroundColor.substring(1);
        if (backgroundOpacity === 0) {
            // For fully transparent, don't set background color
        } else {
            // Always set background color without alpha (we'll handle transparency after)
            options.backgroundcolor = backgroundColor.substring(1);
        }
        
        if (barcodeType === 'qrcode' || barcodeType === 'datamatrix' || barcodeType === 'azteccode') {
            delete options.height;
            delete options.includetext;
        }
        
        // Use canvas-based SVG since CDN version doesn't include toSVG
        createCanvasSVG();
        if (currentSVG) {
            const blob = new Blob([currentSVG], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename + '.svg';
            a.click();
            URL.revokeObjectURL(url);
        } else {
            showError('SVG generation failed. Please try again.');
        }
    } else {
        // Handle transparency for export
        if (format === 'png' && backgroundOpacity < 1) {
            // Create a new canvas with transparency applied
            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = canvas.width;
            exportCanvas.height = canvas.height;
            const exportCtx = exportCanvas.getContext('2d');
            
            if (backgroundOpacity === 0) {
                // For fully transparent background, render without background
                const tempOptions = {
                    bcid: barcodeType,
                    text: barcodeData,
                    scale: sizeMode === 'pixels' ? parseInt(document.getElementById('pixelSize').value) / 100 : parseFloat(document.getElementById('scale').value),
                    height: 10,
                    includetext: true,
                    textxalign: 'center',
                    padding: 10,
                    barcolor: document.getElementById('foregroundColor').value.substring(1)
                    // No background color for transparency
                };
                
                if (barcodeType === 'qrcode' || barcodeType === 'datamatrix' || barcodeType === 'azteccode') {
                    delete tempOptions.height;
                    delete tempOptions.includetext;
                }
                
                bwipjs.toCanvas(exportCanvas, tempOptions, function(err) {
                    if (!err) {
                        exportCanvas.toBlob(function(blob) {
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = filename + '.png';
                            a.click();
                            URL.revokeObjectURL(url);
                        }, 'image/png');
                    } else {
                        showError('Export failed');
                    }
                });
            } else {
                // For partial transparency, create background with proper alpha
                const r = parseInt(document.getElementById('backgroundColor').value.substring(1, 3), 16);
                const g = parseInt(document.getElementById('backgroundColor').value.substring(3, 5), 16);
                const b = parseInt(document.getElementById('backgroundColor').value.substring(5, 7), 16);
                
                exportCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${backgroundOpacity})`;
                exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
                
                // Create a temporary canvas for the barcode without background
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = exportCanvas.width;
                tempCanvas.height = exportCanvas.height;
                
                const tempOptions = {
                    bcid: barcodeType,
                    text: barcodeData,
                    scale: document.getElementById('sizeMode').value === 'pixels' ? parseInt(document.getElementById('pixelSize').value) / 100 : parseFloat(document.getElementById('scale').value),
                    height: 10,
                    includetext: true,
                    textxalign: 'center',
                    padding: 10,
                    barcolor: document.getElementById('foregroundColor').value.substring(1)
                };
                
                if (barcodeType === 'qrcode' || barcodeType === 'datamatrix' || barcodeType === 'azteccode') {
                    delete tempOptions.height;
                    delete tempOptions.includetext;
                }
                
                bwipjs.toCanvas(tempCanvas, tempOptions, function(err) {
                    if (!err) {
                        exportCtx.drawImage(tempCanvas, 0, 0);
                        
                        exportCanvas.toBlob(function(blob) {
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = filename + '.png';
                            a.click();
                            URL.revokeObjectURL(url);
                        }, 'image/png');
                    } else {
                        showError('Export failed');
                    }
                });
                return; // Exit early since we handle the blob creation in the callback
            }
        } else {
            // Regular export without transparency handling
            canvas.toBlob(function(blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename + '.' + (format === 'png' ? 'png' : 'jpg');
                a.click();
                URL.revokeObjectURL(url);
            }, format === 'png' ? 'image/png' : 'image/jpeg', 0.95);
        }
    }
}

function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.classList.add('show');
    errorElement.style.backgroundColor = '#f8d7da';
    errorElement.style.color = '#dc3545';
    errorElement.style.borderColor = '#f5c6cb';
    setTimeout(() => {
        errorElement.classList.remove('show');
    }, 5000);
}

function showWarning(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.classList.add('show');
    errorElement.style.backgroundColor = '#fff3cd';
    errorElement.style.color = '#856404';
    errorElement.style.borderColor = '#ffeaa7';
    setTimeout(() => {
        errorElement.classList.remove('show');
    }, 7000); // Show warnings a bit longer since they're informational
}

function parseColor(color) {
    // Remove spaces
    color = color.trim();
    
    // Check if it's already a valid hex color
    if (/^#[0-9A-F]{6}$/i.test(color)) {
        return color;
    }
    
    // Add # if it's missing
    if (/^[0-9A-F]{6}$/i.test(color)) {
        return '#' + color;
    }
    
    // Parse rgb(r, g, b) format
    const rgbMatch = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
    if (rgbMatch) {
        const r = parseInt(rgbMatch[1]);
        const g = parseInt(rgbMatch[2]);
        const b = parseInt(rgbMatch[3]);
        if (r <= 255 && g <= 255 && b <= 255) {
            return '#' + 
                r.toString(16).padStart(2, '0') + 
                g.toString(16).padStart(2, '0') + 
                b.toString(16).padStart(2, '0');
        }
    }
    
    return null;
}