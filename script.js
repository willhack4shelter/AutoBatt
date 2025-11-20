/* Hauptlogik für AutoBatt Demo
   - Erzeugt Inventare (6x3 für Spieler), Storage (8x2)
   - Drag & Drop mit Vorschau (Highlight für benötigte Felder)
   - Shop Items können ins Inventar oder Storage gezogen werden
   - Starteritems werden verteilt (3 je Spieler)
   - Battle läuft 12s, Items werden nach ihrem cooldown zum ersten Mal benutzt
*/

const PLAYER_SLOTS = {cols:6, rows:3};
const STORAGE_SLOTS = {cols:8, rows:2};
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
  state.playerGrid = makeGridArray(PLAYER_SLOTS.cols, PLAYER_SLOTS.rows);
  state.enemyGrid = makeGridArray(PLAYER_SLOTS.cols, PLAYER_SLOTS.rows);
  state.storageGrid = makeGridArray(STORAGE_SLOTS.cols, STORAGE_SLOTS.rows);
  buildGrid('player-inv', PLAYER_SLOTS.cols, PLAYER_SLOTS.rows, state.playerGrid, 'player');
  buildGrid('enemy-inv', PLAYER_SLOTS.cols, PLAYER_SLOTS.rows, state.enemyGrid, 'enemy');
  buildGrid('storage-grid', STORAGE_SLOTS.cols, STORAGE_SLOTS.rows, state.storageGrid, 'storage');

  // try to load saved state; if none, build defaults
  if(!loadGameState()){
    buildShop();
    assignStarterItems();
  }

  updateHPDisplays();
  document.getElementById('start-battle').addEventListener('click', ()=>startBattle());
  const btn = document.getElementById('btn-reset');
  if(btn) btn.addEventListener('click', ()=>{
    if(confirm('Speicher zurücksetzen und neu laden?')){
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  });
  renderHUD();
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
    slot.addEventListener('dragover', onDragOverSlot);
    slot.addEventListener('dragleave', onDragLeaveSlot);
    slot.addEventListener('drop', onDropOnSlot);
    container.appendChild(slot);
  }
}

function buildShop(){
  const shop = document.getElementById('shop-items');
  shop.innerHTML='';
  // create instances for shop (one of each template)
  if(!state.shopInstances || state.shopInstances.length===0){
    state.shopInstances = [];
    GameItems.ITEMS.forEach(t => {
      const inst = GameItems.createItemInstance(t.key,'shop');
      state.shopInstances.push(inst);
    });
  }
  state.shopInstances.forEach(inst=>{
    const el = renderShopItem(inst);
    // add click-to-buy handler
    el.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      buyFromShop(inst);
    });
    shop.appendChild(el);
  });
}

function buyFromShop(inst){
  state.gold = state.gold || 200;
  if(state.gold < inst.price){ log(`Nicht genug Gold für ${inst.name} (Preis ${inst.price})`); return; }
  // try to place into player inventory first
  const clone = GameItems.createItemInstance(inst.key,'player');
  const placed = placeIntoFirstFree(state.playerGrid, PLAYER_SLOTS.cols, PLAYER_SLOTS.rows, clone);
  if(!placed){
    // try storage
    const placed2 = placeIntoFirstFree(state.storageGrid, STORAGE_SLOTS.cols, STORAGE_SLOTS.rows, clone);
    if(!placed2){ log('Kein Platz im Inventar oder Storage, Kauf abgebrochen.'); return; }
  }
  state.gold -= inst.price;
  log(`Gekauft: ${inst.name} für ${inst.price} Gold.`);
  saveGameState();
  renderAllGrids(); renderHUD();
}

function renderShopItem(item){
  const el = document.createElement('div');
  el.className = `item ${GameItems.RARITIES[item.rarity].colorClass}`;
  el.draggable = true;
  el.style.width = `${item.shape[0]*40 + (item.shape[0]-1)*6}px`;
  el.style.height = `${item.shape[1]*40 + (item.shape[1]-1)*6}px`;
  el.dataset.itemId = item.id;
  el.innerHTML = `<div>${item.name}</div><small>${item.damage?('Dmg:'+item.damage):''}${item.heal?(' Heal:'+item.heal):''} CD:${item.cooldown}s</small>`;
  el.addEventListener('dragstart', (ev)=>onDragStart(ev,item,el));
  el.addEventListener('dragend', onDragEnd);
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
  const [w,h] = shape;
  const startR = Math.floor(startIndex/cols), startC = startIndex%cols;
  const cells = [];
  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
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
    el.draggable = true;
    // account for grid padding (6px) and gap (6px)
    const pad = 6; const gap = 6; const cell = 40;
    el.style.left = `${pad + c*(cell+gap)}px`;
    el.style.top = `${pad + r*(cell+gap)}px`;
    el.style.width = `${inst.shape[0]*40 + (inst.shape[0]-1)*6}px`;
    el.style.height = `${inst.shape[1]*40 + (inst.shape[1]-1)*6}px`;
    el.innerHTML = `<div>${inst.name}</div><small>${inst.damage?('D:'+inst.damage):''}${inst.heal?(' H:'+inst.heal):''}</small>`;
    el.addEventListener('dragstart', (ev)=>onDragStart(ev,inst,el));
    el.addEventListener('dragend', onDragEnd);
    container.appendChild(el);
  }
}

function renderShopInstances(){
  const shop = document.getElementById('shop-items');
  // remove all remaining shop DOM items (they were the originals); regenerate
  shop.innerHTML = '';
  state.shopInstances.forEach(inst=>{
    shop.appendChild(renderShopItem(inst));
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
  state.battle = {
    startTime: performance.now(),
    tickTimer: null,
    elapsed:0,
    end:false
  };
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
    const elapsed = (now - state.battle.startTime)/1000;
    state.battle.elapsed = elapsed;
    document.getElementById('battle-timer').textContent = elapsed.toFixed(1)+'s';
    // process activations
    processActivations(now);
    updateHPDisplays();
    if(elapsed>=BATTLE_DURATION || state.playerHP<=0 || state.enemyHP<=0){
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
    log(`${owner} verwendet ${inst.name} und verursacht ${dmg} Schaden an ${target}`);
  }
  if(heal>0){
    if(owner==='player') { state.playerHP = Math.min(100, state.playerHP + heal); }
    else { state.enemyHP = Math.min(100, state.enemyHP + heal); }
    log(`${owner} verwendet ${inst.name} und heilt ${heal} HP`);
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

// on load
window.addEventListener('DOMContentLoaded', ()=>{
  init();
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
      shopInstances: state.shopInstances.map(i=> ({id:i.id,key:i.key,owner:i.owner}))
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
    state.shopInstances = (obj.shopInstances||[]).map(si => {
      const inst = GameItems.createItemInstance(si.key, si.owner);
      inst.id = si.id; return inst;
    });
    // currency
    state.gold = obj.gold || 200;
    // ensure next item id counter
    const maxIdNum = [state.playerGrid, state.enemyGrid, state.storageGrid, state.shopInstances].flat().filter(Boolean).map(i=>{
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
