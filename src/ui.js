/* Shared tooltip/UI helpers kept for merge compatibility with earlier module layout. */
let tooltipEl = null;

export function ensureTooltip() {
  if (tooltipEl) return tooltipEl;
  tooltipEl = document.createElement('div');
  tooltipEl.id = 'item-tooltip';
  tooltipEl.style.position = 'fixed';
  tooltipEl.style.pointerEvents = 'none';
  tooltipEl.style.zIndex = '9999';
  tooltipEl.style.display = 'none';
  document.body.appendChild(tooltipEl);
  return tooltipEl;
}

export function showTooltip(html, x, y) {
  const el = ensureTooltip();
  if (typeof html === 'string') el.innerHTML = html;
  el.style.left = `${x + 12}px`;
  el.style.top = `${y + 12}px`;
  el.style.display = 'block';
}

export function hideTooltip() {
  if (tooltipEl) tooltipEl.style.display = 'none';
}

// Optional global bridge so legacy scripts and merged branches can share behavior.
if (typeof window !== 'undefined') {
  if (!window.ensureTooltip) window.ensureTooltip = ensureTooltip;
  if (!window.showTooltip) window.showTooltip = showTooltip;
  if (!window.hideTooltip) window.hideTooltip = hideTooltip;
}
