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
  // One picture per half world (10 levels each): art/world/1a.jpg, 1b.jpg ... 8b.jpg.
  // road = the middle of the road from the bottom of the picture to the top
  // (x, y as parts of the width / height). stop = the point where the road ends
  // in the picture (bubbles are only placed up to there).
  // A picture that doesn't exist yet uses its "a" picture flipped left-right.
  const MAP_ART = [
    { a: [[.48,.97],[.47,.88],[.49,.80],[.51,.75],[.55,.70],[.62,.65],[.68,.60],[.72,.55],[.73,.50],[.68,.45],[.53,.40],[.42,.35],[.33,.30],[.30,.25],[.35,.20],[.43,.15],[.50,.10],[.53,.03]] },
    { a: [[.62,.97],[.62,.88],[.61,.80],[.53,.75],[.39,.70],[.25,.65],[.19,.60],[.24,.55],[.42,.50],[.62,.465],[.76,.43],[.78,.40],[.68,.365],[.45,.345],[.27,.325],[.20,.29],[.25,.24],[.38,.20],[.50,.15],[.57,.10],[.60,.03]] },
    { a: [[.52,.97],[.52,.88],[.50,.80],[.47,.75],[.40,.70],[.30,.65],[.22,.60],[.17,.55],[.24,.50],[.42,.46],[.60,.43],[.72,.40],[.76,.35],[.72,.30],[.62,.25],[.53,.20],[.49,.15],[.48,.08],[.48,.03]] },
    { a: [[.57,.97],[.57,.88],[.52,.80],[.46,.75],[.39,.70],[.32,.65],[.31,.60],[.33,.55],[.45,.50],[.60,.465],[.72,.43],[.76,.38],[.73,.32],[.62,.26],[.47,.21],[.41,.175],[.47,.14],[.55,.11],[.58,.06]] },
    { a: [[.51,.95],[.51,.88],[.50,.80],[.46,.75],[.36,.70],[.29,.65],[.27,.60],[.34,.565],[.48,.54],[.63,.51],[.73,.46],[.72,.40],[.60,.36],[.42,.34],[.33,.30],[.37,.25],[.47,.20],[.50,.14],[.50,.06]] },
    { a: [[.50,.95],[.50,.92],[.49,.82],[.45,.72],[.39,.64],[.37,.58],[.42,.52],[.50,.475],[.58,.44],[.63,.41],[.63,.38],[.57,.355],[.47,.335],[.40,.315],[.42,.20],[.43,.08]], aStop: 13 },
    { a: [[.44,.95],[.44,.92],[.43,.85],[.40,.80],[.35,.75],[.26,.70],[.19,.66],[.20,.62],[.33,.585],[.50,.565],[.66,.54],[.70,.51],[.62,.465],[.50,.43],[.43,.39],[.42,.35],[.35,.32],[.31,.29],[.38,.26],[.50,.255],[.57,.27],[.58,.15],[.58,.05]], aStop: 20 },
    { a: [[.33,.96],[.35,.90],[.38,.85],[.44,.80],[.55,.75],[.67,.70],[.75,.65],[.74,.60],[.62,.55],[.45,.50],[.30,.45],[.19,.40],[.16,.35],[.22,.30],[.40,.25],[.55,.20],[.63,.15],[.66,.10],[.66,.04]] }
  ];
  // when you add a "b" picture, give its road here, e.g. MAP_ART[0].b = [[.5,.97], ... ];
  const MAP_LEVELS_PER_PICTURE = 10;
  const MAP_ZOOM = 1.3;             // the map is drawn this many times the screen width
  const ART_W = 900, ART_H = 1612;  // size of the pictures in art/world/
  const DOT_GAP = 15;               // px between the little dots on the road

  const missing = {};               // pictures that failed to load -> use the flipped "a"
  function tileInfo(k) {
    const w = Math.floor(k / 2) % MAP_ART.length, half = k % 2 ? 'b' : 'a';
    const art = MAP_ART[w];
    const own = art[half] && !missing[(w + 1) + half];
    const flip = !own;                                         // a "b" without its own picture
    const road = (own ? art[half] : art.a).map(function (p) { return [flip ? 1 - p[0] : p[0], p[1]]; });
    const stop = own ? (art[half + 'Stop'] || road.length - 1) : (art.aStop || road.length - 1);
    return { src: 'art/world/' + (w + 1) + (own ? half : 'a') + '.jpg', flip: flip, road: road, stop: stop, world: w };
  }
  // smooth the traced points (Catmull-Rom) into many small steps
  function smooth(pts) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let t = 0; t < 1; t += 0.1) {
        const t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(function (j) {
          return 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
        }));
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  function lengths(pts) { const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return L; }
  function at(pts, L, d) {                                    // point at distance d along pts
    let i = 1;
    while (i < L.length - 1 && L[i] < d) i++;
    const f = (d - L[i - 1]) / ((L[i] - L[i - 1]) || 1);
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f];
  }

  let mapState = null;               // what is drawn now (to move the camera smoothly)
  // draws the map so the next level sits in the middle of the screen.
  // from = the level the camera was on before (it glides from there)
  function drawMap(box, level, onPlay, from) {
    const S = box.clientWidth || window.innerWidth, SH = box.clientHeight || window.innerHeight;
    const D = S * MAP_ZOOM, TH = D * ART_H / ART_W;
    const k0 = Math.floor((level - 1) / MAP_LEVELS_PER_PICTURE);
    const first = Math.max(0, k0 - 1), last = k0 + 2;
    box.innerHTML = '';
    const back = document.createElement('div'); back.className = 'map-back';
    back.style.backgroundImage = 'url("' + tileInfo(k0).src + '")';
    box.appendChild(back);
    const strip = document.createElement('div'); strip.className = 'map-strip';
    strip.style.width = D + 'px';
    box.appendChild(strip);

    // pictures, and one long road through all of them (strip coordinates: y grows downwards, tile k sits above tile k-1)
    let path = [];
    const nodes = {};                                         // level -> [x, y]
    for (let k = first; k <= last; k++) {
      const t = tileInfo(k);
      const top = -(k + 1) * TH;
      const img = document.createElement('img');
      img.className = 'map-tile' + (t.flip ? ' flip' : '');
      img.src = t.src; img.alt = ''; img.draggable = false;
      img.style.top = top + 'px'; img.style.height = TH + 'px';
      img.onerror = function () { const key = (t.world + 1) + (k % 2 ? 'b' : 'a'); if (!missing[key]) { missing[key] = true; } };
      strip.appendChild(img);
      const pts = smooth(t.road).map(function (p) { return [p[0] * D, top + p[1] * TH]; });
      // bubbles: evenly along the road part of this picture
      const stopAt = smooth(t.road.slice(0, t.stop + 1)).length - 1;
      const roadPart = pts.slice(0, stopAt + 1), L = lengths(roadPart), total = L[L.length - 1];
      for (let i = 0; i < MAP_LEVELS_PER_PICTURE; i++) {
        nodes[k * MAP_LEVELS_PER_PICTURE + i + 1] = at(roadPart, L, total * (0.06 + 0.88 * i / (MAP_LEVELS_PER_PICTURE - 1)));
      }
      path = path.concat(pts);
    }
    // little dots between the bubbles: solid behind the next level, hollow ahead of it
    const PL = lengths(path);
    function distOf(p) {                                     // where a bubble lies along the road
      let best = 0, bd = 1e9;
      for (let i = 0; i < path.length; i++) { const d = Math.hypot(path[i][0] - p[0], path[i][1] - p[1]); if (d < bd) { bd = d; best = i; } }
      return PL[best];
    }
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'map-dots');
    const minY = -(last + 1) * TH, maxY = -first * TH;
    svg.setAttribute('viewBox', '0 ' + minY + ' ' + D + ' ' + (maxY - minY));
    svg.style.top = minY + 'px'; svg.style.height = (maxY - minY) + 'px'; svg.style.width = D + 'px';
    const levels = Object.keys(nodes).map(Number).sort(function (a, b) { return a - b; });
    const nd = {}; levels.forEach(function (L) { nd[L] = distOf(nodes[L]); });
    for (let j = 0; j < levels.length - 1; j++) {
      const A = levels[j], B = levels[j + 1];
      const behind = B <= level;
      const r1 = A === level ? 52 : 22, r2 = B === level ? 52 : 22;         // keep the dots off the bubbles
      for (let d = nd[A] + r1 + DOT_GAP / 2; d < nd[B] - r2; d += DOT_GAP) {
        const p = at(path, PL, d);
        const c = document.createElementNS(svgNS, 'circle');
        c.setAttribute('cx', p[0]); c.setAttribute('cy', p[1]); c.setAttribute('r', behind ? 4.2 : 3.6);
        c.setAttribute('class', behind ? 'dot-done' : 'dot-next');
        svg.appendChild(c);
      }
    }
    strip.appendChild(svg);

    // the bubbles
    levels.forEach(function (L) {
      const p = nodes[L], pl = plan(L);
      const n = document.createElement(L === level ? 'button' : 'div');
      n.style.left = p[0] + 'px'; n.style.top = p[1] + 'px';
      if (L === level) {
        n.className = 'map-node now' + (pl.boss ? ' boss' : '');
        n.id = 'play-btn';
        n.setAttribute('aria-label', 'Play level ' + L);
        n.innerHTML = '<span class="plaque-small"></span><span id="play-level"></span><span class="plaque-play">PLAY</span>';
        n.children[0].textContent = pl.boss ? '👑 BOSS' : 'LEVEL';
        n.children[1].textContent = L;
        n.children[1].className = String(L).length >= 5 ? 'xlong' : String(L).length >= 4 ? 'long' : '';
        n.onclick = onPlay;
      } else {
        n.className = 'map-node ' + (L < level ? 'done' : 'locked') + (pl.boss ? ' boss' : '');
        const num = document.createElement('b'); num.textContent = L; n.appendChild(num);
        const tag = pl.boss ? '👑' : pl.obstacle ? OBSTACLE_ICONS[pl.obstacle] : '';
        if (tag && L > level) { const t = document.createElement('i'); t.textContent = tag; n.appendChild(t); }
      }
      strip.appendChild(n);
    });

    // the camera: the next level in the exact middle of the screen
    function place(L, animate) {
      const p = nodes[L] || nodes[level];
      strip.style.transition = animate ? 'transform 1.4s cubic-bezier(.45,.05,.25,1)' : 'none';
      strip.style.transform = 'translate(' + (S / 2 - p[0]) + 'px,' + (SH / 2 - p[1]) + 'px)';
    }
    const start = from && from !== level && nodes[from] ? from : level;
    place(start, false);
    if (start !== level) {
      void strip.offsetWidth;
      requestAnimationFrame(function () { place(level, true); });
      const btn = strip.querySelector('#play-btn');
      if (btn) { btn.classList.add('arrive'); }
    }
    mapState = { level: level };
  }

  return { world: world, plan: plan, isBoss: isBoss, drawMap: drawMap, WORLDS: WORLDS };
})();
