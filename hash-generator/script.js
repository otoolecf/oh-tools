class HashGenerator {
    constructor() {
        this.initializeElements();
        this.attachEventListeners();
        this.checkCryptoSupport();
        this.initializeHMACToggle();
    }

    initializeElements() {
        this.inputText = document.getElementById('inputText');
        this.treatAsHex = document.getElementById('treatAsHex');
        this.generateBtn = document.getElementById('generateBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.copyBtn = document.getElementById('copyBtn');
        this.resultsSection = document.getElementById('resultsSection');
        this.resultsContainer = document.getElementById('resultsContainer');
        this.algorithmSelect = document.getElementById('algorithmSelect');
        this.secretKeyGroup = document.getElementById('secretKeyGroup');
        this.secretKey = document.getElementById('secretKey');
        this.keyAsHex = document.getElementById('keyAsHex');
        this.verifyHashGroup = document.getElementById('verifyHashGroup');
        this.expectedHash = document.getElementById('expectedHash');
        this.modeGroup = document.getElementById('modeGroup');
        this.generateMode = document.getElementById('generateMode');
        this.verifyMode = document.getElementById('verifyMode');
        this.hmacToggle = document.getElementById('hmacToggle');
        this.hmacContent = document.getElementById('hmacContent');
    }

    attachEventListeners() {
        this.generateBtn.addEventListener('click', () => this.generateHash());
        this.clearBtn.addEventListener('click', () => this.clearAll());
        this.copyBtn.addEventListener('click', () => this.copyHash());
        
        // Show/hide secret key field based on algorithm selection
        this.algorithmSelect.addEventListener('change', () => this.toggleSecretKeyField());
        
        // Show/hide verify fields based on mode selection
        this.generateMode.addEventListener('change', () => this.toggleVerifyFields());
        this.verifyMode.addEventListener('change', () => this.toggleVerifyFields());
        
        // Allow Ctrl+Enter to generate
        this.inputText.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                this.generateHash();
            }
        });
    }

    checkCryptoSupport() {
        if (!crypto || !crypto.subtle) {
            this.showMessage('Your browser does not support Web Crypto API. SHA algorithms will not work.', 'error');
        }
    }

    initializeHMACToggle() {
        if (this.hmacToggle) {
            this.hmacToggle.addEventListener('click', () => {
                const isExpanded = this.hmacContent.style.display !== 'none';
                const toggleIcon = this.hmacToggle.querySelector('.toggle-icon');
                
                if (isExpanded) {
                    this.hmacContent.style.display = 'none';
                    toggleIcon.classList.remove('expanded');
                } else {
                    this.hmacContent.style.display = 'block';
                    toggleIcon.classList.add('expanded');
                }
            });
        }
    }

    toggleSecretKeyField() {
        const algorithm = this.algorithmSelect.value;
        const isHMAC = algorithm.startsWith('HMAC-');
        this.secretKeyGroup.style.display = isHMAC ? 'block' : 'none';
        this.modeGroup.style.display = isHMAC ? 'block' : 'none';
        this.toggleVerifyFields();
    }

    toggleVerifyFields() {
        const algorithm = this.algorithmSelect.value;
        const isHMAC = algorithm.startsWith('HMAC-');
        const isVerifyMode = this.verifyMode.checked;
        
        this.verifyHashGroup.style.display = (isHMAC && isVerifyMode) ? 'block' : 'none';
        
        // Update button text
        if (isHMAC && isVerifyMode) {
            this.generateBtn.textContent = 'Verify Hash';
        } else {
            this.generateBtn.textContent = 'Generate Hash';
        }
    }

    async generateHash() {
        const inputValue = this.inputText.value.trim();
        if (!inputValue) {
            this.showMessage('Please enter some text to hash', 'error');
            return;
        }

        const selectedAlgorithm = this.algorithmSelect.value;
        const isHMAC = selectedAlgorithm.startsWith('HMAC-');
        const isVerifyMode = this.verifyMode.checked;
        
        // Check if HMAC algorithm requires secret key
        if (isHMAC) {
            const secretKeyValue = this.secretKey.value.trim();
            if (!secretKeyValue) {
                this.showMessage('Please enter a secret key for HMAC algorithms', 'error');
                return;
            }
            
            // Check if verify mode requires expected hash
            if (isVerifyMode) {
                const expectedHashValue = this.expectedHash.value.trim();
                if (!expectedHashValue) {
                    this.showMessage('Please enter the expected hash for verification', 'error');
                    return;
                }
            }
        }

        try {
            this.generateBtn.disabled = true;
            this.generateBtn.textContent = isVerifyMode ? 'Verifying...' : 'Generating...';

            const inputData = this.prepareInputData(inputValue);
            
            if (isHMAC && isVerifyMode) {
                await this.verifyHash(selectedAlgorithm, inputData);
            } else {
                const hash = await this.computeHash(selectedAlgorithm, inputData);
                
                this.displayResult({
                    algorithm: selectedAlgorithm,
                    hash,
                    length: this.getHashLength(selectedAlgorithm)
                });
                
                this.showMessage(`Generated ${selectedAlgorithm} hash successfully`, 'success');
            }

        } catch (error) {
            this.showMessage('Error: ' + error.message, 'error');
            console.error('Hash generation/verification error:', error);
        } finally {
            this.generateBtn.disabled = false;
            this.toggleVerifyFields(); // Reset button text
        }
    }

    prepareInputData(input) {
        if (this.treatAsHex.checked) {
            // Convert hex string to Uint8Array
            const cleanHex = input.replace(/[^0-9a-fA-F]/g, '');
            if (cleanHex.length % 2 !== 0) {
                throw new Error('Invalid hex string: must have even number of characters');
            }
            const bytes = new Uint8Array(cleanHex.length / 2);
            for (let i = 0; i < cleanHex.length; i += 2) {
                bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
            }
            return bytes;
        } else {
            // Convert string to Uint8Array
            return new TextEncoder().encode(input);
        }
    }

    async computeHash(algorithm, data) {
        if (algorithm.startsWith('HMAC-')) {
            return this.generateHMAC(algorithm, data);
        }
        
        switch (algorithm) {
            case 'MD5':
                return this.generateMD5(data);
            case 'SHA-1':
            case 'SHA-256':
            case 'SHA-384':
            case 'SHA-512':
                return this.generateSHA(algorithm, data);
            case 'SHA3-224':
            case 'SHA3-256':
            case 'SHA3-384':
            case 'SHA3-512':
                return this.generateSHA3(algorithm, data);
            case 'RIPEMD160':
                return this.generateRIPEMD160(data);
            default:
                throw new Error(`Unsupported algorithm: ${algorithm}`);
        }
    }

    generateMD5(data) {
        // Convert Uint8Array to string for CryptoJS
        let inputString;
        if (this.treatAsHex.checked) {
            // For hex data, convert back to hex string
            inputString = Array.from(data)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
            return CryptoJS.MD5(CryptoJS.enc.Hex.parse(inputString)).toString();
        } else {
            // For text data, use UTF-8
            inputString = new TextDecoder().decode(data);
            return CryptoJS.MD5(inputString).toString();
        }
    }

    async generateSHA(algorithm, data) {
        try {
            const hashBuffer = await crypto.subtle.digest(algorithm, data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            throw new Error(`${algorithm} not supported by this browser`);
        }
    }

    generateSHA3(algorithm, data) {
        // Convert Uint8Array to string for CryptoJS
        let inputString;
        if (this.treatAsHex.checked) {
            inputString = Array.from(data)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
            const hexParsed = CryptoJS.enc.Hex.parse(inputString);
            switch (algorithm) {
                case 'SHA3-224': return CryptoJS.SHA3(hexParsed, { outputLength: 224 }).toString();
                case 'SHA3-256': return CryptoJS.SHA3(hexParsed, { outputLength: 256 }).toString();
                case 'SHA3-384': return CryptoJS.SHA3(hexParsed, { outputLength: 384 }).toString();
                case 'SHA3-512': return CryptoJS.SHA3(hexParsed, { outputLength: 512 }).toString();
            }
        } else {
            inputString = new TextDecoder().decode(data);
            switch (algorithm) {
                case 'SHA3-224': return CryptoJS.SHA3(inputString, { outputLength: 224 }).toString();
                case 'SHA3-256': return CryptoJS.SHA3(inputString, { outputLength: 256 }).toString();
                case 'SHA3-384': return CryptoJS.SHA3(inputString, { outputLength: 384 }).toString();
                case 'SHA3-512': return CryptoJS.SHA3(inputString, { outputLength: 512 }).toString();
            }
        }
    }

    generateRIPEMD160(data) {
        let inputString;
        if (this.treatAsHex.checked) {
            inputString = Array.from(data)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
            return CryptoJS.RIPEMD160(CryptoJS.enc.Hex.parse(inputString)).toString();
        } else {
            inputString = new TextDecoder().decode(data);
            return CryptoJS.RIPEMD160(inputString).toString();
        }
    }

    async generateHMAC(algorithm, data) {
        // Extract the hash algorithm from HMAC-SHA-256 format
        const hashAlgorithm = algorithm.replace('HMAC-', '');
        
        // Prepare the secret key
        const keyData = this.prepareKeyData();
        
        // Import the key for HMAC
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            {
                name: 'HMAC',
                hash: hashAlgorithm
            },
            false,
            ['sign']
        );
        
        // Generate HMAC signature
        const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
        
        // Convert to hex string
        const hashArray = Array.from(new Uint8Array(signature));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    prepareKeyData() {
        const keyValue = this.secretKey.value.trim();
        
        if (this.keyAsHex.checked) {
            // Convert hex string to Uint8Array
            const cleanHex = keyValue.replace(/[^0-9a-fA-F]/g, '');
            if (cleanHex.length % 2 !== 0) {
                throw new Error('Invalid hex key: must have even number of characters');
            }
            const bytes = new Uint8Array(cleanHex.length / 2);
            for (let i = 0; i < cleanHex.length; i += 2) {
                bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
            }
            return bytes;
        } else {
            // Convert string to Uint8Array
            return new TextEncoder().encode(keyValue);
        }
    }

    async verifyHash(algorithm, data) {
        // Extract the hash algorithm from HMAC-SHA-256 format
        const hashAlgorithm = algorithm.replace('HMAC-', '');
        
        // Prepare the secret key
        const keyData = this.prepareKeyData();
        
        // Convert expected hash from hex to Uint8Array
        const expectedHashHex = this.expectedHash.value.trim().toLowerCase();
        const cleanHex = expectedHashHex.replace(/[^0-9a-f]/g, '');
        if (cleanHex.length % 2 !== 0) {
            throw new Error('Invalid expected hash: must have even number of hex characters');
        }
        
        const expectedHashBytes = new Uint8Array(cleanHex.length / 2);
        for (let i = 0; i < cleanHex.length; i += 2) {
            expectedHashBytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
        }
        
        // Import the key for HMAC
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            {
                name: 'HMAC',
                hash: hashAlgorithm
            },
            false,
            ['verify']
        );
        
        // Verify HMAC signature
        const isValid = await crypto.subtle.verify('HMAC', cryptoKey, expectedHashBytes, data);
        
        // Display verification result
        this.displayVerificationResult({
            algorithm,
            expectedHash: expectedHashHex,
            isValid,
            message: isValid ? 'Hash verification successful - the signature is valid!' : 'Hash verification failed - the signature is invalid.'
        });
        
        this.showMessage(
            isValid ? 'Hash verification successful!' : 'Hash verification failed!', 
            isValid ? 'success' : 'error'
        );
    }


    getHashLength(algorithm) {
        const lengths = {
            'MD5': '128 bits',
            'SHA-1': '160 bits',
            'SHA-256': '256 bits',
            'SHA-384': '384 bits',
            'SHA-512': '512 bits',
            'SHA3-224': '224 bits',
            'SHA3-256': '256 bits',
            'SHA3-384': '384 bits',
            'SHA3-512': '512 bits',
            'RIPEMD160': '160 bits',
            'HMAC-SHA-1': '160 bits',
            'HMAC-SHA-256': '256 bits',
            'HMAC-SHA-512': '512 bits'
        };
        return lengths[algorithm] || 'Unknown';
    }

    displayResult(result) {
        this.resultsContainer.innerHTML = `
            <div class="hash-result">
                <div class="hash-header">
                    <div>
                        <span class="hash-algorithm">${result.algorithm}</span>
                        <span class="hash-length">(${result.length})</span>
                    </div>
                </div>
                <div class="hash-value">${result.hash}</div>
            </div>
        `;

        this.resultsSection.style.display = 'block';
        this.currentHash = result.hash; // Store for copying
    }

    displayVerificationResult(result) {
        const statusClass = result.isValid ? 'valid' : 'invalid';
        const statusIcon = result.isValid ? '✓' : '✗';
        
        this.resultsContainer.innerHTML = `
            <div class="hash-result verification-result ${statusClass}">
                <div class="hash-header">
                    <div>
                        <span class="hash-algorithm">${result.algorithm} Verification</span>
                        <span class="verification-status ${statusClass}">${statusIcon} ${result.isValid ? 'VALID' : 'INVALID'}</span>
                    </div>
                </div>
                <div class="verification-details">
                    <div class="verification-message">${result.message}</div>
                    <div class="expected-hash">
                        <strong>Expected Hash:</strong><br>
                        <code class="hash-value">${result.expectedHash}</code>
                    </div>
                </div>
            </div>
        `;

        this.resultsSection.style.display = 'block';
        this.currentHash = result.expectedHash; // Store for copying
    }

    async copyHash() {
        if (!this.currentHash) return;
        
        try {
            await navigator.clipboard.writeText(this.currentHash);
            this.showMessage('Hash copied to clipboard', 'success');
        } catch (error) {
            this.fallbackCopy(this.currentHash);
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
            this.showMessage('Copied to clipboard', 'success');
        } catch (error) {
            this.showMessage('Failed to copy to clipboard', 'error');
        }
        
        document.body.removeChild(textArea);
    }

    clearAll() {
        this.inputText.value = '';
        this.secretKey.value = '';
        this.expectedHash.value = '';
        this.generateMode.checked = true;
        this.resultsSection.style.display = 'none';
        this.resultsContainer.innerHTML = '';
        this.currentHash = null;
        this.hideMessage();
        this.toggleVerifyFields(); // Reset UI
        this.inputText.focus();
    }

    showMessage(text, type) {
        let messageContainer = document.querySelector('.message-container');
        
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.className = 'message-container';
            this.resultsSection.appendChild(messageContainer);
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

// Initialize the hash generator when the page loads
const hashGenerator = new HashGenerator();