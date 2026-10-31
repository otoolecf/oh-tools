import { headerTemplate } from './header-template.mjs';

class OToolboxHeader extends HTMLElement {
  constructor() {
    super();
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    const currentPath = this.getAttribute('current-path') || '/';
    const currentTool = this.getAttribute('current-tool') || '';
    
    if (!this.shadowRoot.firstChild) {
      const template = this.querySelector('template[shadowrootmode]');
      if (template) {
        this.shadowRoot.append(template.content.cloneNode(true));
        template.remove();
      } else this.shadowRoot.innerHTML = headerTemplate({ currentPath, currentTool });
    }

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
