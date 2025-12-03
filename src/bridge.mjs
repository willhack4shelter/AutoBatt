import { state, saveGameState, loadGameState } from './store.js';
import { createDebugPanel, logDebug, renderHUD, ensureTooltip, showTooltip, hideTooltip } from './ui.js';
import { startBattle, endBattle, generateNewEnemy, attachToWindow } from './game.js';

// expose to global for backwards compatibility with existing non-module script
window.GameStore = { state, saveGameState, loadGameState };
window.state = state;
window.saveGameState = saveGameState;
window.loadGameState = loadGameState;
window.createDebugPanel = createDebugPanel;
window.logDebug = logDebug;
window.renderHUD = renderHUD;
window.ensureTooltip = ensureTooltip;
window.showTooltip = showTooltip;
window.hideTooltip = hideTooltip;
window.GameEngine = { startBattle, endBattle, generateNewEnemy };
// also attach internal engine helpers onto window for legacy scripts if needed
attachToWindow();

// auto-enable debug panel when ?debug=1
const params = new URLSearchParams(location.search);
if(params.get('debug')==='1') createDebugPanel();

console.log('bridge: modules loaded and exposed on window');
