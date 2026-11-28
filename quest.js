/* ==========================================================================
   QUEST - the worlds, which levels are special, and the quest map
   --------------------------------------------------------------------------
   WORLDS: 20 levels each. Every world has its own colours, floating
   particles and music. After the last world they start again ("II", "III"...).

   SPECIAL LEVELS (kept apart so the game never gets too hard or samey):
     - Obstacle levels start at level 30, then come every 5-6 levels.
       The first five bring in a new obstacle each, in this order:
       padlock, spider web, ice, chain, fog. After that they mix, and the
       same obstacle never comes twice in a row. Only ONE obstacle per level.
     - Boss level: the last level of every world (20, 40, 60 ...).
   ========================================================================== */
'use strict';

const WORLD_LEVELS   = 20;              // levels in each world (the last one is the boss)
const SPECIAL_FROM   = 30;              // first obstacle level
const SPECIAL_GAPS   = [5, 6];          // levels between obstacle levels (taken in turn)
const OBSTACLES      = ['padlock', 'web', 'ice', 'chain', 'fog'];

const WORLDS = [
  { name: 'Enchanted Forest', icon: '🌲', tint: '#1f6b3a', band: '#3fa45f', fx: 'leaf',   music: { shift: 0,  bpm: 66, wave: 'sine' } },
  { name: 'Desert Tombs',     icon: '🏺', tint: '#8a5a1c', band: '#d7a24c', fx: 'sand',   music: { shift: -3, bpm: 58, wave: 'triangle' } },
  { name: 'Ice Caverns',      icon: '❄️', tint: '#1d5f8a', band: '#6cc3f0', fx: 'snow',   music: { shift: 5,  bpm: 54, wave: 'sine' } },
  { name: 'Misty Marsh',      icon: '🌫️', tint: '#3d5c52', band: '#86a99b', fx: 'mist',   music: { shift: -5, bpm: 50, wave: 'triangle' } },
  { name: 'Sky Temple',       icon: '☁️', tint: '#3d63a8', band: '#9cc2ff', fx: 'cloud',  music: { shift: 7,  bpm: 72, wave: 'sine' } },
  { name: 'Volcano Forge',    icon: '🌋', tint: '#8a2a12', band: '#ef6a3a', fx: 'ember',  music: { shift: -7, bpm: 76, wave: 'triangle' } },
  { name: "Dragon's Keep",    icon: '🐉', tint: '#4d1d7a', band: '#a35be0', fx: 'spark',  music: { shift: -2, bpm: 64, wave: 'triangle' } },
  { name: 'Starfall Citadel', icon: '✨', tint: '#1b2a6b', band: '#5b74d6', fx: 'star',   music: { shift: 3,  bpm: 60, wave: 'sine' } }
];
const OBSTACLE_ICONS = { padlock: '🔒', web: '🕸️', ice: '❄️', chain: '⛓️', fog: '🌫️' };

