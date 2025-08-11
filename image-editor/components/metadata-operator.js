/**
 * Metadata Operator Web Component
 * Handles image metadata display and copying functionality
 */
class MetadataOperator extends HTMLElement {
    constructor() {
        super();
        this.currentImage = null;
        this.vips = null;
        this.metadata = null;
        
        // Bind methods to preserve context
        this.copyMetadataText = this.copyMetadataText.bind(this);
        this.copyMetadataJson = this.copyMetadataJson.bind(this);
        this.copyExtendedText = this.copyExtendedText.bind(this);
        this.copyExtendedJson = this.copyExtendedJson.bind(this);
        this.copyAllMetadata = this.copyAllMetadata.bind(this);
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
                    padding: 1rem;
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
                
                .metadata-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }
                
                .metadata-section {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: 6px;
                    overflow: hidden;
                }
                
                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.75rem 1rem;
                    background: var(--surface-light);
                    border-bottom: 1px solid var(--border-color);
                }
                
                .section-title {
                    margin: 0;
                    font-size: 0.95rem;
                    font-weight: 600;
                    color: var(--text-primary);
                }
                
                .section-controls {
                    display: flex;
                    gap: 0.5rem;
                }
                
                .btn-copy {
                    padding: 0.25rem 0.5rem;
                    background: var(--primary-color);
                    color: white;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 0.75rem;
                    font-weight: 500;
                    transition: all 0.2s ease;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                
                .btn-copy:hover:not(:disabled) {
                    background: var(--primary-hover, var(--primary-color));
                    transform: translateY(-1px);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.15);
                }
                
                .btn-copy:disabled {
                    background: var(--surface-light);
                    color: var(--text-secondary);
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }
                
                .metadata-display {
                    padding: 0;
                    font-size: 0.85rem;
                    line-height: 1.4;
                    max-height: 400px;
                    overflow-y: auto;
                    background: var(--bg-primary);
                    color: var(--text-primary);
                    border: 1px solid var(--border-color);
                    border-top: none;
                }
                
                .metadata-list {
                    list-style: none;
                    margin: 0;
                    padding: 0;
                }
                
                .metadata-section-header {
                    background: var(--surface-light);
                    padding: 0.75rem 1rem;
                    font-weight: 600;
                    font-size: 0.9rem;
                    color: var(--text-primary);
                    border-bottom: 1px solid var(--border-color);
                    margin: 0;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .metadata-item {
                    display: flex;
                    padding: 0.5rem 1rem;
                    border-bottom: 1px solid rgba(0,0,0,0.05);
                    align-items: flex-start;
                    gap: 1rem;
                }
                
                .metadata-item:last-child {
                    border-bottom: none;
                }
                
                .metadata-item:nth-child(even) {
                    background: rgba(0,0,0,0.02);
                }
                
                .metadata-key {
                    font-weight: 600;
                    color: var(--text-primary);
                    min-width: 140px;
                    flex-shrink: 0;
                    font-size: 0.82rem;
                }
                
                .metadata-value {
                    color: var(--text-secondary);
                    flex: 1;
                    word-break: break-word;
                    font-size: 0.82rem;
                    line-height: 1.4;
                }
                
                .metadata-value.array {
                    font-family: var(--font-mono, 'SF Mono', 'Monaco', 'Consolas', monospace);
                    background: rgba(0,0,0,0.05);
                    padding: 0.25rem 0.5rem;
                    border-radius: 3px;
                    font-size: 0.75rem;
                }
                
                .metadata-value.truncated {
                    position: relative;
                }
                
                .metadata-value.truncated::after {
                    content: "...";
                    font-weight: bold;
                    color: var(--primary-color);
                }
                
                .metadata-nested {
                    background: rgba(0,0,0,0.03);
                    padding: 0.5rem;
                    border-radius: 4px;
                    border-left: 3px solid var(--primary-color);
                    margin: 0.25rem 0;
                }
                
                .metadata-nested > div {
                    margin-bottom: 0.25rem;
                    font-size: 0.8rem;
                }
                
                .metadata-nested > div:last-child {
                    margin-bottom: 0;
                }
                
                .metadata-nested strong {
                    color: var(--text-primary);
                    font-weight: 600;
                }
                
                .metadata-value a {
                    color: var(--primary-color);
                    text-decoration: none;
                }
                
                .metadata-value a:hover {
                    text-decoration: underline;
                }
                
                .metadata-empty {
                    padding: 2rem;
                    text-align: center;
                    color: var(--text-secondary);
                    font-style: italic;
                }
                
                .metadata-display::-webkit-scrollbar {
                    width: 8px;
                }
                
                .metadata-display::-webkit-scrollbar-track {
                    background: var(--bg-secondary);
                }
                
                .metadata-display::-webkit-scrollbar-thumb {
                    background: var(--border-color);
                    border-radius: 4px;
                }
                
                .metadata-display::-webkit-scrollbar-thumb:hover {
                    background: var(--primary-color);
                }
                
                .metadata-display:empty::after {
                    content: "No metadata available";
                    color: var(--text-secondary);
                    font-style: italic;
                    font-family: var(--font-sans, system-ui);
                }
                
                .btn-enhanced {
                    padding: 0.6rem 1.5rem;
                    background: var(--primary-color);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.95rem;
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
                
                .copy-feedback {
                    position: fixed;
                    top: 1rem;
                    right: 1rem;
                    background: var(--primary-color);
                    color: white;
                    padding: 0.75rem 1rem;
                    border-radius: 6px;
                    font-size: 0.85rem;
                    font-weight: 500;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    z-index: 1000;
                    opacity: 0;
                    transform: translateY(-10px);
                    transition: all 0.3s ease;
                    pointer-events: none;
                }
                
                .copy-feedback.show {
                    opacity: 1;
                    transform: translateY(0);
                }
                
                .empty-state {
                    text-align: center;
                    padding: 2rem;
                    color: var(--text-secondary);
                    font-style: italic;
                }
                
                
                @media (max-width: 768px) {
                    .metadata-grid {
                        grid-template-columns: 1fr;
                        gap: 1rem;
                    }
                    
                    .section-header {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 0.5rem;
                    }
                    
                    .section-controls {
                        justify-content: center;
                    }
                    
                    .copy-feedback {
                        top: auto;
                        bottom: 1rem;
                        left: 1rem;
                        right: 1rem;
                        text-align: center;
                    }
                }
            </style>
            
            <div class="operator-container">
                <div class="operator-header">
                    <h3 class="operator-title">Image Metadata</h3>
                    <div class="operator-status" id="status"></div>
                </div>
                
                <div id="metadataContent" class="empty-state">
                    <div>Load an image to view its metadata</div>
                </div>
                
                <div id="metadataDisplay" style="display: none;">
                    <div class="metadata-grid">
                        <div class="metadata-section">
                            <div class="section-header">
                                <h4 class="section-title">Basic Properties</h4>
                                <div class="section-controls">
                                    <button id="copyMetadataTextBtn" class="btn-copy" title="Copy readable text">
                                        Copy Text
                                    </button>
                                    <button id="copyMetadataJsonBtn" class="btn-copy" title="Copy JSON format">
                                        Copy JSON
                                    </button>
                                </div>
                            </div>
                            <div id="basicMetadataDisplay" class="metadata-display"></div>
                        </div>
                        
                        <div class="metadata-section">
                            <div class="section-header">
                                <h4 class="section-title">Extended Metadata</h4>
                                <div class="section-controls">
                                    <button id="copyExtendedTextBtn" class="btn-copy" title="Copy readable text">
                                        Copy Text
                                    </button>
                                    <button id="copyExtendedJsonBtn" class="btn-copy" title="Copy JSON format">
                                        Copy JSON
                                    </button>
                                </div>
                            </div>
                            <div id="extendedMetadataDisplay" class="metadata-display"></div>
                        </div>
                    </div>
                    
                    <button id="copyAllMetadataBtn" class="btn-enhanced">Copy All as JSON</button>
                </div>
                
                <div class="copy-feedback" id="copyFeedback"></div>
            </div>
        `;
    }

    bindEvents() {
        // Copy buttons
        this.querySelector('#copyMetadataTextBtn')?.addEventListener('click', this.copyMetadataText);
        this.querySelector('#copyMetadataJsonBtn')?.addEventListener('click', this.copyMetadataJson);
        this.querySelector('#copyExtendedTextBtn')?.addEventListener('click', this.copyExtendedText);
        this.querySelector('#copyExtendedJsonBtn')?.addEventListener('click', this.copyExtendedJson);
        this.querySelector('#copyAllMetadataBtn')?.addEventListener('click', this.copyAllMetadata);
    }

    updateDisabledState() {
        const disabled = this.hasAttribute('disabled');
        const buttons = this.querySelectorAll('button');
        
        buttons.forEach(btn => btn.disabled = disabled);
        
        if (disabled) {
            this.showStatus('Operator disabled');
        } else if (this.metadata) {
            this.showStatus('Ready');
        } else {
            this.showStatus('No image loaded');
        }
    }

    showStatus(message) {
        const statusEl = this.querySelector('#status');
        if (statusEl) {
            statusEl.textContent = message;
        }
    }

    showCopyFeedback(message) {
        const feedback = this.querySelector('#copyFeedback');
        if (!feedback) return;
        
        feedback.textContent = message;
        feedback.classList.add('show');
        
        setTimeout(() => {
            feedback.classList.remove('show');
        }, 2000);
    }

    async copyToClipboard(text, type) {
        try {
            await navigator.clipboard.writeText(text);
            this.showCopyFeedback(`${type} copied to clipboard!`);
            return true;
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            this.showCopyFeedback(`Failed to copy ${type.toLowerCase()}`);
            return false;
        }
    }

    formatMetadataForDisplay(metadata, extended = false) {
        if (!metadata) return '';
        
        const section = extended ? metadata.extended : metadata.basic;
        if (!section || typeof section !== 'object') return '';
        
        return this.createMetadataHTML(section);
    }
    
    createMetadataHTML(obj) {
        if (!obj || typeof obj !== 'object') return '<div class="metadata-empty">No data available</div>';
        
        const ul = document.createElement('ul');
        ul.className = 'metadata-list';
        
        // Sort entries by key for consistent display, filtering out keys starting with "_"
        const sortedEntries = Object.entries(obj)
            .filter(([key]) => !key.startsWith('_'))
            .sort(([a], [b]) => a.localeCompare(b));
        
        for (const [key, value] of sortedEntries) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // Create section header
                const headerLi = document.createElement('li');
                headerLi.className = 'metadata-section-header';
                headerLi.textContent = this.formatKey(key);
                ul.appendChild(headerLi);
                
                // Add subsection items
                const subEntries = Object.entries(value)
                    .filter(([key]) => !key.startsWith('_'))
                    .sort(([a], [b]) => a.localeCompare(b));
                for (const [subKey, subValue] of subEntries) {
                    const cleanedValue = this.cleanValue(subValue);
                    if (cleanedValue !== null) {
                        const li = this.createMetadataItem(subKey, cleanedValue);
                        ul.appendChild(li);
                    }
                }
            } else {
                const cleanedValue = this.cleanValue(value);
                if (cleanedValue !== null) {
                    const li = this.createMetadataItem(key, cleanedValue);
                    ul.appendChild(li);
                }
            }
        }
        
        return ul.outerHTML;
    }
    
    createMetadataItem(key, value) {
        const li = document.createElement('li');
        li.className = 'metadata-item';
        
        const keyDiv = document.createElement('div');
        keyDiv.className = 'metadata-key';
        keyDiv.textContent = this.formatKey(key);
        
        const valueDiv = document.createElement('div');
        valueDiv.className = 'metadata-value';
        
        const formattedValue = this.formatValueForHTML(value);
        if (typeof formattedValue === 'string') {
            valueDiv.innerHTML = formattedValue;
        } else {
            valueDiv.appendChild(formattedValue);
        }
        
        li.appendChild(keyDiv);
        li.appendChild(valueDiv);
        
        return li;
    }
    
    formatKey(key) {
        // Convert camelCase and other formats to more readable names
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }
    
    formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
    }

    cleanValue(value) {
        if (value === null || value === undefined || value === 'undefined') return null;
        
        // Handle arrays of integers (like the raw byte arrays in keywords)
        if (Array.isArray(value)) {
            // Check if it's an array of integers that might represent text
            if (value.every(v => Number.isInteger(v) && v >= 0 && v <= 255)) {
                try {
                    const text = String.fromCharCode(...value);
                    // Only return if it results in readable text
                    if (text.length > 0 && /^[\x20-\x7E\s]+$/.test(text)) {
                        return text;
                    }
                } catch (e) {
                    // Fall through to regular array handling
                }
            }
            
            // Clean each array item
            const cleaned = value.map(v => this.cleanValue(v)).filter(v => v !== null);
            return cleaned.length > 0 ? cleaned : null;
        }
        
        // Handle objects with potential raw data
        if (typeof value === 'object' && value !== null) {
            // Special handling for objects that might have description field
            if (value.description && value.description !== 'undefined') {
                return value.description;
            }
            if (value.value) {
                return this.cleanValue(value.value);
            }
            
            // Clean the object recursively
            const cleaned = {};
            let hasValidData = false;
            
            for (const [key, val] of Object.entries(value)) {
                // Skip keys starting with underscore
                if (key.startsWith('_')) continue;
                
                const cleanedVal = this.cleanValue(val);
                if (cleanedVal !== null) {
                    cleaned[key] = cleanedVal;
                    hasValidData = true;
                }
            }
            
            return hasValidData ? cleaned : null;
        }
        
        if (typeof value === 'string') {
            // Remove common problematic strings
            if (value === 'undefined' || value === 'null' || value.trim() === '') {
                return null;
            }
            return value;
        }
        
        return value;
    }
    
    formatValueForHTML(value) {
        if (value === null || value === undefined) return '<em>N/A</em>';
        
        if (Array.isArray(value)) {
            if (value.length === 0) return '<em>Empty</em>';
            
            const formatted = value.map(v => this.formatValueForHTML(v)).join(', ');
            return `<span class="metadata-value array">${formatted}</span>`;
        }
        
        if (typeof value === 'object' && value !== null) {
            // For complex objects, create a mini list
            const entries = Object.entries(value);
            if (entries.length === 0) return '<em>Empty</em>';
            
            let html = '<div class="metadata-nested">';
            entries.forEach(([k, v]) => {
                // Skip keys starting with underscore
                if (!k.startsWith('_')) {
                    html += `<div><strong>${this.formatKey(k)}:</strong> ${this.formatValueForHTML(v)}</div>`;
                }
            });
            html += '</div>';
            return html;
        }
        
        if (typeof value === 'number') {
            // Format numbers with appropriate precision
            if (value % 1 !== 0) {
                return value.toFixed(6).replace(/\.?0+$/, '');
            }
            return value.toLocaleString();
        }
        
        if (typeof value === 'string') {
            // Handle URLs
            if (value.startsWith('http://') || value.startsWith('https://')) {
                return `<a href="${value}" target="_blank" rel="noopener noreferrer">${value}</a>`;
            }
            
            // Truncate very long strings for display
            if (value.length > 150) {
                const truncated = value.substring(0, 150);
                return `<span class="metadata-value truncated" title="${value}">${truncated}</span>`;
            }
            
            return value;
        }
        
        return String(value);
    }

    formatMetadataForText(metadata, extended = false) {
        if (!metadata) return '';
        
        const section = extended ? metadata.extended : metadata.basic;
        if (!section || typeof section !== 'object') return '';
        
        return this.formatObjectForText(section, 0);
    }
    
    formatObjectForText(obj, indent = 0) {
        if (!obj || typeof obj !== 'object') return String(obj || '');
        
        const spaces = '  '.repeat(indent);
        let result = [];
        
        // Sort entries by key for consistent display, filtering out keys starting with "_"
        const sortedEntries = Object.entries(obj)
            .filter(([key]) => !key.startsWith('_'))
            .sort(([a], [b]) => a.localeCompare(b));
        
        for (const [key, value] of sortedEntries) {
            const cleanedValue = this.cleanValue(value);
            if (cleanedValue === null) continue;
            
            if (typeof cleanedValue === 'object' && cleanedValue !== null && !Array.isArray(cleanedValue)) {
                // Format section headers
                const sectionHeader = indent === 0 ? `\n=== ${key.toUpperCase()} ===` : `${spaces}${this.formatKey(key)}:`;
                result.push(sectionHeader);
                result.push(this.formatObjectForText(cleanedValue, indent + 1));
            } else {
                result.push(`${spaces}${this.formatKey(key)}: ${this.formatValueForText(cleanedValue)}`);
            }
        }
        
        return result.join('\n');
    }
    
    formatValueForText(value) {
        if (value === null || value === undefined) return 'N/A';
        
        if (Array.isArray(value)) {
            return value.map(v => this.formatValueForText(v)).join(', ');
        }
        
        if (typeof value === 'object') {
            const entries = Object.entries(value).filter(([k]) => !k.startsWith('_'));
            return entries.map(([k, v]) => `${this.formatKey(k)}: ${this.formatValueForText(v)}`).join('; ');
        }
        
        if (typeof value === 'number') {
            if (value % 1 !== 0) {
                return value.toFixed(6).replace(/\.?0+$/, '');
            }
            return value.toLocaleString();
        }
        
        return String(value);
    }

    async copyMetadataText() {
        if (!this.metadata) return;
        const text = this.formatMetadataForText(this.metadata, false);
        await this.copyToClipboard(text, 'Basic metadata');
    }

    async copyMetadataJson() {
        if (!this.metadata) return;
        const cleanedBasic = this.cleanMetadataForCopy(this.metadata.basic || {});
        const json = JSON.stringify(cleanedBasic, null, 2);
        await this.copyToClipboard(json, 'Basic metadata JSON');
    }

    async copyExtendedText() {
        if (!this.metadata) return;
        const text = this.formatMetadataForText(this.metadata, true);
        await this.copyToClipboard(text, 'Extended metadata');
    }

    async copyExtendedJson() {
        if (!this.metadata) return;
        const cleanedExtended = this.cleanMetadataForCopy(this.metadata.extended || {});
        const json = JSON.stringify(cleanedExtended, null, 2);
        await this.copyToClipboard(json, 'Extended metadata JSON');
    }

    async copyAllMetadata() {
        if (!this.metadata) return;
        const cleanedMetadata = this.cleanMetadataForCopy(this.metadata);
        const json = JSON.stringify(cleanedMetadata, null, 2);
        await this.copyToClipboard(json, 'Complete metadata JSON');
    }
    
    cleanMetadataForCopy(metadata) {
        if (!metadata || typeof metadata !== 'object') return metadata;
        
        const cleaned = {};
        
        for (const [key, value] of Object.entries(metadata)) {
            // Skip keys starting with underscore
            if (key.startsWith('_')) continue;
            
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                const cleanedValue = this.cleanMetadataForCopy(value);
                if (cleanedValue && Object.keys(cleanedValue).length > 0) {
                    cleaned[key] = cleanedValue;
                }
            } else {
                const cleanedValue = this.cleanValue(value);
                if (cleanedValue !== null) {
                    cleaned[key] = cleanedValue;
                }
            }
        }
        
        return cleaned;
    }

    updateMetadataDisplay() {
        const metadataContent = this.querySelector('#metadataContent');
        const metadataDisplay = this.querySelector('#metadataDisplay');
        const basicDisplay = this.querySelector('#basicMetadataDisplay');
        const extendedDisplay = this.querySelector('#extendedMetadataDisplay');

        if (!this.metadata) {
            metadataContent.style.display = 'block';
            metadataDisplay.style.display = 'none';
            return;
        }

        // Show metadata display
        metadataContent.style.display = 'none';
        metadataDisplay.style.display = 'block';

        // Update basic metadata
        if (basicDisplay) {
            basicDisplay.innerHTML = this.formatMetadataForDisplay(this.metadata, false);
        }

        // Update extended metadata  
        if (extendedDisplay) {
            extendedDisplay.innerHTML = this.formatMetadataForDisplay(this.metadata, true);
        }
    }

    // Public API methods
    setImage(image, vips) {
        this.currentImage = image;
        this.vips = vips;
        
        if (image && vips) {
            this.removeAttribute('disabled');
            this.extractMetadata();
            this.showStatus('Ready');
        } else {
            this.setAttribute('disabled', '');
            this.metadata = null;
            this.updateMetadataDisplay();
            this.showStatus('No image loaded');
        }
    }
    
    setImageWithBuffer(image, vips, originalBuffer) {
        this.currentImage = image;
        this.vips = vips;
        this.originalBuffer = originalBuffer;
        
        if (image && vips) {
            this.removeAttribute('disabled');
            this.extractMetadata();
            this.showStatus('Ready');
        } else {
            this.setAttribute('disabled', '');
            this.metadata = null;
            this.updateMetadataDisplay();
            this.showStatus('No image loaded');
        }
    }

    async extractMetadata() {
        if (!this.currentImage) {
            this.metadata = null;
            this.updateMetadataDisplay();
            return;
        }

        try {
            // Extract basic VIPS metadata
            const basicMetadata = {
                dimensions: {
                    width: this.currentImage.width,
                    height: this.currentImage.height,
                    megapixels: Math.round((this.currentImage.width * this.currentImage.height) / 1000000 * 100) / 100
                },
                format: {
                    bands: this.currentImage.bands,
                    format: this.currentImage.format || 'unknown',
                    colorspace: this.currentImage.interpretation
                }
            };
            
            // Add file size if available from original buffer
            if (this.originalBuffer && this.originalBuffer.byteLength) {
                basicMetadata.fileSize = {
                    bytes: this.originalBuffer.byteLength,
                    readable: this.formatFileSize(this.originalBuffer.byteLength)
                };
            }
            
            // Add resolution if available
            if (this.currentImage.xres && this.currentImage.yres) {
                basicMetadata.resolution = {
                    x: this.currentImage.xres,
                    y: this.currentImage.yres
                };
            }

            // Try to get extended metadata using ExifReader if available
            let extendedMetadata = {};
            
            if (typeof ExifReader !== 'undefined' && this.originalBuffer) {
                try {
                    const tags = ExifReader.load(this.originalBuffer, {
                        expanded: true,
                        includeUnknown: true
                    });
                    
                    // Helper function to extract metadata values
                    const extractValue = (value) => {
                        if (!value) return null;
                        return value.description || value.value || value;
                    };
                    
                    // Extract EXIF data
                    if (tags.exif && Object.keys(tags.exif).length > 0) {
                        extendedMetadata.exif = {};
                        Object.entries(tags.exif).forEach(([key, value]) => {
                            const extracted = extractValue(value);
                            if (extracted !== null) {
                                extendedMetadata.exif[key] = extracted;
                            }
                        });
                    }
                    
                    // Extract IPTC data
                    if (tags.iptc && Object.keys(tags.iptc).length > 0) {
                        extendedMetadata.iptc = {};
                        Object.entries(tags.iptc).forEach(([key, value]) => {
                            const extracted = extractValue(value);
                            if (extracted !== null) {
                                extendedMetadata.iptc[key] = extracted;
                            }
                        });
                    }
                    
                    // Extract XMP data
                    if (tags.xmp && Object.keys(tags.xmp).length > 0) {
                        extendedMetadata.xmp = {};
                        Object.entries(tags.xmp).forEach(([key, value]) => {
                            const extracted = extractValue(value);
                            if (extracted !== null) {
                                extendedMetadata.xmp[key] = extracted;
                            }
                        });
                    }
                    
                    // Extract Photoshop data
                    if (tags.photoshop && Object.keys(tags.photoshop).length > 0) {
                        extendedMetadata.photoshop = {};
                        Object.entries(tags.photoshop).forEach(([key, value]) => {
                            const extracted = extractValue(value);
                            if (extracted !== null) {
                                extendedMetadata.photoshop[key] = extracted;
                            }
                        });
                    }
                    
                    // Extract ICC Profile data
                    if (tags.icc && Object.keys(tags.icc).length > 0) {
                        extendedMetadata.icc = {};
                        Object.entries(tags.icc).forEach(([key, value]) => {
                            const extracted = extractValue(value);
                            if (extracted !== null) {
                                extendedMetadata.icc[key] = extracted;
                            }
                        });
                    }
                    
                    // Extract GPS data
                    if (tags.gps && Object.keys(tags.gps).length > 0) {
                        extendedMetadata.gps = {};
                        Object.entries(tags.gps).forEach(([key, value]) => {
                            const extracted = extractValue(value);
                            if (extracted !== null) {
                                extendedMetadata.gps[key] = extracted;
                            }
                        });
                    }
                    
                    // Extract MPF (Multi-Picture Format) data
                    if (tags.mpf && Object.keys(tags.mpf).length > 0) {
                        extendedMetadata.mpf = {};
                        Object.entries(tags.mpf).forEach(([key, value]) => {
                            const extracted = extractValue(value);
                            if (extracted !== null) {
                                extendedMetadata.mpf[key] = extracted;
                            }
                        });
                    }
                    
                    // Extract Maker Notes if available
                    if (tags.makerNotes && Object.keys(tags.makerNotes).length > 0) {
                        extendedMetadata.makerNotes = {};
                        Object.entries(tags.makerNotes).forEach(([key, value]) => {
                            const extracted = extractValue(value);
                            if (extracted !== null) {
                                extendedMetadata.makerNotes[key] = extracted;
                            }
                        });
                    }
                } catch (e) {
                    console.warn('ExifReader failed, using basic metadata only:', e);
                }
            }
            
            // Combine basic and extended metadata
            this.metadata = {
                basic: basicMetadata,
                extended: extendedMetadata
            };

            this.updateMetadataDisplay();
            this.showStatus(`Metadata extracted`);
            
        } catch (error) {
            console.error('Failed to extract metadata:', error);
            this.metadata = {
                basic: {
                    error: 'Failed to extract metadata',
                    dimensions: {
                        width: this.currentImage?.width || 0,
                        height: this.currentImage?.height || 0
                    }
                },
                extended: {}
            };
            this.updateMetadataDisplay();
            this.showStatus('Metadata extraction failed');
        }
    }

    getState() {
        return {
            hasMetadata: !!this.metadata,
            fieldCount: this.metadata ? Object.keys(this.metadata).length : 0
        };
    }

    setState() {
        // Metadata component doesn't have user-modifiable state
        // State is derived from the loaded image
    }

    reset() {
        // Metadata component doesn't need reset functionality
        // It displays the current image's metadata
        this.showStatus('Metadata display refreshed');
        setTimeout(() => this.showStatus('Ready'), 2000);
    }
}

// Register the custom element
customElements.define('metadata-operator', MetadataOperator);