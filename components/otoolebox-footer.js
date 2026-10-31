class OToolboxFooter extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    const basePath = this.getAttribute('base-path') || '';
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        
        .main-footer {
          background: var(--bg-secondary);
          border-top: 1px solid var(--border-color);
          padding: 2rem 0;
          text-align: center;
          margin-top: 4rem;
        }

        .main-footer p {
          margin: 0;
          color: var(--text-secondary);
        }

        .custom-kofi-btn {
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
        }

        .custom-kofi-btn:hover {
          background: #475569;
          transform: translateY(-1px);
        }

        .contact-info {
          margin-top: 1rem;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .contact-info a {
          color: var(--primary-color);
          text-decoration: none;
        }

        .contact-info a:hover {
          text-decoration: underline;
        }

        .kofi-container {
          margin-top: 1rem;
        }

      </style>
      
      <footer class="main-footer">
        <p>Oh! Tools. Handy tools for everyday annoyances.</p>
        <div class="contact-info">
          Something broken? Something missing? Let me know: <a href="mailto:help@oh-tools.net">help@oh-tools.net</a>
        </div>
        <div class="kofi-container">
          <a 
            href="https://ko-fi.com/otoolecf" 
            target="_blank" 
            class="custom-kofi-btn"
          >
            <img 
              src="${basePath}kofi_symbol.svg" 
              width="16" 
              height="16" 
              alt="Ko-fi icon"
            />
            Buy me a coffee or a beer
          </a>
        </div>
      </footer>
    `;
  }
}

customElements.define('otoolebox-footer', OToolboxFooter);
