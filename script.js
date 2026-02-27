(function () {
  'use strict';

  const GRID = {
    player: { cols: 6, rows: 3 },
    enemy: { cols: 6, rows: 3 },
    playerStorage: { cols: 6, rows: 6 },
    enemyStorage: { cols: 6, rows: 6 },
    storage: { cols: 10, rows: 4 }
  };

  const CONFIG = {
    maxHP: 100,
    startGold: 200,
    shopSize: 5,
    enemyItems: 3,
    enemyStorageMin: 2,
    enemyStorageMax: 4,
    tickMs: 120,
    saveKey: 'autobatt_swiss_v1'
  };

  const state = {
    playerHP: CONFIG.maxHP,
    enemyHP: CONFIG.maxHP,
    playerGrid: [],
    enemyGrid: [],
    playerStorageGrid: [],
    enemyStorageGrid: [],
    storageGrid: [],
    shopInstances: [],
    gold: CONFIG.startGold,
    battle: null
  };

  const ui = {};

  function now() {
    return performance.now();
  }

  function gridForOwner(owner) {
    if (owner === 'player') return state.playerGrid;
    if (owner === 'enemy') return state.enemyGrid;
    if (owner === 'player-storage') return state.playerStorageGrid;
    if (owner === 'enemy-storage') return state.enemyStorageGrid;
    return state.storageGrid;
  }

  function sizeForOwner(owner) {
    if (owner === 'player') return GRID.player;
    if (owner === 'enemy') return GRID.enemy;
    if (owner === 'player-storage') return GRID.playerStorage;
    if (owner === 'enemy-storage') return GRID.enemyStorage;
    return GRID.storage;
  }

  function emptyGrid(cols, rows) {
    return Array(cols * rows).fill(null);
  }

  function isDroppableOwner(owner) {
    return owner === 'player' || owner === 'player-storage' || owner === 'storage';
  }

  function log(message, type) {
    const entry = document.createElement('div');
    entry.className = 'entry';
    entry.style.color = type === 'player' ? '#1f8a4d' : type === 'enemy' ? '#b5332e' : '#232323';
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    ui.log.prepend(entry);
  }

  let tooltipEl = null;
  function ensureTooltip() {
    if (tooltipEl) return tooltipEl;
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'item-tooltip';
    tooltipEl.style.position = 'fixed';
    tooltipEl.style.pointerEvents = 'none';
    tooltipEl.style.zIndex = '9999';
    tooltipEl.style.display = 'none';
    document.body.appendChild(tooltipEl);
    return tooltipEl;
  }

  function showTooltip(item, x, y) {
    const el = ensureTooltip();
    el.innerHTML = `<strong>${item.name}</strong><br>Dmg ${item.damage} · Heal ${item.heal}<br>Cooldown ${item.cooldown}s · Preis ${item.price}<br>${item.rarity}`;
    el.style.left = `${x + 12}px`;
    el.style.top = `${y + 12}px`;
    el.style.display = 'block';
  }

  function hideTooltip() {
    if (tooltipEl) tooltipEl.style.display = 'none';
  }

  function canPlace(grid, cols, rows, index, shape) {
    const w = shape.w;
    const h = shape.h;
    const mask = shape.mask;
    const startRow = Math.floor(index / cols);
    const startCol = index % cols;
    const cells = [];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (mask && (!mask[y] || !mask[y][x])) continue;
        const c = startCol + x;
        const r = startRow + y;
        if (c >= cols || r >= rows) return { ok: false, cells: [] };
        const i = r * cols + c;
        if (grid[i]) return { ok: false, cells: [] };
        cells.push(i);
      }
    }

    return { ok: true, cells };
  }

  function clearHighlights() {
    document.querySelectorAll('.slot.highlight').forEach((el) => el.classList.remove('highlight'));
  }

  function removeInstanceEverywhere(itemId) {
    const shopIdx = state.shopInstances.findIndex((item) => item.id === itemId);
    if (shopIdx >= 0) state.shopInstances.splice(shopIdx, 1);

    [state.playerGrid, state.enemyGrid, state.playerStorageGrid, state.enemyStorageGrid, state.storageGrid].forEach((grid) => {
      for (let i = 0; i < grid.length; i++) {
        if (grid[i] && grid[i].id === itemId) grid[i] = null;
      }
    });
  }

  function placeFirstFree(grid, cols, rows, item) {
    for (let i = 0; i < grid.length; i++) {
      const fit = canPlace(grid, cols, rows, i, item.shape);
      if (!fit.ok) continue;
      fit.cells.forEach((cell) => {
        grid[cell] = item;
      });
      return true;
    }
    return false;
  }

  function renderSlotItem(item, topLeftIndex, cols) {
    const node = document.createElement('div');
    node.className = `item grid-item ${window.GameItems.RARITIES[item.rarity].colorClass}`;

    const pad = 6;
    const gap = 5;
    const size = 38;
    const col = topLeftIndex % cols;
    const row = Math.floor(topLeftIndex / cols);

    node.style.left = `${pad + col * (size + gap)}px`;
    node.style.top = `${pad + row * (size + gap)}px`;
    node.style.width = `${item.shape.w * size + (item.shape.w - 1) * gap}px`;
    node.style.height = `${item.shape.h * size + (item.shape.h - 1) * gap}px`;

    node.innerHTML = `<div>${item.name}<small>D ${item.damage} · H ${item.heal}</small></div>`;

    const enemyOwned = item.owner === 'enemy' || item.owner === 'enemy-storage';
    node.draggable = !enemyOwned;
    if (!enemyOwned) {
      node.addEventListener('dragstart', (event) => {
        event.dataTransfer.effectAllowed = 'move';
        node.classList.add('dragging');
        window._draggingItem = item;
      });
      node.addEventListener('dragend', () => {
        node.classList.remove('dragging');
        window._draggingItem = null;
        clearHighlights();
      });
    }

    node.addEventListener('mouseenter', (event) => showTooltip(item, event.clientX, event.clientY));
    node.addEventListener('mousemove', (event) => showTooltip(item, event.clientX, event.clientY));
    node.addEventListener('mouseleave', hideTooltip);

    const playerOwned = item.owner === 'player' || item.owner === 'player-storage';
    if (playerOwned) {
      node.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        const value = Math.max(1, Math.round(item.price * 0.5));
        removeInstanceEverywhere(item.id);
        state.gold += value;
        log(`Verkauft ${item.name} für ${value} Gold.`, 'player');
        renderAll();
        persist();
      });
    }

    return node;
  }

  function renderGrid(containerId, grid, owner) {
    const root = document.getElementById(containerId);
    root.querySelectorAll('.grid-item').forEach((el) => el.remove());
    const cols = sizeForOwner(owner).cols;

    const seen = new Set();
    for (let i = 0; i < grid.length; i++) {
      const item = grid[i];
      if (!item || seen.has(item.id)) continue;
      seen.add(item.id);
      root.appendChild(renderSlotItem(item, i, cols));
    }
  }

  function createShopNode(item) {
    const node = document.createElement('div');
    node.className = `item ${window.GameItems.RARITIES[item.rarity].colorClass}`;
    node.style.width = `${item.shape.w * 38 + (item.shape.w - 1) * 5}px`;
    node.style.height = `${item.shape.h * 38 + (item.shape.h - 1) * 5}px`;
    node.draggable = true;
    node.innerHTML = `<div>${item.name}<small>${item.price}g</small></div>`;

    node.addEventListener('click', (event) => {
      event.stopPropagation();
      buy(item);
    });

    node.addEventListener('dragstart', (event) => {
      event.dataTransfer.effectAllowed = 'copyMove';
      node.classList.add('dragging');
      window._draggingItem = item;
    });
    node.addEventListener('dragend', () => {
      node.classList.remove('dragging');
      window._draggingItem = null;
      clearHighlights();
    });

    node.addEventListener('mouseenter', (event) => showTooltip(item, event.clientX, event.clientY));
    node.addEventListener('mousemove', (event) => showTooltip(item, event.clientX, event.clientY));
    node.addEventListener('mouseleave', hideTooltip);

    return node;
  }

  function renderShop() {
    ui.shop.innerHTML = '';
    state.shopInstances.forEach((item) => {
      ui.shop.appendChild(createShopNode(item));
    });
  }

  function renderHud() {
    ui.gold.textContent = String(state.gold);
    ui.playerBar.style.width = `${(Math.max(0, state.playerHP) / CONFIG.maxHP) * 100}%`;
    ui.enemyBar.style.width = `${(Math.max(0, state.enemyHP) / CONFIG.maxHP) * 100}%`;
    ui.playerText.textContent = `${Math.max(0, Math.round(state.playerHP))} / ${CONFIG.maxHP}`;
    ui.enemyText.textContent = `${Math.max(0, Math.round(state.enemyHP))} / ${CONFIG.maxHP}`;
  }

  function renderAll() {
    renderGrid('player-inv', state.playerGrid, 'player');
    renderGrid('enemy-inv', state.enemyGrid, 'enemy');
    renderGrid('player-storage', state.playerStorageGrid, 'player-storage');
    renderGrid('enemy-storage', state.enemyStorageGrid, 'enemy-storage');
    renderGrid('storage-grid', state.storageGrid, 'storage');
    renderShop();
    renderHud();
  }

  function onDragOverSlot(event) {
    event.preventDefault();
    const item = window._draggingItem;
    if (!item) return;

    const owner = event.currentTarget.dataset.owner;
    const index = Number(event.currentTarget.dataset.index);
    const grid = gridForOwner(owner);
    const { cols, rows } = sizeForOwner(owner);

    const fit = canPlace(grid, cols, rows, index, item.shape);
    clearHighlights();
    if (!fit.ok) return;

    fit.cells.forEach((cell) => {
      const target = event.currentTarget.parentElement.children[cell];
      if (target) target.classList.add('highlight');
    });
  }

  function onDropSlot(event) {
    event.preventDefault();
    clearHighlights();

    const item = window._draggingItem;
    if (!item) return;

    const owner = event.currentTarget.dataset.owner;
    const index = Number(event.currentTarget.dataset.index);
    const grid = gridForOwner(owner);
    const { cols, rows } = sizeForOwner(owner);

    const fit = canPlace(grid, cols, rows, index, item.shape);
    if (!fit.ok) {
      log(`Kein Platz für ${item.name} an dieser Position.`);
      return;
    }

    const itemCopy = item.owner === 'shop' ? window.GameItems.createItemInstance(item.key, owner) : item;
    removeInstanceEverywhere(item.id);
    fit.cells.forEach((cell) => {
      grid[cell] = itemCopy;
    });
    itemCopy.owner = owner;

    if (item.owner === 'shop') {
      if (state.gold < item.price) {
        removeInstanceEverywhere(itemCopy.id);
        log(`Nicht genug Gold für ${item.name}.`);
        renderAll();
        return;
      }
      state.gold -= item.price;
      log(`Gekauft: ${item.name} für ${item.price} Gold.`, 'player');
    }

    renderAll();
    persist();
  }

  function buildGridSlots(containerId, owner) {
    const root = document.getElementById(containerId);
    const { cols, rows } = sizeForOwner(owner);
    root.innerHTML = '';
    root.style.gridTemplateColumns = `repeat(${cols}, 38px)`;

    for (let i = 0; i < cols * rows; i++) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.dataset.owner = owner;
      slot.dataset.index = String(i);

      if (isDroppableOwner(owner)) {
        slot.addEventListener('dragover', onDragOverSlot);
        slot.addEventListener('dragleave', clearHighlights);
        slot.addEventListener('drop', onDropSlot);
      }

      root.appendChild(slot);
    }
  }

  function randomTemplate() {
    const all = window.GameItems.ITEMS;
    return all[Math.floor(Math.random() * all.length)];
  }

  function fillShop() {
    state.shopInstances = [];
    const pool = window.GameItems.ITEMS.slice();
    for (let i = 0; i < CONFIG.shopSize && pool.length; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      const tpl = pool.splice(idx, 1)[0];
      state.shopInstances.push(window.GameItems.createItemInstance(tpl.key, 'shop'));
    }
  }

  function buy(shopItem) {
    if (state.gold < shopItem.price) {
      log(`Nicht genug Gold für ${shopItem.name}.`);
      return;
    }

    const instance = window.GameItems.createItemInstance(shopItem.key, 'player');
    const okInventory = placeFirstFree(state.playerGrid, GRID.player.cols, GRID.player.rows, instance);
    const okBackpack = okInventory || placeFirstFree(state.playerStorageGrid, GRID.playerStorage.cols, GRID.playerStorage.rows, instance);

    if (!okBackpack) {
      log(`Kein Platz für ${shopItem.name}.`);
      return;
    }

    removeInstanceEverywhere(shopItem.id);
    state.gold -= shopItem.price;
    log(`Gekauft: ${shopItem.name} für ${shopItem.price} Gold.`, 'player');
    renderAll();
    persist();
  }

  function spawnEnemySetup() {
    state.enemyHP = CONFIG.maxHP;
    state.enemyGrid = emptyGrid(GRID.enemy.cols, GRID.enemy.rows);
    state.enemyStorageGrid = emptyGrid(GRID.enemyStorage.cols, GRID.enemyStorage.rows);

    for (let i = 0; i < CONFIG.enemyItems; i++) {
      const item = window.GameItems.createItemInstance(randomTemplate().key, 'enemy');
      placeFirstFree(state.enemyGrid, GRID.enemy.cols, GRID.enemy.rows, item);
    }

    const storageCount = CONFIG.enemyStorageMin + Math.floor(Math.random() * (CONFIG.enemyStorageMax - CONFIG.enemyStorageMin + 1));
    for (let i = 0; i < storageCount; i++) {
      const item = window.GameItems.createItemInstance(randomTemplate().key, 'enemy-storage');
      placeFirstFree(state.enemyStorageGrid, GRID.enemyStorage.cols, GRID.enemyStorage.rows, item);
    }
  }

  function applyEffect(item, owner) {
    if (owner === 'player') {
      state.enemyHP = Math.max(0, state.enemyHP - (item.damage || 0));
      state.playerHP = Math.min(CONFIG.maxHP, state.playerHP + (item.heal || 0));
    } else {
      state.playerHP = Math.max(0, state.playerHP - (item.damage || 0));
      state.enemyHP = Math.min(CONFIG.maxHP, state.enemyHP + (item.heal || 0));
    }

    const verb = owner === 'player' ? 'Spieler' : 'Gegner';
    log(`${verb}: ${item.name} (D${item.damage}/H${item.heal})`, owner);
  }

  function processTeam(grid, owner, t) {
    const unique = new Set(grid.filter(Boolean));
    unique.forEach((item) => {
      if (!item.nextAvailable) item.nextAvailable = t + item.cooldown * 1000;
      if (t < item.nextAvailable) return;
      applyEffect(item, owner);
      item.nextAvailable = t + item.cooldown * 1000;
    });
  }

  function battleTick() {
    const t = now();
    processTeam(state.playerGrid, 'player', t);
    processTeam(state.enemyGrid, 'enemy', t);
    renderHud();

    if (state.playerHP <= 0 || state.enemyHP <= 0) endBattle();
  }

  function endBattle() {
    if (!state.battle) return;
    clearInterval(state.battle.timer);
    state.battle = null;

    const winner = state.playerHP > state.enemyHP ? 'Spieler' : state.enemyHP > state.playerHP ? 'Gegner' : 'Unentschieden';
    log(`Battle beendet. Sieger: ${winner}`);

    if (winner === 'Spieler') {
      const reward = Math.max(5, Math.round(state.playerHP - state.enemyHP));
      state.gold += reward;
      log(`Belohnung: ${reward} Gold.`, 'player');

      const drop = window.GameItems.createItemInstance(randomTemplate().key, 'player');
      const inInv = placeFirstFree(state.playerGrid, GRID.player.cols, GRID.player.rows, drop);
      const inBackpack = inInv || placeFirstFree(state.playerStorageGrid, GRID.playerStorage.cols, GRID.playerStorage.rows, drop);
      if (!inBackpack) placeFirstFree(state.storageGrid, GRID.storage.cols, GRID.storage.rows, drop);
      log(`Drop: ${drop.name}`);
    }

    state.playerHP = CONFIG.maxHP;
    fillShop();
    spawnEnemySetup();
    renderAll();
    persist();
  }

  function startBattle() {
    if (state.battle) return;
    state.battle = { timer: null };
    ui.log.innerHTML = '';

    const t = now();
    [state.playerGrid, state.enemyGrid].forEach((grid) => {
      new Set(grid.filter(Boolean)).forEach((item) => {
        item.nextAvailable = t + item.cooldown * 1000;
      });
    });

    state.battle.timer = setInterval(battleTick, CONFIG.tickMs);
  }

  function persist() {
    const save = {
      hp: { p: state.playerHP, e: state.enemyHP },
      gold: state.gold,
      playerGrid: serializeGrid(state.playerGrid),
      enemyGrid: serializeGrid(state.enemyGrid),
      playerStorageGrid: serializeGrid(state.playerStorageGrid),
      enemyStorageGrid: serializeGrid(state.enemyStorageGrid),
      storageGrid: serializeGrid(state.storageGrid),
      shopInstances: state.shopInstances.map(serializeItem)
    };
    localStorage.setItem(CONFIG.saveKey, JSON.stringify(save));
  }

  function serializeItem(item) {
    return { id: item.id, key: item.key, owner: item.owner, nextAvailable: item.nextAvailable };
  }

  function serializeGrid(grid) {
    return grid.map((item) => (item ? serializeItem(item) : null));
  }

  function materialize(list) {
    return (list || []).map((entry) => {
      if (!entry) return null;
      const item = window.GameItems.createItemInstance(entry.key, entry.owner);
      item.id = entry.id;
      item.nextAvailable = entry.nextAvailable || null;
      return item;
    });
  }

  function restore() {
    const raw = localStorage.getItem(CONFIG.saveKey);
    if (!raw) return false;

    try {
      const data = JSON.parse(raw);
      state.playerHP = data.hp?.p || CONFIG.maxHP;
      state.enemyHP = data.hp?.e || CONFIG.maxHP;
      state.gold = data.gold || CONFIG.startGold;
      state.playerGrid = materialize(data.playerGrid);
      state.enemyGrid = materialize(data.enemyGrid);
      state.playerStorageGrid = materialize(data.playerStorageGrid);
      state.enemyStorageGrid = materialize(data.enemyStorageGrid);
      state.storageGrid = materialize(data.storageGrid);
      state.shopInstances = materialize(data.shopInstances);

      const max = [state.playerGrid, state.enemyGrid, state.playerStorageGrid, state.enemyStorageGrid, state.storageGrid, state.shopInstances]
        .flat()
        .filter(Boolean)
        .map((item) => Number((item.id.match(/itm-(\d+)/) || [0, 0])[1]))
        .reduce((a, b) => Math.max(a, b), 0);
      if (max) window.GameItems.ensureNextItemId(max + 1);

      return true;
    } catch (error) {
      console.warn('Savegame konnte nicht geladen werden:', error);
      return false;
    }
  }

  function initEmptyState() {
    state.playerHP = CONFIG.maxHP;
    state.enemyHP = CONFIG.maxHP;
    state.gold = CONFIG.startGold;
    state.playerGrid = emptyGrid(GRID.player.cols, GRID.player.rows);
    state.enemyGrid = emptyGrid(GRID.enemy.cols, GRID.enemy.rows);
    state.playerStorageGrid = emptyGrid(GRID.playerStorage.cols, GRID.playerStorage.rows);
    state.enemyStorageGrid = emptyGrid(GRID.enemyStorage.cols, GRID.enemyStorage.rows);
    state.storageGrid = emptyGrid(GRID.storage.cols, GRID.storage.rows);
    state.shopInstances = [];
    state.battle = null;
  }

  function assignStarterItems() {
    const starters = window.GameItems.ITEMS.filter((i) => i.rarity === 'common');
    for (let i = 0; i < 3; i++) {
      const p = window.GameItems.createItemInstance(starters[i % starters.length].key, 'player');
      placeFirstFree(state.playerGrid, GRID.player.cols, GRID.player.rows, p);
    }
  }

  function bindUi() {
    ui.gold = document.getElementById('gold-amount');
    ui.playerBar = document.getElementById('player-hp-fill');
    ui.enemyBar = document.getElementById('enemy-hp-fill');
    ui.playerText = document.getElementById('player-hp-text');
    ui.enemyText = document.getElementById('enemy-hp-text');
    ui.log = document.getElementById('battle-log');
    ui.shop = document.getElementById('shop-items');
    ui.start = document.getElementById('start-battle');
    ui.reset = document.getElementById('btn-reset');

    buildGridSlots('player-inv', 'player');
    buildGridSlots('enemy-inv', 'enemy');
    buildGridSlots('player-storage', 'player-storage');
    buildGridSlots('enemy-storage', 'enemy-storage');
    buildGridSlots('storage-grid', 'storage');

    ui.start.addEventListener('click', startBattle);
    ui.reset.addEventListener('click', () => {
      localStorage.removeItem(CONFIG.saveKey);
      location.reload();
    });
  }

  function init() {
    bindUi();
    initEmptyState();

    if (!restore()) {
      assignStarterItems();
      fillShop();
      spawnEnemySetup();
      persist();
    }

    renderAll();
    log('Willkommen in AutoBatt. Rechtsklick verkauft ein Spieler-Item.');
  }

  window.addEventListener('DOMContentLoaded', init);
})();
