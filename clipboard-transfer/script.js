// Clipboard Transfer Tool - WebRTC P2P Implementation
class ClipboardTransfer {
    constructor() {
        this.pc = null;
        this.dataChannel = null;
        this.isInitiator = false;
        this.connectionState = 'disconnected';
        this.transfers = new Map(); // Track active file transfers
        this.currentOfferUrl = null; // Store current offer URL for theme change regeneration
        this.currentAnswerData = null; // Store current answer data for theme change regeneration
        
        // OTP mode properties
        this.connectionMethod = 'direct'; // 'direct' or 'otp'
        this.otpServerUrl = 'http://localhost:3001'; // Local testing - change to your worker URL for production
        this.currentOtpCode = null;
        this.currentAnswerOtp = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupThemeChangeListener();
        this.checkForOfferInUrl();
        this.checkHumanIdLibrary();
    }

    initializeElements() {
        // Progress tracker elements
        this.progressTracker = document.getElementById('progress-tracker');
        this.progressFill = document.getElementById('progress-fill');
        
        // Connection setup elements
        this.connectionSetupSection = document.getElementById('connection-setup-section');
        this.createSessionBtn = document.getElementById('create-session-btn');
        this.joinSessionBtn = document.getElementById('join-session-btn');
        this.connectionStatus = document.getElementById('connection-status');
        this.statusText = this.connectionStatus.querySelector('.status-text');
        this.urlProcessingBanner = document.getElementById('url-processing-banner');
        
        // Session section elements
        this.sessionSection = document.getElementById('session-section');
        this.sessionTitle = document.getElementById('session-title');
        this.qrDisplay = document.getElementById('qr-display');
        this.qrCanvas = document.getElementById('qr-canvas');
        this.offerUrl = document.getElementById('offer-url');
        this.copyOfferBtn = document.getElementById('copy-offer-btn');
        this.manualExchange = document.getElementById('manual-exchange');
        this.offerAnswerInput = document.getElementById('offer-answer-input');
        this.processOfferAnswerBtn = document.getElementById('process-offer-answer-btn');
        this.answerDisplay = document.getElementById('answer-display');
        this.answerText = document.getElementById('answer-text');
        this.answerQRCanvas = document.getElementById('answer-qr-canvas');
        this.copyAnswerBtn = document.getElementById('copy-answer-btn');
        this.waitingResponse = document.getElementById('waiting-response');
        this.responseInput = document.getElementById('response-input');
        this.processResponseBtn = document.getElementById('process-response-btn');
        this.cancelSessionBtn = document.getElementById('cancel-session-btn');
        
        // Communication section elements
        this.communicationSection = document.getElementById('communication-section');
        this.clipboardInput = document.getElementById('clipboard-input');
        this.sendClipboardBtn = document.getElementById('send-clipboard-btn');
        this.pasteClipboardBtn = document.getElementById('paste-clipboard-btn');
        this.fileDropZone = document.getElementById('file-drop-zone');
        this.fileInput = document.getElementById('file-input');
        this.selectFilesBtn = document.getElementById('select-files-btn');
        this.transferSection = document.getElementById('transfer-section');
        this.transferList = document.getElementById('transfer-list');
        this.messageFeed = document.getElementById('message-feed');
        this.disconnectBtn = document.getElementById('disconnect-btn');
        
        // Connection mode
        this.lanModeRadio = document.getElementById('lan-mode');
        this.internetModeRadio = document.getElementById('internet-mode');
        
        // Connection method elements
        this.directModeRadio = document.getElementById('direct-mode');
        this.otpModeRadio = document.getElementById('otp-mode');
        this.methodDescriptionText = document.getElementById('method-description-text');
        this.connectionTypeGroup = document.getElementById('connection-type-group');
        
        // OTP type elements
        this.otpTypeGroup = document.getElementById('otp-type-group');
        this.numbersModeRadio = document.getElementById('numbers-mode');
        this.wordsModeRadio = document.getElementById('words-mode');
        
        // OTP connection elements
        this.otpConnectionSection = document.getElementById('otp-connection-section');
        this.otpSectionTitle = document.getElementById('otp-section-title');
        this.otpCreateDisplay = document.getElementById('otp-create-display');
        this.otpCodeText = document.getElementById('otp-code-text');
        this.copyOtpBtn = document.getElementById('copy-otp-btn');
        this.otpJoinDisplay = document.getElementById('otp-join-display');
        this.otpJoinInput = document.getElementById('otp-join-input');
        this.joinWithOtpBtn = document.getElementById('join-with-otp-btn');
        this.otpFinalDisplay = document.getElementById('otp-final-display');
        this.otpFinalCodeText = document.getElementById('otp-final-code-text');
        this.copyFinalOtpBtn = document.getElementById('copy-final-otp-btn');
        this.otpAnswerDisplay = document.getElementById('otp-answer-display');
        this.otpAnswerInput = document.getElementById('otp-answer-input');
        this.completeOtpBtn = document.getElementById('complete-otp-btn');
        this.cancelOtpBtn = document.getElementById('cancel-otp-btn');
    }

