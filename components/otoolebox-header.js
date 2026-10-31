import { brandStyles, wordmark } from './brand.mjs';

class OToolboxHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    const currentPath = this.getAttribute('current-path') || '/';
    const currentTool = this.getAttribute('current-tool') || '';
    const isHome = !currentTool && currentPath === '/';
    
    this.shadowRoot.innerHTML = `
      <style>
        ${brandStyles}
        :host {
          display: block;
        }
        
        .main-header {
          background: var(--card-bg);
          border-bottom: 1px solid var(--border-color);
          padding: 1rem 0;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
        }

        .nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .nav-brand {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--primary-color);
          text-decoration: none;
          transition: color 0.2s;
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }

        .nav-brand-tagline {
          font-size: 0.75rem;
          font-weight: 400;
          color: var(--text-secondary);
          margin-top: -2px;
        }

        .nav-brand:hover {
          color: var(--primary-hover);
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .nav-link {
          color: var(--text-secondary);
          text-decoration: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          transition: color 0.2s, background-color 0.2s;
          font-weight: 500;
        }

        .nav-link:hover {
          color: var(--text-primary);
          background: var(--bg-secondary);
        }

        .nav-link.active {
          color: var(--primary-color);
          background: var(--bg-secondary);
        }

        .theme-toggle {
          background: var(--border-color);
          border: none;
          border-radius: 20px;
          width: 60px;
          height: 30px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          margin-right: 1.5rem;
          flex-shrink: 0;
        }

        .theme-toggle:hover {
          background: var(--primary-color);
        }

        .theme-toggle::before {
          content: '';
          position: absolute;
          top: 3px;
          left: 3px;
          width: 24px;
          height: 24px;
          background: white;
          border-radius: 50%;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        :host([data-theme="dark"]) .theme-toggle::before {
          transform: translateX(30px);
          background: var(--bg-primary);
        }

        :host([data-theme="dark"]) .theme-toggle {
          background: var(--primary-color);
        }

        .theme-toggle::after {
          content: '';
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          font-size: 12px;
          font-weight: 500;
          pointer-events: none;
          transition: all 0.3s ease;
        }

        :host([data-theme="light"]) .theme-toggle::after,
        :host(:not([data-theme])) .theme-toggle::after {
          content: '☀️';
          right: 8px;
        }

        :host([data-theme="dark"]) .theme-toggle::after {
          content: '🌙';
          left: 8px;
        }

        @media (max-width: 768px) {
          .nav {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto auto;
            gap: 0.5rem;
          }

          .nav-brand { min-width: 0; white-space: nowrap; }
          .nav-brand-tagline { white-space: normal; }
          .nav-links { display: contents; }
          .theme-toggle { margin-right: 0; }
          .nav-link { padding: 0.5rem 0.75rem; white-space: nowrap; }
          /* The page heading already identifies the current tool. */
          .current-tool { display: none; }
        }
      </style>
      
      <header class="main-header">
        <div class="container">
          <nav class="nav">
            <a href="/" class="nav-brand">
              ${wordmark()}
              <span class="nav-brand-tagline">Handy tools for everyday annoyances.</span>
            </a>
            <div class="nav-links">
              <button id="themeToggle" class="theme-toggle" title="Toggle theme"></button>
              <a href="/" class="nav-link ${isHome ? 'active' : ''}" ${isHome ? 'aria-current="page"' : ''}>
                ${isHome ? 'Tools' : 'All Tools'}
              </a>
              ${currentTool ? `<a href="./" class="nav-link active current-tool" aria-current="page">${currentTool}</a>` : ''}
            </div>
          </nav>
        </div>
      </header>
    `;

    this.setupThemeToggle();
  }

  setupThemeToggle() {
    const themeToggle = this.shadowRoot.getElementById('themeToggle');
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    // Set theme on both document and component
    document.documentElement.setAttribute('data-theme', currentTheme);
    this.setAttribute('data-theme', currentTheme);
    
    themeToggle.addEventListener('click', () => {
      const theme = this.getAttribute('data-theme') || 'light';
      const newTheme = theme === 'dark' ? 'light' : 'dark';
      
      // Update both document and component
      document.documentElement.setAttribute('data-theme', newTheme);
      this.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
    });
  }
}

customElements.define('otoolebox-header', OToolboxHeader);
