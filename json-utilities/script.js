// JSON Utilities Script - Simplified Version

// Get textarea element
const jsonEditor = document.getElementById("jsonEditor");

// Store original JSON for undo functionality
let originalJsonBeforeClean = null;
let originalJsonBeforeFormat = null;

// Show message
function showMessage(message, type = "info", autoHide = true) {
  const container = document.getElementById("messageContainer");
  const content = document.getElementById("messageContent");

  content.className = `message-content ${type}`;
  content.textContent = message;
  container.style.display = "block";

  // Only auto-hide success messages
  if (autoHide && type === "success") {
    setTimeout(() => {
      container.style.display = "none";
    }, 5000);
  }
}

// Hide message
function hideMessage() {
  document.getElementById("messageContainer").style.display = "none";
}

// Clear error highlighting
function clearErrorHighlight() {
  const textarea = document.getElementById("jsonEditor");
  const errorMarker = document.getElementById("errorMarker");
  
  textarea.classList.remove("has-error");
  errorMarker.style.display = "none";
}

// Highlight error in textarea with subtle visual effects
function highlightError(lineNum, colNum) {
  const textarea = document.getElementById("jsonEditor");
  const errorMarker = document.getElementById("errorMarker");
  const lines = textarea.value.split("\n");

  if (lineNum <= lines.length) {
    let position = 0;

    // Calculate position up to the error line
    for (let i = 0; i < lineNum - 1; i++) {
      position += lines[i].length + 1; // +1 for newline
    }

    // Add column position
    position += colNum - 1;

    // Add red background to indicate error
    textarea.classList.add("has-error");
    
    // Position error marker at the approximate line location
    const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight);
    const textareaPadding = 16; // 1rem padding
    const markerHeight = 32; // Approximate height of the marker
    
    // Calculate vertical position based on line number
    const lineTop = (lineNum - 1) * lineHeight + textareaPadding;
    
    // Keep marker within textarea bounds
    const textareaHeight = textarea.offsetHeight;
    const maxTop = textareaHeight - markerHeight - 10;
    const finalTop = Math.min(Math.max(lineTop, 10), maxTop);
    
    errorMarker.style.top = `${finalTop}px`;
    errorMarker.style.display = "flex";
    errorMarker.querySelector(".error-line-num").textContent = `Line ${lineNum}:${colNum}`;

    // Set selection to highlight the error area
    textarea.focus();
    const endPosition = Math.min(position + 3, textarea.value.length);
    textarea.setSelectionRange(position, endPosition);

    // Scroll to make the error visible
    const scrollTop = Math.max(0, (lineNum - 3) * lineHeight);
    textarea.scrollTop = scrollTop;
  }
}

// Validate JSON
function validateJSON() {
  hideMessage(); // Clear any previous messages
  clearErrorHighlight(); // Clear error highlighting
  const content = jsonEditor.value.trim();
  if (!content) {
    showMessage("Please enter some JSON content to validate", "error", false);
    return;
  }

  try {
    // First try standard JSON parse
    JSON.parse(content);
    showMessage("Valid JSON!", "success", false); // Don't auto-hide success
  } catch (jsonError) {
    // Try JSON5 parse to get better error messages
    try {
      JSON5.parse(content);
      showMessage(
        "Invalid standard JSON but valid JSON5. Contains comments, trailing commas, or unquoted keys. Use Clean to convert to standard JSON.",
        "info",
        false
      );
    } catch (json5Error) {
      // Extract line and column info for better error display
      const match = json5Error.message.match(/at (\d+):(\d+)/);
      if (match) {
        const line = parseInt(match[1]);
        const col = parseInt(match[2]);
        showMessage(
          `Invalid JSON: Syntax error at line ${line}, column ${col}. ${json5Error.message}`,
          "error",
          false
        );
        highlightError(line, col);
      } else {
        showMessage(`Invalid JSON: ${json5Error.message}`, "error", false);
      }
    }
  }
}

// Convert position to line and column
function positionToLineCol(text, position) {
  const lines = text.split("\n");
  let currentPos = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length + 1; // +1 for newline
    if (currentPos + lineLength > position) {
      return {
        line: i + 1,
        col: position - currentPos + 1,
      };
    }
    currentPos += lineLength;
  }

  return { line: 1, col: 1 };
}

// Clean JSON using jsonrepair
function cleanJSON() {
  hideMessage();
  clearErrorHighlight(); // Clear error highlighting
  const content = jsonEditor.value.trim();
  if (!content) {
    showMessage("Please enter some JSON content to clean", "error", false);
    return;
  }

  try {
    // Store original content for undo functionality
    originalJsonBeforeClean = content;
    
    const { jsonrepair } = JSONRepair;
    const repaired = jsonrepair(content);
    jsonEditor.value = repaired;
    
    // Show and enable undo button
    const undoBtn = document.getElementById("undoBtn");
    undoBtn.style.display = "inline-block";
    undoBtn.disabled = false;
    
    showMessage("JSON cleaned successfully!", "success", false); // Don't auto-hide success
  } catch (error) {
    // Reset undo state on error
    originalJsonBeforeClean = null;
    
    // Try to extract position from error message
    const posMatch = error.message.match(/at position (\d+)/);
    if (posMatch) {
      const position = parseInt(posMatch[1]);
      const { line, col } = positionToLineCol(content, position);
      showMessage(
        `Error cleaning JSON at line ${line}, column ${col}: ${error.message}`,
        "error",
        false
      );
      highlightError(line, col);
    } else {
      showMessage(`Error cleaning JSON: ${error.message}`, "error", false);
    }
  }
}

