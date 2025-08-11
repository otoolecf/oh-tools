// File Drop Component for Browser Data Workbench

class BDWFileDrop extends HTMLElement {
    constructor() {
        super();
        this.acceptedTypes = ['.csv', '.json', '.jsonl', '.ndjson', '.parquet', '.xlsx', '.xls', '.zip'];
    }

    connectedCallback() {
        this.innerHTML = `
            <div class="file-drop-zone" id="dropZone">
                <div class="drop-text">
                    <strong>Drop your data files here</strong><br>
                    or choose files to upload<br>
                    <small>Supports: CSV, JSON, JSONL, Parquet, Excel, ZIP archives</small>
                </div>
                
                <div class="drop-actions">
                    <button class="btn btn-primary" onclick="this.nextElementSibling.click()">
                        Choose Files
                    </button>
                    <input type="file" id="fileInput" accept="${this.acceptedTypes.join(',')}" multiple>
                    
                    <button class="btn" onclick="document.getElementById('urlInput').focus()">
                        Load from URL
                    </button>
                </div>

                <div class="url-input-group">
                    <input type="url" 
                           id="urlInput" 
                           class="url-input" 
                           placeholder="https://example.com/data.csv">
                    <button class="btn" onclick="this.parentElement.parentElement.parentElement.__loadFromURL()">
                        Load
                    </button>
                </div>
            </div>
            
            <div id="fileList" style="margin-top: 1rem;"></div>
        `;

        this.setupEventListeners();
    }

