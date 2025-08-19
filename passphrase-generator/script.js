class PassphraseGenerator {
    constructor() {
        this.initializeWordLists();
        this.initializeElements();
        this.attachEventListeners();
        this.checkLibrarySupport();
        this.loadPreferences();
    }

    initializeWordLists() {
        // No longer needed - passhelp handles word generation internally
    }

    initializeElements() {
        // Type selection
        this.humanType = document.getElementById('humanType');
        this.secureType = document.getElementById('secureType');
        
        // Options containers
        this.humanOptions = document.getElementById('humanOptions');
        this.secureOptions = document.getElementById('secureOptions');
        
        // Human readable controls
        this.humanCount = document.getElementById('humanCount');
        this.separator = document.getElementById('separator');
        this.caseOption = document.getElementById('caseOption');
        this.includeAdverb = document.getElementById('includeAdverb');
        this.addNumbers = document.getElementById('addNumbers');
        this.addSymbols = document.getElementById('addSymbols');
        this.enhancementPosition = document.getElementById('enhancementPosition');
        
        // Secure random controls
        this.secureCount = document.getElementById('secureCount');
        this.passwordLength = document.getElementById('passwordLength');
        this.lengthValue = document.getElementById('lengthValue');
        this.includeUppercase = document.getElementById('includeUppercase');
        this.includeLowercase = document.getElementById('includeLowercase');
        this.includeNumbers = document.getElementById('includeNumbers');
        this.includeSymbols = document.getElementById('includeSymbols');
        this.avoidAmbiguous = document.getElementById('avoidAmbiguous');
        
        // Action buttons and results
        this.generateBtn = document.getElementById('generateBtn');
        this.passphraseResults = document.getElementById('passphraseResults');
        this.copyAllBtn = document.getElementById('copyAllBtn');
        this.clearBtn = document.getElementById('clearBtn');
        
        this.generatedPassphrases = [];
    }

    attachEventListeners() {
        // Type selection
        this.humanType.addEventListener('change', () => this.toggleOptions());
        this.secureType.addEventListener('change', () => this.toggleOptions());
        
        // Enhancement options
        this.addNumbers.addEventListener('change', () => this.toggleEnhancementPosition());
        this.addSymbols.addEventListener('change', () => this.toggleEnhancementPosition());
        
        // Password length slider
        this.passwordLength.addEventListener('input', (e) => {
            this.lengthValue.textContent = e.target.value;
        });
        
        // Generate button
        this.generateBtn.addEventListener('click', () => this.generatePassphrases());
        
        // Action buttons
        this.copyAllBtn.addEventListener('click', () => this.copyAllPassphrases());
        this.clearBtn.addEventListener('click', () => this.clearResults());
        
        // Enter key support
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.target.matches('textarea')) {
                this.generatePassphrases();
            }
        });
        
        // Save preferences on change
        this.attachPreferenceListeners();
    }

    attachPreferenceListeners() {
        const elements = [
            this.humanType, this.secureType, this.separator, this.caseOption,
            this.includeAdverb, this.addNumbers, this.addSymbols, this.enhancementPosition,
            this.passwordLength, this.includeUppercase, this.includeLowercase,
            this.includeNumbers, this.includeSymbols, this.avoidAmbiguous
        ];
        
        elements.forEach(element => {
            element.addEventListener('change', () => this.savePreferences());
        });
    }

    checkLibrarySupport() {
        let missingLibraries = [];
        
        // Check passhelp library
        if (typeof passhelp === 'undefined') {
            missingLibraries.push('passhelp');
        }
        
        if (missingLibraries.length > 0) {
            this.showError(`Failed to load required libraries: ${missingLibraries.join(', ')}. Please refresh the page.`);
            this.generateBtn.disabled = true;
        }
    }

    toggleOptions() {
        if (this.humanType.checked) {
            this.humanOptions.style.display = 'block';
            this.secureOptions.style.display = 'none';
        } else {
            this.humanOptions.style.display = 'none';
            this.secureOptions.style.display = 'block';
        }
        this.savePreferences();
    }

    toggleEnhancementPosition() {
        const hasEnhancements = this.addNumbers.checked || this.addSymbols.checked;
        this.enhancementPosition.disabled = !hasEnhancements;
    }

    generatePassphrases() {
        try {
            this.clearError();
            this.setLoading(true);
            
            if (this.humanType.checked) {
                this.generateHumanReadable();
            } else {
                this.generateSecureRandom();
            }
            
            this.displayResults();
            
        } catch (error) {
            this.showError(`Generation failed: ${error.message}`);
        } finally {
            this.setLoading(false);
        }
    }

    generateHumanReadable() {
        const count = Math.max(1, Math.min(20, parseInt(this.humanCount.value) || 1));
        const separator = this.separator.value;
        const caseOption = this.caseOption.value;
        
        this.generatedPassphrases = [];
        
        for (let i = 0; i < count; i++) {
            // Generate a human-readable passphrase using our word lists
            let passphrase = this.createHumanReadablePhrase(separator, caseOption);
            
            // Add enhancements
            passphrase = this.addEnhancements(passphrase);
            
            this.generatedPassphrases.push(passphrase);
        }
    }
    
    createHumanReadablePhrase(separator, caseOption) {
        // Use passhelp to generate a 3-word passphrase
        const wordCount = this.includeAdverb.checked ? 4 : 3;
        const useEnhancements = false; // We'll add enhancements separately
        
        // Handle separator: for "None", we need to generate with a temp separator then remove it
        let sep;
        if (separator === '') {
            // When user selects "None", use a simple temp separator that we'll remove later
            sep = '~';
        } else {
            sep = separator;
        }
        
        let phrase = passhelp.phrase(wordCount, useEnhancements, sep);
        
        // Apply case transformation if needed (before removing temp separator)
        switch (caseOption) {
            case 'uppercase':
                phrase = phrase.toUpperCase();
                break;
            case 'lowercase':
                phrase = phrase.toLowerCase();
                break;
            case 'capitalize':
                // Capitalize first letter of each word
                const actualSeparator = separator === '' ? '~' : separator;
                phrase = phrase.split(actualSeparator).map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                ).join(actualSeparator);
                break;
            default:
                break;
        }
        
        // If we used a temp separator, remove it to get concatenated words
        if (separator === '') {
            phrase = phrase.replace(/~/g, '');
        }
        
        return phrase;
    }
    
    getRandomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    addEnhancements(passphrase) {
        const position = this.enhancementPosition.value;
        
        if (position === 'sprinkle') {
            return this.sprinkleEnhancements(passphrase);
        }
        
        // Traditional enhancement placement - but distributed at word boundaries
        let numbersToAdd = [];
        let symbolsToAdd = [];
        
        if (this.addNumbers.checked) {
            // Generate individual digits to distribute
            const numDigits = Math.floor(Math.random() * 3) + 2; // 2-4 digits total
            for (let i = 0; i < numDigits; i++) {
                numbersToAdd.push(Math.floor(Math.random() * 10).toString());
            }
        }
        
        if (this.addSymbols.checked) {
            const symbolChars = '!@#$%&*';
            const numSymbols = Math.floor(Math.random() * 2) + 1; // 1-2 symbols total
            for (let i = 0; i < numSymbols; i++) {
                symbolsToAdd.push(symbolChars[Math.floor(Math.random() * symbolChars.length)]);
            }
        }
        
        const allEnhancements = [...numbersToAdd, ...symbolsToAdd];
        if (allEnhancements.length === 0) return passphrase;
        
        const separator = this.separator.value;
        
        // Use the same smart approach as sprinkle, but constrain to specific regions
        if (separator) {
            return this.placeEnhancementsWithSeparators(passphrase, separator, allEnhancements, position);
        } else {
            return this.placeEnhancementsNaturally(passphrase, allEnhancements, position);
        }
    }
    
    sprinkleEnhancements(passphrase) {
        const separator = this.separator.value;
        
        // Create arrays of numbers and symbols to sprinkle
        let numbersToAdd = [];
        let symbolsToAdd = [];
        
        if (this.addNumbers.checked) {
            // Generate individual digits to sprinkle
            const numDigits = Math.floor(Math.random() * 3) + 2; // 2-4 digits total
            for (let i = 0; i < numDigits; i++) {
                numbersToAdd.push(Math.floor(Math.random() * 10).toString());
            }
        }
        
        if (this.addSymbols.checked) {
            const symbolChars = '!@#$%&*';
            const numSymbols = Math.floor(Math.random() * 2) + 1; // 1-2 symbols total
            for (let i = 0; i < numSymbols; i++) {
                symbolsToAdd.push(symbolChars[Math.floor(Math.random() * symbolChars.length)]);
            }
        }
        
        // Combine all enhancements
        const allEnhancements = [...numbersToAdd, ...symbolsToAdd];
        if (allEnhancements.length === 0) return passphrase;
        
        // Smart replacement approach
        if (separator) {
            // Replace separators with random choice between enhancement, separator, or both
            return this.replaceSeparatorsWithEnhancements(passphrase, separator, allEnhancements);
        } else {
            // For no separator case, we used temp separator during generation and removed it
            // Add enhancements at random positions, but intelligently
            return this.distributeEnhancementsRandomly(passphrase, allEnhancements);
        }
    }
    
    replaceSeparatorsWithEnhancements(passphrase, separator, enhancements) {
        const parts = passphrase.split(separator);
        const result = [parts[0]]; // Start with first word
        
        for (let i = 1; i < parts.length; i++) {
            // For each separator position, randomly choose what to put there
            const rand = Math.random();
            
            if (enhancements.length > 0 && rand < 0.4) {
                // 40% chance: use enhancement only
                result.push(enhancements.shift());
            } else if (enhancements.length > 0 && rand < 0.7) {
                // 30% chance: use enhancement + separator
                result.push(enhancements.shift() + separator);
            } else if (enhancements.length > 0 && rand < 0.9) {
                // 20% chance: use separator + enhancement
                result.push(separator + enhancements.shift());
            } else {
                // 10% chance: keep original separator
                result.push(separator);
            }
            
            result.push(parts[i]); // Add the next word
        }
        
        // Add any remaining enhancements to the end
        if (enhancements.length > 0) {
            result.push(enhancements.join(''));
        }
        
        return result.join('');
    }
    
    distributeEnhancementsRandomly(passphrase, enhancements) {
        let enhanced = passphrase;
        
        // Add enhancements at word boundaries (we can detect these from case changes or just distribute)
        const positions = [0]; // Start
        
        // Find case change positions for word boundaries
        for (let i = 1; i < passphrase.length; i++) {
            const current = passphrase[i];
            const previous = passphrase[i - 1];
            
            // Detect word boundary by case change (works for capitalize mode)
            if (current >= 'A' && current <= 'Z' && previous >= 'a' && previous <= 'z') {
                positions.push(i);
            }
        }
        
        positions.push(passphrase.length); // End
        
        // Shuffle positions and use them
        const shuffledPositions = [...positions].sort(() => Math.random() - 0.5);
        let offset = 0;
        
        for (let i = 0; i < Math.min(enhancements.length, shuffledPositions.length); i++) {
            const enhancement = enhancements[i];
            const pos = shuffledPositions[i] + offset;
            enhanced = enhanced.slice(0, pos) + enhancement + enhanced.slice(pos);
            offset += enhancement.length;
        }
        
        // Add remaining enhancements to end
        const remaining = enhancements.slice(shuffledPositions.length);
        if (remaining.length > 0) {
            enhanced += remaining.join('');
        }
        
        return enhanced;
    }
    
    placeEnhancementsWithSeparators(passphrase, separator, enhancements, position) {
        const parts = passphrase.split(separator);
        const result = [parts[0]]; // Start with first word
        
        // Determine which separator positions to target based on position
        const separatorPositions = [];
        for (let i = 1; i < parts.length; i++) {
            separatorPositions.push(i);
        }
        
        let targetPositions = [];
        switch (position) {
            case 'beginning':
                // Use first third of separators
                const beginCount = Math.max(1, Math.ceil(separatorPositions.length / 3));
                targetPositions = separatorPositions.slice(0, beginCount);
                break;
            case 'middle':
                // Use middle third of separators
                const startIdx = Math.floor(separatorPositions.length / 3);
                const endIdx = Math.floor(2 * separatorPositions.length / 3);
                targetPositions = separatorPositions.slice(startIdx, Math.max(startIdx + 1, endIdx));
                break;
            case 'end':
                // Use last third of separators
                const endCount = Math.max(1, Math.ceil(separatorPositions.length / 3));
                targetPositions = separatorPositions.slice(-endCount);
                break;
        }
        
        // Build result with enhancements at target positions
        let enhancementIndex = 0;
        for (let i = 1; i < parts.length; i++) {
            if (targetPositions.includes(i) && enhancementIndex < enhancements.length) {
                // Use enhancement at this separator position
                const rand = Math.random();
                if (rand < 0.5) {
                    result.push(enhancements[enhancementIndex++]);
                } else {
                    result.push(enhancements[enhancementIndex++] + separator);
                }
            } else {
                // Keep original separator
                result.push(separator);
            }
            result.push(parts[i]);
        }
        
        // Add any remaining enhancements based on position
        if (enhancementIndex < enhancements.length) {
            const remaining = enhancements.slice(enhancementIndex);
            if (position === 'beginning') {
                return remaining.join('') + result.join('');
            } else {
                return result.join('') + remaining.join('');
            }
        }
        
        return result.join('');
    }
    
    placeEnhancementsNaturally(passphrase, enhancements, position) {
        // For no-separator case, find word boundaries by case changes
        const positions = [0]; // Start
        
        // Find case change positions for word boundaries
        for (let i = 1; i < passphrase.length; i++) {
            const current = passphrase[i];
            const previous = passphrase[i - 1];
            
            // Detect word boundary by case change
            if (current >= 'A' && current <= 'Z' && previous >= 'a' && previous <= 'z') {
                positions.push(i);
            }
        }
        
        positions.push(passphrase.length); // End
        
        // Select target positions based on position preference
        let targetPositions = [];
        switch (position) {
            case 'beginning':
                const beginCount = Math.max(1, Math.ceil(positions.length / 3));
                targetPositions = positions.slice(0, beginCount);
                break;
            case 'middle':
                const startIdx = Math.floor(positions.length / 3);
                const endIdx = Math.floor(2 * positions.length / 3);
                targetPositions = positions.slice(startIdx, Math.max(startIdx + 1, endIdx));
                break;
            case 'end':
                const endCount = Math.max(1, Math.ceil(positions.length / 3));
                targetPositions = positions.slice(-endCount);
                break;
        }
        
        // Place enhancements at target positions
        let enhanced = passphrase;
        let offset = 0;
        
        for (let i = 0; i < Math.min(enhancements.length, targetPositions.length); i++) {
            const enhancement = enhancements[i];
            const pos = targetPositions[i] + offset;
            enhanced = enhanced.slice(0, pos) + enhancement + enhanced.slice(pos);
            offset += enhancement.length;
        }
        
        // Add remaining enhancements
        const remaining = enhancements.slice(targetPositions.length);
        if (remaining.length > 0) {
            if (position === 'beginning') {
                enhanced = remaining.join('') + enhanced;
            } else {
                enhanced += remaining.join('');
            }
        }
        
        return enhanced;
    }
    
    placeAtBoundaries(passphrase, enhancements, boundaries, position) {
        if (boundaries.length === 0 || enhancements.length === 0) {
            return passphrase + enhancements.join('');
        }
        
        let targetBoundaries = [];
        
        switch (position) {
            case 'beginning':
                // Use boundaries in the first third of the phrase
                const firstThirdEnd = Math.floor(boundaries.length / 3);
                targetBoundaries = boundaries.slice(0, Math.max(1, firstThirdEnd));
                break;
                
            case 'middle':
                // Use boundaries in the middle third
                const middleStart = Math.floor(boundaries.length / 3);
                const middleEnd = Math.floor(2 * boundaries.length / 3);
                targetBoundaries = boundaries.slice(middleStart, Math.max(middleStart + 1, middleEnd));
                break;
                
            case 'end':
                // Use boundaries in the last third of the phrase
                const lastThirdStart = Math.floor(2 * boundaries.length / 3);
                targetBoundaries = boundaries.slice(Math.max(0, lastThirdStart));
                break;
        }
        
        // If no suitable boundaries found, fall back to simple placement
        if (targetBoundaries.length === 0) {
            switch (position) {
                case 'beginning':
                    return enhancements.join('') + passphrase;
                case 'middle':
                    const mid = Math.floor(passphrase.length / 2);
                    return passphrase.slice(0, mid) + enhancements.join('') + passphrase.slice(mid);
                case 'end':
                default:
                    return passphrase + enhancements.join('');
            }
        }
        
        // Distribute enhancements across the target boundaries
        let enhanced = passphrase;
        let offset = 0;
        
        // Sort boundaries and pick random ones from our target set
        const shuffledTargets = [...targetBoundaries].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < Math.min(enhancements.length, shuffledTargets.length); i++) {
            const enhancement = enhancements[i];
            const boundaryPos = shuffledTargets[i] + offset;
            
            enhanced = enhanced.slice(0, boundaryPos) + enhancement + enhanced.slice(boundaryPos);
            offset += enhancement.length;
        }
        
        // If we have remaining enhancements, place them at the last boundary
        const remainingEnhancements = enhancements.slice(shuffledTargets.length);
        if (remainingEnhancements.length > 0) {
            if (position === 'beginning') {
                enhanced = remainingEnhancements.join('') + enhanced;
            } else {
                enhanced += remainingEnhancements.join('');
            }
        }
        
        return enhanced;
    }
    
    findWordBoundaries(passphrase, separator, caseOption) {
        const boundaries = [];
        
        // If we have separators, those are obvious boundaries
        if (separator) {
            for (let i = 0; i < passphrase.length; i++) {
                if (passphrase[i] === separator) {
                    // Add position before and after separator
                    boundaries.push(i);
                    boundaries.push(i + 1);
                }
            }
        } else {
            // No separator - we need to calculate word boundaries based on our known word structure
            // We know we have 3 words: adjective, noun, verb
            // We need to find where these words start and end
            
            if (caseOption === 'capitalize') {
                // Find uppercase letters (except the first character) - these mark word starts
                for (let i = 1; i < passphrase.length; i++) {
                    if (passphrase[i] >= 'A' && passphrase[i] <= 'Z') {
                        boundaries.push(i); // Insert before the uppercase letter
                    }
                }
            } else {
                // For lowercase/uppercase, we need to calculate word boundaries
                // Since we can't rely on case changes, we'll use the original word lengths
                const wordBoundaries = this.calculateWordBoundaries();
                boundaries.push(...wordBoundaries);
            }
        }
        
        // Always include start and end as potential boundaries
        boundaries.push(0); // Beginning
        boundaries.push(passphrase.length); // End
        
        // Remove duplicates and sort
        return [...new Set(boundaries)].sort((a, b) => a - b);
    }
    
    calculateWordBoundaries() {
        // We know our structure is always: adjective + noun + verb
        // We need to get the lengths to calculate boundaries
        // This is a bit of a hack, but we'll store the last generated words
        if (this.lastGeneratedWords && this.lastGeneratedWords.length === 3) {
            const boundaries = [];
            let position = 0;
            
            // After first word (adjective)
            position += this.lastGeneratedWords[0].length;
            boundaries.push(position);
            
            // After second word (noun) 
            position += this.lastGeneratedWords[1].length;
            boundaries.push(position);
            
            // The third word (verb) ends at the end, which we add separately
            
            return boundaries;
        }
        
        // Fallback: no internal boundaries, only start and end
        return [];
    }

    generateSecureRandom() {
        const count = Math.max(1, Math.min(20, parseInt(this.secureCount.value) || 1));
        const length = parseInt(this.passwordLength.value);
        
        // Determine which alphabet to use based on user selections
        let alphabet;
        
        const hasUppercase = this.includeUppercase.checked;
        const hasLowercase = this.includeLowercase.checked;
        const hasNumbers = this.includeNumbers.checked;
        const hasSymbols = this.includeSymbols.checked;
        const avoidAmbiguous = this.avoidAmbiguous.checked;
        
        // Check if at least one character set is selected
        if (!hasUppercase && !hasLowercase && !hasNumbers && !hasSymbols) {
            throw new Error('Please select at least one character set');
        }
        
        // Choose the appropriate alphabet based on selections
        if (hasUppercase && hasLowercase && hasNumbers && hasSymbols) {
            alphabet = avoidAmbiguous ? passhelp.alphabets.full_friendly : passhelp.alphabets.full;
        } else if (hasUppercase && hasLowercase && hasNumbers && !hasSymbols) {
            alphabet = avoidAmbiguous ? passhelp.alphabets.alphanumeric_friendly : passhelp.alphabets.alphanumeric;
        } else if (!hasUppercase && !hasLowercase && hasNumbers && !hasSymbols) {
            alphabet = passhelp.alphabets.numeric;
        } else if (!hasUppercase && !hasLowercase && hasNumbers && !hasSymbols) {
            alphabet = passhelp.alphabets.hex;
        } else {
            // Custom alphabet for other combinations
            alphabet = '';
            if (hasUppercase) alphabet += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            if (hasLowercase) alphabet += 'abcdefghijklmnopqrstuvwxyz';
            if (hasNumbers) alphabet += '0123456789';
            if (hasSymbols) alphabet += '!@#$%^&*()_+-=[]{}|;:,.<>?';
            
            if (avoidAmbiguous) {
                const ambiguous = '0Ol1Il|';
                alphabet = alphabet.split('').filter(char => !ambiguous.includes(char)).join('');
            }
        }
        
        this.generatedPassphrases = [];
        
        for (let i = 0; i < count; i++) {
            const password = passhelp.character(length, alphabet, true); // true for diversity
            this.generatedPassphrases.push(password);
        }
    }

    displayResults() {
        if (this.generatedPassphrases.length === 0) {
            this.passphraseResults.innerHTML = '<div class="placeholder-message">No passphrases generated</div>';
            this.copyAllBtn.style.display = 'none';
            this.clearBtn.style.display = 'none';
            return;
        }
        
        const resultsHTML = this.generatedPassphrases.map((passphrase, index) => `
            <div class="passphrase-item">
                <span class="passphrase-text">${this.escapeHtml(passphrase)}</span>
                <button class="btn-copy-individual" onclick="passphraseGenerator.copyIndividual(${index})">Copy</button>
            </div>
        `).join('');
        
        this.passphraseResults.innerHTML = resultsHTML;
        this.copyAllBtn.style.display = 'inline-block';
        this.clearBtn.style.display = 'inline-block';
    }

    copyIndividual(index) {
        const passphrase = this.generatedPassphrases[index];
        const button = document.querySelectorAll('.btn-copy-individual')[index];
        
        this.copyToClipboard(passphrase).then(() => {
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            button.classList.add('copied');
            
            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('copied');
            }, 2000);
        });
    }

    copyAllPassphrases() {
        const allPassphrases = this.generatedPassphrases.join('\n');
        
        this.copyToClipboard(allPassphrases).then(() => {
            const originalText = this.copyAllBtn.textContent;
            this.copyAllBtn.textContent = 'Copied!';
            
            setTimeout(() => {
                this.copyAllBtn.textContent = originalText;
            }, 2000);
        });
    }

    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            throw new Error('Failed to copy to clipboard');
        }
    }

    clearResults() {
        this.generatedPassphrases = [];
        this.passphraseResults.innerHTML = '<div class="placeholder-message">Select your options and click "Generate Passphrases" to create secure passphrases</div>';
        this.copyAllBtn.style.display = 'none';
        this.clearBtn.style.display = 'none';
    }

    setLoading(loading) {
        if (loading) {
            this.generateBtn.disabled = true;
            this.generateBtn.textContent = 'Generating...';
            document.body.classList.add('loading');
        } else {
            this.generateBtn.disabled = false;
            this.generateBtn.textContent = 'Generate Passphrases';
            document.body.classList.remove('loading');
        }
    }

    showError(message) {
        this.clearError();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        this.passphraseResults.parentNode.insertBefore(errorDiv, this.passphraseResults);
    }

    clearError() {
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    savePreferences() {
        const preferences = {
            passphraseType: this.humanType.checked ? 'human' : 'secure',
            separator: this.separator.value,
            caseOption: this.caseOption.value,
            includeAdverb: this.includeAdverb.checked,
            addNumbers: this.addNumbers.checked,
            addSymbols: this.addSymbols.checked,
            enhancementPosition: this.enhancementPosition.value,
            passwordLength: this.passwordLength.value,
            includeUppercase: this.includeUppercase.checked,
            includeLowercase: this.includeLowercase.checked,
            includeNumbers: this.includeNumbers.checked,
            includeSymbols: this.includeSymbols.checked,
            avoidAmbiguous: this.avoidAmbiguous.checked
        };
        
        localStorage.setItem('passphraseGeneratorPrefs', JSON.stringify(preferences));
    }

    loadPreferences() {
        try {
            const saved = localStorage.getItem('passphraseGeneratorPrefs');
            if (!saved) return;
            
            const preferences = JSON.parse(saved);
            
            // Apply preferences
            if (preferences.passphraseType === 'secure') {
                this.secureType.checked = true;
                this.humanType.checked = false;
            } else {
                this.humanType.checked = true;
                this.secureType.checked = false;
            }
            
            this.separator.value = preferences.separator || '';
            this.caseOption.value = preferences.caseOption || 'capitalize';
            this.includeAdverb.checked = preferences.includeAdverb || false;
            this.addNumbers.checked = preferences.addNumbers || false;
            this.addSymbols.checked = preferences.addSymbols || false;
            this.enhancementPosition.value = preferences.enhancementPosition || 'sprinkle';
            this.passwordLength.value = preferences.passwordLength || 16;
            this.lengthValue.textContent = this.passwordLength.value;
            this.includeUppercase.checked = preferences.includeUppercase !== false;
            this.includeLowercase.checked = preferences.includeLowercase !== false;
            this.includeNumbers.checked = preferences.includeNumbers !== false;
            this.includeSymbols.checked = preferences.includeSymbols || false;
            this.avoidAmbiguous.checked = preferences.avoidAmbiguous || false;
            
            // Apply UI state
            this.toggleOptions();
            this.toggleEnhancementPosition();
            
        } catch (error) {
            console.warn('Failed to load preferences:', error);
        }
    }
}

// Initialize the generator when the page loads
let passphraseGenerator;

function initializeGenerator() {
    console.log('Initializing PassphraseGenerator...');
    passphraseGenerator = new PassphraseGenerator();
}

// Wait for both DOM and passhelp library to be ready
let domReady = false;
let passhelpReady = false;

function checkAndInitialize() {
    if (domReady && (passhelpReady || typeof passhelp !== 'undefined')) {
        initializeGenerator();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready');
    domReady = true;
    checkAndInitialize();
});

window.addEventListener('passhelpReady', () => {
    console.log('passhelp ready');
    passhelpReady = true;
    checkAndInitialize();
});

window.addEventListener('passhelpFailed', () => {
    console.log('passhelp failed to load, initializing anyway');
    passhelpReady = true;
    checkAndInitialize();
});