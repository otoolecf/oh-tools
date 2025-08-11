// Tool data loader utility
class ToolDataLoader {
  static async loadToolData(toolPath) {
    try {
      const response = await fetch('/tools.json');
      const data = await response.json();
      
      // Find tool by path (remove leading slash for comparison)
      const normalizedPath = toolPath.startsWith('/') ? toolPath : `/${toolPath}`;
      const tool = data.tools.find(t => t.path === normalizedPath);
      
      if (!tool) {
        console.warn(`Tool not found for path: ${toolPath}`);
        return null;
      }
      
      return tool;
    } catch (error) {
      console.error('Failed to load tool data:', error);
      return null;
    }
  }

  static async setupToolHero(toolPath) {
    const toolData = await this.loadToolData(toolPath);
    if (!toolData) return;

    const heroElement = document.querySelector('tool-hero');
    if (heroElement) {
      // Check if custom HTML is provided
      if (toolData.customHtml && toolData.customHtml.trim()) {
        heroElement.setAttribute('custom-html', '');
        const customSlot = document.createElement('div');
        customSlot.slot = 'custom-content';
        customSlot.innerHTML = toolData.customHtml;
        heroElement.appendChild(customSlot);
      } else {
        // Use standard template
        heroElement.setAttribute('tool-name', toolData.name);
        heroElement.setAttribute('description', toolData.description);
        
        // Build extra content container
        let extraContent = '';
        
        // Add powered by section if available
        if (toolData.poweredBy && Array.isArray(toolData.poweredBy) && toolData.poweredBy.length > 0) {
          const libLinks = toolData.poweredBy.map(lib => 
            `<a href="${lib.url}" target="_blank">${lib.name}</a>`
          ).join(', ');
          extraContent += `<div class="powered-by">Uses the excellent ${libLinks} ${toolData.poweredBy.length === 1 ? 'library' : 'libraries'} under the hood.</div>`;
        }
        
        // Add any additional hero extra content
        if (toolData.heroExtra && toolData.heroExtra.trim()) {
          extraContent += toolData.heroExtra;
        }
        
        // Add combined content if any exists
        if (extraContent) {
          const extraSlot = document.createElement('div');
          extraSlot.slot = 'extra-content';
          extraSlot.innerHTML = extraContent;
          heroElement.appendChild(extraSlot);
        }
      }
    }
  }
}

// Auto-setup if data-tool-path attribute is found
document.addEventListener('DOMContentLoaded', () => {
  const heroElement = document.querySelector('tool-hero[data-tool-path]');
  if (heroElement) {
    const toolPath = heroElement.getAttribute('data-tool-path');
    ToolDataLoader.setupToolHero(toolPath);
  }
});

window.ToolDataLoader = ToolDataLoader;