/* ==========================================================================
   CODE QUEST - MOBILE PUZZLE GAME
   --------------------------------------------------------------------------
   Every level hides a secret code. Type a guess and the boxes show:
     green  = right digit in the right place
     yellow = the digit is in the code, but somewhere else
     grey   = the digit is not in the code
   Which levels have obstacles or a boss is decided in quest.js.
   ========================================================================== */
'use strict';

// ---------------- SETTINGS (easy to change) ----------------
const MAX_TRIES        = 4;     // guesses per level
const BOSS_TRIES       = 3;     // guesses on a boss level
const BOSS_COIN_TIMES  = 3;     // a boss pays this many times the normal coins
const EXTRA_TRIES      = 2;     // locked extra rows, opened with an ad or coins
const EXTRA_TRY_PRICE  = 100;   // coins for one extra try
const WIN_COINS        = 40;    // coins for winning a level (an ad doubles them)
const START_COINS      = 0;     // coins a new player starts with
const HINT_PACK_PRICE  = 700;   // coins for a pack of hints
const HINT_PACK_SIZE   = 3;     // hints in one pack
const ELIMINATE_PRICE  = 1500;  // coins for one eliminate (removes 3 wrong digits from the keypad)
const ELIMINATE_DIGITS = 3;
const PICTURES         = 5;     // pictures/1.jpg ... 5.jpg, one per level, repeating
const LIVES_MAX        = 5;     // losing a level costs one life
const LIFE_REFILL_PRICE = 1500; // coins to fill all lives again
const LIFE_REGEN_MINUTES = 240; // one free life comes back every 4 hours (0 = never)
const AD_COINS         = 100;   // coins for watching an ad from the home page or shop
// DAILY PUZZLE and RACE A FRIEND: same code for everyone, no hints, no lives used
const DAILY_DIGITS = 5, DAILY_TRIES = 6, DAILY_COINS = 100;
const RACE_DIGITS  = 4, RACE_TRIES  = 6;
const RACE_FEE = 100, RACE_MAX = 10;   // entry coins per player; the winner takes them all (ties share)
// DAILY TARGETS: levels won today -> coins (100 a day in total). Resets at midnight.
const DAILY_TARGETS = [
  { levels: 5,  coins: 20 },
  { levels: 10, coins: 20 },
  { levels: 15, coins: 20 },
  { levels: 20, coins: 40 }
];
// WATCH & EARN: ads watched today -> coins (550 a day in total). Resets at midnight.
const AD_LADDER = [
  { ads: 1, coins: 50 },
  { ads: 3, coins: 200 },
  { ads: 5, coins: 300 }
];
// Levels never run out.

// Code length: 4 digits up to level 100, 5 digits from 101, 6 digits from 201.
function digitsForLevel(level) { return level > 200 ? 6 : level > 100 ? 5 : 4; }

// OBSTACLES (one at a time, see quest.js for when they come):
//   🔒 padlock   : colours hidden until the digit in the box with the 🔑 is found
//   🕸️ spider web: colours hidden until WEB_BREAKS_AFTER other digits are found
//   ❄️ ice       : the box shows its colour only on every 2nd guess (2nd, 4th, 6th)
//   ⛓️ chain     : two linked boxes stay hidden until BOTH are right in one guess
//   🌫️ fog       : yellow and grey look the same in that box (green still shows)
const WEB_BREAKS_AFTER = 3;

// LEVEL-BREAK ADS: shown after the coins for a level have been collected.
// Levels 1-21: after every 3rd level; 22-100: every 2nd level; 101+: every level.
function adAfterLevel(level) {
  if (level <= 21) return level % 3 === 0;
  if (level <= 100) return (level - 21) % 2 === 0;
  return true;
}

const SAVE_KEY = 'ctcm-save-v1';
// -----------------------------------------------------------

// puts text into an element, drawing every 🪙 as the gold coin and every 🪄 as the magic wand (eliminate)
function coinText(el, text) {
  el.textContent = '';
  String(text).split(/(🪙|🪄)/).forEach(function (part) {
    if (part === '🪙' || part === '🪄') { const c = document.createElement('i'); c.className = part === '🪙' ? 'coin' : 'wand'; el.appendChild(c); }
    else if (part) el.appendChild(document.createTextNode(part));
  });
}

