// Main Application Initialization for Browser Data Workbench

document.addEventListener('DOMContentLoaded', function() {
    console.log('Browser Data Workbench initializing...');
    
    // Check for required features
    if (!window.Worker) {
        showCompatibilityError('Web Workers are not supported in this browser');
        return;
    }
    
    if (!window.WebAssembly) {
        showCompatibilityError('WebAssembly is not supported in this browser');
        return;
    }
    
    // Initialize the application
    initializeApp();
});

function initializeApp() {
    // Set up global error handlers
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleGlobalError);
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    console.log('Browser Data Workbench initialized successfully');
}

function handleKeyboardShortcuts(e) {
    // Ctrl+O / Cmd+O to open file picker
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        const fileInput = document.querySelector('#fileInput');
        if (fileInput) {
            fileInput.click();
        }
    }
    
    // Ctrl+E / Cmd+E to focus export
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        const exportPanel = document.querySelector('bdw-export-panel');
        if (exportPanel) {
            exportPanel.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    // Ctrl+/ / Cmd+/ to toggle SQL console
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        const sqlHeader = document.querySelector('.panel h3');
        if (sqlHeader && sqlHeader.textContent.includes('SQL Console')) {
            sqlHeader.click();
        }
    }
}

function handleGlobalError(event) {
    console.error('Global error:', event.error || event.reason);
    
    // Show user-friendly error message
    const errorMessage = event.error?.message || event.reason?.message || 'An unexpected error occurred';
    showStatusMessage(errorMessage, 'error');
}

function showCompatibilityError(message) {
    const container = document.querySelector('.container main');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--error-color);">
                <h2>Compatibility Issue</h2>
                <p style="margin: 1rem 0; font-size: 1.1rem;">${message}</p>
                <p style="color: var(--text-secondary);">
                    Please use a modern browser like Chrome, Firefox, Safari, or Edge.
                </p>
            </div>
        `;
    }
}

function showStatusMessage(message, type = 'info', duration = 5000) {
    // Create or update status message
    let statusArea = document.getElementById('statusArea');
    if (!statusArea) {
        statusArea = document.createElement('div');
        statusArea.id = 'statusArea';
        document.querySelector('.container main')?.appendChild(statusArea);
    }
    
    const statusDiv = document.createElement('div');
    statusDiv.className = `status-message status-${type}`;
    statusDiv.textContent = message;
    
    statusArea.appendChild(statusDiv);
    
    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => {
            if (statusDiv.parentNode) {
                statusDiv.remove();
            }
        }, duration);
    }
    
    return statusDiv;
}

// Utility functions for data processing
const DataUtils = {
    formatFileSize(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    },

    detectDelimiter(csvText) {
        const sample = csvText.substring(0, 10000);
        const delimiters = [',', ';', '\t', '|'];
        let bestDelimiter = ',';
        let maxScore = 0;
        
        delimiters.forEach(delimiter => {
            const lines = sample.split('\n').slice(0, 10);
            if (lines.length < 2) return;
            
            const counts = lines.map(line => line.split(delimiter).length);
            const avgCount = counts.reduce((sum, count) => sum + count, 0) / counts.length;
            const consistency = counts.filter(count => count === counts[0]).length / counts.length;
            
            const score = avgCount * consistency;
            if (score > maxScore) {
                maxScore = score;
                bestDelimiter = delimiter;
            }
        });
        
        return bestDelimiter;
    },

    generateSampleData(format = 'csv', rowCount = 100) {
        const data = [];
        for (let i = 1; i <= rowCount; i++) {
            data.push({
                id: i,
                name: `Item ${i}`,
                value: Math.random() * 1000,
                category: ['A', 'B', 'C'][i % 3],
                active: i % 2 === 0
            });
        }

        switch (format) {
            case 'csv':
                const headers = Object.keys(data[0]).join(',');
                const rows = data.map(row => Object.values(row).join(','));
                return headers + '\n' + rows.join('\n');
            
            case 'json':
                return JSON.stringify(data, null, 2);
            
            case 'jsonl':
                return data.map(row => JSON.stringify(row)).join('\n');
            
            default:
                return data;
        }
    }
};

// Export utilities globally
window.DataUtils = DataUtils;
window.showStatusMessage = showStatusMessage;

// Disable service worker for now to avoid ES module conflicts
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
            registration.unregister();
            console.log('Unregistered service worker:', registration);
        }
    });
}