/* Hauptlogik für AutoBatt Demo
   - Erzeugt Inventare (6x3 für Spieler), Storage (8x2)
   - Drag & Drop mit Vorschau (Highlight für benötigte Felder)
   - Shop Items können ins Inventar oder Storage gezogen werden
   - Starteritems werden verteilt (3 je Spieler)
   - Battle läuft 12s, Items werden nach ihrem cooldown zum ersten Mal benutzt
*/
// Encapsulate script in IIFE and enable strict mode
(function(){
  'use strict';
  // non-intrusive debug panel and helper
function createDebugPanel(){
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

function logDebug(...args){
  // always write to console
  console.log(...args);
  const d = document.getElementById('debug-lines');
  if(d){ const ln = document.createElement('div'); ln.textContent = args.map(a=>String(a)).join(' '); d.prepend(ln); }
}

// create debug panel only when ?debug=1 in URL
window.addEventListener('load', ()=>{
  try{
    const params = new URLSearchParams(location.search);
    if(params.get('debug')==='1') createDebugPanel();
  }catch(e){ console.error('Debug panel init failed', e); }
});

const PLAYER_SLOTS = {cols:6, rows:3};
const STORAGE_SLOTS = {cols:10, rows:4};
const PLAYER_STORAGE_SLOTS = {cols:6, rows:6};
const ENEMY_STORAGE_SLOTS = {cols:6, rows:6};
const BATTLE_DURATION = 12.0; // Sekunden

let state = {
  playerHP:100, enemyHP:100,
  playerGrid:[], enemyGrid:[], storageGrid:[],
  shopInstances:[], // item instances available in shop
  gold:200,
  battle: null
};

function makeGridArray(cols, rows){
  const arr = [];
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++) arr.push(null);
  }
  return arr;
}

function init(){
  logDebug('AutoBatt:init starting');
  state.playerGrid = makeGridArray(PLAYER_SLOTS.cols, PLAYER_SLOTS.rows);
  state.enemyGrid = makeGridArray(PLAYER_SLOTS.cols, PLAYER_SLOTS.rows);
  state.storageGrid = makeGridArray(STORAGE_SLOTS.cols, STORAGE_SLOTS.rows);
  state.playerStorageGrid = makeGridArray(PLAYER_STORAGE_SLOTS.cols, PLAYER_STORAGE_SLOTS.rows);
  state.enemyStorageGrid = makeGridArray(ENEMY_STORAGE_SLOTS.cols, ENEMY_STORAGE_SLOTS.rows);
  buildGrid('player-inv', PLAYER_SLOTS.cols, PLAYER_SLOTS.rows, state.playerGrid, 'player');
  buildGrid('player-storage', PLAYER_STORAGE_SLOTS.cols, PLAYER_STORAGE_SLOTS.rows, state.playerStorageGrid, 'player-storage');
  buildGrid('enemy-inv', PLAYER_SLOTS.cols, PLAYER_SLOTS.rows, state.enemyGrid, 'enemy');
  buildGrid('enemy-storage', ENEMY_STORAGE_SLOTS.cols, ENEMY_STORAGE_SLOTS.rows, state.enemyStorageGrid, 'enemy-storage');
  buildGrid('storage-grid', STORAGE_SLOTS.cols, STORAGE_SLOTS.rows, state.storageGrid, 'storage');

  // try to load saved state; if none, build defaults
  if(!loadGameState()){
    buildShop();
    assignStarterItems();
  }

  updateHPDisplays();
  document.getElementById('start-battle').addEventListener('click', ()=>startBattle());
  logDebug('AutoBatt:init attached start-battle listener');
  const btn = document.getElementById('btn-reset');
  if(btn) btn.addEventListener('click', ()=>{
    if(confirm('Speicher zurücksetzen und neu laden?')){
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  });
  renderHUD();
  logDebug('AutoBatt:init done');
}

function buildGrid(containerId, cols, rows, gridArray, owner){
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  container.style.gridTemplateColumns = `repeat(${cols},40px)`;
  for(let i=0;i<cols*rows;i++){
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.dataset.index = i;
    slot.dataset.owner = owner;
    // NPC inventory should not accept drops
    if(owner !== 'enemy' && owner !== 'enemy-storage'){
      slot.addEventListener('dragover', onDragOverSlot);
      slot.addEventListener('dragleave', onDragLeaveSlot);
      slot.addEventListener('drop', onDropOnSlot);
    }
    container.appendChild(slot);
  }
}

function buildShop(){
  const shop = document.getElementById('shop-items');
  shop.innerHTML='';
  // create instances for shop (one of each template)
  // spawn or refresh 5 random items
  spawnShopItems();
  state.shopInstances.forEach(inst=>{
    const el = renderShopItem(inst);
    // add click-to-buy handler
    el.addEventListener('click', (ev)=>{ ev.stopPropagation(); buyFromShop(inst); });
    shop.appendChild(el);
  });
}

function spawnShopItems(){
  // pick 5 random templates
  state.shopInstances = [];
  const pool = GameItems.ITEMS.slice();
  for(let k=0;k<5;k++){
    const idx = Math.floor(Math.random()*pool.length);
    const t = pool.splice(idx,1)[0];
    state.shopInstances.push(GameItems.createItemInstance(t.key,'shop'));
  }
}

function buyFromShop(inst){
  state.gold = state.gold || 200;
  if(state.gold < inst.price){ log(`Nicht genug Gold für ${inst.name} (Preis ${inst.price})`); return; }
  // try to place into player inventory first
  const clone = GameItems.createItemInstance(inst.key,'player');
  // remove shop instance so it disappears
  const sidx = state.shopInstances.findIndex(s=>s.id===inst.id);
  if(sidx>=0) state.shopInstances.splice(sidx,1);
  const placed = placeIntoFirstFree(state.playerGrid, PLAYER_SLOTS.cols, PLAYER_SLOTS.rows, clone);
  if(!placed){
    // try storage
    const placed2 = placeIntoFirstFree(state.storageGrid, STORAGE_SLOTS.cols, STORAGE_SLOTS.rows, clone);
    if(!placed2){ log('Kein Platz im Inventar oder Storage, Kauf abgebrochen.'); return; }
  }
  state.gold -= inst.price;
  colorLog(`Gekauft: ${inst.name} für ${inst.price} Gold.`, 'player');
  saveGameState();
  renderAllGrids(); renderHUD();
}

function renderShopItem(item){
  const el = document.createElement('div');
  el.className = `item ${GameItems.RARITIES[item.rarity].colorClass}`;
  el.draggable = true;
  const sw = item.shape.w || 1, sh = item.shape.h || 1;
  el.style.width = `${sw*40 + (sw-1)*6}px`;
  el.style.height = `${sh*40 + (sh-1)*6}px`;
  el.dataset.itemId = item.id;
  el.innerHTML = `<div>${item.name}</div><small>${item.damage?('Dmg:'+item.damage):''}${item.heal?(' Heal:'+item.heal):''} CD:${item.cooldown}s</small>`;
  el.addEventListener('dragstart', (ev)=>onDragStart(ev,item,el));
  el.addEventListener('dragend', onDragEnd);
  // tooltip (uses bridge-provided global `showTooltip`/`hideTooltip` if available)
  el.addEventListener('mouseenter', (ev)=>{
    try{ if(window.showTooltip) window.showTooltip(`<strong>${item.name}</strong><br>Dmg: ${item.damage||0} Heal: ${item.heal||0}<br>CD: ${item.cooldown}s<br>Price: ${item.price}<br>Rarity: ${item.rarity}`, ev.clientX, ev.clientY); }catch(e){}
  });
  el.addEventListener('mousemove', (ev)=>{ try{ if(window.showTooltip) window.showTooltip(null, ev.clientX, ev.clientY); }catch(e){} });
  el.addEventListener('mouseleave', ()=>{ try{ if(window.hideTooltip) window.hideTooltip(); }catch(e){} });
  return el;
}

function onDragStart(ev,item,el){
  ev.dataTransfer.setData('text/plain', item.id);
  ev.dataTransfer.effectAllowed = 'copyMove';
  el.classList.add('dragging');
  window._draggingItem = item;
}
function onDragEnd(ev){
  const els = document.querySelectorAll('.item.dragging');
  els.forEach(e=>e.classList.remove('dragging'));
  window._draggingItem = null;
  clearHighlights();
}

function clearHighlights(){
  document.querySelectorAll('.slot.highlight').forEach(s=>s.classList.remove('highlight'));
}

function onDragOverSlot(ev){
  ev.preventDefault();
  const slot = ev.currentTarget;
  const owner = slot.dataset.owner;
  const idx = Number(slot.dataset.index);
  const dragging = window._draggingItem;
  if(!dragging) return;
  const grid = getGridByOwner(owner);
  const cols = owner==='storage'?STORAGE_SLOTS.cols:PLAYER_SLOTS.cols;
  const rows = owner==='storage'?STORAGE_SLOTS.rows:PLAYER_SLOTS.rows;
  const fits = canPlaceShape(grid, cols, rows, idx, dragging.shape);
  clearHighlights();
  if(fits.ok){
    fits.cells.forEach(i => {
      const slotEl = slot.parentElement.children[i];
      slotEl.classList.add('highlight');
    });
  }
}

function onDragLeave(ev){
  clearHighlights();
}

// alias kept for older event name usage
function onDragLeaveSlot(ev){
  return onDragLeave(ev);
}

function onDropOnSlot(ev){
  ev.preventDefault();
  clearHighlights();
  const slot = ev.currentTarget;
  const owner = slot.dataset.owner;
  const idx = Number(slot.dataset.index);
  const dragging = window._draggingItem;
  if(!dragging) return;
  const grid = getGridByOwner(owner);
  const cols = owner==='storage'?STORAGE_SLOTS.cols:PLAYER_SLOTS.cols;
  const rows = owner==='storage'?STORAGE_SLOTS.rows:PLAYER_SLOTS.rows;
  const fits = canPlaceShape(grid, cols, rows, idx, dragging.shape);
  if(!fits.ok){
    log(`Kann ${dragging.name} hier nicht platzieren.`);
    return;
  }
  // remove from previous container (shop or other grid)
  removeInstanceFromAll(dragging.id);
  // place into grid cells (store reference)
  fits.cells.forEach(i=>grid[i]=dragging);
  // set owner
  dragging.owner = owner;
  renderAllGrids();
  saveGameState();
}

function removeInstanceFromAll(id){
  // from shopInstances
  const sidx = state.shopInstances.findIndex(s=>s.id===id);
  if(sidx>=0) state.shopInstances.splice(sidx,1);
  [state.playerGrid, state.enemyGrid, state.storageGrid].forEach(g=>{
    for(let i=0;i<g.length;i++) if(g[i] && g[i].id===id) g[i]=null;
  });
}

function getGridByOwner(owner){
  if(owner==='player') return state.playerGrid;
  if(owner==='enemy') return state.enemyGrid;
  if(owner==='storage') return state.storageGrid;
  return null;
}

function canPlaceShape(grid, cols, rows, startIndex, shape){
  // shape is normalized object: {w,h,mask}
  const w = shape.w, h = shape.h, mask = shape.mask;
  const startR = Math.floor(startIndex/cols), startC = startIndex%cols;
  const cells = [];
  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
      // if mask exists and mask[y][x] === 0, skip this cell (no tile)
      if(mask && (!mask[y] || !mask[y][x])) continue;
      const c = startC + x; const r = startR + y;
      if(c>=cols || r>=rows) return {ok:false};
      const idx = r*cols + c;
      if(grid[idx]) return {ok:false};
      cells.push(idx);
    }
  }
  return {ok:true,cells};
}

