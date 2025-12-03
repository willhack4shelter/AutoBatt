import { state, saveGameState } from './store.js';

/* Game engine module
   - Implements battle loop and round lifecycle
   - Uses `window.GameItems` for templates and calls into window-side UI helpers
*/

function _now(){ return performance.now(); }

export function startBattle(){
  if(state.battle) return; // already running
  state.battle = { tickTimer: null };
  // schedule first availability based on cooldown
  ['playerGrid','enemyGrid'].forEach(gname=>{
    const grid = state[gname];
    const unique = new Set();
    grid.forEach(cell=>{ if(cell) unique.add(cell); });
    unique.forEach(inst=>{ inst.nextAvailable = _now() + (inst.cooldown||0)*1000; });
  });
  const tick = ()=>{
    const now = _now();
    // call into UI if provided
    try{ if(window && window.updateBattleTimer) window.updateBattleTimer(); }catch(e){}
    processActivations(now);
    try{ if(window && window.updateHPDisplays) window.updateHPDisplays(); }catch(e){}
    if((state.playerHP||0) <= 0 || (state.enemyHP||0) <= 0){ endBattle(); }
  };
  state.battle.tickTimer = setInterval(tick, 100);
}

export function endBattle(){
  if(!state.battle) return;
  clearInterval(state.battle.tickTimer);
  state.battle = null;
  const winner = (state.playerHP>state.enemyHP)? 'Spieler' : (state.enemyHP>state.playerHP? 'Gegner' : 'Unentschieden');
  try{ if(window && window.colorLog) window.colorLog(`Battle beendet — Sieger: ${winner}`,'info'); else if(window && window.log) window.log(`Battle beendet — Sieger: ${winner}`); }catch(e){}
  handleEndOfRound(winner);
}

function processActivations(now){
  ['playerGrid','enemyGrid'].forEach(gname=>{
    const grid = state[gname];
    const unique = new Set();
    grid.forEach(cell=>{ if(cell) unique.add(cell); });
    unique.forEach(inst=>{
      if(!inst || !inst.nextAvailable) return;
      if(now >= inst.nextAvailable){
        const owner = (gname==='playerGrid')? 'player' : 'enemy';
        const target = owner==='player' ? 'enemy' : 'player';
        applyItemEffect(inst, owner, target);
        inst.nextAvailable = now + (inst.cooldown||0)*1000;
      }
    });
  });
}

function applyItemEffect(inst, owner, target){
  const dmg = inst.damage||0; const heal = inst.heal||0;
  if(dmg>0){ if(target==='enemy') state.enemyHP = Math.max(0, state.enemyHP - dmg); else state.playerHP = Math.max(0, state.playerHP - dmg); try{ if(window && window.colorLog) window.colorLog(`${owner} verwendet ${inst.name} und verursacht ${dmg} Schaden an ${target}`, owner); }catch(e){} }
  if(heal>0){ if(owner==='player') state.playerHP = Math.min(100, state.playerHP + heal); else state.enemyHP = Math.min(100, state.enemyHP + heal); try{ if(window && window.colorLog) window.colorLog(`${owner} verwendet ${inst.name} und heilt ${heal} HP`, owner); }catch(e){} }
}

function handleEndOfRound(winner){
  if(winner==='Spieler'){
    const hpDiff = Math.max(0, Math.round((state.playerHP||0) - (state.enemyHP||0)));
    state.gold = (state.gold||0) + hpDiff;
    try{ if(window && window.log) window.log(`Spieler erhält ${hpDiff} Gold (HP-Differenz).`); }catch(e){}
    // drop one random template
    const pool = (window && window.GameItems && window.GameItems.ITEMS) ? window.GameItems.ITEMS : [];
    if(pool.length){
      const template = pool[Math.floor(Math.random()*pool.length)];
      const drop = window.GameItems.createItemInstance(template.key,'player');
      // try to place into player-inv, then player-storage, then global storage via helpers if available
      try{
        if(window && window.placeIntoFirstFree){
          if(!window.placeIntoFirstFree(state.playerGrid, 6, 3, drop)){
            if(!window.placeIntoFirstFree(state.playerStorageGrid, 6, 6, drop)){
              window.placeIntoFirstFree(state.storageGrid, 10, 4, drop);
            }
          }
        }else{
          // fallback: push into storage grid first empty
          for(let i=0;i<state.storageGrid.length;i++){ if(!state.storageGrid[i]){ state.storageGrid[i]=drop; break; } }
        }
      }catch(e){ console.warn('Drop placement failed', e); }
      try{ if(window && window.log) window.log(`Item gedroppt: ${drop.name}`); }catch(e){}
    }
  }
  // regenerate enemy and refill shop
  generateNewEnemy();
  // spawn 5 shop items
  const shopPool = (window && window.GameItems && window.GameItems.ITEMS) ? window.GameItems.ITEMS.slice() : [];
  state.shopInstances = [];
  for(let k=0;k<5 && shopPool.length;k++){
    const idx = Math.floor(Math.random()*shopPool.length);
    const t = shopPool.splice(idx,1)[0];
    state.shopInstances.push(window.GameItems.createItemInstance(t.key,'shop'));
  }
  try{ if(window && window.renderAllGrids) window.renderAllGrids(); if(window && window.renderHUD) window.renderHUD(state); }catch(e){}
  saveGameState();
}

function generateNewEnemy(){
  state.enemyHP = 100;
  state.enemyGrid = Array(6*3).fill(null);
  state.enemyStorageGrid = Array(6*6).fill(null);
  const pool = (window && window.GameItems && window.GameItems.ITEMS) ? window.GameItems.ITEMS : [];
  for(let k=0;k<3;k++){
    const t = pool[Math.floor(Math.random()*pool.length)];
    const inst = window.GameItems.createItemInstance(t.key,'enemy');
    if(window && window.placeIntoFirstFree) window.placeIntoFirstFree(state.enemyGrid, 6, 3, inst); else { for(let i=0;i<state.enemyGrid.length;i++){ if(!state.enemyGrid[i]){ state.enemyGrid[i]=inst; break; } } }
  }
  const sCount = 2 + Math.floor(Math.random()*3);
  for(let k=0;k<sCount;k++){
    const t = pool[Math.floor(Math.random()*pool.length)];
    const inst = window.GameItems.createItemInstance(t.key,'enemy-storage');
    if(window && window.placeIntoFirstFree) window.placeIntoFirstFree(state.enemyStorageGrid, 6, 6, inst); else { for(let i=0;i<state.enemyStorageGrid.length;i++){ if(!state.enemyStorageGrid[i]){ state.enemyStorageGrid[i]=inst; break; } } }
  }
  try{ if(window && window.log) window.log('Neuer Gegner generiert.'); }catch(e){}
}

// expose a small helper if the consumer wants to attach to window directly
export function attachToWindow(){
  if(window) window.GameEngine = { startBattle, endBattle, generateNewEnemy };
}
