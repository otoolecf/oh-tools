import './components/site.js';

// Measure natural label heights so every button follows the tallest one.
// Observing the labels also covers wrapping, font loads, and text changes.
const grid = document.getElementById('toolsGrid');
const labels = [...grid.querySelectorAll('.tool-link-label')];
const equalizeButtons = () => {
  const height = Math.ceil(Math.max(...labels.map(label => {
    const style = getComputedStyle(label.parentElement);
    return label.getBoundingClientRect().height
      + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
      + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
  })));
  grid.style.setProperty('--tool-link-height', `${height}px`);
};
const labelObserver = new ResizeObserver(equalizeButtons);
labels.forEach(label => labelObserver.observe(label));
equalizeButtons();
