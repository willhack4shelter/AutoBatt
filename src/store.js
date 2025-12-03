/* Lightweight store module: holds state and persistence helpers */
export const state = {
  playerHP: 100,
  enemyHP: 100,
  playerGrid: [],
  enemyGrid: [],
  storageGrid: [],
  playerStorageGrid: [],
  enemyStorageGrid: [],
  shopInstances: [],
  gold: 200,
  battle: null
};

const STORAGE_KEY = 'autobatt_state_v1';

export function saveGameState(){
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

export function loadGameState(GameItems, makeGridArray){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return false;
    const obj = JSON.parse(raw);
    // basic validation
    const expectedPlayerLen = 6 * 3; // depends on UI sizes; keep small validation
    const expectedStorageLen = 10 * 4;
    if(!obj.playerGrid || !obj.enemyGrid || !obj.storageGrid) return false;
    if(obj.playerGrid.length !== expectedPlayerLen || obj.enemyGrid.length !== expectedPlayerLen || obj.storageGrid.length !== expectedStorageLen) return false;

    state.playerHP = obj.playerHP||100;
    state.enemyHP = obj.enemyHP||100;
    function materialize(arr){
      return arr.map(cell => {
        if(!cell) return null;
        const inst = GameItems.createItemInstance(cell.key, cell.owner);
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
    state.gold = obj.gold || 200;
    return true;
  }catch(e){ console.warn('Load failed',e); return false; }
}