function renderAllGrids(){
  renderGrid('player-inv', state.playerGrid, PLAYER_SLOTS.cols);
  renderGrid('enemy-inv', state.enemyGrid, PLAYER_SLOTS.cols);
  renderGrid('storage-grid', state.storageGrid, STORAGE_SLOTS.cols);
  renderGrid('player-storage', state.playerStorageGrid, PLAYER_STORAGE_SLOTS.cols);
  renderGrid('enemy-storage', state.enemyStorageGrid, ENEMY_STORAGE_SLOTS.cols);
  renderShopInstances();
}

function renderGrid(containerId, gridArray, cols){
  const container = document.getElementById(containerId);
  // remove current item elements first
  Array.from(container.querySelectorAll('.item')).forEach(e=>e.remove());
  // render each unique instance only once (top-left cell)
  const seen = new Set();
  for(let i=0;i<gridArray.length;i++){
    const inst = gridArray[i];
    if(!inst) continue;
    if(seen.has(inst.id)) continue;
    seen.add(inst.id);
    // compute top-left cell index for that instance
    const idx = i; // first occurrence in the grid is top-left by how we place
    const c = idx % cols, r = Math.floor(idx/cols);
    const el = document.createElement('div');
    el.className = `item grid-item ${GameItems.RARITIES[inst.rarity].colorClass}`;
    el.dataset.itemId = inst.id;
    // enemy items should not be draggable
    const isEnemy = (inst.owner==='enemy' || inst.owner==='enemy-storage');
    el.draggable = !isEnemy;
    // account for grid padding (6px) and gap (6px)
    const pad = 6; const gap = 6; const cell = 40;
    el.style.left = `${pad + c*(cell+gap)}px`;
    el.style.top = `${pad + r*(cell+gap)}px`;
    // shape is normalized {w,h,mask}
    const sw = inst.shape.w || 1, sh = inst.shape.h || 1;
    el.style.width = `${sw*40 + (sw-1)*6}px`;
    el.style.height = `${sh*40 + (sh-1)*6}px`;
    el.innerHTML = `<div>${inst.name}</div><small>${inst.damage?('D:'+inst.damage):''}${inst.heal?(' H:'+inst.heal):''}</small>`;
    if(!isEnemy) el.addEventListener('dragstart', (ev)=>onDragStart(ev,inst,el));
    el.addEventListener('dragend', onDragEnd);
    // tooltip handlers instead of title (more flexible)
    el.addEventListener('mouseenter', (ev)=>{
      try{ if(window.showTooltip) window.showTooltip(`<strong>${inst.name}</strong><br>Dmg: ${inst.damage||0} Heal: ${inst.heal||0}<br>CD: ${inst.cooldown}s<br>Price: ${inst.price}<br>Rarity: ${inst.rarity}`, ev.clientX, ev.clientY); }catch(e){}
    });
    el.addEventListener('mousemove', (ev)=>{ try{ if(window.showTooltip) window.showTooltip(null, ev.clientX, ev.clientY); }catch(e){} });
    el.addEventListener('mouseleave', ()=>{ try{ if(window.hideTooltip) window.hideTooltip(); }catch(e){} });
    // right-click to sell for player's items
    const isPlayerItem = (inst.owner==='player' || inst.owner==='player-storage');
    if(isPlayerItem){
      el.addEventListener('contextmenu', (ev)=>{
        ev.preventDefault();
        // sell for half price
        const sellPrice = Math.max(1, Math.round((inst.price||0)/2));
        // remove instance from grids
        removeInstanceFromAll(inst.id);
        state.gold = (state.gold||0) + sellPrice;
        colorLog(`Verkauft ${inst.name} für ${sellPrice} Gold`, 'player');
        renderAllGrids(); renderHUD(); saveGameState();
      });
    }
    container.appendChild(el);
  }
}

