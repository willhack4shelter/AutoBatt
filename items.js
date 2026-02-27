(function () {
  const RARITIES = {
    common: { label: 'Common', colorClass: 'rarity-common', mod: 1 },
    rare: { label: 'Rare', colorClass: 'rarity-rare', mod: 1.35 },
    epic: { label: 'Epic', colorClass: 'rarity-epic', mod: 1.75 },
    legendary: { label: 'Legendary', colorClass: 'rarity-legendary', mod: 2.25 }
  };

  const CATALOG = [
    { key: 'knife', name: 'Messer', damage: 8, heal: 0, cooldown: 1.3, price: 20, rarity: 'common', shape: [1, 1] },
    { key: 'potion', name: 'Heiltrank', damage: 0, heal: 10, cooldown: 2.2, price: 24, rarity: 'common', shape: [1, 1] },
    { key: 'club', name: 'Keule', damage: 14, heal: 0, cooldown: 2.4, price: 34, rarity: 'common', shape: [1, 2] },
    { key: 'buckler', name: 'Buckler', damage: 4, heal: 5, cooldown: 2.1, price: 32, rarity: 'common', shape: [2, 1] },

    { key: 'rapier', name: 'Rapier', damage: 22, heal: 0, cooldown: 2.4, price: 54, rarity: 'rare', shape: [1, 2] },
    { key: 'crossbow', name: 'Armbrust', damage: 26, heal: 0, cooldown: 3.4, price: 62, rarity: 'rare', shape: [2, 1] },
    { key: 'fieldkit', name: 'Field Kit', damage: 0, heal: 18, cooldown: 3.2, price: 58, rarity: 'rare', shape: [2, 1] },
    { key: 'lance', name: 'Lanze', damage: 24, heal: 0, cooldown: 2.6, price: 66, rarity: 'rare', shape: [1, 3] },

    { key: 'sunblade', name: 'Sunblade', damage: 32, heal: 5, cooldown: 2.8, price: 92, rarity: 'epic', shape: [2, 2] },
    { key: 'medicore', name: 'Medi-Core', damage: 8, heal: 24, cooldown: 3.6, price: 96, rarity: 'epic', shape: [2, 2] },
    { key: 'halberd', name: 'Hellebarde', damage: 36, heal: 0, cooldown: 3.3, price: 110, rarity: 'epic', shape: [3, 1] },

    { key: 'aegis', name: 'Aegis', damage: 15, heal: 24, cooldown: 3.1, price: 150, rarity: 'legendary', shape: [2, 2] },
    { key: 'dawncannon', name: 'Dawn Cannon', damage: 50, heal: 0, cooldown: 4.3, price: 170, rarity: 'legendary', shape: [3, 1] }
  ];

  let nextId = 1;

  function normalizeShape(shape) {
    if (Array.isArray(shape)) return { w: shape[0], h: shape[1], mask: null };
    return { w: shape.w || 1, h: shape.h || 1, mask: shape.mask || null };
  }

  function createItemInstance(key, owner) {
    const tpl = CATALOG.find((item) => item.key === key);
    if (!tpl) throw new Error(`Unknown item key: ${key}`);
    const rarity = RARITIES[tpl.rarity] || RARITIES.common;
    return {
      id: `itm-${nextId++}`,
      key: tpl.key,
      name: tpl.name,
      shape: normalizeShape(tpl.shape),
      damage: Math.round(tpl.damage * rarity.mod),
      heal: Math.round(tpl.heal * rarity.mod),
      cooldown: Number(tpl.cooldown.toFixed(2)),
      price: Math.round(tpl.price * rarity.mod),
      rarity: tpl.rarity,
      owner: owner || 'shop',
      nextAvailable: null
    };
  }

  function ensureNextItemId(n) {
    if (typeof n === 'number' && n > nextId) nextId = n;
  }

  window.GameItems = {
    ITEMS: CATALOG,
    RARITIES,
    createItemInstance,
    ensureNextItemId
  };
})();
