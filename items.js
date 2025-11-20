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

// Beispiel-Items — du kannst diese Liste direkt editieren
const ITEMS = [
  {key:'rock', name:'Stein', shape:[1,1], damage:6, heal:0, price:5, cooldown:2.5, dropChance:0.5, rarity:'common'},
  {key:'bandage', name:'Bandage', shape:[1,1], damage:0, heal:8, price:8, cooldown:3.0, dropChance:0.45, rarity:'common'},
  {key:'sword', name:'Kurzschwert', shape:[1,2], damage:16, heal:0, price:30, cooldown:5.5, dropChance:0.18, rarity:'rare'},
  {key:'medkit', name:'MedKit', shape:[2,1], damage:0, heal:28, price:70, cooldown:8.0, dropChance:0.08, rarity:'rare'},
  {key:'rifle', name:'Gewehr', shape:[1,3], damage:40, heal:0, price:160, cooldown:10.5, dropChance:0.03, rarity:'epic'},
  {key:'orb', name:'Heiliges Orb', shape:[2,2], damage:0, heal:60, price:420, cooldown:11.0, dropChance:0.01, rarity:'legendary'}
];

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

// expose for script
window.GameItems = {ITEMS, RARITIES, createItemInstance};