function renderShopInstances(){
  const shop = document.getElementById('shop-items');
  // remove all remaining shop DOM items (they were the originals); regenerate
  shop.innerHTML = '';
  state.shopInstances.forEach(inst=>{
    const el = renderShopItem(inst);
    el.addEventListener('click', (ev)=>{ ev.stopPropagation(); buyFromShop(inst); });
    shop.appendChild(el);
  });
}

function assignStarterItems(){
  // give each player 3 starter items (clones from common pool)
  const commons = GameItems.ITEMS.filter(i=>i.rarity==='common');
  for(let k=0;k<3;k++){
    const pi = GameItems.createItemInstance(commons[k%commons.length].key,'player');
    placeIntoFirstFree(state.playerGrid, PLAYER_SLOTS.cols, PLAYER_SLOTS.rows, pi);
    const ei = GameItems.createItemInstance(commons[(k+1)%commons.length].key,'enemy');
    placeIntoFirstFree(state.enemyGrid, PLAYER_SLOTS.cols, PLAYER_SLOTS.rows, ei);
  }
  renderAllGrids();
  saveGameState();
}

function placeIntoFirstFree(grid, cols, rows, inst){
  for(let i=0;i<grid.length;i++){
    const fits = canPlaceShape(grid, cols, rows, i, inst.shape);
    if(fits.ok){
      fits.cells.forEach(ci=>grid[ci]=inst);
      return true;
    }
  }
  return false;
}