const Quest = (function () {
  const ROMAN = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'];

  function worldIndex(level) { return Math.floor((level - 1) / WORLD_LEVELS); }
  function world(level) {
    const i = worldIndex(level);
    const w = WORLDS[i % WORLDS.length];
    const lap = Math.floor(i / WORLDS.length);
    return Object.assign({}, w, { index: i, title: w.name + (lap ? ROMAN[lap] || ' ' + (lap + 1) : ''), first: i * WORLD_LEVELS + 1 });
  }
  function isBoss(level) { return level % WORLD_LEVELS === 0; }

  // which levels have an obstacle, and which one (worked out once, then remembered)
  const specials = {};            // level -> obstacle
  let builtTo = 0, nextAt = SPECIAL_FROM, count = 0, prev = '';
  function hash(n) { let x = Math.sin(n * 91.7 + 13.3) * 43758.5453; return x - Math.floor(x); }
  function build(upTo) {
    while (nextAt <= upTo) {
      let at = nextAt;
      const m = at % WORLD_LEVELS;                           // keep 2 levels away from a boss
      if (m === WORLD_LEVELS - 1) at += 3; else if (m === 0) at += 2; else if (m === 1) at += 1;
      let kind;
      if (count < OBSTACLES.length) kind = OBSTACLES[count];
      else {
        let k = Math.floor(hash(count) * OBSTACLES.length);
        if (OBSTACLES[k] === prev) k = (k + 1) % OBSTACLES.length;
        kind = OBSTACLES[k];
      }
      specials[at] = kind;
      prev = kind;
      nextAt = at + SPECIAL_GAPS[count % SPECIAL_GAPS.length];
      count++;
    }
    builtTo = Math.max(builtTo, upTo);
  }
  // { boss: true/false, obstacle: 'padlock' | 'web' | 'ice' | 'chain' | 'fog' | null }
  function plan(level) {
    if (level > builtTo) build(level + 40);
    return { boss: isBoss(level), obstacle: specials[level] || null };
  }

  // ---------------- the quest map on the home page ----------------
  // a winding path: finished levels below, the next level big, locked ones above
  function drawMap(box, level, onPlay) {
    const from = Math.max(1, level - 5), to = level + 12;
    const STEP = 92;                                         // px between levels
    const items = [];
    for (let L = to; L >= from; L--) items.push(L);
    box.innerHTML = '';
    const inner = document.createElement('div');
    inner.className = 'map-inner';
    const H = items.length * STEP + 140;
    inner.style.height = H + 'px';
    box.appendChild(inner);
    const pts = [];
    const yOf = function (k) { return 70 + k * STEP; };
    const xOf = function (L) { return 50 + 19 * Math.sin(L * 0.95); };   // % across

    // world colour bands + banners
    let bandStart = 0;
    items.forEach(function (L, k) {
      const startsWorld = (L - 1) % WORLD_LEVELS === 0;
      const endOfList = k === items.length - 1;
      if (startsWorld || endOfList) {
        const w = world(L);
        const band = document.createElement('div');
        band.className = 'map-band';
        band.style.top = (k === 0 ? 0 : yOf(bandStart) - STEP / 2) + 'px';
        band.style.height = (yOf(k) + STEP / 2 - (k === 0 ? 0 : yOf(bandStart) - STEP / 2)) + 'px';
        band.style.setProperty('--band', w.band);
        inner.appendChild(band);
        bandStart = k + 1;
      }
      if (startsWorld) {
        const w = world(L);
        const b = document.createElement('div');
        b.className = 'map-banner';
        b.style.top = (yOf(k) + 44) + 'px';
        b.textContent = w.icon + ' ' + w.title.toUpperCase();
        inner.appendChild(b);
      }
    });
    // the dotted path
    items.forEach(function (L, k) { pts.push([xOf(L), yOf(k)]); });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'map-path');
    svg.setAttribute('viewBox', '0 0 100 ' + H);
    svg.setAttribute('preserveAspectRatio', 'none');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    let d = '';
    pts.forEach(function (p, i) {
      if (!i) d += 'M' + p[0] + ' ' + p[1];
      else { const q = pts[i - 1], my = (q[1] + p[1]) / 2; d += ' C' + q[0] + ' ' + my + ' ' + p[0] + ' ' + my + ' ' + p[0] + ' ' + p[1]; }
    });
    path.setAttribute('d', d);
    svg.appendChild(path);
    inner.appendChild(svg);

    // the level stops
    let current = null;
    items.forEach(function (L, k) {
      const p = plan(L);
      const n = document.createElement(L === level ? 'button' : 'div');
      n.style.left = xOf(L) + '%';
      n.style.top = yOf(k) + 'px';
      if (L === level) {
        n.className = 'map-node now' + (p.boss ? ' boss' : '');
        n.id = 'play-btn';
        n.setAttribute('aria-label', 'Play level ' + L);
        n.innerHTML = '<span class="plaque-small"></span><span id="play-level"></span><span class="plaque-play">PLAY</span>';
        n.children[0].textContent = p.boss ? '👑 BOSS' : 'LEVEL';
        n.children[1].textContent = L;
        n.children[1].className = String(L).length >= 5 ? 'xlong' : String(L).length >= 4 ? 'long' : '';
        n.onclick = onPlay;
        current = n;
      } else {
        n.className = 'map-node ' + (L < level ? 'done' : 'locked') + (p.boss ? ' boss' : '');
        const num = document.createElement('b'); num.textContent = L; n.appendChild(num);
        const tag = p.boss ? '👑' : p.obstacle ? OBSTACLE_ICONS[p.obstacle] : '';
        if (tag) { const t = document.createElement('i'); t.textContent = tag; n.appendChild(t); }
        if (L < level) { const ok = document.createElement('em'); ok.textContent = '✓'; n.appendChild(ok); }
      }
      inner.appendChild(n);
    });
    // show the next level a little below the middle
    if (current) box.scrollTop = Math.max(0, parseFloat(current.style.top) - box.clientHeight * 0.55);
  }

  return { world: world, plan: plan, isBoss: isBoss, drawMap: drawMap, WORLDS: WORLDS };
})();