const Game = (function () {
  const $ = function (id) { return document.getElementById(id); };
  function pick(l) { return l[Math.floor(Math.random() * l.length)]; }
  function shuffle(a, rnd) {
    rnd = rnd || Math.random;
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function range(n) { const a = []; for (let i = 0; i < n; i++) a.push(i); return a; }
  // the same "random" numbers from the same word (daily puzzle, races)
  function seeded(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16;
      return (h >>> 0) / 4294967296;
    };
  }

  // ======================= SAVED PROGRESS =================================
  let save = load();
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { /* ignore */ }
    if (!s || !(s.level >= 1)) s = { level: 1, stars: 0, cur: null, seenHelp: false };
    if (typeof s.coins !== 'number') { s.coins = START_COINS; s.hints = 0; }   // the old free hints are gone
    if (typeof s.hints !== 'number') s.hints = 0;
    if (typeof s.elims !== 'number') s.elims = 0;          // free eliminates (from star chests)
    if (typeof s.lives !== 'number') { s.lives = LIVES_MAX; s.lifeAt = null; }
    if (typeof s.wins !== 'number') s.wins = Math.max(0, s.level - 1);
    if (typeof s.avatar !== 'number') s.avatar = 0;
    if (!s.name) s.name = randomName();
    if (!s.settings) s.settings = { vibrate: true, notify: false };
    s.noAds = !!s.noAds;
    if (!s.pid) s.pid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);   // leaderboard id
    if (!s.seen) s.seen = {};
    if (!s.stats) s.stats = {};
    if (!s.races) s.races = {};
    if (typeof s.chestStars !== 'number') s.chestStars = 0;
    if (!s.skin) s.skin = 'classic';
    [s.cur, s.dp].concat(Object.keys(s.races).map(function (k) { return s.races[k]; })).forEach(fixPuzzle);
    return s;
  }
  function fixPuzzle(c) {                       // saves from older versions
    if (!c) return;
    c.revealed = c.revealed || [];
    c.locks = c.locks || {};
    c.extra = c.extra || 0;
    c.entry = c.entry || [];
    c.elim = c.elim || [];
    if (!c.base) { c.base = MAX_TRIES; c.extras = true; }
  }
  // rnd = a random number maker (the computer players use a fixed one so their names never change)
  function randomName(rnd) {
    const r = rnd || Math.random;
    const a = ['Swift', 'Silent', 'Clever', 'Brave', 'Lucky', 'Sneaky', 'Golden', 'Shadow', 'Rapid', 'Mystic', 'Cosmic', 'Wild',
               'Sharp', 'Bold', 'Frosty', 'Turbo', 'Witty', 'Iron', 'Neon', 'Royal'];
    const b = ['Fox', 'Owl', 'Tiger', 'Panda', 'Wolf', 'Falcon', 'Otter', 'Raven', 'Lynx', 'Cobra', 'Koala', 'Shark', 'Phoenix',
               'Ninja', 'Wizard', 'Rider', 'Hunter', 'Spark', 'Comet', 'Cracker'];
    return a[Math.floor(r() * a.length)] + b[Math.floor(r() * b.length)] + Math.floor(100 + r() * 900);
  }
  function store() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* private mode */ } }
  function stat(k, n) { save.stats[k] = (save.stats[k] || 0) + (n === undefined ? 1 : n); }

  // ======================= LIVES ==========================================
  const LIFE_MS = LIFE_REGEN_MINUTES * 60000;
  function regenLives() {
    if (save.lives >= LIVES_MAX) { save.lives = LIVES_MAX; save.lifeAt = null; return; }
    if (!LIFE_MS) return;
    if (!save.lifeAt) { save.lifeAt = Date.now(); store(); }
    const gained = Math.floor((Date.now() - save.lifeAt) / LIFE_MS);
    if (gained > 0) {
      save.lives = Math.min(LIVES_MAX, save.lives + gained);
      save.lifeAt = save.lives >= LIVES_MAX ? null : save.lifeAt + gained * LIFE_MS;
      store();
      if (window.App) App.livesChanged(save.lives >= LIVES_MAX);
    }
  }
  function nextLifeIn() { return save.lives >= LIVES_MAX || !LIFE_MS || !save.lifeAt ? 0 : Math.max(0, save.lifeAt + LIFE_MS - Date.now()); }
  function loseLife() {
    if (save.lives >= LIVES_MAX) save.lifeAt = Date.now();
    save.lives = Math.max(0, save.lives - 1);
    store();
  }
  function refillLives() {
    if (save.coins < LIFE_REFILL_PRICE) return false;
    save.coins -= LIFE_REFILL_PRICE;
    save.lives = LIVES_MAX; save.lifeAt = null;
    store();
    return true;
  }

  // ======================= DAILY TARGETS / WATCH & EARN ===================
  function today() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function utcDay() { return new Date().toISOString().slice(0, 10); }     // the same day for everyone
  function daily() {
    if (!save.daily || save.daily.day !== today()) { save.daily = { day: today(), wins: 0, claimed: [] }; store(); }
    return save.daily;
  }
  function dailyReady() {
    const d = daily();
    return DAILY_TARGETS.some(function (t, i) { return !d.claimed[i] && d.wins >= t.levels; });
  }
  function claimDaily(i) {
    const d = daily(), t = DAILY_TARGETS[i];
    if (!t || d.claimed[i] || d.wins < t.levels) return 0;
    d.claimed[i] = true;
    save.coins += t.coins;
    store();
    return t.coins;
  }
  function adDay() {
    if (!save.adDay || save.adDay.day !== today()) { save.adDay = { day: today(), count: 0 }; store(); }
    return save.adDay;
  }
  function adWatched() {
    const a = adDay();
    if (a.count >= AD_LADDER[AD_LADDER.length - 1].ads) return 0;
    a.count++;
    const hit = AD_LADDER.filter(function (t) { return t.ads === a.count; })[0];
    if (hit) save.coins += hit.coins;
    store();
    return hit ? hit.coins : 0;
  }

  // ======================= PUZZLES ========================================
  // mode: 'level' (the quest), 'daily' (daily puzzle) or 'race' (race a friend)
  let mode = 'level', raceId = null;
  function C() { return mode === 'daily' ? save.dp : mode === 'race' ? save.races[raceId] : save.cur; }

  function makeLocks(n, kind) {
    const free = shuffle(range(n));
    if (kind === 'padlock') return { padlock: free.pop(), key: free.pop() };
    if (kind === 'web') return { web: free.pop() };
    if (kind === 'ice') return { ice: free.pop() };
    if (kind === 'chain') return { chain: [free.pop(), free.pop()].sort() };
    if (kind === 'fog') return { fog: free.pop() };
    return {};
  }
  function blank(code, base, extras) {
    return { code: code, guesses: [], revealed: [], locks: {}, extra: 0, base: base, extras: extras, elim: [], entry: [],
             done: '', paid: false, collected: false };
  }
  function newPuzzle() {
    const n = digitsForLevel(save.level);
    const p = Quest.plan(save.level);
    save.cur = blank(shuffle(range(10)).slice(0, n), p.boss ? BOSS_TRIES : MAX_TRIES, true);
    save.cur.locks = makeLocks(n, p.obstacle);
    save.cur.boss = p.boss;
    entry = [];
    wasOpen = null;
    store();
  }
  function dailyPuzzle() {
    const day = utcDay();
    if (!save.dp || save.dp.day !== day) {
      save.dp = blank(shuffle(range(10), seeded('daily-' + day)).slice(0, DAILY_DIGITS), DAILY_TRIES, false);
      save.dp.day = day;
      store();
    }
    return save.dp;
  }
  function racePuzzle(id) {
    if (!save.races[id]) {
      save.races[id] = blank(shuffle(range(10), seeded('race-' + id)).slice(0, RACE_DIGITS), RACE_TRIES, false);
      save.races[id].at = Date.now();
      const ids = Object.keys(save.races).sort(function (a, b) { return save.races[b].at - save.races[a].at; });
      ids.slice(12).forEach(function (old) { delete save.races[old]; });      // keep the last 12
      store();
    }
    return save.races[id];
  }

  // Wordle-style marks: hit / near / miss for each guessed digit
  function marks(guess, code) {
    const out = guess.map(function () { return 'miss'; });
    const left = {};
    for (let i = 0; i < code.length; i++) {
      if (guess[i] === code[i]) out[i] = 'hit';
      else left[code[i]] = (left[code[i]] || 0) + 1;
    }
    for (let i = 0; i < code.length; i++) {
      if (out[i] !== 'hit' && left[guess[i]] > 0) { out[i] = 'near'; left[guess[i]]--; }
    }
    return out;
  }

  // What the player can see: which positions are open (colours shown) and
  // which digits are known (green where it could be seen, or shown by a hint).
  function webNeed(c) { return Math.min(WEB_BREAKS_AFTER, c.code.length - 1); }
  function iceHidden(c, r, i) { return c.locks.ice === i && r % 2 === 0; }      // 1st, 3rd, 5th guess
  function view(c) {
    const n = c.code.length, L = c.locks;
    const told = {};
    c.revealed.forEach(function (i) { told[i] = true; });
    const raw = {};
    c.guesses.forEach(function (g, r) {
      marks(g, c.code).forEach(function (k, i) { if (k === 'hit' && !iceHidden(c, r, i)) raw[i] = true; });
    });
    Object.keys(told).forEach(function (i) { raw[i] = true; });
    const open = {};
    range(n).forEach(function (i) { open[i] = true; });
    let webHave = 0;
    if (!c.done) {
      if (L.padlock !== undefined) open[L.padlock] = !!raw[L.key] || !!told[L.padlock];
      if (L.chain) {
        const a = L.chain[0], b = L.chain[1];
        const broke = (told[a] && told[b]) || c.guesses.some(function (g) {
          return (g[a] === c.code[a] || told[a]) && (g[b] === c.code[b] || told[b]);
        });
        open[a] = open[b] = broke;
      }
      if (L.web !== undefined) {
        webHave = Object.keys(raw).filter(function (k) { return +k !== L.web && open[k]; }).length;
        open[L.web] = webHave >= webNeed(c) || !!told[L.web];
      }
    }
    const known = {};
    Object.keys(raw).forEach(function (k) { if (open[k] || told[k]) known[k] = true; });
    return { open: open, known: known, told: told, webHave: webHave };
  }
  function allowed(c) { return c.base + (c.extras ? Math.min(EXTRA_TRIES, c.extra || 0) : 0); }
  function rowsOf(c) { return c.base + (c.extras ? EXTRA_TRIES : 0); }

  // ======================= DRAWING ========================================
  let entry = [];
  let busy = false;
  let flipRow = -1;           // only the row just entered gets the flip animation
  let wasOpen = null;         // which boxes were open last time (to animate unlocking)
  let worldShown = -1;

  function theme() {
    const w = Quest.world(save.level);
    if (w.index === worldShown) return;
    worldShown = w.index;
    document.body.style.setProperty('--tint', w.tint);
    document.body.dataset.fx = w.fx;
    if (Sounds.setWorld) Sounds.setWorld(w.music);
  }

  function render() {
    const c = C();
    const n = c.code.length;
    const v = view(c);
    theme();
    $('level').textContent = mode === 'daily' ? '📅 DAILY' : mode === 'race' ? '⚔️ RACE' : (c.boss ? '👑 BOSS ' : 'LEVEL ') + save.level;
    $('level').classList.toggle('boss', !!c.boss && mode === 'level');
    coinText($('coins'), '🪙 ' + save.coins);
    $('lives').textContent = save.lives;
    $('lives-chip').classList.toggle('full', save.lives >= LIVES_MAX);
    document.body.style.setProperty('--bg', 'url("pictures/' + (((save.level - 1) % PICTURES) + 1) + '.jpg")');
    $('clue-card').classList.toggle('no-tools', mode !== 'level');

    // hint button
    const hb = $('hint-btn');
    hb.innerHTML = '';
    if (save.hints > 0) {
      hb.appendChild(document.createTextNode('💡 '));
      const b = document.createElement('b'); b.textContent = save.hints; hb.appendChild(b);
    } else {
      hb.appendChild(document.createTextNode('💡 '));
      const b = document.createElement('b'); coinText(b, HINT_PACK_PRICE + ' 🪙'); hb.appendChild(b);
    }
    hb.disabled = !!c.done;
    // eliminate button
    const eb = $('elim-btn');
    eb.innerHTML = '';
    eb.appendChild(document.createTextNode('🪄 '));
    const eb2 = document.createElement('b');
    if (save.elims > 0) eb2.textContent = save.elims; else coinText(eb2, ELIMINATE_PRICE + ' 🪙');
    eb.appendChild(eb2);
    eb.disabled = !!c.done;

    // the secret code
    const box = $('code');
    box.innerHTML = '';
    box.style.gridTemplateColumns = 'repeat(' + n + ', 1fr)';
    const L = c.locks;
    const nowOpen = [];
    for (let i = 0; i < n; i++) {
      const t = document.createElement('div');
      t.className = 'code-box';
      const sym = document.createElement('span');
      sym.className = 'sym';
      nowOpen.push(v.open[i]);
      let cap = '';
      if (c.done) {
        sym.textContent = c.code[i];
        t.classList.add(c.done === 'won' ? 'found' : 'shown');
      } else if (!v.open[i] && L.padlock === i) {
        t.classList.add('locked', 'padlock'); sym.textContent = '🔒'; cap = 'FIND 🔑';
      } else if (!v.open[i] && L.web === i) {
        t.classList.add('locked', 'web'); sym.textContent = '🕸️'; cap = v.webHave + '/' + webNeed(c);
      } else if (!v.open[i] && L.chain && L.chain.indexOf(i) >= 0) {
        t.classList.add('locked', 'chain'); sym.textContent = v.known[i] ? c.code[i] : '⛓️'; cap = 'LINKED';
      } else if (v.known[i]) {
        sym.textContent = c.code[i];
        t.classList.add(v.told[i] ? 'told' : 'found');
      } else {
        sym.textContent = '?';
      }
      if (!c.done && L.ice === i) { t.classList.add('ice'); badge(t, '❄️', 'ice'); }
      if (!c.done && L.fog === i) { t.classList.add('fog'); badge(t, '🌫️', 'fog'); }
      if (cap) { const s = document.createElement('small'); s.textContent = cap; t.appendChild(s); }
      if (wasOpen && wasOpen[i] === false && v.open[i]) t.classList.add('unlocking');
      t.insertBefore(sym, t.firstChild);
      if (L.key === i && !c.done && !v.known[i] && L.padlock !== undefined && !v.open[L.padlock]) badge(t, '🔑', 'key');
      box.appendChild(t);
    }
    const unlocked = wasOpen && nowOpen.some(function (o, i) { return o && wasOpen[i] === false; });
    wasOpen = nowOpen;
    if (unlocked && !c.done) { Sounds.play('hint'); buzz([30, 40, 30]); toast('🔓 A box has been unlocked!'); }

    // guess grid
    const grid = $('grid');
    grid.innerHTML = '';
    const can = allowed(c);
    for (let r = 0; r < rowsOf(c); r++) {
      const row = document.createElement('div');
      row.className = 'row' + (r === flipRow ? ' reveal' : '');
      if (r >= can) {                                   // extra try, still locked
        row.classList.add('locked');
        for (let i = 0; i < n; i++) { const cell = document.createElement('div'); cell.className = 'cell'; row.appendChild(cell); }
        const tag = document.createElement('span'); tag.className = 'row-lock';
        if (r === can && !c.done) {
          row.classList.add('next');
          row.onclick = function () { offerExtra(false); };
          tag.textContent = '🔒 UNLOCK';
        } else tag.textContent = '🔒';
        row.appendChild(tag);
        grid.appendChild(row);
        continue;
      }
      const g = c.guesses[r];
      const m = g ? marks(g, c.code) : null;
      for (let i = 0; i < n; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        if (g) {
          cell.textContent = g[i];
          let k = m[i];
          if (!c.done) {
            if (!v.open[i]) k = 'veiled';
            else if (iceHidden(c, r, i)) k = 'frozen';
            else if (L.fog === i && k !== 'hit') k = 'fogged';
          }
          cell.classList.add(k);
          cell.style.animationDelay = (i * 0.12) + 's';
        } else if (r === c.guesses.length && !c.done && r < can) {
          row.classList.add('active');
          if (entry[i] !== undefined) { cell.textContent = entry[i]; cell.classList.add('typed'); }
          if (L.ice === i && r % 2 === 0) cell.classList.add('ice-next');
        }
        row.appendChild(cell);
      }
      grid.appendChild(row);
    }
    const left = Math.max(0, can - c.guesses.length);
    $('tries').textContent = n + '-DIGIT CODE · ' + left + ' ' + (left === 1 ? 'TRY' : 'TRIES') + ' LEFT';
    $('enter').disabled = entry.length !== n;
    document.querySelectorAll('#keypad button[data-d]').forEach(function (b) {
      const gone = c.elim.indexOf(+b.dataset.d) >= 0;
      b.classList.toggle('gone', gone);
      b.disabled = gone;
    });
    fitGrid();
  }
  function badge(t, txt, cls) { const k = document.createElement('i'); k.className = 'badge ' + cls; k.textContent = txt; t.appendChild(k); }

  // make the guess boxes as big as the free space allows (small phones, long codes)
  function fitGrid() {
    const c = C();
    const n = c ? c.code.length : 4;
    const board = $('board');
    const open = c ? allowed(c) : MAX_TRIES;
    const rows = c ? rowsOf(c) : MAX_TRIES + EXTRA_TRIES;
    const free = board.clientHeight - $('tries').offsetHeight - 6 - (rows - 1) * 6;
    const byHeight = Math.floor(free / (open + (rows - open) * 0.55));   // locked rows are shorter
    const byWidth = Math.floor((board.clientWidth - (n - 1) * 7) / n);
    $('grid').style.setProperty('--cell', Math.max(24, Math.min(64, byHeight, byWidth)) + 'px');
  }
  window.addEventListener('resize', function () { if (playing) fitGrid(); });

  // ======================= PLAYING ========================================
  function type(d) {
    const c = C();
    if (busy || c.done || entry.length >= c.code.length || c.elim.indexOf(d) >= 0) return;
    buzz(12);
    entry.push(d);
    c.entry = entry.slice(); store();
    render();
  }
  function back() {
    const c = C();
    if (busy || c.done) return;
    entry.pop();
    c.entry = entry.slice(); store();
    render();
  }
  function submit() {
    const c = C();
    if (busy || c.done) return;
    if (c.guesses.length >= allowed(c)) { offerExtra(true); return; }
    if (entry.length !== c.code.length) { shake($('grid')); buzz(60); return; }
    c.guesses.push(entry.slice());
    flipRow = c.guesses.length - 1;
    const m = marks(entry, c.code);
    entry = []; c.entry = [];
    if (m.every(function (k) { return k === 'hit'; })) c.done = 'won';
    else if (c.guesses.length >= allowed(c) && (!c.extras || c.extra >= EXTRA_TRIES)) {
      c.done = 'lost';
      if (mode === 'level') { loseLife(); save.stats.clean = 0; }
    }
    if (c.done) c.ms = Date.now() - (c.startedAt || Date.now());
    store();
    busy = true;
    const keepLocks = wasOpen;          // let the flip finish before boxes unlock
    render();
    wasOpen = keepLocks;
    setTimeout(function () {
      busy = false;
      flipRow = -1;
      if (c.done === 'won') win();
      else if (c.done === 'lost') lose();
      else if (c.guesses.length >= allowed(c)) { Sounds.play('wrong'); buzz([20, 60, 20]); render(); offerExtra(true); }
      else {
        const shown = view(c), r = c.guesses.length - 1;
        const sawHit = m.some(function (k, i) { return k === 'hit' && shown.open[i] && !iceHidden(c, r, i); });
        Sounds.play(sawHit ? 'correct' : 'wrong'); buzz(sawHit ? 25 : [20, 60, 20]); render();
      }
    }, c.code.length * 120 + 450);
  }

  // ---- hints: each one shows one correct digit in its place ----
  function hint() {
    const c = C();
    if (c.done || busy || mode !== 'level') return;
    if (save.hints <= 0) { openHintShop(); return; }
    const v = view(c);
    const unknown = range(c.code.length).filter(function (i) { return !v.known[i]; });
    if (unknown.length <= 1) { toast('Only one digit left — you can do it!'); return; }
    const openOnes = unknown.filter(function (i) { return v.open[i]; });
    const i = pick(openOnes.length ? openOnes : unknown);      // locked boxes last
    save.hints--;
    c.revealed.push(i);
    store();
    Sounds.play('hint');
    toast('💡 Box ' + (i + 1) + ' is ' + c.code[i]);
    render();
  }
  function openHintShop() {
    coinText($('shop-have'), 'You have ' + save.coins + ' 🪙');
    coinText($('shop-buy'), 'BUY ' + HINT_PACK_SIZE + ' HINTS · ' + HINT_PACK_PRICE + ' 🪙');
    $('shop-buy').disabled = save.coins < HINT_PACK_PRICE;
    $('shop-short').textContent = '';
    $('shop-more').classList.toggle('hidden', save.coins >= HINT_PACK_PRICE);
    $('shop').classList.remove('hidden');
  }
  function buyHints() {
    if (save.coins < HINT_PACK_PRICE) return;
    save.coins -= HINT_PACK_PRICE;
    save.hints += HINT_PACK_SIZE;
    store();
    $('shop').classList.add('hidden');
    Sounds.play('hint');
    toast('+' + HINT_PACK_SIZE + ' hints!');
    render();
  }

  // ---- eliminate: takes 3 digits that are NOT in the code off the keypad ----
  function elimLeft(c) { return range(10).filter(function (d) { return c.code.indexOf(d) < 0 && c.elim.indexOf(d) < 0; }); }
  function openElim() {
    const c = C();
    if (c.done || busy || mode !== 'level') return;
    if (!elimLeft(c).length) { toast('All the wrong digits are already gone!'); return; }
    const free = save.elims > 0;
    coinText($('el-have'), 'You have ' + save.coins + ' 🪙');
    $('el-have').classList.toggle('hidden', free);
    const b = $('el-use');
    if (free) b.textContent = 'USE FREE ELIMINATE (' + save.elims + ')';
    else coinText(b, 'USE · ' + ELIMINATE_PRICE + ' 🪙');
    b.disabled = !free && save.coins < ELIMINATE_PRICE;
    $('el-more').classList.toggle('hidden', free || save.coins >= ELIMINATE_PRICE);
    $('elim-modal').classList.remove('hidden');
  }
  function useElim() {
    const c = C();
    const free = save.elims > 0;
    if (!free && save.coins < ELIMINATE_PRICE) return;
    if (free) save.elims--; else save.coins -= ELIMINATE_PRICE;
    const gone = shuffle(elimLeft(c)).slice(0, ELIMINATE_DIGITS);
    c.elim = c.elim.concat(gone);
    entry = entry.filter(function (d) { return gone.indexOf(d) < 0; }); c.entry = entry.slice();
    stat('elims');
    store();
    $('elim-modal').classList.add('hidden');
    Sounds.play('hint'); buzz([30, 40, 30]);
    toast('🪄 ' + gone.sort().join(', ') + ' are not in the code');
    render();
  }

  // ---- extra tries: 2 locked rows, each opened with an ad or coins ----
  let extraOut = false;
  function offerExtra(out) {
    const c = C();
    if (c.done || !c.extras || c.extra >= EXTRA_TRIES) return;
    extraOut = !!out;
    $('ex-title').textContent = out ? 'OUT OF TRIES' : 'UNLOCK A TRY';
    coinText($('ex-coins'), 'USE ' + EXTRA_TRY_PRICE + ' 🪙');
    $('ex-coins').disabled = save.coins < EXTRA_TRY_PRICE;
    $('ex-more').classList.toggle('hidden', save.coins >= EXTRA_TRY_PRICE);
    $('ex-close').textContent = out ? 'GIVE UP' : 'NOT NOW';
    $('extra-modal').classList.remove('hidden');
  }
  function addTry() {
    const c = C();
    if (c.done || c.extra >= EXTRA_TRIES) return;
    c.extra++;
    store();
    $('extra-modal').classList.add('hidden');
    Sounds.play('hint');
    buzz([30, 40, 30]);
    toast('🔓 Try unlocked!');
    render();
  }
  function extraByAd() {
    Ads.reward(function (watched) {
      if (watched) addTry(); else toast('No ad available right now');
    }, musicHooks);
  }
  function extraByCoins() {
    if (save.coins < EXTRA_TRY_PRICE) return;
    save.coins -= EXTRA_TRY_PRICE;
    addTry();
  }
  function extraClose() {
    $('extra-modal').classList.add('hidden');
    const c = C();
    if (extraOut && !c.done && c.guesses.length >= allowed(c)) {
      c.done = 'lost'; loseLife(); save.stats.clean = 0; store(); lose();
    }
  }

  function stars() { const n = C().guesses.length; return n <= 2 ? 3 : n === 3 ? 2 : 1; }

  // ======================= WIN / LOSE =====================================
  function win() {
    if (mode !== 'level') { finishSpecial(true); return; }
    const c = save.cur;
    const s = stars();
    const closeCall = c.guesses.length === allowed(c) && allowed(c) > 1;
    if (!c.paid) {                     // count everything only once, even after a reload
      c.paid = true;
      save.stars += s;
      save.wins++;
      save.chestStars += s;
      const d = daily();
      d.wins++;
      if (c.guesses.length === 1) stat('oneTry');
      if (c.guesses.length <= 2) stat('quick');
      if (!c.revealed.length && !c.elim.length) { stat('clean'); save.stats.cleanBest = Math.max(save.stats.cleanBest || 0, save.stats.clean); }
      else save.stats.clean = 0;
      ['padlock', 'web', 'ice', 'chain', 'fog'].forEach(function (k) { if (c.locks[k] !== undefined) stat(k + 's'); });
      if (c.boss) stat('bosses');
      if (closeCall) stat('closeCalls');
      store();
      if (DAILY_TARGETS.some(function (t) { return t.levels === d.wins; })) setTimeout(function () { toast('🎯 Daily target reached!'); }, 900);
      if (window.App && App.onWin) App.onWin();
    }
    const pay = WIN_COINS * (c.boss ? BOSS_COIN_TIMES : 1);
    Sounds.playWin(4000);
    buzz([40, 60, 40, 60, 120]);
    confetti();
    render();
    showModal({
      icon: c.boss ? '👑' : '🔓', title: c.boss ? 'BOSS DEFEATED!' : 'ESCAPED!', cls: 'won' + (closeCall ? ' close' : ''),
      stars: s,
      line: 'The code was ' + c.code.join(''),
      extra: closeCall ? '😅 CLOSE CALL!' : '',
      coins: '+' + pay + ' 🪙',
      button: '▶ WATCH AD · GET ' + (pay * 2) + ' 🪙', action: watchForDouble,
      button2: 'CLAIM REWARD · ' + pay + ' 🪙', action2: function () { collect(1); }
    });
  }
  function watchForDouble() {
    Ads.reward(function (watched) {
      if (watched) collect(2);
      else toast('No ad available right now');
    }, musicHooks);
  }
  function collect(times) {
    const c = save.cur;
    if (c.collected) return;
    c.collected = true;
    const amount = WIN_COINS * (c.boss ? BOSS_COIN_TIMES : 1) * times;
    save.coins += amount;
    store();
    $('m-button').disabled = true;
    $('m-button2').disabled = true;
    coinBurst(amount);
    render();
    setTimeout(function () {
      hideModal();
      if (adAfterLevel(save.level) && !save.noAds) Ads.interstitial(next, musicHooks);   // the ad comes AFTER the coins
      else next();
    }, 1100);
  }
  function lose() {
    if (mode !== 'level') { finishSpecial(false); return; }
    const c = save.cur;
    Sounds.play('wrong');
    buzz([200, 80, 200]);
    render();
    const any = save.lives > 0;
    showModal({
      icon: '💔', title: 'LOCKED IN', cls: 'lost',
      line: 'The code was ' + c.code.join(''),
      extra: any ? save.lives + ' ❤️ left' : 'You are out of lives!',
      button: any ? 'TRY AGAIN ↻' : 'GET LIVES ❤️', action: any ? retry : function () { App.livesModal(); },
      button2: 'HOME', action2: function () { App.home(); }
    });
    if (!any) setTimeout(function () { App.livesModal(); }, 700);
  }
  // daily puzzle / race finished: send the result, show where to see the ranking
  function finishSpecial(won) {
    const c = C();
    const isDaily = mode === 'daily', id = raceId;
    if (!c.paid) {
      c.paid = true;
      if (won && isDaily) { save.coins += DAILY_COINS; stat('dailies'); }
      store();
      const me = { name: save.name, avatar: save.avatar, tries: won ? c.guesses.length : 99, ms: c.ms || 0, done: true, paid: true };
      if (isDaily) { if (won) Board.dailyPush(c.day, save.pid, me); }
      else Board.raceSubmit(id, save.pid, me);
    }
    if (won) { Sounds.playWin(3000); buzz([40, 60, 40, 60, 120]); confetti(); } else { Sounds.play('wrong'); buzz([200, 80, 200]); }
    render();
    const n = c.guesses.length;
    showModal({
      icon: won ? (isDaily ? '📅' : '⚔️') : '💔', title: won ? 'SOLVED!' : 'LOCKED IN', cls: won ? 'won' : 'lost',
      line: won ? 'Cracked in ' + n + ' ' + (n === 1 ? 'try' : 'tries') + ' · ' + clockText(c.ms) : 'The code was ' + c.code.join(''),
      coins: won && isDaily ? '+' + DAILY_COINS + ' 🪙' : '',
      button: isDaily ? '🏆 SEE RANKING' : '⚔️ SEE RESULT',
      action: function () { hideModal(); App.home(function () { if (isDaily) Extras.dailyBoard(); else Extras.raceResult(id); }); },
      button2: 'HOME', action2: function () { App.home(); }
    });
  }
  function clockText(ms) { const t = Math.round((ms || 0) / 1000); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
  function next() { save.level++; newPuzzle(); hideModal(); render(); bossIntro(); maybeTour(); }
  function retry() {
    if (save.lives <= 0) { App.livesModal(); return; }
    newPuzzle(); hideModal(); render(); maybeTour();
  }
  function bossIntro() { if (save.cur.boss && save.seen.boss) toast('👑 BOSS LEVEL — ' + BOSS_TRIES + ' tries, ×' + BOSS_COIN_TIMES + ' coins!'); }
  function buzz(p) { if (window.App) App.buzz(p); }

  // ======================= GUIDED INSTRUCTIONS ============================
  function howToPlay(onEnd) {
    const n = C().code.length, lv = mode === 'level';
    Tour.start([
      { title: 'WELCOME TO CODE QUEST', text: 'Every level hides a secret code. Crack it to escape!' },
      { el: '#code', title: 'THE SECRET CODE', text: 'These ' + n + ' boxes hide the code. Every digit is different.' },
      { el: '#keypad', title: 'TYPE A GUESS', text: 'Tap ' + n + ' digits, then ✓ to try them.' },
      { el: function () { return document.querySelector('#grid .row'); }, title: 'READ THE COLOURS',
        html: '<span class="dot hit">7</span> right digit, right place<br><span class="dot near">3</span> in the code, wrong place<br><span class="dot miss">5</span> not in the code' },
      lv && { el: function () { return document.querySelector('#grid .row.locked'); }, title: 'LOCKED TRIES',
        text: 'You have ' + MAX_TRIES + ' tries. Tap UNLOCK for up to ' + EXTRA_TRIES + ' more — watch an ad or pay ' + EXTRA_TRY_PRICE + ' 🪙.' },
      lv && { el: '#hint-btn', title: 'HINTS', text: 'Stuck? A hint shows one digit in its place.' },
      lv && { el: '#elim-btn', title: 'ELIMINATE 🪄', text: 'Takes ' + ELIMINATE_DIGITS + ' digits that are not in the code off the keypad.' },
      lv && { el: '#lives-chip', title: 'LIVES', text: 'Losing a level costs a life ❤️. One comes back every ' + (LIFE_REGEN_MINUTES / 60) + ' hours.' }
    ].filter(Boolean), function () { save.seenHelp = true; if (lv) save.seen.elim = true; store(); if (onEnd) onEnd(); });
  }
  function once(key, steps, onEnd) {
    Tour.start(steps, function () { save.seen[key] = true; store(); if (onEnd) onEnd(); });
  }
  const TOURS = [
    { key: 'elim', when: function () { return mode === 'level'; }, steps: function () { return [
      { el: '#elim-btn', title: 'NEW: ELIMINATE 🪄', text: 'Takes ' + ELIMINATE_DIGITS + ' digits that are not in the code off the keypad.' }]; } },
    { key: 'boss', when: function () { return C().boss; }, steps: function () { return [
      { el: '#level', title: 'BOSS LEVEL 👑', text: 'The last level of every world. Only ' + BOSS_TRIES + ' tries — but it pays ×' + BOSS_COIN_TIMES + ' coins!' }]; } },
    { key: 'padlock', sel: '#code .code-box.padlock', steps: function () { return [
      { el: '#code .code-box.padlock', title: 'PADLOCK 🔒', text: 'This box is locked: your guesses won’t show its colour.' },
      { el: function () { const k = document.querySelector('#code .badge.key'); return k && k.parentNode; }, title: 'FIND THE KEY 🔑',
        text: 'Get the right digit in the box with the key (it turns green) and the padlock opens. A hint opens it too.' }]; } },
    { key: 'web', sel: '#code .code-box.web', steps: function () { return [
      { el: '#code .code-box.web', title: 'SPIDER WEB 🕸️', text: 'The web hides this box’s colour. Find ' + WEB_BREAKS_AFTER +
        ' other digits (green) and it breaks — the counter shows how many you have. A hint breaks it too.' }]; } },
    { key: 'ice', sel: '#code .code-box.ice', steps: function () { return [
      { el: '#code .code-box.ice', title: 'ICE BOX ❄️', text: 'This box is frozen on your 1st, 3rd and 5th guess — its colour only shows on the 2nd, 4th and 6th.' },
      { el: function () { return document.querySelector('#grid .row.active'); }, title: 'PLAN YOUR GUESSES', text: 'Frozen guesses still count. Use them to test the other boxes!' }]; } },
    { key: 'chain', sel: '#code .code-box.chain', steps: function () { return [
      { el: '#code', title: 'CHAINED BOXES ⛓️', text: 'Two boxes are linked. Their colours stay hidden until you get BOTH right in the same guess.' }]; } },
    { key: 'fog', sel: '#code .code-box.fog', steps: function () { return [
      { el: '#code .code-box.fog', title: 'FOG 🌫️', text: 'In this box yellow and grey look the same. Green still shines through when you are right.' }]; } },
    { key: 'daily', when: function () { return mode === 'daily'; }, steps: function () { return [
      { el: '#level', title: 'DAILY PUZZLE 📅', text: 'Everyone gets the same code today. ' + DAILY_TRIES + ' tries, no hints — fewest tries wins the day!' }]; } },
    { key: 'race', when: function () { return mode === 'race'; }, steps: function () { return [
      { el: '#level', title: 'RACE ⚔️', text: 'You and your friend crack the same code. Fewest tries wins — if it’s a tie, the faster one wins.' }]; } }
  ];
  // shows the right instructions the first time something new appears
  function maybeTour() {
    setTimeout(function () {
      const c = C();
      if (!playing || busy || Tour.active() || c.done) return;
      if (!$('modal').classList.contains('hidden') || !$('extra-modal').classList.contains('hidden')) return;
      const run = function () { maybeTour(); };
      if (!save.seenHelp) { howToPlay(run); return; }
      for (let i = 0; i < TOURS.length; i++) {
        const t = TOURS[i];
        if (save.seen[t.key]) continue;
        if (t.when ? t.when() : document.querySelector(t.sel)) { once(t.key, t.steps(), run); return; }
      }
    }, 450);
  }

  // music goes quiet while an ad plays
  let savedVolume = null;
  const musicHooks = {
    before: function () {
      try { savedVolume = parseFloat(localStorage.getItem('ctc-music-volume') || '0.18'); } catch (e) { savedVolume = 0.18; }
      Sounds.setVolume(0);
    },
    after: function () { if (savedVolume !== null) Sounds.setVolume(savedVolume); savedVolume = null; }
  };

  // ======================= LITTLE HELPERS =================================
  function shake(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
  let toastTimer = null;
  function toast(text) {
    const t = $('toast');
    coinText(t, text);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }
  function showModal(o) {
    const m = $('modal');
    m.className = 'modal ' + o.cls;
    $('m-icon').textContent = o.icon;
    $('m-title').textContent = o.title;
    $('m-stars').textContent = o.stars ? '★'.repeat(o.stars) + '☆'.repeat(3 - o.stars) : '';
    $('m-line').textContent = o.line;
    $('m-extra').textContent = o.extra || '';
    $('m-coins').classList.toggle('hidden', !o.coins);
    coinText($('m-coins'), o.coins || '');
    const b = $('m-button');
    coinText(b, o.button); b.onclick = o.action; b.disabled = false;
    const b2 = $('m-button2');
    b2.classList.toggle('hidden', !o.button2);
    coinText(b2, o.button2 || ''); b2.onclick = o.action2 || null; b2.disabled = false;
  }
  function hideModal() { $('modal').className = 'modal hidden'; $('confetti').innerHTML = ''; }
  function confetti() {
    const box = $('confetti');
    box.innerHTML = '';
    const colours = ['#25e06b', '#ffc933', '#ff5c8a', '#4cc9ff', '#ffffff'];
    for (let i = 0; i < 60; i++) {
      const p = document.createElement('i');
      p.style.left = (Math.random() * 100) + '%';
      p.style.background = pick(colours);
      p.style.animationDelay = (Math.random() * 0.8) + 's';
      p.style.animationDuration = (1.8 + Math.random() * 1.6) + 's';
      box.appendChild(p);
    }
  }
  function coinBurst(amount) {
    coinText($('m-coins'), '+' + amount + ' 🪙');
    $('m-coins').classList.remove('pop'); void $('m-coins').offsetWidth; $('m-coins').classList.add('pop');
    const chip = $('coins');
    chip.classList.remove('pop'); void chip.offsetWidth; chip.classList.add('pop');
    Sounds.play('correct');
  }

  // ======================= START ==========================================
  function init() {
    // saves from the version with clue boxes: start that level again with a fresh code
    if (!save.cur || save.cur.parts) newPuzzle();
    const pad = $('keypad');
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'enter'].forEach(function (k) {
      const b = document.createElement('button');
      if (k === 'back') { b.id = 'back'; b.textContent = '⌫'; b.setAttribute('aria-label', 'Delete'); b.onclick = back; }
      else if (k === 'enter') { b.id = 'enter'; b.textContent = '✓'; b.setAttribute('aria-label', 'Try this code'); b.onclick = submit; }
      else { b.dataset.d = k; b.textContent = k; b.onclick = function () { type(+k); }; }
      pad.appendChild(b);
    });
    $('hint-btn').onclick = hint;
    $('elim-btn').onclick = openElim;
    $('el-use').onclick = useElim;
    $('el-close').onclick = function () { $('elim-modal').classList.add('hidden'); };
    $('shop-buy').onclick = buyHints;
    $('shop-close').onclick = function () { $('shop').classList.add('hidden'); };
    $('help-btn').onclick = function () { if (!Tour.active()) howToPlay(); };
    $('help-close').onclick = function () { $('help').classList.add('hidden'); };
    $('home-btn').onclick = function () { App.home(); };
    $('lives-chip').onclick = function () { App.livesModal(); };
    $('ex-ad').onclick = extraByAd;
    $('ex-coins').onclick = extraByCoins;
    $('ex-close').onclick = extraClose;
    ['shop-more', 'el-more', 'ex-more'].forEach(function (id) {
      $(id).onclick = function () { ['shop', 'elim-modal', 'extra-modal'].forEach(function (m) { $(m).classList.add('hidden'); }); App.goShop(); };
    });
    Ads.banner($('ad-banner'));
    document.addEventListener('keydown', function (e) {
      if (!playing) return;
      if (/^[0-9]$/.test(e.key)) type(+e.key);
      else if (e.key === 'Backspace') back();
      else if (e.key === 'Enter') { if (document.querySelectorAll('.modal:not(.hidden)').length === 0) submit(); }
    });
    // stop double-tap zoom on iPhone while tapping keys fast
    document.addEventListener('dblclick', function (e) { e.preventDefault(); }, { passive: false });

    const c = save.cur;
    if (c.done === 'won' && c.collected) { save.level++; newPuzzle(); }   // closed during the level-break ad
    regenLives();
    setInterval(regenLives, 15000);
  }

  // open the quest (default), today's daily puzzle or a race. false = can't play now.
  let playing = false;
  function open(which, id) {
    regenLives();
    mode = which || 'level';
    raceId = id || null;
    if (mode === 'daily') dailyPuzzle();
    if (mode === 'race') racePuzzle(id);
    const c = C();
    if (mode === 'level') {
      if (save.lives <= 0 && (c.done === 'lost' || c.guesses.length === 0)) { App.livesModal(); return false; }
      if (c.done === 'lost') newPuzzle();
    } else if (c.done) {                 // already played: show the result instead
      mode = 'level';
      if (which === 'daily') Extras.dailyBoard(); else Extras.raceResult(id);
      return false;
    }
    const p = C();
    if (!p.startedAt) { p.startedAt = Date.now(); store(); }
    playing = true;
    wasOpen = null;
    entry = (p.entry || []).slice();
    render();
    if (p.done === 'won') win();
    else if (!p.done && p.guesses.length >= allowed(p)) offerExtra(true);
    else if (mode === 'level' && p.guesses.length === 0) bossIntro();
    maybeTour();
    return true;
  }
  function close() {
    playing = false; Tour.stop(); hideModal();
    ['shop', 'extra-modal', 'elim-modal'].forEach(function (id) { $(id).classList.add('hidden'); });
    mode = 'level'; raceId = null;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return {
    data: function () { return save; }, persist: store, open: open, close: close,
    render: function () { if (playing) render(); },
    regenLives: regenLives, nextLifeIn: nextLifeIn, refillLives: refillLives, randomName: randomName,
    addCoins: function (n) { save.coins += n; store(); },
    buyHints: function () { if (save.coins < HINT_PACK_PRICE) return false; save.coins -= HINT_PACK_PRICE; save.hints += HINT_PACK_SIZE; store(); return true; },
    afterRefill: function () { if (playing && mode === 'level' && save.cur.done === 'lost') retry(); },
    daily: daily, dailyReady: dailyReady, claimDaily: claimDaily, DAILY_TARGETS: DAILY_TARGETS,
    adDay: adDay, adWatched: adWatched, AD_LADDER: AD_LADDER,
    today: today, utcDay: utcDay, stat: stat,
    dailyState: function () { return save.dp && save.dp.day === utcDay() ? save.dp : null; },
    raceState: function (id) { return save.races[id] || null; },
    inProgress: function () { const c = save.cur; return !!c && !c.done && (c.guesses.length > 0 || (c.entry || []).length > 0); },
    toast: toast, musicHooks: musicHooks, LIVES_MAX: LIVES_MAX, LIFE_REFILL_PRICE: LIFE_REFILL_PRICE, AD_COINS: AD_COINS,
    HINT_PACK_PRICE: HINT_PACK_PRICE, HINT_PACK_SIZE: HINT_PACK_SIZE,
    DAILY_TRIES: DAILY_TRIES, DAILY_COINS: DAILY_COINS, RACE_TRIES: RACE_TRIES, RACE_FEE: RACE_FEE, RACE_MAX: RACE_MAX,
    // testing helpers
    _state: function () { return save; },
    _render: function () { wasOpen = null; render(); },
    _new: function () { newPuzzle(); if (playing) render(); },
    _view: function () { return view(C()); },
    _reset: function () { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } location.reload(); }
  };
})();

// Works offline and can be added to the home screen (only over https / localhost).
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(function () { /* not important */ });
}