function startBattle(){
  if(state.battle) return; // already running
  state.battle = { tickTimer: null };
  // set nextAvailable for all items owned by player or enemy based on their cooldown: they become usable only after cooldown seconds from start
  ['playerGrid','enemyGrid'].forEach(gname=>{
    const grid = state[gname];
    const unique = new Set();
    grid.forEach(cell=>{ if(cell) unique.add(cell);});
    unique.forEach(inst=>{
      inst.nextAvailable = performance.now() + inst.cooldown*1000; // first use after its cooldown
    });
  });
  const logEl = document.getElementById('battle-log');
  logEl.innerHTML='';
  const tick = ()=>{
    const now = performance.now();
    document.getElementById('battle-timer').textContent = '';
    // process activations
    processActivations(now);
    updateHPDisplays();
    if(state.playerHP<=0 || state.enemyHP<=0){
      endBattle();
    }
  };
  // run ticks every 100ms
  state.battle.tickTimer = setInterval(tick,100);
}

function endBattle(){
  if(!state.battle) return;
  clearInterval(state.battle.tickTimer);
  state.battle = null;
  const winner = state.playerHP>state.enemyHP? 'Spieler' : (state.enemyHP>state.playerHP? 'Gegner' : 'Unentschieden');
  log(`Battle beendet — Sieger: ${winner}`);
  // After round: handle rewards, drops, respawn enemy, refill shop
  handleEndOfRound(winner);
}

