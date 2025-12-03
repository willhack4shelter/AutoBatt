/* UI helpers: debug panel, HUD rendering, tooltip handling */
export function createDebugPanel(){
  if(document.getElementById('debug-panel')) return;
  const pnl = document.createElement('div');
  pnl.id = 'debug-panel';
  pnl.style.position = 'fixed';
  pnl.style.right = '12px';
  pnl.style.bottom = '12px';
  pnl.style.width = '340px';
  pnl.style.maxHeight = '240px';
  pnl.style.overflow = 'auto';
  pnl.style.background = 'rgba(2,6,23,0.9)';
  pnl.style.color = '#9fb6c9';
  pnl.style.fontSize = '12px';
  pnl.style.padding = '8px';
  pnl.style.borderRadius = '8px';
  pnl.style.zIndex = '9999';
  pnl.innerHTML = '<strong>Debug</strong><div id="debug-lines" style="margin-top:6px"></div>';
  document.body.appendChild(pnl);
}

export function logDebug(...args){
  console.log(...args);
  const d = document.getElementById('debug-lines');
  if(d){ const ln = document.createElement('div'); ln.textContent = args.map(a=>String(a)).join(' '); d.prepend(ln); }
}

export function renderHUD(state){
  const el = document.getElementById('gold-amount');
  if(el) el.textContent = (state.gold||0).toString();
}

// tooltip overlay
let _tooltipEl = null;
export function ensureTooltip(){
  if(_tooltipEl) return _tooltipEl;
  _tooltipEl = document.createElement('div');
  _tooltipEl.id = 'item-tooltip';
  _tooltipEl.style.position = 'fixed';
  _tooltipEl.style.pointerEvents = 'none';
  _tooltipEl.style.zIndex = '99999';
  _tooltipEl.style.background = 'rgba(10,12,20,0.95)';
  _tooltipEl.style.color = '#e6eef6';
  _tooltipEl.style.padding = '8px';
  _tooltipEl.style.borderRadius = '6px';
  _tooltipEl.style.fontSize = '13px';
  _tooltipEl.style.maxWidth = '280px';
  _tooltipEl.style.display = 'none';
  document.body.appendChild(_tooltipEl);
  return _tooltipEl;
}

export function showTooltip(html, x, y){
  const t = ensureTooltip();
  t.innerHTML = html;
  t.style.left = (x+12)+'px';
  t.style.top = (y+12)+'px';
  t.style.display = 'block';
}

export function hideTooltip(){ if(_tooltipEl) _tooltipEl.style.display='none'; }
