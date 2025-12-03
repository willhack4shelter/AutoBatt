/*
  ITEMS configuration
  - Einfach anpassbar: änder oder ergänze Einträge in ITEMS.
  - shape: width x height in inventory-slots
  - cooldown in seconds (0.5 - 11.5), damage/heal, price, dropChance (0-1)
  - rarity: affects visuals and typical stat ranges
*/

const RARITIES = {
  common: {label:'Common', colorClass:'rarity-common'},
  rare: {label:'Rare', colorClass:'rarity-rare'},
  epic: {label:'Epic', colorClass:'rarity-epic'},
  legendary: {label:'Legendary', colorClass:'rarity-legendary'}
};


// Erzeuge programmgesteuert eine größere Items-Liste (50 Items), leicht anpassbar
const ITEMS = [];
// shapes: can be simple [w,h] or a mask (array of rows) to allow L-shapes
const SHAPES = [
  [1,1],[1,2],[2,1],[2,2],[1,3],[3,1],
  // L-shape masks (3x2 etc)
  {w:2,h:2,mask:[[1,0],[1,1]]},
  {w:3,h:2,mask:[[1,0,0],[1,1,1]]}
];
// rarity distribution: more commons, few rares/epics/legendary
const RARITY_ORDER = ['common','common','common','common','common','common','rare','rare','rare','epic','epic','legendary'];

function addTemplate(i){
  const rarity = RARITY_ORDER[Math.floor(Math.random()*RARITY_ORDER.length)];
  const rawShape = SHAPES[i % SHAPES.length];
  const shape = (rawShape.mask) ? {w:rawShape.w,h:rawShape.h,mask:rawShape.mask} : [rawShape[0], rawShape[1]];
  // scale stats by index and rarity
  const base = 4 + Math.floor(i*1.6);
  const rarityScale = ({common:1, rare:1.6, epic:2.5, legendary:4})[rarity]||1;
  const damage = Math.round(base * rarityScale);
  const heal = (i%5===0)? Math.round((base/1.2)*rarityScale) : 0;
  const cooldown = Math.max(0.5, Math.min(11.5, (1 + (50-i)/10 + (rarity==='legendary'?4:0))));
  const price = Math.round((10 + i*8) * rarityScale);
  const dropChance = Math.max(0.01, Math.min(0.7, 0.6 / rarityScale * (1 - i/120)));
  const key = `itm_${i}`;
  // nicer fantasy names from base nouns
  const baseNames = ['Schwert','Schild','Trank','Dolch','Bogen','Stab','Rüstung','Ring','Amulett','Faustkeil'];
  const addons = ['der Morgenröte','des Sturms','vom Düsterwald','aus Feuerstein','der Tiefen','des Wanderers','des Alten','der Nebelinsel','des Phönix','des Windes'];
  const name = `${baseNames[i % baseNames.length]} ${addons[i % addons.length]}`;
  const template = {key,name,damage,heal,price,cooldown:Number(cooldown.toFixed(2)),dropChance:Number(dropChance.toFixed(3)),rarity};
  if(Array.isArray(shape)) template.shape = [shape[0],shape[1]]; else template.shape = {w:shape.w,h:shape.h,mask:shape.mask};
  ITEMS.push(template);
}

for(let i=1;i<=50;i++) addTemplate(i);

let _nextItemId = 1;
function createItemInstance(templateKey, owner){
  const t = ITEMS.find(it => it.key===templateKey);
  if(!t) throw new Error('Unknown item key '+templateKey);
  const id = 'itm-'+(_nextItemId++);
  // normalize shape to object {w,h,mask}
  let normShape;
  if(Array.isArray(t.shape)){
    normShape = {w: t.shape[0], h: t.shape[1], mask: null};
  }else if(t.shape && typeof t.shape === 'object'){
    normShape = {w: t.shape.w, h: t.shape.h, mask: t.shape.mask || null};
  }else{
    normShape = {w:1,h:1,mask:null};
  }
  return {
    id, key:t.key, name:t.name, shape: normShape, damage:t.damage, heal:t.heal, price:t.price,
    cooldown: Number(t.cooldown), dropChance:t.dropChance, rarity:t.rarity, owner: owner||'shop', nextAvailable: null
  };
}

function ensureNextItemId(n){ if(typeof n==='number' && n>_nextItemId) _nextItemId = n; }

// expose for script
window.GameItems = {ITEMS, RARITIES, createItemInstance, ensureNextItemId};