function handleEndOfRound(winner){
  // If player survived (winner === 'Spieler'), drop 1 item and award gold equal to HP difference
  if(winner==='Spieler'){
    const hpDiff = Math.max(0, Math.round(state.playerHP - state.enemyHP));
    state.gold = (state.gold||0) + hpDiff;
    log(`Spieler erhält ${hpDiff} Gold (HP-Differenz).`);
    // drop one random item
    const template = GameItems.ITEMS[Math.floor(Math.random()*GameItems.ITEMS.length)];
    const drop = GameItems.createItemInstance(template.key,'player');
    // try to place into player-inv, then player-storage, then global storage
    if(!placeIntoFirstFree(state.playerGrid, PLAYER_SLOTS.cols, PLAYER_SLOTS.rows, drop)){
      if(!placeIntoFirstFree(state.playerStorageGrid, PLAYER_STORAGE_SLOTS.cols, PLAYER_STORAGE_SLOTS.rows, drop)){
        placeIntoFirstFree(state.storageGrid, STORAGE_SLOTS.cols, STORAGE_SLOTS.rows, drop);
      }
    }
    log(`Item gedroppt: ${drop.name}`);
  }
  // generate new enemy
  generateNewEnemy();
  // refill shop with 5 items
  spawnShopItems();
  renderAllGrids(); renderHUD(); saveGameState();
}

