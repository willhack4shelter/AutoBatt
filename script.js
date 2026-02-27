(function () {
  'use strict';

  const GRID = {
    player: { cols: 6, rows: 3 },
    enemy: { cols: 6, rows: 3 },
    playerStorage: { cols: 6, rows: 6 },
    enemyStorage: { cols: 6, rows: 6 },
    storage: { cols: 10, rows: 4 }
  };

  const START_GOLD = 200;
  const START_HP = 100;
  const TICK_MS = 100;
  const SAVE_KEY = 'autobatt_state_v2';

  const state = window.state || {
    playerHP: START_HP,
    enemyHP: START_HP,
    playerGrid: [],
    enemyGrid: [],
    playerStorageGrid: [],
    enemyStorageGrid: [],
    storageGrid: [],
    shopInstances: [],
    gold: START_GOLD,
    battle: null
  };

  const dom = {};

  function makeGridArray(cols, rows) {
    return Array(cols * rows).fill(null);
  }

  function getGridByOwner(owner) {
    if (owner === 'player') return state.playerGrid;
    if (owner === 'enemy') return state.enemyGrid;
    if (owner === 'player-storage') return state.playerStorageGrid;
    if (owner === 'enemy-storage') return state.enemyStorageGrid;
    if (owner === 'storage') return state.storageGrid;
    return null;
  }

  function getSizeByOwner(owner) {
    if (owner === 'player') return GRID.player;
    if (owner === 'enemy') return GRID.enemy;
    if (owner === 'player-storage') return GRID.playerStorage;
    if (owner === 'enemy-storage') return GRID.enemyStorage;
    return GRID.storage;
  }

  function canPlaceShape(grid, cols, rows, startIndex, shape) {
    const { w, h, mask } = shape;
    const startR = Math.floor(startIndex / cols);
    const startC = startIndex % cols;
    const cells = [];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (mask && (!mask[y] || !mask[y][x])) continue;
        const c = startC + x;
        const r = startR + y;
        if (c >= cols || r >= rows) return { ok: false, cells: [] };
        const idx = r * cols + c;
        if (grid[idx]) return { ok: false, cells: [] };
        cells.push(idx);
      }
    }

    return { ok: true, cells };
  }

  function placeIntoFirstFree(grid, cols, rows, inst) {
    for (let i = 0; i < grid.length; i++) {
      const fits = canPlaceShape(grid, cols, rows, i, inst.shape);
      if (!fits.ok) continue;
      fits.cells.forEach((cell) => {
        grid[cell] = inst;
      });
      return true;
    }
    return false;
  }

  function removeInstanceFromAll(id) {
    const shopIdx = state.shopInstances.findIndex((it) => it.id === id);
    if (shopIdx >= 0) state.shopInstances.splice(shopIdx, 1);

    [state.playerGrid, state.enemyGrid, state.playerStorageGrid, state.enemyStorageGrid, state.storageGrid].forEach((grid) => {
      for (let i = 0; i < grid.length; i++) {
        if (grid[i] && grid[i].id === id) grid[i] = null;
      }
    });
  }

  function buildGrid(container, owner) {
    const { cols, rows } = getSizeByOwner(owner);
    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${cols}, 40px)`;

    for (let i = 0; i < cols * rows; i++) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.dataset.index = String(i);
      slot.dataset.owner = owner;

      const droppable = owner === 'player' || owner === 'player-storage' || owner === 'storage';
      if (droppable) {
        slot.addEventListener('dragover', onDragOverSlot);
        slot.addEventListener('dragleave', clearHighlights);
        slot.addEventListener('drop', onDropOnSlot);
      }

      container.appendChild(slot);
    }
  }

  function clearHighlights() {
    document.querySelectorAll('.slot.highlight').forEach((slot) => slot.classList.remove('highlight'));
  }

  function onDragStart(ev, item, el) {
    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.setData('text/plain', item.id);
    el.classList.add('dragging');
    window._draggingItem = item;
  }

  function onDragEnd() {
    document.querySelectorAll('.item.dragging').forEach((el) => el.classList.remove('dragging'));
    window._draggingItem = null;
    clearHighlights();
  }

  function onDragOverSlot(ev) {
    ev.preventDefault();
    const item = window._draggingItem;
    if (!item) return;

    const slot = ev.currentTarget;
    const owner = slot.dataset.owner;
    const idx = Number(slot.dataset.index);
    const size = getSizeByOwner(owner);
    const grid = getGridByOwner(owner);
    const fits = canPlaceShape(grid, size.cols, size.rows, idx, item.shape);

    clearHighlights();
    if (!fits.ok) return;

    fits.cells.forEach((i) => {
      const slotEl = slot.parentElement.children[i];
      if (slotEl) slotEl.classList.add('highlight');
    });
  }

  function onDropOnSlot(ev) {
    ev.preventDefault();
    const item = window._draggingItem;
    clearHighlights();
    if (!item) return;

    const slot = ev.currentTarget;
    const owner = slot.dataset.owner;
    const idx = Number(slot.dataset.index);
    const size = getSizeByOwner(owner);
    const grid = getGridByOwner(owner);
    const fits = canPlaceShape(grid, size.cols, size.rows, idx, item.shape);

    if (!fits.ok) {
      log(`Kann ${item.name} hier nicht platzieren.`);
      return;
    }

    removeInstanceFromAll(item.id);
    fits.cells.forEach((cell) => {
      grid[cell] = item;
    });
    item.owner = owner;

    renderAll();
    saveGameState();
  }

  function renderItemTooltip(item, x, y) {
    const html = `<strong>${item.name}</strong><br>Dmg: ${item.damage || 0} | Heal: ${item.heal || 0}<br>CD: ${item.cooldown}s | Preis: ${item.price}<br>Seltenheit: ${item.rarity}`;
    if (window.showTooltip) window.showTooltip(html, x, y);
  }

  function renderShopItem(item) {
    const el = document.createElement('div');
    el.className = `item ${window.GameItems.RARITIES[item.rarity].colorClass}`;
    el.draggable = true;
    el.dataset.itemId = item.id;

    const w = item.shape.w || 1;
    const h = item.shape.h || 1;
    el.style.width = `${w * 40 + (w - 1) * 6}px`;
    el.style.height = `${h * 40 + (h - 1) * 6}px`;
    el.innerHTML = `<div>${item.name}</div><small>${item.damage ? `D:${item.damage}` : ''}${item.heal ? ` H:${item.heal}` : ''}</small>`;

    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      buyFromShop(item);
    });
    el.addEventListener('dragstart', (ev) => onDragStart(ev, item, el));
    el.addEventListener('dragend', onDragEnd);
    el.addEventListener('mouseenter', (ev) => renderItemTooltip(item, ev.clientX, ev.clientY));
    el.addEventListener('mousemove', (ev) => renderItemTooltip(item, ev.clientX, ev.clientY));
    el.addEventListener('mouseleave', () => {
      if (window.hideTooltip) window.hideTooltip();
    });

    return el;
  }

  function renderGrid(containerId, grid, owner) {
    const container = document.getElementById(containerId);
    Array.from(container.querySelectorAll('.grid-item')).forEach((el) => el.remove());

    const size = getSizeByOwner(owner);
    const seen = new Set();

    for (let i = 0; i < grid.length; i++) {
      const inst = grid[i];
      if (!inst || seen.has(inst.id)) continue;
      seen.add(inst.id);

      const c = i % size.cols;
      const r = Math.floor(i / size.cols);
      const el = document.createElement('div');
      el.className = `item grid-item ${window.GameItems.RARITIES[inst.rarity].colorClass}`;
      el.dataset.itemId = inst.id;

      const isEnemy = inst.owner === 'enemy' || inst.owner === 'enemy-storage';
      el.draggable = !isEnemy;

      const pad = 6;
      const gap = 6;
      el.style.left = `${pad + c * (40 + gap)}px`;
      el.style.top = `${pad + r * (40 + gap)}px`;

      const w = inst.shape.w || 1;
      const h = inst.shape.h || 1;
      el.style.width = `${w * 40 + (w - 1) * 6}px`;
      el.style.height = `${h * 40 + (h - 1) * 6}px`;
      el.innerHTML = `<div>${inst.name}</div><small>${inst.damage ? `D:${inst.damage}` : ''}${inst.heal ? ` H:${inst.heal}` : ''}</small>`;

      if (!isEnemy) {
        el.addEventListener('dragstart', (ev) => onDragStart(ev, inst, el));
        el.addEventListener('dragend', onDragEnd);
      }

      el.addEventListener('mouseenter', (ev) => renderItemTooltip(inst, ev.clientX, ev.clientY));
      el.addEventListener('mousemove', (ev) => renderItemTooltip(inst, ev.clientX, ev.clientY));
      el.addEventListener('mouseleave', () => {
        if (window.hideTooltip) window.hideTooltip();
      });

      const isPlayerItem = inst.owner === 'player' || inst.owner === 'player-storage';
      if (isPlayerItem) {
        el.addEventListener('contextmenu', (ev) => {
          ev.preventDefault();
          const sellPrice = Math.max(1, Math.round((inst.price || 0) / 2));
          removeInstanceFromAll(inst.id);
          state.gold = (state.gold || 0) + sellPrice;
          colorLog(`Verkauft ${inst.name} für ${sellPrice} Gold.`, 'player');
          renderAll();
          saveGameState();
        });
      }

      container.appendChild(el);
    }
  }

  function renderAll() {
    renderGrid('player-inv', state.playerGrid, 'player');
    renderGrid('enemy-inv', state.enemyGrid, 'enemy');
    renderGrid('player-storage', state.playerStorageGrid, 'player-storage');
    renderGrid('enemy-storage', state.enemyStorageGrid, 'enemy-storage');
    renderGrid('storage-grid', state.storageGrid, 'storage');

    dom.shopItems.innerHTML = '';
    state.shopInstances.forEach((item) => dom.shopItems.appendChild(renderShopItem(item)));
    renderHUD();
    updateHP();
  }

  function renderHUD() {
    dom.goldAmount.textContent = String(state.gold || 0);
  }

  function updateHP() {
    dom.playerHPFill.style.width = `${Math.max(0, (state.playerHP / START_HP) * 100)}%`;
    dom.enemyHPFill.style.width = `${Math.max(0, (state.enemyHP / START_HP) * 100)}%`;
    dom.playerHPText.textContent = `${Math.max(0, Math.round(state.playerHP))} / 100`;
    dom.enemyHPText.textContent = `${Math.max(0, Math.round(state.enemyHP))} / 100`;
  }

  function log(text) {
    const entry = document.createElement('div');
    entry.className = 'entry';
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
    dom.battleLog.prepend(entry);
  }

  function colorLog(text, type) {
    const entry = document.createElement('div');
    entry.className = 'entry';
    entry.style.color = type === 'player' ? '#b7f5c8' : type === 'enemy' ? '#ffb3b3' : '#dbeafe';
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
    dom.battleLog.prepend(entry);
  }

  function spawnShopItems() {
    const pool = window.GameItems.ITEMS.slice();
    state.shopInstances = [];

    for (let i = 0; i < 5 && pool.length; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      const template = pool.splice(idx, 1)[0];
      state.shopInstances.push(window.GameItems.createItemInstance(template.key, 'shop'));
    }
  }

  function buyFromShop(shopItem) {
    if (state.gold < shopItem.price) {
      log(`Nicht genug Gold für ${shopItem.name}.`);
      return;
    }

    const clone = window.GameItems.createItemInstance(shopItem.key, 'player');
    const placedInPlayer = placeIntoFirstFree(state.playerGrid, GRID.player.cols, GRID.player.rows, clone);
    const placedInStorage = placedInPlayer || placeIntoFirstFree(state.playerStorageGrid, GRID.playerStorage.cols, GRID.playerStorage.rows, clone);

    if (!placedInStorage) {
      log(`Kein Platz für ${shopItem.name}.`);
      return;
    }

    removeInstanceFromAll(shopItem.id);
    state.gold -= shopItem.price;
    colorLog(`Gekauft: ${shopItem.name} für ${shopItem.price} Gold.`, 'player');

    renderAll();
    saveGameState();
  }

  function assignStarterItems() {
    const commons = window.GameItems.ITEMS.filter((item) => item.rarity === 'common');
    for (let i = 0; i < 3; i++) {
      const p = window.GameItems.createItemInstance(commons[i % commons.length].key, 'player');
      const e = window.GameItems.createItemInstance(commons[(i + 1) % commons.length].key, 'enemy');
      placeIntoFirstFree(state.playerGrid, GRID.player.cols, GRID.player.rows, p);
      placeIntoFirstFree(state.enemyGrid, GRID.enemy.cols, GRID.enemy.rows, e);
    }
  }

  function generateEnemy() {
    state.enemyHP = START_HP;
    state.enemyGrid = makeGridArray(GRID.enemy.cols, GRID.enemy.rows);
    state.enemyStorageGrid = makeGridArray(GRID.enemyStorage.cols, GRID.enemyStorage.rows);

    const pool = window.GameItems.ITEMS;
    for (let i = 0; i < 3; i++) {
      const t = pool[Math.floor(Math.random() * pool.length)];
      const inst = window.GameItems.createItemInstance(t.key, 'enemy');
      placeIntoFirstFree(state.enemyGrid, GRID.enemy.cols, GRID.enemy.rows, inst);
    }

    const storageCount = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < storageCount; i++) {
      const t = pool[Math.floor(Math.random() * pool.length)];
      const inst = window.GameItems.createItemInstance(t.key, 'enemy-storage');
      placeIntoFirstFree(state.enemyStorageGrid, GRID.enemyStorage.cols, GRID.enemyStorage.rows, inst);
    }
  }

  function applyItemEffect(inst, owner, target) {
    const dmg = inst.damage || 0;
    const heal = inst.heal || 0;

    if (dmg > 0) {
      if (target === 'enemy') state.enemyHP = Math.max(0, state.enemyHP - dmg);
      else state.playerHP = Math.max(0, state.playerHP - dmg);
      colorLog(`${owner} nutzt ${inst.name} und macht ${dmg} Schaden.`, owner);
    }

    if (heal > 0) {
      if (owner === 'player') state.playerHP = Math.min(START_HP, state.playerHP + heal);
      else state.enemyHP = Math.min(START_HP, state.enemyHP + heal);
      colorLog(`${owner} heilt ${heal} HP mit ${inst.name}.`, owner);
    }
  }

  function processActivations(now) {
    [
      { grid: state.playerGrid, owner: 'player', target: 'enemy' },
      { grid: state.enemyGrid, owner: 'enemy', target: 'player' }
    ].forEach(({ grid, owner, target }) => {
      const unique = new Set(grid.filter(Boolean));
      unique.forEach((inst) => {
        if (inst.nextAvailable == null) inst.nextAvailable = now + inst.cooldown * 1000;
        if (now < inst.nextAvailable) return;
        applyItemEffect(inst, owner, target);
        inst.nextAvailable = now + inst.cooldown * 1000;
      });
    });
  }

  function endBattle() {
    if (!state.battle) return;

    clearInterval(state.battle.tickTimer);
    state.battle = null;

    const winner = state.playerHP > state.enemyHP ? 'Spieler' : state.enemyHP > state.playerHP ? 'Gegner' : 'Unentschieden';
    colorLog(`Battle beendet: ${winner}`, 'info');

    if (winner === 'Spieler') {
      const hpDiff = Math.max(0, Math.round(state.playerHP - state.enemyHP));
      state.gold += hpDiff;
      colorLog(`Belohnung: ${hpDiff} Gold (HP-Differenz).`, 'player');

      const template = window.GameItems.ITEMS[Math.floor(Math.random() * window.GameItems.ITEMS.length)];
      const drop = window.GameItems.createItemInstance(template.key, 'player');
      const inv = placeIntoFirstFree(state.playerGrid, GRID.player.cols, GRID.player.rows, drop);
      const ps = inv || placeIntoFirstFree(state.playerStorageGrid, GRID.playerStorage.cols, GRID.playerStorage.rows, drop);
      if (!ps) placeIntoFirstFree(state.storageGrid, GRID.storage.cols, GRID.storage.rows, drop);

      log(`Drop erhalten: ${drop.name}`);
    }

    state.playerHP = START_HP;
    generateEnemy();
    spawnShopItems();
    renderAll();
    saveGameState();
  }

  function startBattle() {
    if (state.battle) return;

    dom.battleLog.innerHTML = '';
    state.battle = { tickTimer: null };

    const now = performance.now();
    [state.playerGrid, state.enemyGrid].forEach((grid) => {
      new Set(grid.filter(Boolean)).forEach((inst) => {
        inst.nextAvailable = now + inst.cooldown * 1000;
      });
    });

    state.battle.tickTimer = setInterval(() => {
      processActivations(performance.now());
      updateHP();
      if (state.playerHP <= 0 || state.enemyHP <= 0) endBattle();
    }, TICK_MS);
  }

  function saveGameState() {
    const save = {
      playerHP: state.playerHP,
      enemyHP: state.enemyHP,
      playerGrid: state.playerGrid.map((i) => (i ? { id: i.id, key: i.key, owner: i.owner, nextAvailable: i.nextAvailable } : null)),
      enemyGrid: state.enemyGrid.map((i) => (i ? { id: i.id, key: i.key, owner: i.owner, nextAvailable: i.nextAvailable } : null)),
      playerStorageGrid: state.playerStorageGrid.map((i) => (i ? { id: i.id, key: i.key, owner: i.owner, nextAvailable: i.nextAvailable } : null)),
      enemyStorageGrid: state.enemyStorageGrid.map((i) => (i ? { id: i.id, key: i.key, owner: i.owner, nextAvailable: i.nextAvailable } : null)),
      storageGrid: state.storageGrid.map((i) => (i ? { id: i.id, key: i.key, owner: i.owner, nextAvailable: i.nextAvailable } : null)),
      shopInstances: state.shopInstances.map((i) => ({ id: i.id, key: i.key, owner: i.owner })),
      gold: state.gold
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  }

  function loadGameState() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;

    try {
      const data = JSON.parse(raw);
      const materialize = (arr) =>
        (arr || []).map((cell) => {
          if (!cell) return null;
          const inst = window.GameItems.createItemInstance(cell.key, cell.owner);
          inst.id = cell.id;
          inst.nextAvailable = cell.nextAvailable || null;
          return inst;
        });

      state.playerHP = data.playerHP || START_HP;
      state.enemyHP = data.enemyHP || START_HP;
      state.playerGrid = materialize(data.playerGrid);
      state.enemyGrid = materialize(data.enemyGrid);
      state.playerStorageGrid = materialize(data.playerStorageGrid);
      state.enemyStorageGrid = materialize(data.enemyStorageGrid);
      state.storageGrid = materialize(data.storageGrid);
      state.shopInstances = materialize(data.shopInstances);
      state.gold = data.gold || START_GOLD;
      return true;
    } catch (err) {
      console.warn('Konnte Savegame nicht laden.', err);
      return false;
    }
  }

  function initializeState() {
    state.playerHP = START_HP;
    state.enemyHP = START_HP;
    state.playerGrid = makeGridArray(GRID.player.cols, GRID.player.rows);
    state.enemyGrid = makeGridArray(GRID.enemy.cols, GRID.enemy.rows);
    state.playerStorageGrid = makeGridArray(GRID.playerStorage.cols, GRID.playerStorage.rows);
    state.enemyStorageGrid = makeGridArray(GRID.enemyStorage.cols, GRID.enemyStorage.rows);
    state.storageGrid = makeGridArray(GRID.storage.cols, GRID.storage.rows);
    state.shopInstances = [];
    state.gold = START_GOLD;
    state.battle = null;
  }

  function cacheDom() {
    dom.playerInv = document.getElementById('player-inv');
    dom.enemyInv = document.getElementById('enemy-inv');
    dom.playerStorage = document.getElementById('player-storage');
    dom.enemyStorage = document.getElementById('enemy-storage');
    dom.storageGrid = document.getElementById('storage-grid');
    dom.shopItems = document.getElementById('shop-items');
    dom.goldAmount = document.getElementById('gold-amount');
    dom.playerHPFill = document.getElementById('player-hp-fill');
    dom.enemyHPFill = document.getElementById('enemy-hp-fill');
    dom.playerHPText = document.getElementById('player-hp-text');
    dom.enemyHPText = document.getElementById('enemy-hp-text');
    dom.battleLog = document.getElementById('battle-log');
    dom.startBattle = document.getElementById('start-battle');
    dom.resetBtn = document.getElementById('btn-reset');
  }

  function init() {
    cacheDom();
    initializeState();

    buildGrid(dom.playerInv, 'player');
    buildGrid(dom.enemyInv, 'enemy');
    buildGrid(dom.playerStorage, 'player-storage');
    buildGrid(dom.enemyStorage, 'enemy-storage');
    buildGrid(dom.storageGrid, 'storage');

    const loaded = loadGameState();
    if (!loaded) {
      assignStarterItems();
      generateEnemy();
      spawnShopItems();
    }

    dom.startBattle.addEventListener('click', startBattle);
    dom.resetBtn.addEventListener('click', () => {
      localStorage.removeItem(SAVE_KEY);
      location.reload();
    });

    renderAll();
  }

  window.addEventListener('DOMContentLoaded', init);
})();
