class UUIDGenerator {
    constructor() {
        this.initializeElements();
        this.attachEventListeners();
        this.checkCryptoSupport();
    }

    initializeElements() {
        this.generateBtn = document.getElementById('generateBtn');
        this.uuidCount = document.getElementById('uuidCount');
        this.uuidFormat = document.getElementById('uuidFormat');
        this.uuidResults = document.getElementById('uuidResults');
        this.copyAllBtn = document.getElementById('copyAllBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.generatedUUIDs = [];
    }

    attachEventListeners() {
        this.generateBtn.addEventListener('click', () => this.generateUUIDs());
        this.copyAllBtn.addEventListener('click', () => this.copyAllUUIDs());
        this.clearBtn.addEventListener('click', () => this.clearResults());
        
        // Allow Enter key to generate
        this.uuidCount.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.generateUUIDs();
        });
    }

    checkCryptoSupport() {
        if (!crypto || !crypto.randomUUID) {
            this.showMessage('Your browser does not support crypto.randomUUID(). Please use a modern browser.', 'error');
            this.generateBtn.disabled = true;
        }
    }

    generateUUIDs() {
        const count = parseInt(this.uuidCount.value) || 1;
        const format = this.uuidFormat.value;

        if (count < 1 || count > 100) {
            this.showMessage('Please enter a number between 1 and 100', 'error');
            return;
        }

        try {
            this.generatedUUIDs = [];
            
            for (let i = 0; i < count; i++) {
                const uuid = crypto.randomUUID();
                const formattedUUID = this.formatUUID(uuid, format);
                this.generatedUUIDs.push(formattedUUID);
            }

            this.displayResults();
            this.showMessage(`Generated ${count} UUID${count > 1 ? 's' : ''}.`, 'success');
            
        } catch (error) {
            this.showMessage('Error generating UUIDs: ' + error.message, 'error');
        }
    }

    formatUUID(uuid, format) {
        switch (format) {
            case 'uppercase':
                return uuid.toUpperCase();
            case 'nodashes':
                return uuid.replace(/-/g, '');
            case 'nodashes-upper':
                return uuid.replace(/-/g, '').toUpperCase();
            default:
                return uuid;
        }
    }

    displayResults() {
        if (this.generatedUUIDs.length === 0) {
            this.uuidResults.innerHTML = '<div class="placeholder-message">Click "Generate UUIDs" to create unique identifiers</div>';
            this.copyAllBtn.style.display = 'none';
            this.clearBtn.style.display = 'none';
            return;
        }

        const resultsHTML = this.generatedUUIDs.map((uuid, index) => `
            <div class="uuid-item">
                <span class="uuid-text">${uuid}</span>
                <button class="btn-copy" onclick="uuidGenerator.copySingleUUID('${uuid}', ${index})">Copy</button>
            </div>
        `).join('');

        this.uuidResults.innerHTML = resultsHTML;
        this.copyAllBtn.style.display = 'inline-block';
        this.clearBtn.style.display = 'inline-block';
    }

    async copySingleUUID(uuid, index) {
        try {
            await navigator.clipboard.writeText(uuid);
            this.showMessage(`Copied.`, 'success');
        } catch (error) {
            this.fallbackCopy(uuid);
        }
    }

    async copyAllUUIDs() {
        if (this.generatedUUIDs.length === 0) return;

        const allUUIDs = this.generatedUUIDs.join('\n');
        
        try {
            await navigator.clipboard.writeText(allUUIDs);
            this.showMessage(`Copied.`, 'success');
        } catch (error) {
            this.fallbackCopy(allUUIDs);
        }
    }

    fallbackCopy(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showMessage('Copied.', 'success');
        } catch (error) {
            this.showMessage('Couldn’t copy that. Try selecting the text and copying it.', 'error');
        }
        
        document.body.removeChild(textArea);
    }

    clearResults() {
        this.generatedUUIDs = [];
        this.displayResults();
        this.hideMessage();
    }

    showMessage(text, type) {
        let messageContainer = document.querySelector('.message-container');
        
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.className = 'message-container';
            this.uuidResults.parentNode.appendChild(messageContainer);
        }

        messageContainer.textContent = text;
        messageContainer.className = `message-container ${type}`;
        messageContainer.style.display = 'block';

        // Keep messages visible (no auto-hide)
    }

    hideMessage() {
        const messageContainer = document.querySelector('.message-container');
        if (messageContainer) {
            messageContainer.style.display = 'none';
        }
    }
}

// Initialize the UUID generator when the page loads
window.uuidGenerator = new UUIDGenerator();