// Format JSON
function formatJSON() {
  hideMessage();
  clearErrorHighlight(); // Clear error highlighting
  const content = jsonEditor.value.trim();
  if (!content) {
    showMessage("Please enter some JSON content to format", "error", false);
    return;
  }

  try {
    // Store original content for undo functionality
    originalJsonBeforeFormat = content;
    originalJsonBeforeClean = null; // Clear clean undo state
    
    // First try to parse the JSON
    let jsonObject;
    let wasRepaired = false;
    try {
      jsonObject = JSON.parse(content);
    } catch (parseError) {
      // If parsing fails, try to repair it first
      try {
        const { jsonrepair } = JSONRepair;
        const repaired = jsonrepair(content);
        jsonObject = JSON.parse(repaired);
        wasRepaired = true;
      } catch (repairError) {
        // Reset undo state on error
        originalJsonBeforeFormat = null;
        showMessage(`Invalid JSON: ${parseError.message}`, "error", false);
        return;
      }
    }

    // Format with 2-space indentation
    const formatted = JSON.stringify(jsonObject, null, 2);
    jsonEditor.value = formatted;
    
    // Show and enable undo button
    const undoBtn = document.getElementById("undoBtn");
    undoBtn.style.display = "inline-block";
    undoBtn.disabled = false;
    
    showMessage(
      wasRepaired
        ? "JSON repaired and formatted!"
        : "JSON formatted successfully!",
      "success",
      false // Don't auto-hide success
    );
  } catch (error) {
    // Reset undo state on error
    originalJsonBeforeFormat = null;
    showMessage(`Error formatting JSON: ${error.message}`, "error", false);
  }
}

// Copy to clipboard
async function copyToClipboard() {
  const content = jsonEditor.value;
  if (!content.trim()) {
    showMessage("No content to copy", "error", false);
    return;
  }
  
  try {
    await navigator.clipboard.writeText(content);
    showMessage("Copied to clipboard!", "success", false);
  } catch (error) {
    showMessage("Failed to copy to clipboard", "error", false);
  }
}

// Undo operation
function undoOperation() {
  if (originalJsonBeforeClean !== null) {
    jsonEditor.value = originalJsonBeforeClean;
    originalJsonBeforeClean = null;
    originalJsonBeforeFormat = null;
    const undoBtn = document.getElementById("undoBtn");
    undoBtn.style.display = "none";
    undoBtn.disabled = true;
    hideMessage();
    clearErrorHighlight();
    showMessage("Undo successful! Original content restored.", "success", false);
  } else if (originalJsonBeforeFormat !== null) {
    jsonEditor.value = originalJsonBeforeFormat;
    originalJsonBeforeFormat = null;
    originalJsonBeforeClean = null;
    const undoBtn = document.getElementById("undoBtn");
    undoBtn.style.display = "none";
    undoBtn.disabled = true;
    hideMessage();
    clearErrorHighlight();
    showMessage("Undo successful! Original content restored.", "success", false);
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Event listeners
  document
    .getElementById("validateBtn")
    .addEventListener("click", validateJSON);
  document.getElementById("cleanBtn").addEventListener("click", cleanJSON);
  document.getElementById("formatBtn").addEventListener("click", formatJSON);
  document.getElementById("copyBtn").addEventListener("click", copyToClipboard);
  document.getElementById("undoBtn").addEventListener("click", undoOperation);

  // Hide message and clear error highlighting when user starts typing
  jsonEditor.addEventListener("input", () => {
    hideMessage();
    clearErrorHighlight();
  });

  // Load sample messy JSON on start
  const sampleJSON = `{
  // This is a comment that needs to be removed
  _id: ObjectId("507f1f77bcf86cd799439011"),
  name: 'John Doe', // Single quotes need to be fixed
  age: 30,
  "email": "john.doe@example.com",
  /* Multi-line comment
     that should be removed */
  address: {
    street: "123 Main St",
    city: 'New York',
    state: "NY",
    zipCode: 10001, // No quotes on number is fine
  }, // Trailing comma here
  hobbies: ['reading', "gaming", 'cooking'],
  isActive: true,
  created_at: ISODate("2023-10-27T14:30:00.123Z"),
  metadata: {
    tags: [programming, javascript, json], // Missing quotes
    score: undefined, // undefined is not valid JSON
    notes: null,
  }
  // Missing closing brace`;
  jsonEditor.value = sampleJSON;
});
