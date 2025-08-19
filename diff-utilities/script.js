// Tab functionality
document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });

    // Theme toggle functionality
    const themeToggle = document.getElementById('themeToggle');
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const theme = document.documentElement.getAttribute('data-theme');
            const newTheme = theme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }

    // Text diff functionality
    document.getElementById('compareText').addEventListener('click', compareText);
    document.getElementById('clearText').addEventListener('click', clearText);

    // JSON diff functionality
    document.getElementById('compareJSON').addEventListener('click', compareJSON);
    document.getElementById('clearJSON').addEventListener('click', clearJSON);
    document.getElementById('formatJSON').addEventListener('click', formatJSON);

    // CSS diff functionality
    document.getElementById('compareCSS').addEventListener('click', compareCSS);
    document.getElementById('clearCSS').addEventListener('click', clearCSS);

    // Array diff functionality
    document.getElementById('compareArray').addEventListener('click', compareArray);
    document.getElementById('clearArray').addEventListener('click', clearArray);
    document.getElementById('formatArray').addEventListener('click', formatArray);
});

function compareText() {
    const text1 = document.getElementById('text1').value;
    const text2 = document.getElementById('text2').value;
    const ignoreWhitespace = document.getElementById('ignoreWhitespace').checked;
    const ignoreCase = document.getElementById('ignoreCase').checked;
    const resultDiv = document.getElementById('textDiffResult');

    if (!text1 && !text2) {
        resultDiv.innerHTML = '<div class="json-error">Please enter text in both fields to compare.</div>';
        return;
    }

    let processedText1 = text1;
    let processedText2 = text2;

    if (ignoreCase) {
        processedText1 = text1.toLowerCase();
        processedText2 = text2.toLowerCase();
    }

    if (ignoreWhitespace) {
        processedText1 = processedText1.replace(/\s+/g, ' ').trim();
        processedText2 = processedText2.replace(/\s+/g, ' ').trim();
    }

    // Use line-based diff for side-by-side comparison
    const diff = Diff.diffLines(processedText1, processedText2);
    
    generateSideBySideDiff(diff, text1, text2, resultDiv, 'Original Text', 'Modified Text');
}

function clearText() {
    document.getElementById('text1').value = '';
    document.getElementById('text2').value = '';
    document.getElementById('textDiffResult').innerHTML = '';
}

function compareJSON() {
    const json1Text = document.getElementById('json1').value;
    const json2Text = document.getElementById('json2').value;
    const resultDiv = document.getElementById('jsonDiffResult');

    if (!json1Text && !json2Text) {
        resultDiv.innerHTML = '<div class="json-error">Please enter JSON in both fields to compare.</div>';
        return;
    }

    try {
        // Parse JSON objects for comparison
        const obj1 = json1Text ? JSON.parse(json1Text) : {};
        const obj2 = json2Text ? JSON.parse(json2Text) : {};
        
        // Use diffJson which handles object property ordering automatically
        const diff = Diff.diffJson(obj1, obj2);
        
        // Get formatted versions for display
        const formatted1 = JSON.stringify(obj1, null, 2);
        const formatted2 = JSON.stringify(obj2, null, 2);
        
        generateSideBySideDiff(diff, formatted1, formatted2, resultDiv, 'Original JSON', 'Modified JSON');

    } catch (error) {
        let errorMessage = 'Invalid JSON format. ';
        
        // Try to identify which JSON is invalid
        try {
            JSON.parse(json1Text);
        } catch (e1) {
            errorMessage += 'Error in original JSON: ' + e1.message + ' ';
        }
        
        try {
            JSON.parse(json2Text);
        } catch (e2) {
            errorMessage += 'Error in modified JSON: ' + e2.message;
        }

        resultDiv.innerHTML = `<div class="json-error">${errorMessage}</div>`;
    }
}

function clearJSON() {
    document.getElementById('json1').value = '';
    document.getElementById('json2').value = '';
    document.getElementById('jsonDiffResult').innerHTML = '';
}

function formatJSON() {
    const json1Input = document.getElementById('json1');
    const json2Input = document.getElementById('json2');

    try {
        if (json1Input.value.trim()) {
            const obj1 = JSON.parse(json1Input.value);
            json1Input.value = JSON.stringify(obj1, null, 2);
        }
    } catch (error) {
        // Silently ignore formatting errors for first JSON
    }

    try {
        if (json2Input.value.trim()) {
            const obj2 = JSON.parse(json2Input.value);
            json2Input.value = JSON.stringify(obj2, null, 2);
        }
    } catch (error) {
        // Silently ignore formatting errors for second JSON
    }
}

function compareCSS() {
    const css1 = document.getElementById('css1').value;
    const css2 = document.getElementById('css2').value;
    const resultDiv = document.getElementById('cssDiffResult');

    if (!css1 && !css2) {
        resultDiv.innerHTML = '<div class="json-error">Please enter CSS in both fields to compare.</div>';
        return;
    }

    // Use CSS-specific diff which understands CSS syntax
    const diff = Diff.diffCss(css1, css2);
    
    generateSideBySideDiff(diff, css1, css2, resultDiv, 'Original CSS', 'Modified CSS');
}

function clearCSS() {
    document.getElementById('css1').value = '';
    document.getElementById('css2').value = '';
    document.getElementById('cssDiffResult').innerHTML = '';
}

