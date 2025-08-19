# OToolebox

A collection of client-side web tools that run entirely in the browser. No data is sent to servers, ensuring privacy and security for all operations.

## Development Server

To run the development server locally with proper headers for SharedArrayBuffer support (required for some tools like image-editor):

```bash
node dev-server.js
```

Then open `http://localhost:8000` in your browser.

**Alternative (basic server without SharedArrayBuffer support):**
```bash
npx serve . --listen 8000
```

**Note:** Some tools (like the image-editor) require SharedArrayBuffer and need the proper CORS headers that the dev-server.js provides. If you get errors about SharedArrayBuffer not being available, use the dev-server.js instead of the basic serve command.

## Project Structure

```
otoolebox/
├── index.html           # Homepage with tool grid
├── global.css          # Shared styles and CSS variables
├── tools.json          # Tool configuration and metadata
└── [tool-name]/        # Individual tool directories
    ├── index.html      # Tool page
    ├── styles.css      # Tool-specific styles (optional)
    └── script.js       # Tool functionality
```

## Adding New Tools

### 1. Create Tool Directory

Create a new directory with your tool name (use kebab-case):
```bash
mkdir my-new-tool
```

### 2. Configure tools.json

Add your tool to the `tools.json` file:

```json
{
  "id": "my-new-tool",
  "name": "My New Tool",
  "description": "Brief description of what your tool does",
  "path": "/my-new-tool/",
  "icon": "icon-name",
  "tags": ["tag1", "tag2", "tag3"],
  "status": "active"
}
```

**Required fields:**
- `id`: Unique identifier (matches directory name)
- `name`: Display name shown on homepage
- `description`: Brief explanation of tool functionality
- `path`: Relative path to tool (must start and end with `/`)
- `status`: `"active"` to show on homepage, `"inactive"` to hide

**Optional fields:**
- `icon`: Icon identifier (currently not implemented)
- `tags`: Array of searchable keywords

### 3. Create Tool Page

Copy the structure from an existing tool (like `barcode-generator/index.html`):

#### Required Components

**Header with Navigation:**
```html
<header class="main-header">
    <div class="container">
        <nav class="nav">
            <a href="../" class="nav-brand">OToolebox</a>
            <div class="nav-links">
                <button id="themeToggle" class="theme-toggle" title="Toggle theme"></button>
                <a href="../" class="nav-link">All Tools</a>
                <a href="../my-new-tool/" class="nav-link active">My New Tool</a>
            </div>
        </nav>
    </div>
</header>
```

**Footer with Donation Button:**
```html
<footer class="main-footer">
    <p>&copy; 2025 OToolebox. All tools run locally in your browser.</p>
    <div style="margin-top: 1rem;">
        <script type='text/javascript' src='https://storage.ko-fi.com/cdn/widget/Widget_2.js'></script>
        <script type='text/javascript'>kofiwidget2.init('Buy Me a Coffee or Beer', '#64748b', 'F1F41J70Y8');kofiwidget2.draw();</script>
    </div>
</footer>
```

**Theme Toggle Script:**
```html
<script>
    // Theme toggle functionality
    const themeToggle = document.getElementById('themeToggle');
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    themeToggle.addEventListener('click', () => {
        const theme = document.documentElement.getAttribute('data-theme');
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });
</script>
```

#### Required HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Tool Name</title>
    <link rel="stylesheet" href="../global.css">
    <!-- Optional: <link rel="stylesheet" href="styles.css"> -->
</head>
<body>
    <!-- Header (see above) -->
    
    <div class="container">
        <div class="hero">
            <h1>Your Tool Name</h1>
            <p>Description of what your tool does.</p>
        </div>
        
        <main class="tool-container">
            <!-- Your tool's interface goes here -->
        </main>
        
        <!-- Footer (see above) -->
    </div>
    
    <!-- Your tool's JavaScript -->
    <!-- Theme toggle script (see above) -->
</body>
</html>
```

## Styling System

### Global Styles (global.css)

The project uses CSS custom properties for consistent theming:

**Color Variables:**
- `--primary-color`: Main brand color (#64748b light, #94a3b8 dark)
- `--bg-primary`: Main background
- `--bg-secondary`: Secondary background
- `--text-primary`: Primary text color
- `--text-secondary`: Secondary text color
- `--border-color`: Border and divider color
- `--button-bg`: Button background
- `--button-hover`: Button hover state

**Component Classes:**
- `.container`: Main content wrapper (max-width: 1200px)
- `.tool-container`: Tool-specific container with padding and styling
- `.section-card`: Card-style sections with background and border
- `.control-group`: Form control grouping
- `.control-grid`: Responsive grid for form controls
- `.btn`, `.btn-primary`, `.btn-enhanced`: Button styles
- `.flex-group`, `.flex-group-center`: Flexbox utilities

### Theme Support

The site supports light and dark themes using `data-theme` attribute:
- Light theme: Default color scheme with sun icon (☀️) 
- Dark theme: Automatically applied dark color variants with moon icon (🌙)
- Theme preference persists in localStorage
- Visual slider-style toggle shows current theme state clearly

## Donation Button

### Implementation Strategy

The Ko-fi donation button uses a **custom HTML implementation** instead of external widgets to avoid CSP (Content Security Policy) conflicts and ensure consistent loading across all pages.

### Current Implementation

```html
<div style="margin-top: 1rem;">
    <a 
        href="https://ko-fi.com/otoolecf" 
        target="_blank" 
        class="custom-kofi-btn"
        style="
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: #64748b;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            font-size: 0.9rem;
            font-weight: 500;
            transition: background-color 0.2s, transform 0.2s;
        "
    >
        <img src="../kofi_symbol.svg" width="16" height="16" alt="Ko-fi icon" />
        Buy Me a Coffee or Beer
    </a>
</div>
```

### Button Components

- **Icon**: Uses `kofi_symbol.svg` located in the root directory
- **Styling**: Matches the site's design system with `#64748b` background
- **Hover Effects**: Defined in `global.css` with `.custom-kofi-btn:hover`
- **Accessibility**: Includes proper alt text and target="_blank"

### Path Considerations

- **Root level pages** (index.html): Use `kofi_symbol.svg`
- **Tool pages** (subdirectories): Use `../kofi_symbol.svg`

### Update Instructions

When adding the donation button to new pages:
1. Copy the exact HTML structure above
2. Adjust the image src path based on directory level
3. Place inside the footer after the copyright text
4. Ensure the button inherits hover styles from `global.css`
5. Test that the icon displays correctly

## Development Notes

- All tools run client-side only - no server communication
- External libraries should be loaded via CDN when possible
- Maintain consistent navigation and footer across all tools
- Test both light and dark themes for new tools
- Follow existing naming conventions (kebab-case for directories/files)