    setupEventListeners() {
        const dropZone = this.querySelector('#dropZone');
        const fileInput = this.querySelector('#fileInput');
        const urlInput = this.querySelector('#urlInput');

        // Drag and drop events
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            if (!dropZone.contains(e.relatedTarget)) {
                dropZone.classList.remove('drag-over');
            }
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            
            const files = Array.from(e.dataTransfer.files);
            this.handleFiles(files);
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            this.handleFiles(files);
        });

        // URL input enter key
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loadFromURL();
            }
        });

        // Make loadFromURL method available to inline onclick
        dropZone.__loadFromURL = () => this.loadFromURL();
    }

    async handleFiles(files) {
        const fileListElement = this.querySelector('#fileList');
        fileListElement.innerHTML = '';

        if (files.length === 0) return;

        for (const file of files) {
            await this.processFile(file);
        }
    }

    async processFile(file) {
        const fileListElement = this.querySelector('#fileList');
        
        // Validate file type
        if (!this.isValidFileType(file)) {
            this.showFileError(file.name, 'Unsupported file type');
            return;
        }

        // Validate file size (limit to 500MB)
        const maxSize = 500 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showFileError(file.name, 'File too large (max 500MB)');
            return;
        }

        // Show file info
        const fileDiv = document.createElement('div');
        fileDiv.className = 'file-item';
        fileDiv.innerHTML = `
            <div style="padding: 1rem; border: 1px solid var(--border-color); border-radius: 4px; margin-bottom: 0.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${file.name}</strong>
                        <div style="font-size: 0.9rem; color: var(--text-secondary);">
                            ${this.formatFileSize(file.size)} • ${this.detectFileType(file)}
                        </div>
                    </div>
                    <div class="loading">
                        <div class="spinner"></div>
                        Processing...
                    </div>
                </div>
            </div>
        `;
        fileListElement.appendChild(fileDiv);

        try {
            // Emit file-imported event
            const event = new CustomEvent('file-imported', {
                detail: {
                    file: file,
                    fileName: file.name,
                    fileType: this.detectFileType(file),
                    fileSize: file.size
                },
                bubbles: true
            });

            this.dispatchEvent(event);

            // Update file status to success
            const loadingDiv = fileDiv.querySelector('.loading');
            loadingDiv.innerHTML = '✅ Loaded';
            loadingDiv.className = 'success';

        } catch (error) {
            console.error('Error processing file:', error);
            const loadingDiv = fileDiv.querySelector('.loading');
            loadingDiv.innerHTML = '❌ Error';
            loadingDiv.className = 'error';
        }
    }

    async loadFromURL() {
        const urlInput = this.querySelector('#urlInput');
        const url = urlInput.value.trim();

        if (!url) {
            alert('Please enter a URL');
            return;
        }

        if (!this.isValidURL(url)) {
            alert('Please enter a valid URL');
            return;
        }

        const fileListElement = this.querySelector('#fileList');
        
        // Show loading state
        const urlDiv = document.createElement('div');
        urlDiv.className = 'file-item';
        urlDiv.innerHTML = `
            <div style="padding: 1rem; border: 1px solid var(--border-color); border-radius: 4px; margin-bottom: 0.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${this.getFileNameFromURL(url)}</strong>
                        <div style="font-size: 0.9rem; color: var(--text-secondary);">
                            Remote URL • ${this.detectFileTypeFromURL(url)}
                        </div>
                    </div>
                    <div class="loading">
                        <div class="spinner"></div>
                        Downloading...
                    </div>
                </div>
            </div>
        `;
        fileListElement.appendChild(urlDiv);

        try {
            // Fetch the file
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const blob = await response.blob();
            const fileName = this.getFileNameFromURL(url);
            
            // Create a File object from the blob
            const file = new File([blob], fileName, { type: blob.type });

            // Emit file-imported event
            const event = new CustomEvent('file-imported', {
                detail: {
                    file: file,
                    fileName: fileName,
                    fileType: this.detectFileTypeFromURL(url),
                    fileSize: blob.size,
                    isRemote: true,
                    url: url
                },
                bubbles: true
            });

            this.dispatchEvent(event);

            // Update status to success
            const loadingDiv = urlDiv.querySelector('.loading');
            loadingDiv.innerHTML = '✅ Loaded';
            loadingDiv.className = 'success';

            // Clear URL input
            urlInput.value = '';

        } catch (error) {
            console.error('Error loading from URL:', error);
            const loadingDiv = urlDiv.querySelector('.loading');
            loadingDiv.innerHTML = `❌ ${error.message}`;
            loadingDiv.className = 'error';
        }
    }

    isValidFileType(file) {
        const fileName = file.name.toLowerCase();
        return this.acceptedTypes.some(type => fileName.endsWith(type.substring(1)));
    }

    isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    detectFileType(file) {
        const name = file.name.toLowerCase();
        if (name.endsWith('.csv')) return 'CSV';
        if (name.endsWith('.json')) return 'JSON';
        if (name.endsWith('.jsonl') || name.endsWith('.ndjson')) return 'JSON Lines';
        if (name.endsWith('.parquet')) return 'Parquet';
        if (name.endsWith('.xlsx') || name.endsWith('.xls')) return 'Excel';
        if (name.endsWith('.zip')) return 'ZIP Archive';
        return 'Unknown';
    }

    detectFileTypeFromURL(url) {
        const path = new URL(url).pathname.toLowerCase();
        if (path.endsWith('.csv')) return 'CSV';
        if (path.endsWith('.json')) return 'JSON';
        if (path.endsWith('.jsonl') || path.endsWith('.ndjson')) return 'JSON Lines';
        if (path.endsWith('.parquet')) return 'Parquet';
        if (path.endsWith('.xlsx') || path.endsWith('.xls')) return 'Excel';
        if (path.endsWith('.zip')) return 'ZIP Archive';
        return 'Unknown';
    }

    getFileNameFromURL(url) {
        try {
            const path = new URL(url).pathname;
            return path.split('/').pop() || 'remote-file';
        } catch {
            return 'remote-file';
        }
    }

    formatFileSize(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    showFileError(fileName, error) {
        const fileListElement = this.querySelector('#fileList');
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'file-item error';
        errorDiv.innerHTML = `
            <div style="padding: 1rem; border: 1px solid var(--error-color); border-radius: 4px; margin-bottom: 0.5rem; background: color-mix(in srgb, var(--error-color) 10%, var(--panel-bg));">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${fileName}</strong>
                        <div style="font-size: 0.9rem; color: var(--error-color);">
                            ${error}
                        </div>
                    </div>
                    <div style="color: var(--error-color);">❌</div>
                </div>
            </div>
        `;
        fileListElement.appendChild(errorDiv);
    }
}

customElements.define('bdw-file-drop', BDWFileDrop);