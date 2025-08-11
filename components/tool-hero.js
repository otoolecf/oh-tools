class ToolHero extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    const toolName = this.getAttribute('tool-name') || '';
    const description = this.getAttribute('description') || '';
    const useCustomHtml = this.hasAttribute('custom-html');
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        
        .hero {
          text-align: center;
          padding: 3rem 0;
        }

        .hero h1 {
          margin: 0 0 1rem 0;
          font-size: 2.5rem;
          color: var(--primary-color);
        }

        .hero-content p {
          font-size: 1.2rem;
          color: var(--text-secondary);
          max-width: 600px;
          margin: 0 auto 1rem auto;
          line-height: 1.6;
        }

        .hero-extra {
          margin-top: 2rem;
        }

        .powered-by {
          font-size: 0.9rem;
          font-style: italic;
          color: var(--text-secondary);
          margin-top: 0.75rem;
        }

        .powered-by a {
          color: var(--primary-color);
          text-decoration: none;
        }

        .powered-by a:hover {
          text-decoration: underline;
        }

        .custom-content {
          /* Allow custom content to override centering if needed */
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .hero {
            padding: 2rem 0;
          }
          
          .hero h1 {
            font-size: 2rem;
          }
          
          .hero-content p {
            font-size: 1.1rem;
            padding: 0 1rem;
          }
        }
      </style>
      
      <div class="hero">
        ${useCustomHtml ? `
          <div class="custom-content">
            <slot name="custom-content"></slot>
          </div>
        ` : `
          <h1>${toolName}</h1>
          <div class="hero-content">
            <p>${description}</p>
            <div class="hero-extra">
              <slot name="extra-content"></slot>
            </div>
          </div>
        `}
      </div>
    `;
  }

  static get observedAttributes() {
    return ['tool-name', 'description'];
  }

  attributeChangedCallback() {
    if (this.shadowRoot) {
      this.connectedCallback();
    }
  }
}

customElements.define('tool-hero', ToolHero);