    setupEventListeners() {
        // Session control buttons
        this.createSessionBtn.addEventListener('click', () => this.createSession());
        this.joinSessionBtn.addEventListener('click', () => this.joinSession());
        this.cancelSessionBtn.addEventListener('click', () => this.cancelSession());
        this.disconnectBtn.addEventListener('click', () => this.disconnect());
        
        // Offer/Answer processing
        this.processOfferAnswerBtn.addEventListener('click', () => this.processOfferAnswer());
        this.processResponseBtn.addEventListener('click', () => this.processResponse());
        this.copyOfferBtn.addEventListener('click', () => this.copyToClipboard('offer'));
        this.copyAnswerBtn.addEventListener('click', () => this.copyToClipboard('answer'));
        
        // Clipboard sharing
        this.sendClipboardBtn.addEventListener('click', () => this.sendClipboard());
        this.pasteClipboardBtn.addEventListener('click', () => this.pasteFromClipboard());
        
        // Auto-select text when clicking in text areas
        this.offerUrl.addEventListener('click', () => this.offerUrl.select());
        this.answerText.addEventListener('click', () => this.answerText.select());
        this.responseInput.addEventListener('click', () => this.responseInput.select());
        
        // File sharing
        this.selectFilesBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files));
        
        // Drag and drop
        this.setupDragAndDrop();
        
        // Connection mode change
        this.lanModeRadio.addEventListener('change', () => this.updateConnectionMode());
        this.internetModeRadio.addEventListener('change', () => this.updateConnectionMode());
        
        // Connection method change
        this.directModeRadio.addEventListener('change', () => this.updateConnectionMethod());
        this.otpModeRadio.addEventListener('change', () => this.updateConnectionMethod());
        
        // OTP event listeners
        this.copyOtpBtn.addEventListener('click', () => this.copyToClipboard('otp'));
        this.copyFinalOtpBtn.addEventListener('click', () => this.copyToClipboard('final-otp'));
        this.joinWithOtpBtn.addEventListener('click', () => this.joinWithOtpCode());
        this.completeOtpBtn.addEventListener('click', () => this.completeOtpConnection());
        this.cancelOtpBtn.addEventListener('click', () => this.cancelOtpSession());
        
        // Enter key support for OTP inputs
        this.otpJoinInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinWithOtpCode();
        });
        this.otpAnswerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.completeOtpConnection();
        });
    }

    setupThemeChangeListener() {
        // Listen for theme changes on the theme toggle button
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                // Regenerate QR codes after theme change (small delay to let theme apply)
                setTimeout(() => this.regenerateQRCodesForTheme(), 100);
            });
        }
        
        // Also listen for direct theme attribute changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                    // Theme changed, regenerate QR codes
                    setTimeout(() => this.regenerateQRCodesForTheme(), 100);
                }
            });
        });
        
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme']
        });
    }

    async regenerateQRCodesForTheme() {
        try {
            // Regenerate offer QR code if it exists
            if (this.currentOfferUrl && this.qrDisplay.style.display !== 'none') {
                console.log('Regenerating offer QR code for theme change');
                await this.generateQRCodeFromUrl(this.currentOfferUrl);
            }
            
            // Regenerate answer QR code if it exists
            if (this.currentAnswerData && this.answerDisplay.style.display !== 'none') {
                console.log('Regenerating answer QR code for theme change');
                await this.generateAnswerQRCode(this.currentAnswerData);
            }
        } catch (error) {
            console.error('Error regenerating QR codes for theme:', error);
        }
    }

    checkForOfferInUrl() {
        console.log('Checking for offer or answer in URL...');
        
        // Check if there's an offer or answer in the URL hash
        const hash = window.location.hash;
        console.log('Current URL hash:', hash);
        
        if (hash.startsWith('#offer=')) {
            console.log('Found offer in URL hash');
            // Show processing banner
            this.urlProcessingBanner.style.display = 'block';
            
            const compressed = hash.substring(7); // Remove '#offer='
            console.log('Compressed offer data length:', compressed.length);
            
            try {
                // Add padding if needed for base64 decoding
                let paddedCompressed = compressed.replace(/-/g, '+').replace(/_/g, '/');
                while (paddedCompressed.length % 4) {
                    paddedCompressed += '=';
                }
                console.log('Padded compressed data:', paddedCompressed.substring(0, 50) + '...');
                
                // Decode the offer
                const decoded = atob(paddedCompressed);
                console.log('Decoded JSON length:', decoded.length);
                
                const offer = JSON.parse(decoded);
                console.log('Parsed offer type:', offer.type);
                console.log('Offer SDP preview:', offer.sdp?.substring(0, 100) + '...');
                
                if (offer.type === 'offer') {
                    console.log('Starting auto-join process...');
                    // Auto-start join process with this offer
                    this.autoJoinWithOffer(offer);
                    
                    // Clear the hash from URL for security after a short delay
                    setTimeout(() => {
                        console.log('Clearing URL hash for security');
                        window.history.replaceState('', document.title, window.location.pathname);
                    }, 1000);
                } else {
                    console.error('Not a valid offer type:', offer.type);
                }
            } catch (error) {
                console.error('Error processing offer from URL:', error);
                console.error('Raw compressed data:', compressed.substring(0, 100) + '...');
                
                // Hide processing banner and show error
                this.urlProcessingBanner.style.display = 'none';
                this.updateStatus('Invalid offer URL - please check the link', 'error');
            }
        } else if (hash.startsWith('#answer=')) {
            console.log('Found answer in URL hash');
            // Show processing banner
            this.urlProcessingBanner.style.display = 'block';
            
            const compressed = hash.substring(8); // Remove '#answer='
            console.log('Compressed answer data length:', compressed.length);
            
            try {
                // Add padding if needed for base64 decoding
                let paddedCompressed = compressed.replace(/-/g, '+').replace(/_/g, '/');
                while (paddedCompressed.length % 4) {
                    paddedCompressed += '=';
                }
                console.log('Padded compressed data:', paddedCompressed.substring(0, 50) + '...');
                
                // Decode the answer
                const decoded = atob(paddedCompressed);
                console.log('Decoded JSON length:', decoded.length);
                
                const answer = JSON.parse(decoded);
                console.log('Parsed answer type:', answer.type);
                console.log('Answer SDP preview:', answer.sdp?.substring(0, 100) + '...');
                
                if (answer.type === 'answer') {
                    console.log('Starting auto-process answer...');
                    // Auto-process this answer (paste it into the response input)
                    this.autoProcessAnswer(compressed);
                    
                    // Clear the hash from URL for security after a short delay
                    setTimeout(() => {
                        console.log('Clearing URL hash for security');
                        window.history.replaceState('', document.title, window.location.pathname);
                    }, 1000);
                } else {
                    console.error('Not a valid answer type:', answer.type);
                }
            } catch (error) {
                console.error('Error processing answer from URL:', error);
                console.error('Raw compressed data:', compressed.substring(0, 100) + '...');
                
                // Hide processing banner and show error
                this.urlProcessingBanner.style.display = 'none';
                this.updateStatus('Invalid answer URL - please check the link', 'error');
            }
        } else {
            console.log('No offer or answer found in URL hash');
        }
    }

    async autoJoinWithOffer(offer) {
        try {
            console.log('Auto-joining with offer...');
            // Hide processing banner once we start the actual process
            this.urlProcessingBanner.style.display = 'none';
            this.updateStatus('Auto-joining session from URL...', 'connecting');
            this.isInitiator = false;
            
            // Show join UI
            console.log('Showing session UI');
            this.showSessionUI('Joining Session from URL');
            
            // Override progress for joining device - they start at step 2 (they are the "other device")  
            this.updateProgress('connect');
            
            // Create peer connection
            console.log('Creating peer connection with config:', this.getIceConfiguration());
            const iceConfig = this.getIceConfiguration();
            this.pc = new RTCPeerConnection(iceConfig);
            this.setupPeerConnection();

            // Set remote description
            console.log('Setting remote description (offer)');
            await this.pc.setRemoteDescription(offer);
            console.log('Remote description set successfully');

            // Create answer
            console.log('Creating answer...');
            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);
            console.log('Answer created and local description set');

            // Wait for ICE gathering
            console.log('Waiting for ICE gathering to complete...');
            await this.waitForIceGathering();
            console.log('ICE gathering completed');

            // Display answer for sharing back
            console.log('Displaying answer for user to share');
            this.displayAnswer(this.pc.localDescription);
            this.updateStatus('Copy the answer below and send it back to the other device', 'connecting');
            
        } catch (error) {
            console.error('Error auto-joining session:', error);
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
            this.updateStatus('Failed to join session from URL: ' + error.message, 'error');
        }
    }

    autoProcessAnswer(compressedAnswer) {
        try {
            console.log('Auto-processing answer from URL...');
            // Hide processing banner 
            this.urlProcessingBanner.style.display = 'none';
            
            // Check if we're in the right state to receive an answer
            if (this.waitingResponse.style.display !== 'none') {
                // We're waiting for a response, automatically paste it
                console.log('Pasting answer into response input');
                this.responseInput.value = compressedAnswer;
                
                // Show status message
                this.updateStatus('Answer received from URL - processing...', 'connecting');
                
                // Auto-click the process button after a short delay
                setTimeout(() => {
                    console.log('Auto-clicking process response button');
                    this.processResponseBtn.click();
                }, 500);
            } else {
                console.log('Not in waiting response state, showing answer for manual processing');
                this.updateStatus('Answer URL received - copy the response data if needed', 'info');
            }
            
        } catch (error) {
            console.error('Error auto-processing answer:', error);
            this.updateStatus('Failed to process answer from URL: ' + error.message, 'error');
        }
    }

    setupDragAndDrop() {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.fileDropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            this.fileDropZone.addEventListener(eventName, () => {
                this.fileDropZone.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            this.fileDropZone.addEventListener(eventName, () => {
                this.fileDropZone.classList.remove('drag-over');
            });
        });

        this.fileDropZone.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer.files);
            this.handleFileSelect(files);
        });
    }

    getIceConfiguration() {
        if (this.lanModeRadio.checked) {
            // LAN only - no STUN servers, just host candidates
            return { iceServers: [] };
        } else {
            // Internet mode with STUN
            return { 
                iceServers: [
                    { urls: ['stun:stun.l.google.com:19302'] },
                    { urls: ['stun:stun1.l.google.com:19302'] }
                ]
            };
        }
    }

    updateConnectionMode() {
        // If already connecting or connected, show warning
        if (this.connectionState !== 'disconnected') {
            alert('Please disconnect first before changing connection mode.');
            return;
        }
    }

    updateConnectionMethod() {
        if (this.connectionState !== 'disconnected') {
            alert('Please disconnect first before changing connection method.');
            return;
        }
        
        this.connectionMethod = this.otpModeRadio.checked ? 'otp' : 'direct';
        
        // Update UI based on selected method
        if (this.connectionMethod === 'otp') {
            document.body.classList.add('otp-mode');
            this.otpTypeGroup.style.display = 'block';
            this.methodDescriptionText.textContent = 'Use simple codes to connect. Requires temporary signaling server.';
        } else {
            document.body.classList.remove('otp-mode');
            this.otpTypeGroup.style.display = 'none';
            this.methodDescriptionText.textContent = 'Share QR codes or URLs directly between devices. Maximum privacy - no servers involved.';
        }
    }

    checkHumanIdLibrary() {
        // Wait for humanId library to be available
        if (typeof window.humanId !== 'undefined') {
            console.log('human-id library is available');
            return;
        }
        
        // Listen for library ready event
        window.addEventListener('humanIdReady', () => {
            console.log('human-id library loaded');
        });
        
        window.addEventListener('humanIdFailed', () => {
            console.warn('human-id library failed to load, OTP mode may not work properly');
        });
    }

    generateOtpCode() {
        const useNumbers = this.numbersModeRadio?.checked !== false; // Default to numbers if radio not found
        
        if (useNumbers) {
            return this.generateSixDigitCode();
        } else {
            return this.generateHumanId();
        }
    }

    generateSixDigitCode() {
        // Generate cryptographically secure 6-digit code
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        // Get a number between 100000 and 999999
        const code = (array[0] % 900000) + 100000;
        return code.toString();
    }

    generateHumanId() {
        if (typeof window.humanId !== 'undefined') {
            return window.humanId({
                separator: '-',
                capitalize: false
            });
        } else {
            // Fallback to simple random code if library not available
            const words = ['happy', 'clever', 'bright', 'swift', 'gentle', 'brave', 'calm', 'wise'];
            const animals = ['tiger', 'eagle', 'dolphin', 'fox', 'owl', 'bear', 'wolf', 'deer'];
            const actions = ['runs', 'flies', 'jumps', 'swims', 'sings', 'dances', 'climbs', 'soars'];
            
            const word = words[Math.floor(Math.random() * words.length)];
            const animal = animals[Math.floor(Math.random() * animals.length)];
            const action = actions[Math.floor(Math.random() * actions.length)];
            
            return `${word}-${animal}-${action}`;
        }
    }

    async createSession() {
        try {
            this.updateStatus('Initializing session...', 'connecting');
            this.isInitiator = true;
            
            if (this.connectionMethod === 'otp') {
                await this.createOtpSession();
            } else {
                await this.createDirectSession();
            }
            
        } catch (error) {
            console.error('Error creating session:', error);
            this.updateStatus('Failed to create session', 'error');
        }
    }

    async createDirectSession() {
        // Create peer connection
        const iceConfig = this.getIceConfiguration();
        this.pc = new RTCPeerConnection(iceConfig);
        this.setupPeerConnection();
        
        // Create data channel
        this.dataChannel = this.pc.createDataChannel('clipboard-transfer', {
            ordered: true
        });
        this.setupDataChannel(this.dataChannel);
        
        // Create offer
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        
        // Wait for ICE gathering to complete
        await this.waitForIceGathering();
        
        // Show session UI
        this.showSessionUI('Share Invitation');
        await this.generateQRCode(this.pc.localDescription);
        
        this.updateStatus('Share the invitation with the other device', 'connecting');
        
        // Show waiting for response section after a brief delay
        setTimeout(() => {
            this.waitingResponse.style.display = 'block';
        }, 2000);
    }

    async createOtpSession() {
        // Create peer connection
        const iceConfig = this.getIceConfiguration();
        this.pc = new RTCPeerConnection(iceConfig);
        this.setupPeerConnection();
        
        // Create data channel
        this.dataChannel = this.pc.createDataChannel('clipboard-transfer', {
            ordered: true
        });
        this.setupDataChannel(this.dataChannel);
        
        // Create offer
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        
        // Wait for ICE gathering to complete
        await this.waitForIceGathering();
        
        // Generate passcode based on user preference
        this.currentOtpCode = this.generateOtpCode();
        
        // Encrypt and store the offer
        const encryptedOffer = await this.encryptData(JSON.stringify(this.pc.localDescription), this.currentOtpCode);
        
        try {
            const response = await fetch(`${this.otpServerUrl}/temp/${this.currentOtpCode}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    encryptedData: encryptedOffer,
                    type: 'offer'
                })
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }
            
            // Show OTP UI
            this.showOtpCreateUI();
            this.updateStatus('Share the connection code with the other device', 'connecting');
            
            // Show answer input immediately - user will need it when they get the second code
            setTimeout(() => {
                this.showOtpAnswerUI();
            }, 1000); // Just a short delay so user can see the first code
            
        } catch (error) {
            console.error('Failed to store offer:', error);
            this.updateStatus('Failed to store connection data. Please try direct mode.', 'error');
        }
    }

    // Encryption/Decryption helpers for OTP mode
    async encryptData(data, passphrase) {
        try {
            // Simple Base64 encoding for now - in production, use real encryption
            const combined = passphrase + '|' + data;
            return btoa(combined).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        } catch (error) {
            console.error('Encryption failed:', error);
            throw error;
        }
    }

    async decryptData(encryptedData, passphrase) {
        try {
            // Simple Base64 decoding - in production, use real decryption
            let padded = encryptedData.replace(/-/g, '+').replace(/_/g, '/');
            while (padded.length % 4) padded += '=';
            
            const combined = atob(padded);
            const separator = combined.indexOf('|');
            const storedPassphrase = combined.substring(0, separator);
            const data = combined.substring(separator + 1);
            
            if (storedPassphrase !== passphrase) {
                throw new Error('Invalid passphrase');
            }
            
            return data;
        } catch (error) {
            console.error('Decryption failed:', error);
            throw error;
        }
    }

    showOtpCreateUI() {
        console.log('Showing OTP create UI with code:', this.currentOtpCode);
        
        this.connectionSetupSection.style.display = 'none';
        this.otpConnectionSection.style.display = 'block';
        this.otpSectionTitle.textContent = 'Share Connection Code';
        
        // Show the create display
        this.otpCreateDisplay.style.display = 'block';
        this.otpCodeText.textContent = this.currentOtpCode;
        
        // Hide other displays
        this.otpJoinDisplay.style.display = 'none';
        this.otpFinalDisplay.style.display = 'none';
        this.otpAnswerDisplay.style.display = 'none';
        
        // Show progress tracker
        this.showProgressTracker();
        this.updateProgress('share');
        
        console.log('OTP UI elements:', {
            otpConnectionSection: this.otpConnectionSection.style.display,
            otpCreateDisplay: this.otpCreateDisplay.style.display,
            otpCodeText: this.otpCodeText.textContent
        });
    }

    showOtpJoinUI() {
        this.connectionSetupSection.style.display = 'none';
        this.otpConnectionSection.style.display = 'block';
        this.otpSectionTitle.textContent = 'Enter Connection Code';
        
        // Show the join display
        this.otpJoinDisplay.style.display = 'block';
        
        // Hide other displays
        this.otpCreateDisplay.style.display = 'none';
        this.otpFinalDisplay.style.display = 'none';
        this.otpAnswerDisplay.style.display = 'none';
        
        // Show progress tracker
        this.showProgressTracker();
        this.updateProgress('connect');
    }

    async joinWithOtpCode() {
        const code = this.otpJoinInput.value.trim().toLowerCase();
        if (!code) {
            alert('Please enter a connection code');
            return;
        }

        try {
            this.updateStatus('Retrieving connection data...', 'connecting');
            
            // Fetch the offer from server
            const response = await fetch(`${this.otpServerUrl}/temp/${code}`, {
                method: 'GET'
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Connection code not found or expired');
                } else {
                    throw new Error(`Server error: ${response.status}`);
                }
            }
            
            const data = await response.json();
            
            // Decrypt the offer
            const decryptedOffer = await this.decryptData(data.encryptedData, code);
            const offer = JSON.parse(decryptedOffer);
            
            // Create peer connection and process offer
            const iceConfig = this.getIceConfiguration();
            this.pc = new RTCPeerConnection(iceConfig);
            this.setupPeerConnection();
            
            await this.pc.setRemoteDescription(offer);
            
            // Create answer
            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);
            
            // Wait for ICE gathering
            await this.waitForIceGathering();
            
            // Generate code for answer and store it (using same method as first code)
            this.currentAnswerOtp = this.generateOtpCode();
            const encryptedAnswer = await this.encryptData(JSON.stringify(this.pc.localDescription), this.currentAnswerOtp);
            
            const storeResponse = await fetch(`${this.otpServerUrl}/temp/${this.currentAnswerOtp}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    encryptedData: encryptedAnswer,
                    type: 'answer'
                })
            });
            
            if (!storeResponse.ok) {
                throw new Error('Failed to store answer');
            }
            
            // Show final code display
            this.showOtpFinalUI();
            this.updateStatus('Share the final code with the first device', 'connecting');
            // Keep progress at 'connect' - the second device is still "joining"
            this.updateProgress('connect');
            
        } catch (error) {
            console.error('Failed to join with OTP code:', error);
            this.updateStatus(`Failed to join: ${error.message}`, 'error');
        }
    }

    showOtpFinalUI() {
        this.otpFinalDisplay.style.display = 'block';
        this.otpFinalCodeText.textContent = this.currentAnswerOtp;
        
        // Hide other displays
        this.otpJoinDisplay.style.display = 'none';
        this.otpCreateDisplay.style.display = 'none';
        this.otpAnswerDisplay.style.display = 'none';
    }


    showOtpAnswerUI() {
        this.otpAnswerDisplay.style.display = 'block';
        // Keep the create display visible so user can still see their original code
        // this.otpCreateDisplay.style.display = 'none'; // Don't hide this!
        this.updateStatus('Enter the final code from the other device below', 'connecting');
        // First device advances to step 3 when waiting for the final answer
        this.updateProgress('answer');
    }

    async completeOtpConnection() {
        const code = this.otpAnswerInput.value.trim().toLowerCase();
        if (!code) {
            alert('Please enter the final connection code');
            return;
        }

        try {
            this.updateStatus('Completing connection...', 'connecting');
            
            // Fetch the answer from server
            const response = await fetch(`${this.otpServerUrl}/temp/${code}`, {
                method: 'GET'
            });
            
            if (!response.ok) {
                throw new Error('Final code not found or invalid');
            }
            
            const data = await response.json();
            
            // Decrypt the answer
            const decryptedAnswer = await this.decryptData(data.encryptedData, code);
            const answer = JSON.parse(decryptedAnswer);
            
            // Set remote description (answer)
            await this.pc.setRemoteDescription(answer);
            
            this.updateStatus('Connection established!', 'connected');
            this.updateProgress('connected');
            
        } catch (error) {
            console.error('Failed to complete OTP connection:', error);
            this.updateStatus(`Connection failed: ${error.message}`, 'error');
        }
    }

    cancelOtpSession() {
        this.disconnect();
    }

    async joinSession() {
        try {
            this.updateStatus('Ready to join session', 'connecting');
            this.isInitiator = false;
            
            if (this.connectionMethod === 'otp') {
                this.showOtpJoinUI();
            } else {
                // Show session UI for joining
                this.showSessionUI('Join Session');
                this.manualExchange.style.display = 'block';
            }
            
        } catch (error) {
            console.error('Error joining session:', error);
            this.updateStatus('Failed to join session', 'error');
        }
    }

    async processOfferAnswer() {
        try {
            const data = this.offerAnswerInput.value.trim();
            if (!data) {
                alert('Please paste the offer or answer data');
                return;
            }

            let sdpData;
            try {
                // Try to parse as JSON first
                sdpData = JSON.parse(data);
            } catch {
                // If not JSON, try to parse as base64 URL
                try {
                    const decoded = atob(data.replace(/-/g, '+').replace(/_/g, '/'));
                    sdpData = JSON.parse(decoded);
                } catch {
                    alert('Invalid offer/answer format');
                    return;
                }
            }

            if (!this.isInitiator) {
                // Joining - this should be an offer
                if (sdpData.type !== 'offer') {
                    alert('Expected an offer, but received: ' + sdpData.type);
                    return;
                }

                // Create peer connection
                const iceConfig = this.getIceConfiguration();
                this.pc = new RTCPeerConnection(iceConfig);
                this.setupPeerConnection();

                // Set remote description
                await this.pc.setRemoteDescription(sdpData);

                // Create answer
                const answer = await this.pc.createAnswer();
                await this.pc.setLocalDescription(answer);

                // Wait for ICE gathering
                await this.waitForIceGathering();

                // Show answer for sharing
                this.displayAnswer(this.pc.localDescription);
                this.updateStatus('Send answer to other device', 'connecting');

            } else {
                // Creating - this should be an answer
                if (sdpData.type !== 'answer') {
                    alert('Expected an answer, but received: ' + sdpData.type);
                    return;
                }

                // Set remote description
                await this.pc.setRemoteDescription(sdpData);
                this.updateStatus('Connecting...', 'connecting');
            }

        } catch (error) {
            console.error('Error processing offer/answer:', error);
            this.updateStatus('Failed to process offer/answer', 'error');
        }
    }

    async processResponse() {
        try {
            const data = this.responseInput.value.trim();
            if (!data) {
                alert('Please paste the response from the other device');
                return;
            }

            let sdpData;
            try {
                // Try to parse as JSON first
                sdpData = JSON.parse(data);
            } catch {
                // If not JSON, try to parse as base64 URL
                try {
                    let paddedData = data.replace(/-/g, '+').replace(/_/g, '/');
                    while (paddedData.length % 4) {
                        paddedData += '=';
                    }
                    const decoded = atob(paddedData);
                    sdpData = JSON.parse(decoded);
                } catch {
                    alert('Invalid response format');
                    return;
                }
            }

            if (sdpData.type !== 'answer') {
                alert('Expected a response, but received: ' + sdpData.type);
                return;
            }

            // Set remote description (answer)
            await this.pc.setRemoteDescription(sdpData);
            this.updateStatus('Connecting...', 'connecting');
            
            // Update progress to complete connection step (we received the answer)
            this.updateProgress('answer');
            
            // Hide the waiting section
            this.waitingResponse.style.display = 'none';

        } catch (error) {
            console.error('Error processing response:', error);
            this.updateStatus('Failed to process response', 'error');
        }
    }

    setupPeerConnection() {
        this.pc.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', this.pc.iceConnectionState);
            
            switch (this.pc.iceConnectionState) {
                case 'connected':
                case 'completed':
                    this.onConnected();
                    break;
                case 'disconnected':
                case 'failed':
                case 'closed':
                    this.onDisconnected();
                    break;
            }
        };

        this.pc.ondatachannel = (event) => {
            if (!this.isInitiator) {
                this.setupDataChannel(event.channel);
            }
        };

        this.pc.onconnectionstatechange = () => {
            console.log('Connection state:', this.pc.connectionState);
        };
    }

    setupDataChannel(channel) {
        this.dataChannel = channel;
        
        channel.onopen = () => {
            console.log('Data channel opened');
            this.onConnected();
        };

        channel.onclose = () => {
            console.log('Data channel closed');
            this.onDisconnected();
        };

        channel.onmessage = (event) => {
            this.handleMessage(event.data);
        };

        // Set binary type for file transfers
        channel.binaryType = 'arraybuffer';

        channel.onerror = (error) => {
            console.error('Data channel error:', error);
        };
    }

    async waitForIceGathering() {
        return new Promise((resolve) => {
            if (this.pc.iceGatheringState === 'complete') {
                resolve();
                return;
            }

            const checkState = () => {
                if (this.pc.iceGatheringState === 'complete') {
                    this.pc.removeEventListener('icegatheringstatechange', checkState);
                    resolve();
                }
            };

            this.pc.addEventListener('icegatheringstatechange', checkState);
        });
    }

    getThemeColors() {
        // Get CSS variable values from computed styles
        const rootStyles = getComputedStyle(document.documentElement);
        const bgPrimary = rootStyles.getPropertyValue('--bg-primary').trim();
        
        // Detect current theme from document attribute
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        
        // Convert CSS color to hex if needed
        const backgroundColor = this.cssColorToHex(bgPrimary);
        
        return {
            barColor: isDarkMode ? 'ffffff' : '000000', // White bars in dark mode, black in light mode
            backgroundColor: backgroundColor.substring(1), // Remove # for bwip-js
            backgroundTransparent: false // Now using actual background color
        };
    }

    cssColorToHex(cssColor) {
        // Handle different CSS color formats
        if (cssColor.startsWith('#')) {
            return cssColor;
        }
        
        // For rgb() values, convert to hex
        if (cssColor.startsWith('rgb')) {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 1;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = cssColor;
            ctx.fillRect(0, 0, 1, 1);
            const data = ctx.getImageData(0, 0, 1, 1).data;
            return '#' + 
                   data[0].toString(16).padStart(2, '0') + 
                   data[1].toString(16).padStart(2, '0') + 
                   data[2].toString(16).padStart(2, '0');
        }
        
        // Fallback to white/dark based on theme
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        return isDarkMode ? '#1f2937' : '#ffffff';
    }

    async generateQRCode(sdp) {
        try {
            // Compress SDP for smaller QR code
            const sdpString = JSON.stringify(sdp);
            const compressed = btoa(sdpString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
            
            // Generate the URL with hash
            const currentUrl = window.location.href.split('#')[0]; // Remove any existing hash
            const offerUrl = `${currentUrl}#offer=${compressed}`;
            
            // Store for theme change regeneration
            this.currentOfferUrl = offerUrl;
            
            // Display the URL
            this.offerUrl.value = offerUrl;
            
            await this.generateQRCodeFromUrl(offerUrl);

            this.qrDisplay.style.display = 'block';
            
            // Progress stays on "share" - user needs to actually share the link
            
            // Store URL for copy button and show it
            this.copyOfferBtn.setAttribute('data-content', offerUrl);
            this.copyOfferBtn.style.display = 'inline-block';

        } catch (error) {
            console.error('QR code generation error:', error);
            // Fallback to manual exchange
            this.manualExchange.style.display = 'block';
        }
    }

    async displayAnswer(answer) {
        const answerString = JSON.stringify(answer);
        const compressed = btoa(answerString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        
        // Generate the full URL with answer hash (matching offer pattern)
        const currentUrl = window.location.href.split('#')[0]; // Remove any existing hash
        const answerUrl = `${currentUrl}#answer=${compressed}`;
        
        // Store for theme change regeneration
        this.currentAnswerData = answerUrl;
        
        this.answerText.value = answerUrl; // Show the full URL in textarea for consistency
        
        await this.generateAnswerQRCode(answerUrl); // But use full URL for QR code
        
        this.answerDisplay.style.display = 'block';
        this.manualExchange.style.display = 'none';
        
        // Don't update progress here - pairing device will go directly to "connected" when done
    }

    async generateQRCodeFromUrl(url) {
        const canvas = this.qrCanvas;
        canvas.style.display = 'block';
        
        const themeColors = this.getThemeColors();
        
        // Create temp canvas for QR generation (following barcode generator pattern)
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 300; // QR codes are typically square
        tempCanvas.height = 300;
        
        const qrOptions = {
            bcid: 'qrcode',
            text: url,
            scale: 2,
            includetext: false,
            barcolor: themeColors.barColor,
            backgroundcolor: themeColors.backgroundColor,
        };
        
        // Generate QR on temp canvas first
        await bwipjs.toCanvas(tempCanvas, qrOptions);
        
        // Find actual bounds of the QR code on temp canvas
        const tempCtx = tempCanvas.getContext('2d');
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        
        let minX = tempCanvas.width, minY = tempCanvas.height;
        let maxX = 0, maxY = 0;
        
        for (let y = 0; y < tempCanvas.height; y++) {
            for (let x = 0; x < tempCanvas.width; x++) {
                const index = (y * tempCanvas.width + x) * 4;
                const alpha = data[index + 3];
                
                if (alpha > 0) {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }
        
        const qrWidth = maxX - minX + 1;
        const qrHeight = maxY - minY + 1;
        const padding = 20;
        
        // Set final canvas size
        canvas.width = qrWidth + (padding * 2);
        canvas.height = qrHeight + (padding * 2);
        
        // Clear canvas and fill with theme background
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw QR code centered on canvas
        const centerX = (canvas.width - qrWidth) / 2;
        const centerY = (canvas.height - qrHeight) / 2;
        ctx.drawImage(tempCanvas, minX, minY, qrWidth, qrHeight, 
                     centerX, centerY, qrWidth, qrHeight);
    }

    async generateAnswerQRCode(data) {
        try {
            const themeColors = this.getThemeColors();
            
            // Create temp canvas for QR generation (following barcode generator pattern)
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 300; // QR codes are typically square
            tempCanvas.height = 300;
            
            const qrOptions = {
                bcid: 'qrcode',
                text: data,
                scale: 2,
                includetext: false,
                barcolor: themeColors.barColor,
                backgroundcolor: themeColors.backgroundColor,
            };
            
            // Generate QR on temp canvas first
            await bwipjs.toCanvas(tempCanvas, qrOptions);
            
            // Find actual bounds of the QR code on temp canvas
            const tempCtx = tempCanvas.getContext('2d');
            const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const data_pixels = imageData.data;
            
            let minX = tempCanvas.width, minY = tempCanvas.height;
            let maxX = 0, maxY = 0;
            
            for (let y = 0; y < tempCanvas.height; y++) {
                for (let x = 0; x < tempCanvas.width; x++) {
                    const index = (y * tempCanvas.width + x) * 4;
                    const alpha = data_pixels[index + 3];
                    
                    if (alpha > 0) {
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                    }
                }
            }
            
            const qrWidth = maxX - minX + 1;
            const qrHeight = maxY - minY + 1;
            const padding = 20;
            
            // Set final canvas size
            this.answerQRCanvas.width = qrWidth + (padding * 2);
            this.answerQRCanvas.height = qrHeight + (padding * 2);
            
            // Clear canvas and fill with theme background
            const ctx = this.answerQRCanvas.getContext('2d');
            ctx.clearRect(0, 0, this.answerQRCanvas.width, this.answerQRCanvas.height);
            
            // Draw QR code centered on canvas
            const centerX = (this.answerQRCanvas.width - qrWidth) / 2;
            const centerY = (this.answerQRCanvas.height - qrHeight) / 2;
            ctx.drawImage(tempCanvas, minX, minY, qrWidth, qrHeight, 
                         centerX, centerY, qrWidth, qrHeight);
        } catch (error) {
            console.error('QR code generation error for answer:', error);
        }
    }

    onConnected() {
        this.connectionState = 'connected';
        this.updateStatus('Connected', 'connected');
        
        // Update progress to final step
        this.updateProgress('connected');
        
        // Hide session sections and show communication
        this.sessionSection.style.display = 'none';
        this.otpConnectionSection.style.display = 'none'; // Hide OTP section too
        this.communicationSection.style.display = 'block';
        
        // Add connection message to feed
        this.addMessage('system', 'Connection established', new Date());
    }

    onDisconnected() {
        this.connectionState = 'disconnected';
        this.updateStatus('Disconnected', 'error');
        this.resetUI();
    }


    // Message handling
    handleMessage(data) {
        try {
            // Handle binary data (file chunks)
            if (data instanceof ArrayBuffer) {
                this.handleFileChunk(data);
                return;
            }
            
            let message;
            
            // Try to parse as JSON (control messages)
            try {
                message = JSON.parse(data);
            } catch {
                // If not JSON, treat as plain text
                message = {
                    kind: 'text',
                    content: data,
                    timestamp: Date.now()
                };
            }

            switch (message.kind) {
                case 'text':
                    this.handleTextMessage(message);
                    break;
                case 'file-start':
                    this.handleFileStart(message);
                    break;
                case 'file-end':
                    this.handleFileEnd(message);
                    break;
                case 'file-abort':
                    this.handleFileAbort(message);
                    break;
                case 'ping':
                    this.sendMessage({ kind: 'pong', t: message.t });
                    break;
                case 'pong':
                    // Handle pong if needed
                    break;
                default:
                    console.warn('Unknown message type:', message.kind);
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    handleTextMessage(message) {
        this.addMessage('received', message.content, new Date(message.timestamp));
        
        // Try to write to clipboard (requires user interaction)
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(message.content).catch(err => {
                console.log('Clipboard write failed:', err);
            });
        }
    }

    // File transfer methods
    handleFileStart(message) {
        const transfer = {
            id: message.transferId,
            name: message.name,
            size: message.size,
            type: message.type,
            chunks: new Map(),
            receivedBytes: 0,
            startTime: Date.now()
        };
        
        this.transfers.set(message.transferId, transfer);
        // Don't add to message feed yet - wait until file is complete with download button
        this.updateTransferProgress(message.transferId, 0);
    }

    handleFileChunk(data) {
        // Handle binary chunk data
        if (data instanceof ArrayBuffer) {
            // Parse header from binary data
            const view = new DataView(data);
            const headerLength = view.getUint32(0);
            const headerBytes = new Uint8Array(data, 4, headerLength);
            const headerString = new TextDecoder().decode(headerBytes);
            const header = JSON.parse(headerString);
            
            const chunkData = new Uint8Array(data, 4 + headerLength);
            
            const transfer = this.transfers.get(header.transferId);
            if (transfer) {
                transfer.chunks.set(header.seq, chunkData);
                transfer.receivedBytes += chunkData.length;
                
                const progress = (transfer.receivedBytes / transfer.size) * 100;
                this.updateTransferProgress(header.transferId, progress);
            }
        }
    }

    handleFileEnd(message) {
        const transfer = this.transfers.get(message.transferId);
        if (transfer) {
            this.assembleAndDownloadFile(transfer, message);
        }
    }

    assembleAndDownloadFile(transfer, endMessage) {
        try {
            // Sort chunks by sequence number and assemble
            const sortedChunks = Array.from(transfer.chunks.entries())
                .sort((a, b) => a[0] - b[0])
                .map(entry => entry[1]);
            
            // Create blob from assembled chunks
            const blob = new Blob(sortedChunks, { type: transfer.type });
            
            // Verify file size if provided
            if (endMessage.totalBytes && blob.size !== endMessage.totalBytes) {
                console.warn('File size mismatch:', blob.size, 'vs', endMessage.totalBytes);
            }
            
            // Convert to base64 for storage in message feed
            const reader = new FileReader();
            reader.onload = () => {
                const base64Data = reader.result.split(',')[1]; // Remove data:mime;base64, prefix
                
                // Add to message feed with download button
                this.addFileMessage('received', transfer.name, transfer.size, new Date(), base64Data, transfer.type);
                
                // Auto-download
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = transfer.name;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            };
            reader.readAsDataURL(blob);
            
            this.completeFileTransfer(transfer.id);
            
        } catch (error) {
            console.error('Error assembling file:', error);
        }
    }

    handleFileAbort(message) {
        const transferElement = document.getElementById(`transfer-${message.transferId}`);
        if (transferElement) {
            const statusSpan = transferElement.querySelector('.transfer-status');
            statusSpan.textContent = 'Cancelled';
            setTimeout(() => {
                transferElement.remove();
                if (this.transferList.children.length === 0) {
                    this.transferSection.style.display = 'none';
                }
            }, 2000);
        }
        
        this.transfers.delete(message.transferId);
    }

    // UI Methods
    sendMessage(message) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify(message));
            return true;
        }
        return false;
    }

    async sendClipboard() {
        const text = this.clipboardInput.value.trim();
        if (!text) return;

        const message = {
            kind: 'text',
            content: text,
            timestamp: Date.now()
        };

        if (this.sendMessage(message)) {
            this.addMessage('sent', text, new Date());
            this.clipboardInput.value = '';
        } else {
            alert('Connection not ready');
        }
    }

    async pasteFromClipboard() {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                const text = await navigator.clipboard.readText();
                this.clipboardInput.value = text;
            } else {
                alert('Clipboard access not available. Please paste manually.');
            }
        } catch (err) {
            alert('Failed to read clipboard. Please paste manually.');
        }
    }

    handleFileSelect(files) {
        if (!files.length) return;

        for (const file of files) {
            this.sendFile(file);
        }
    }

    async sendFile(file) {
        if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
            alert('Connection not ready');
            return;
        }

        const transferId = 'transfer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const chunkSize = 16384; // 16KB chunks
        
        try {
            // Send start message
            const startMessage = {
                kind: 'file-start',
                transferId: transferId,
                name: file.name,
                type: file.type || 'application/octet-stream',
                size: file.size,
                createdAt: Date.now()
            };
            
            this.sendMessage(startMessage);
            this.addFileMessage('sent', file.name, file.size, new Date());
            
            // Read file as array buffer
            const arrayBuffer = await file.arrayBuffer();
            const totalChunks = Math.ceil(arrayBuffer.byteLength / chunkSize);
            
            // Send file in chunks with backpressure handling
            for (let seq = 0; seq < totalChunks; seq++) {
                const start = seq * chunkSize;
                const end = Math.min(start + chunkSize, arrayBuffer.byteLength);
                const chunkData = arrayBuffer.slice(start, end);
                
                // Create binary message with header
                const header = {
                    kind: 'file-chunk',
                    transferId: transferId,
                    seq: seq
                };
                
                const headerString = JSON.stringify(header);
                const headerBytes = new TextEncoder().encode(headerString);
                
                // Create combined binary message: [headerLength][header][data]
                const combined = new ArrayBuffer(4 + headerBytes.length + chunkData.byteLength);
                const view = new DataView(combined);
                
                view.setUint32(0, headerBytes.length);
                new Uint8Array(combined, 4).set(headerBytes);
                new Uint8Array(combined, 4 + headerBytes.length).set(new Uint8Array(chunkData));
                
                // Wait for backpressure if needed
                await this.waitForBackpressure();
                
                // Send chunk
                this.dataChannel.send(combined);
                
                // Update progress
                const progress = ((seq + 1) / totalChunks) * 100;
                this.updateTransferProgress(transferId, progress, true);
            }
            
            // Send end message
            const endMessage = {
                kind: 'file-end',
                transferId: transferId,
                totalBytes: file.size
            };
            
            this.sendMessage(endMessage);
            
        } catch (error) {
            console.error('Error sending file:', error);
            alert('Failed to send file: ' + error.message);
        }
    }

    async waitForBackpressure() {
        const threshold = 1000000; // 1MB buffer threshold
        
        if (this.dataChannel.bufferedAmount >= threshold) {
            this.dataChannel.bufferedAmountLowThreshold = threshold / 2;
            
            return new Promise((resolve) => {
                const onBufferedAmountLow = () => {
                    this.dataChannel.removeEventListener('bufferedamountlow', onBufferedAmountLow);
                    resolve();
                };
                
                this.dataChannel.addEventListener('bufferedamountlow', onBufferedAmountLow);
            });
        }
    }

    addMessage(type, content, timestamp) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-item ${type}`;
        
        const typeText = type === 'sent' ? 'SENT TO DEVICE' : type === 'received' ? 'RECEIVED FROM DEVICE' : 'SYSTEM';
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-type">${typeText}</span>
                <span class="message-time">${timestamp.toLocaleTimeString()}</span>
            </div>
            <div class="message-content clipboard-text">${content}</div>
            ${type === 'received' ? '<button class="btn-copy" onclick="this.parentNode.querySelector(\'.clipboard-text\').select(); document.execCommand(\'copy\');">Copy</button>' : ''}
        `;
        
        // Insert at the top for reverse chronological order (newest first)
        this.messageFeed.insertBefore(messageDiv, this.messageFeed.firstChild);
    }

    addFileMessage(type, filename, size, timestamp, fileData = null, mimeType = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-item file ${type}`;
        
        const typeText = type === 'sent' ? 'FILE SENT TO DEVICE' : 'FILE RECEIVED FROM DEVICE';
        const sizeText = this.formatFileSize(size);
        
        // Determine MIME type to show
        const displayMimeType = mimeType || this.getFileMimeType(filename);
        const mimeTypeDisplay = displayMimeType !== 'application/octet-stream' ? 
            `<div class="file-mime">${displayMimeType}</div>` : '';
        
        // Create download button if we have file data (for received files)
        const downloadButton = fileData ? 
            `<button class="btn-copy" onclick="clipboardTransfer.downloadFile('${filename}', '${fileData}', '${displayMimeType}')">Download</button>` 
            : '';
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-type">${typeText}</span>
                <span class="message-time">${timestamp.toLocaleTimeString()}</span>
            </div>
            <div class="file-info">
                <div class="file-icon">${this.getFileIcon(filename)}</div>
                <div class="file-details">
                    <div class="file-name">${filename}</div>
                    <div class="file-size">${sizeText}</div>
                    ${mimeTypeDisplay}
                </div>
                <div class="file-actions">
                    ${downloadButton}
                </div>
            </div>
        `;
        
        // Insert at the top for reverse chronological order (newest first)
        this.messageFeed.insertBefore(messageDiv, this.messageFeed.firstChild);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const iconMap = {
            'txt': 'TXT',
            'pdf': 'PDF',
            'doc': 'DOC',
            'docx': 'DOC',
            'jpg': 'IMG',
            'jpeg': 'IMG',
            'png': 'IMG',
            'gif': 'IMG',
        };
        return iconMap[ext] || 'FILE';
    }

    getFileMimeType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const mimeMap = {
            'txt': 'text/plain',
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'zip': 'application/zip',
            'json': 'application/json',
            'html': 'text/html',
            'css': 'text/css',
            'js': 'application/javascript'
        };
        return mimeMap[ext] || 'application/octet-stream';
    }

    downloadFile(filename, base64Data, mimeType) {
        try {
            // Convert base64 to blob
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: mimeType });
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('Error downloading file:', error);
            alert('Failed to download file');
        }
    }

    updateTransferProgress(transferId, percentage, isSending = false) {
        let transferElement = document.getElementById(`transfer-${transferId}`);
        
        if (!transferElement) {
            // Create transfer progress element
            transferElement = document.createElement('div');
            transferElement.id = `transfer-${transferId}`;
            transferElement.className = 'transfer-item';
            
            const transfer = this.transfers.get(transferId);
            const fileName = transfer ? transfer.name : 'Unknown file';
            const direction = isSending ? 'Sending' : 'Receiving';
            
            transferElement.innerHTML = `
                <div class="transfer-header">
                    <span class="transfer-name">${fileName}</span>
                    <span class="transfer-status">${direction}...</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="transfer-controls">
                    <span class="transfer-speed">0 KB/s</span>
                    <button class="btn-secondary btn-small" onclick="clipboardTransfer.cancelTransfer('${transferId}')">Cancel</button>
                </div>
            `;
            
            this.transferList.appendChild(transferElement);
            this.transferSection.style.display = 'block';
        }
        
        // Update progress
        const progressFill = transferElement.querySelector('.progress-fill');
        const statusSpan = transferElement.querySelector('.transfer-status');
        
        progressFill.style.width = `${Math.round(percentage)}%`;
        
        if (percentage >= 100) {
            statusSpan.textContent = isSending ? 'Sent' : 'Completed';
            setTimeout(() => {
                transferElement.remove();
                if (this.transferList.children.length === 0) {
                    this.transferSection.style.display = 'none';
                }
            }, 3000);
        } else {
            statusSpan.textContent = `${Math.round(percentage)}%`;
        }
    }

    cancelTransfer(transferId) {
        // Remove from UI
        const transferElement = document.getElementById(`transfer-${transferId}`);
        if (transferElement) {
            transferElement.remove();
        }
        
        // Clean up transfer data
        this.transfers.delete(transferId);
        
        // Hide transfer section if no more transfers
        if (this.transferList.children.length === 0) {
            this.transferSection.style.display = 'none';
        }
        
        // Send abort message if connected
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.sendMessage({
                kind: 'file-abort',
                transferId: transferId,
                reason: 'Cancelled by user'
            });
        }
    }

    completeFileTransfer(transferId) {
        this.transfers.delete(transferId);
        console.log('Transfer completed:', transferId);
    }

    async copyToClipboard(type) {
        let button, content;
        
        switch (type) {
            case 'offer':
                button = this.copyOfferBtn;
                content = this.offerUrl ? this.offerUrl.value : button.getAttribute('data-content');
                break;
            case 'answer':
                button = this.copyAnswerBtn;
                content = this.answerText.value;
                break;
            case 'otp':
                button = this.copyOtpBtn;
                content = this.currentOtpCode;
                break;
            case 'final-otp':
                button = this.copyFinalOtpBtn;
                content = this.currentAnswerOtp;
                break;
            default:
                console.error('Unknown copy type:', type);
                return;
        }

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(content);
                this.showCopyFeedback(button);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = content;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.showCopyFeedback(button);
            }
        } catch (err) {
            console.error('Copy failed:', err);
            alert('Copy failed. Please copy manually.');
        }
    }

    showCopyFeedback(button) {
        const originalText = button.textContent;
        button.classList.add('copied');
        button.textContent = 'Copied!';
        
        setTimeout(() => {
            button.classList.remove('copied');
            button.textContent = originalText;
        }, 2000);
    }

    showSessionUI(title) {
        this.sessionTitle.textContent = title;
        this.sessionSection.style.display = 'block';
        
        // Hide connection setup when session starts
        this.connectionSetupSection.style.display = 'none';
        
        // Show and update progress tracker
        this.showProgressTracker();
        
        // Hide elements initially
        this.qrDisplay.style.display = 'none';
        this.manualExchange.style.display = 'none';
        this.answerDisplay.style.display = 'none';
        this.waitingResponse.style.display = 'none';
        this.copyOfferBtn.style.display = 'none';
    }

    updateStatus(message, type = 'normal') {
        this.statusText.textContent = message;
        this.connectionStatus.className = `status-display ${type}`;
    }

    cancelSession() {
        this.disconnect();
    }

    disconnect() {
        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }
        
        if (this.dataChannel) {
            this.dataChannel = null;
        }
        
        this.transfers.clear();
        this.resetUI();
        this.updateStatus('Ready to connect', 'normal');
    }

    resetUI() {
        this.connectionState = 'disconnected';
        this.sessionSection.style.display = 'none';
        this.communicationSection.style.display = 'none';
        this.otpConnectionSection.style.display = 'none'; // Hide OTP section
        this.connectionSetupSection.style.display = 'block'; // Show connection options again
        this.hideProgressTracker(); // Hide progress tracker when disconnecting
        this.isInitiator = false;
        
        // Clear OTP data
        this.currentOtpCode = null;
        this.currentAnswerOtp = null;
        
        // Clear form fields
        this.offerAnswerInput.value = '';
        this.answerText.value = '';
        this.responseInput.value = '';
        this.clipboardInput.value = '';
        this.otpJoinInput.value = '';
        this.otpAnswerInput.value = '';
        
        // Clear message feed
        this.messageFeed.innerHTML = '';
    }

    showProgressTracker() {
        this.progressTracker.style.display = 'block';
        // Start with share step active
        this.updateProgress('share');
    }

    hideProgressTracker() {
        this.progressTracker.style.display = 'none';
        // Reset progress
        this.resetProgress();
    }

    updateProgress(step) {
        const steps = ['share', 'connect', 'answer', 'connected'];
        const currentStepIndex = steps.indexOf(step);
        
        if (currentStepIndex === -1) return;
        
        // Update step classes
        const stepElements = this.progressTracker.querySelectorAll('.progress-step');
        stepElements.forEach((element, index) => {
            element.classList.remove('active', 'completed');
            
            if (index < currentStepIndex) {
                element.classList.add('completed');
            } else if (index === currentStepIndex) {
                element.classList.add('active');
            }
        });
        
        // Update progress bar fill
        const progressPercentage = ((currentStepIndex + 1) / steps.length) * 100;
        this.progressFill.style.width = `${progressPercentage}%`;
        
        // Make progress bar green when connected
        if (step === 'connected') {
            this.progressFill.style.background = '#16a34a';
        } else {
            this.progressFill.style.background = 'linear-gradient(90deg, var(--primary-color), var(--success-color))';
        }
    }

    resetProgress() {
        const stepElements = this.progressTracker.querySelectorAll('.progress-step');
        stepElements.forEach(element => {
            element.classList.remove('active', 'completed');
        });
        this.progressFill.style.width = '0%';
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing Clipboard Transfer');
    console.log('Current URL:', window.location.href);
    console.log('Current hash:', window.location.hash);
    
    window.clipboardTransfer = new ClipboardTransfer();
    
    // Also check for hash changes (in case the page was loaded with a hash)
    window.addEventListener('hashchange', () => {
        console.log('Hash changed:', window.location.hash);
        if (window.clipboardTransfer && window.clipboardTransfer.connectionState === 'disconnected') {
            window.clipboardTransfer.checkForOfferInUrl();
        }
    });
});