function compareArray() {
    const array1Text = document.getElementById('array1').value;
    const array2Text = document.getElementById('array2').value;
    const resultDiv = document.getElementById('arrayDiffResult');

    if (!array1Text && !array2Text) {
        resultDiv.innerHTML = '<div class="json-error">Please enter arrays in both fields to compare.</div>';
        return;
    }

    try {
        // Parse arrays from JSON
        const arr1 = array1Text.trim() ? JSON.parse(array1Text) : [];
        const arr2 = array2Text.trim() ? JSON.parse(array2Text) : [];
        
        // Validate that inputs are arrays
        if (!Array.isArray(arr1) || !Array.isArray(arr2)) {
            resultDiv.innerHTML = '<div class="json-error">Both inputs must be valid JSON arrays.</div>';
            return;
        }

        // Use line-based diff for arrays (convert to formatted strings first)
        const formatted1 = JSON.stringify(arr1, null, 2);
        const formatted2 = JSON.stringify(arr2, null, 2);
        
        // Use line-based diff for better visual comparison
        const diff = Diff.diffLines(formatted1, formatted2);
        
        generateSideBySideDiff(diff, formatted1, formatted2, resultDiv, 'Original Array', 'Modified Array');

    } catch (error) {
        let errorMessage = 'Invalid JSON array format. ';
        
        // Try to identify which array is invalid
        try {
            if (array1Text.trim()) {
                const test1 = JSON.parse(array1Text);
                if (!Array.isArray(test1)) {
                    errorMessage += 'Original input is not an array. ';
                }
            }
        } catch (e1) {
            errorMessage += 'Error in original array: ' + e1.message + ' ';
        }
        
        try {
            if (array2Text.trim()) {
                const test2 = JSON.parse(array2Text);
                if (!Array.isArray(test2)) {
                    errorMessage += 'Modified input is not an array.';
                }
            }
        } catch (e2) {
            errorMessage += 'Error in modified array: ' + e2.message;
        }


        resultDiv.innerHTML = `<div class="json-error">${errorMessage}</div>`;
    }
}

function clearArray() {
    document.getElementById('array1').value = '';
    document.getElementById('array2').value = '';
    document.getElementById('arrayDiffResult').innerHTML = '';
}

function formatArray() {
    const array1Input = document.getElementById('array1');
    const array2Input = document.getElementById('array2');

    try {
        if (array1Input.value.trim()) {
            const arr1 = JSON.parse(array1Input.value);
            if (Array.isArray(arr1)) {
                array1Input.value = JSON.stringify(arr1, null, 2);
            }
        }
    } catch (error) {
        // Silently ignore formatting errors for first array
    }

    try {
        if (array2Input.value.trim()) {
            const arr2 = JSON.parse(array2Input.value);
            if (Array.isArray(arr2)) {
                array2Input.value = JSON.stringify(arr2, null, 2);
            }
        }
    } catch (error) {
        // Silently ignore formatting errors for second array
    }
}

function generateSideBySideDiff(diff, originalText, modifiedText, resultDiv, leftHeader, rightHeader) {
    const originalLines = originalText.split('\n');
    const modifiedLines = modifiedText.split('\n');
    
    let leftContent = '';
    let rightContent = '';
    let leftLineNum = 1;
    let rightLineNum = 1;
    
    diff.forEach(part => {
        const lines = part.value.split('\n');
        
        // Remove the last empty line if it exists (from split)
        if (lines[lines.length - 1] === '') {
            lines.pop();
        }
        
        if (part.removed) {
            // Show removed lines only on the left side
            lines.forEach(line => {
                leftContent += `<div class="diff-line diff-line-removed">
                    <span class="diff-line-number">${leftLineNum}</span>
                    <span class="diff-line-content">${escapeHtml(line)}</span>
                </div>`;
                leftLineNum++;
                
                // Add empty line on the right to maintain alignment
                rightContent += `<div class="diff-line diff-line-empty">
                    <span class="diff-line-number"></span>
                    <span class="diff-line-content"></span>
                </div>`;
            });
        } else if (part.added) {
            // Show added lines only on the right side
            lines.forEach(line => {
                rightContent += `<div class="diff-line diff-line-added">
                    <span class="diff-line-number">${rightLineNum}</span>
                    <span class="diff-line-content">${escapeHtml(line)}</span>
                </div>`;
                rightLineNum++;
                
                // Add empty line on the left to maintain alignment
                leftContent += `<div class="diff-line diff-line-empty">
                    <span class="diff-line-number"></span>
                    <span class="diff-line-content"></span>
                </div>`;
            });
        } else {
            // Show unchanged lines on both sides
            lines.forEach(line => {
                leftContent += `<div class="diff-line diff-line-unchanged">
                    <span class="diff-line-number">${leftLineNum}</span>
                    <span class="diff-line-content">${escapeHtml(line)}</span>
                </div>`;
                leftLineNum++;
                
                rightContent += `<div class="diff-line diff-line-unchanged">
                    <span class="diff-line-number">${rightLineNum}</span>
                    <span class="diff-line-content">${escapeHtml(line)}</span>
                </div>`;
                rightLineNum++;
            });
        }
    });
    
    if (!leftContent && !rightContent) {
        resultDiv.innerHTML = '<div style="color: var(--text-secondary); padding: 1rem;">No differences found.</div>';
        return;
    }
    
    resultDiv.innerHTML = `
        <div class="diff-container-side-by-side">
            <div class="diff-panel">
                <div class="diff-panel-header">${leftHeader}</div>
                <div class="diff-panel-content">${leftContent}</div>
            </div>
            <div class="diff-panel">
                <div class="diff-panel-header">${rightHeader}</div>
                <div class="diff-panel-content">${rightContent}</div>
            </div>
        </div>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}