function generateNewEnemy(){
  // reset enemy HP
  state.enemyHP = 100;
  // clear enemy grids
  state.enemyGrid = makeGridArray(PLAYER_SLOTS.cols, PLAYER_SLOTS.rows);
  state.enemyStorageGrid = makeGridArray(ENEMY_STORAGE_SLOTS.cols, ENEMY_STORAGE_SLOTS.rows);
  // fill enemy inventory with random 3 items
  for(let k=0;k<3;k++){
    const t = GameItems.ITEMS[Math.floor(Math.random()*GameItems.ITEMS.length)];
    const inst = GameItems.createItemInstance(t.key,'enemy');
    placeIntoFirstFree(state.enemyGrid, PLAYER_SLOTS.cols, PLAYER_SLOTS.rows, inst);
  }
  // optionally fill enemy storage with 2-4 items
  const sCount = 2 + Math.floor(Math.random()*3);
  for(let k=0;k<sCount;k++){
    const t = GameItems.ITEMS[Math.floor(Math.random()*GameItems.ITEMS.length)];
    const inst = GameItems.createItemInstance(t.key,'enemy-storage');
    placeIntoFirstFree(state.enemyStorageGrid, ENEMY_STORAGE_SLOTS.cols, ENEMY_STORAGE_SLOTS.rows, inst);
  }
  log('Neuer Gegner generiert.');
}

function processActivations(now){
  // iterate unique items for player => target enemy, and enemy => target player
  ['playerGrid','enemyGrid'].forEach(gname=>{
    const grid = state[gname];
    const unique = new Set();
    grid.forEach(cell=>{ if(cell) unique.add(cell);});
    unique.forEach(inst=>{
      if(!inst) return;
      if(!inst.nextAvailable) return; // safety
      if(now >= inst.nextAvailable){
        // use it
        const owner = inst.owner === 'player' || gname==='playerGrid' ? 'player' : 'enemy';
        const target = owner==='player' ? 'enemy' : 'player';
        applyItemEffect(inst, owner, target);
        // schedule next use after cooldown
        inst.nextAvailable = now + inst.cooldown*1000;
      }
    });
  });
}

function applyItemEffect(inst, owner, target){
  const dmg = inst.damage||0; const heal = inst.heal||0;
  if(dmg>0){
    if(target==='enemy') state.enemyHP = Math.max(0, state.enemyHP - dmg);
    else state.playerHP = Math.max(0, state.playerHP - dmg);
    colorLog(`${owner} verwendet ${inst.name} und verursacht ${dmg} Schaden an ${target}`, owner);
  }
  if(heal>0){
    if(owner==='player') { state.playerHP = Math.min(100, state.playerHP + heal); }
    else { state.enemyHP = Math.min(100, state.enemyHP + heal); }
    colorLog(`${owner} verwendet ${inst.name} und heilt ${heal} HP`, owner);
  }
}

function updateHPDisplays(){
  const pFill = document.getElementById('player-hp-fill');
  const eFill = document.getElementById('enemy-hp-fill');
  pFill.style.width = Math.max(0,(state.playerHP/100)*100)+'%';
  eFill.style.width = Math.max(0,(state.enemyHP/100)*100)+'%';
  document.getElementById('player-hp-text').textContent = `${state.playerHP.toFixed(0)} / 100`;
  document.getElementById('enemy-hp-text').textContent = `${state.enemyHP.toFixed(0)} / 100`;
}

function log(text){
  const logEl = document.getElementById('battle-log');
  const entry = document.createElement('div');
  entry.className = 'entry';
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  logEl.prepend(entry);
}

// colored log with type: 'player','enemy','info'
function colorLog(text, type){
  const logEl = document.getElementById('battle-log');
  const entry = document.createElement('div');
  entry.className = 'entry';
  if(type==='player') entry.style.color = '#b7f5c8';
  else if(type==='enemy') entry.style.color = '#f5b7b7';
  else entry.style.color = '#cfe7ff';
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  logEl.prepend(entry);
}

// on load
window.addEventListener('DOMContentLoaded', ()=>{
  try{
    init();
  }catch(e){
    console.error('Init failed', e);
    const logEl = document.getElementById && document.getElementById('battle-log');
    if(logEl){ const n = document.createElement('div'); n.className='entry'; n.textContent = 'Init error: '+e.message; logEl.prepend(n); }
    throw e;
  }
});

