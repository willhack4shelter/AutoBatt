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

console.log('GameItems: templates loaded, count=', ITEMS.length);

// Erzeuge programmgesteuert eine größere Items-Liste (50 Items), leicht anpassbar
const ITEMS = [];
const SHAPES = [[1,1],[1,2],[2,1],[2,2],[1,3],[3,1]];
// rarity distribution: more commons, few rares/epics/legendary
const RARITY_ORDER = ['common','common','common','common','common','common','rare','rare','rare','epic','epic','legendary'];

function addTemplate(i){
  const rarity = RARITY_ORDER[Math.floor(Math.random()*RARITY_ORDER.length)];
  const shape = SHAPES[i % SHAPES.length];
  // scale stats by index and rarity
  const base = 4 + Math.floor(i*1.6);
  const rarityScale = ({common:1, rare:1.6, epic:2.5, legendary:4})[rarity]||1;
  const damage = Math.round(base * rarityScale);
  const heal = (i%5===0)? Math.round((base/1.2)*rarityScale) : 0;
  const cooldown = Math.max(0.5, Math.min(11.5, (1 + (50-i)/10 + (rarity==='legendary'?4:0))));
  const price = Math.round((10 + i*8) * rarityScale);
  const dropChance = Math.max(0.01, Math.min(0.7, 0.6 / rarityScale * (1 - i/120)));
  const key = `itm_${i}`;
  const name = `${rarity.charAt(0).toUpperCase()+rarity.slice(1)} Item ${i}`;
  ITEMS.push({key,name,shape:[shape[0],shape[1]],damage,heal,price,cooldown:Number(cooldown.toFixed(2)),dropChance:Number(dropChance.toFixed(3)),rarity});
}

for(let i=1;i<=50;i++) addTemplate(i);

let _nextItemId = 1;
function createItemInstance(templateKey, owner){
  const t = ITEMS.find(it => it.key===templateKey);
  if(!t) throw new Error('Unknown item key '+templateKey);
  const id = 'itm-'+(_nextItemId++);
  return {
    id, key:t.key, name:t.name, shape: t.shape.slice(), damage:t.damage, heal:t.heal, price:t.price,
    cooldown: Number(t.cooldown), dropChance:t.dropChance, rarity:t.rarity, owner: owner||'shop', nextAvailable: null
  };
}

function ensureNextItemId(n){ if(typeof n==='number' && n>_nextItemId) _nextItemId = n; }

// expose for script
window.GameItems = {ITEMS, RARITIES, createItemInstance, ensureNextItemId};