// global error handler to surface runtime errors into the battle log
window.addEventListener('error', (ev)=>{
  console.error('Global error', ev.error || ev.message);
  const logEl = document.getElementById && document.getElementById('battle-log');
  if(logEl){
    const d = document.createElement('div'); d.className='entry'; d.textContent = `[Error] ${ev.message || ev.error}`; logEl.prepend(d);
  }
});

/* Persistence: save/load to localStorage */
const STORAGE_KEY = 'autobatt_state_v1';
function saveGameState(){
  try{
    const save = {
      playerHP: state.playerHP,
      enemyHP: state.enemyHP,
      playerGrid: state.playerGrid.map(i=> i ? {id:i.id,key:i.key,owner:i.owner, nextAvailable:i.nextAvailable,shape:i.shape} : null),
      enemyGrid: state.enemyGrid.map(i=> i ? {id:i.id,key:i.key,owner:i.owner, nextAvailable:i.nextAvailable,shape:i.shape} : null),
      storageGrid: state.storageGrid.map(i=> i ? {id:i.id,key:i.key,owner:i.owner, nextAvailable:i.nextAvailable,shape:i.shape} : null),
      playerStorageGrid: state.playerStorageGrid.map(i=> i ? {id:i.id,key:i.key,owner:i.owner, nextAvailable:i.nextAvailable,shape:i.shape} : null),
      enemyStorageGrid: state.enemyStorageGrid.map(i=> i ? {id:i.id,key:i.key,owner:i.owner, nextAvailable:i.nextAvailable,shape:i.shape} : null),
      shopInstances: state.shopInstances.map(i=> ({id:i.id,key:i.key,owner:i.owner})),
      gold: state.gold || 0
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  }catch(e){ console.warn('Save failed',e); }
}

function loadGameState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return false;
    const obj = JSON.parse(raw);
    // basic validation of saved grids length
    const expectedPlayerLen = PLAYER_SLOTS.cols * PLAYER_SLOTS.rows;
    const expectedStorageLen = STORAGE_SLOTS.cols * STORAGE_SLOTS.rows;
    if(!obj.playerGrid || !obj.enemyGrid || !obj.storageGrid) return false;
    if(obj.playerGrid.length !== expectedPlayerLen || obj.enemyGrid.length !== expectedPlayerLen || obj.storageGrid.length !== expectedStorageLen) return false;

    state.playerHP = obj.playerHP||100;
    state.enemyHP = obj.enemyHP||100;
    // helper to materialize instances
    function materialize(arr){
      return arr.map(cell => {
        if(!cell) return null;
        const inst = GameItems.createItemInstance(cell.key, cell.owner);
        // ensure id continuity
        inst.id = cell.id;
        inst.nextAvailable = cell.nextAvailable || null;
        return inst;
      });
    }
    state.playerGrid = materialize(obj.playerGrid);
    state.enemyGrid = materialize(obj.enemyGrid);
    state.storageGrid = materialize(obj.storageGrid);
    state.playerStorageGrid = materialize(obj.playerStorageGrid || []);
    state.enemyStorageGrid = materialize(obj.enemyStorageGrid || []);
    state.shopInstances = (obj.shopInstances||[]).map(si => {
      const inst = GameItems.createItemInstance(si.key, si.owner);
      inst.id = si.id; return inst;
    });
    // currency
    state.gold = obj.gold || 200;
    // ensure next item id counter
    const maxIdNum = [state.playerGrid, state.enemyGrid, state.storageGrid, state.playerStorageGrid, state.enemyStorageGrid, state.shopInstances].flat().filter(Boolean).map(i=>{
      const m = i.id && i.id.match(/itm-(\d+)/); return m? Number(m[1]) : 0;
    }).reduce((a,b)=> Math.max(a,b), 0);
    if(maxIdNum) GameItems.ensureNextItemId(maxIdNum+1);
    renderAllGrids();
    renderHUD();
    return true;
  }catch(e){ console.warn('Load failed',e); return false; }
}

/* HUD: render gold and controls */
function renderHUD(){
  const el = document.getElementById('gold-amount');
  if(el) el.textContent = (state.gold||0).toString();
}

  // end IIFE wrapper
})();
