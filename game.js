/* ==========================================================================
   CODE QUEST - MOBILE PUZZLE GAME
   --------------------------------------------------------------------------
   Every level hides a secret code. Type a guess and the boxes show:
     green  = right digit in the right place
     yellow = the digit is in the code, but somewhere else
     grey   = the digit is not in the code
   ========================================================================== */
'use strict';

// ---------------- SETTINGS (easy to change) ----------------
const MAX_TRIES        = 4;     // guesses per level
const EXTRA_TRIES      = 2;     // locked extra rows, opened with an ad or coins
const EXTRA_TRY_PRICE  = 100;   // coins for one extra try
const WIN_COINS        = 40;    // coins for winning a level (an ad doubles them)
const START_COINS      = 0;     // coins a new player starts with
const HINT_PACK_PRICE  = 700;   // coins for a pack of hints
const HINT_PACK_SIZE   = 3;     // hints in one pack
const PICTURES         = 5;     // pictures/1.jpg ... 5.jpg, one per level, repeating
const LIVES_MAX        = 5;     // losing a level costs one life
const LIFE_REFILL_PRICE = 1500; // coins to fill all lives again
const LIFE_REGEN_MINUTES = 240; // one free life comes back every 4 hours (0 = never)
const AD_COINS         = 100;   // coins for watching an ad from the home page or shop
// DAILY TARGETS: levels won today -> coins (100 a day in total). Resets at midnight.
const DAILY_TARGETS = [
  { levels: 5,  coins: 20 },
  { levels: 10, coins: 20 },
  { levels: 15, coins: 20 },
  { levels: 20, coins: 40 }
];

// Code length: 4 digits up to level 100, 5 digits from 101, 6 digits from 201.
function digitsForLevel(level) { return level > 200 ? 6 : level > 100 ? 5 : 4; }

// LOCKED BOXES: a position of the code whose colours stay hidden
//   🔒 padlock: opens once the digit in the box with the 🔑 has been found
//   🕸️ spider web: breaks once WEB_BREAKS_AFTER other digits have been found
const PADLOCK_FROM           = 11;   // from this level, half of the levels have a padlock
const LOCK_EVERY_LEVEL_FROM  = 31;   // from here every level has a padlock or a web
const BOTH_LOCKS_FROM        = 101;  // from here every level has both
const WEB_BREAKS_AFTER       = 3;

// LEVEL-BREAK ADS: shown after the coins for a level have been collected.
// Levels 1-21: after every 3rd level; 22-100: every 2nd level; 101+: every level.
function adAfterLevel(level) {
  if (level <= 21) return level % 3 === 0;
  if (level <= 100) return (level - 21) % 2 === 0;
  return true;
}

const SAVE_KEY = 'ctcm-save-v1';
// -----------------------------------------------------------

// puts text into an element, drawing every 🪙 as the gold coin picture
function coinText(el, text) {
  el.textContent = '';
  String(text).split('🪙').forEach(function (part, i) {
    if (i) { const c = document.createElement('i'); c.className = 'coin'; el.appendChild(c); }
    if (part) el.appendChild(document.createTextNode(part));
  });
}

const Game = (function () {
  const $ = function (id) { return document.getElementById(id); };
  function pick(l) { return l[Math.floor(Math.random() * l.length)]; }
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function range(n) { const a = []; for (let i = 0; i < n; i++) a.push(i); return a; }

  // ======================= SAVED PROGRESS =================================
  let save = load();
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { /* ignore */ }
    if (!s || !(s.level >= 1)) s = { level: 1, stars: 0, cur: null, seenHelp: false };
    if (typeof s.coins !== 'number') { s.coins = START_COINS; s.hints = 0; }   // the old free hints are gone
    if (typeof s.hints !== 'number') s.hints = 0;
    if (typeof s.lives !== 'number') { s.lives = LIVES_MAX; s.lifeAt = null; }
    if (typeof s.wins !== 'number') s.wins = Math.max(0, s.level - 1);
    if (typeof s.avatar !== 'number') s.avatar = 0;
    if (!s.name) s.name = randomName();
    if (!s.settings) s.settings = { vibrate: true, notify: false };
    s.noAds = !!s.noAds;
    if (s.cur) {                                // saves from older versions
      s.cur.revealed = s.cur.revealed || [];
      s.cur.locks = s.cur.locks || {};
      s.cur.extra = s.cur.extra || 0;
    }
    return s;
  }
  function randomName() {
    const a = ['Swift', 'Silent', 'Clever', 'Brave', 'Lucky', 'Sneaky', 'Golden', 'Shadow', 'Rapid', 'Mystic', 'Cosmic', 'Wild',
               'Sharp', 'Bold', 'Frosty', 'Turbo', 'Witty', 'Iron', 'Neon', 'Royal'];
    const b = ['Fox', 'Owl', 'Tiger', 'Panda', 'Wolf', 'Falcon', 'Otter', 'Raven', 'Lynx', 'Cobra', 'Koala', 'Shark', 'Phoenix',
               'Ninja', 'Wizard', 'Rider', 'Hunter', 'Spark', 'Comet', 'Cracker'];
    return pick(a) + pick(b) + Math.floor(100 + Math.random() * 900);
  }
  function store() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* private mode */ } }

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

  // ======================= DAILY TARGETS ==================================
  function today() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
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

  // ======================= PUZZLES ========================================
  function makeLocks(n) {
    const L = save.level;
    let kinds = [];
    if (L >= BOTH_LOCKS_FROM) kinds = ['padlock', 'web'];
    else if (L >= LOCK_EVERY_LEVEL_FROM) kinds = [pick(['padlock', 'web'])];
    else if (L >= PADLOCK_FROM && Math.random() < 0.5) kinds = ['padlock'];
    const free = shuffle(range(n));
    const out = {};
    kinds.forEach(function (k) {
      if (k === 'padlock') { out.padlock = free.pop(); out.key = free.pop(); }
      else out.web = free.pop();
    });
    return out;
  }
  function newPuzzle() {
    const n = digitsForLevel(save.level);
    save.cur = { code: shuffle(range(10)).slice(0, n),           // all digits different
                 guesses: [], revealed: [], locks: makeLocks(n), extra: 0, done: '', paid: false, collected: false };
    entry = [];
    wasOpen = null;
    store();
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
  // which digits are known (green in an open position, or shown by a hint).
  function webNeed(c) { return Math.min(WEB_BREAKS_AFTER, c.code.length - 1); }
  function view(c) {
    const raw = {};
    c.guesses.forEach(function (g) { marks(g, c.code).forEach(function (k, i) { if (k === 'hit') raw[i] = true; }); });
    const told = {};
    c.revealed.forEach(function (i) { told[i] = true; raw[i] = true; });
    const L = c.locks;
    const open = {};
    range(c.code.length).forEach(function (i) { open[i] = true; });
    let webHave = 0;
    if (!c.done) {
      if (L.padlock !== undefined) open[L.padlock] = !!raw[L.key] || !!told[L.padlock];
      if (L.web !== undefined) {
        webHave = Object.keys(raw).filter(function (k) { return +k !== L.web && open[k]; }).length;
        open[L.web] = webHave >= webNeed(c) || !!told[L.web];
      }
    }
    const known = {};
    Object.keys(raw).forEach(function (k) { if (open[k] || told[k]) known[k] = true; });
    return { open: open, known: known, told: told, webHave: webHave };
  }

  // ======================= DRAWING ========================================
  let entry = [];
  let busy = false;
  let flipRow = -1;           // only the row just entered gets the flip animation
  let wasOpen = null;         // which boxes were open last time (to animate unlocking)

  function render() {
    const c = save.cur;
    const n = c.code.length;
    const v = view(c);
    $('level').textContent = 'LEVEL ' + save.level;
    coinText($('coins'), '🪙 ' + save.coins);
    $('lives').textContent = save.lives;
    $('lives-chip').classList.toggle('full', save.lives >= LIVES_MAX);
    document.body.style.setProperty('--bg', 'url("pictures/' + (((save.level - 1) % PICTURES) + 1) + '.jpg")');

    // hint button
    const hb = $('hint-btn');
    hb.innerHTML = '';
    if (save.hints > 0) {
      hb.appendChild(document.createTextNode('💡 HINT '));
      const b = document.createElement('b'); b.textContent = save.hints; hb.appendChild(b);
    } else {
      hb.appendChild(document.createTextNode('💡 +' + HINT_PACK_SIZE + ' HINTS '));
      const b = document.createElement('b'); coinText(b, HINT_PACK_PRICE + ' 🪙'); hb.appendChild(b);
    }
    hb.disabled = !!c.done;

    // the secret code: ? until found, padlock / web while locked
    const box = $('code');
    box.innerHTML = '';
    box.style.gridTemplateColumns = 'repeat(' + n + ', 1fr)';
    const nowOpen = [];
    for (let i = 0; i < n; i++) {
      const t = document.createElement('div');
      t.className = 'code-box';
      const sym = document.createElement('span');
      sym.className = 'sym';
      nowOpen.push(v.open[i]);
      if (c.done) {
        sym.textContent = c.code[i];
        t.classList.add(c.done === 'won' ? 'found' : 'shown');
      } else if (!v.open[i] && c.locks.padlock === i) {
        t.classList.add('locked', 'padlock');
        sym.textContent = '🔒';
        const cap = document.createElement('small'); cap.textContent = 'FIND 🔑'; t.appendChild(cap);
      } else if (!v.open[i] && c.locks.web === i) {
        t.classList.add('locked', 'web');
        sym.textContent = '🕸️';
        const cap = document.createElement('small'); cap.textContent = v.webHave + '/' + webNeed(c); t.appendChild(cap);
      } else if (v.known[i]) {
        sym.textContent = c.code[i];
        t.classList.add(v.told[i] ? 'told' : 'found');
      } else {
        sym.textContent = '?';
      }
      if (wasOpen && wasOpen[i] === false && v.open[i]) t.classList.add('unlocking');
      t.insertBefore(sym, t.firstChild);
      if (c.locks.key === i && !c.done && !v.known[i] && c.locks.padlock !== undefined && !v.open[c.locks.padlock]) {
        const k = document.createElement('i'); k.className = 'badge key'; k.textContent = '🔑'; t.appendChild(k);
      }
      box.appendChild(t);
    }
    const unlocked = wasOpen && nowOpen.some(function (o, i) { return o && wasOpen[i] === false; });
    wasOpen = nowOpen;
    if (unlocked && !c.done) { Sounds.play('hint'); buzz([30, 40, 30]); toast('🔓 A box has been unlocked!'); }

    // guess grid (a locked position keeps its colour hidden)
    const grid = $('grid');
    grid.innerHTML = '';
    const can = allowed(c);
    for (let r = 0; r < MAX_TRIES + EXTRA_TRIES; r++) {
      const row = document.createElement('div');
      row.className = 'row' + (r === flipRow ? ' reveal' : '');
      if (r >= can) {                                   // extra try, still locked
        row.classList.add('locked');
        for (let i = 0; i < n; i++) { const cell = document.createElement('div'); cell.className = 'cell'; row.appendChild(cell); }
        const tag = document.createElement('span'); tag.className = 'row-lock';
        if (r === can && !c.done) {
          row.classList.add('next');
          row.onclick = function () { offerExtra(false); };
          coinText(tag, '🔒 +1 TRY');
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
          cell.classList.add(v.open[i] ? m[i] : 'veiled');
          cell.style.animationDelay = (i * 0.12) + 's';
        } else if (r === c.guesses.length && !c.done && r < can) {
          row.classList.add('active');
          if (entry[i] !== undefined) { cell.textContent = entry[i]; cell.classList.add('typed'); }
        }
        row.appendChild(cell);
      }
      grid.appendChild(row);
    }
    const left = Math.max(0, can - c.guesses.length);
    $('tries').textContent = n + '-DIGIT CODE · ' + left + ' ' + (left === 1 ? 'TRY' : 'TRIES') + ' LEFT';
    $('enter').disabled = entry.length !== n;
    fitGrid();
  }

  // make the guess boxes as big as the free space allows (small phones, long codes)
  function fitGrid() {
    const n = save.cur ? save.cur.code.length : 4;
    const board = $('board');
    const open = save.cur ? allowed(save.cur) : MAX_TRIES;
    const rows = MAX_TRIES + EXTRA_TRIES;
    const free = board.clientHeight - $('tries').offsetHeight - 6 - (rows - 1) * 6;
    const byHeight = Math.floor(free / (open + (rows - open) * 0.55));   // locked rows are shorter
    const byWidth = Math.floor((board.clientWidth - (n - 1) * 7) / n);
    $('grid').style.setProperty('--cell', Math.max(22, Math.min(54, byHeight, byWidth)) + 'px');
  }
  window.addEventListener('resize', fitGrid);

  // ======================= PLAYING ========================================
  function type(d) {
    if (busy || save.cur.done || entry.length >= save.cur.code.length) return;
    buzz(12);
    entry.push(d);
    render();
  }
  function back() {
    if (busy || save.cur.done) return;
    entry.pop();
    render();
  }
  function submit() {
    const c = save.cur;
    if (busy || c.done) return;
    if (c.guesses.length >= allowed(c)) { offerExtra(true); return; }
    if (entry.length !== c.code.length) { shake($('grid')); buzz(60); return; }
    c.guesses.push(entry.slice());
    flipRow = c.guesses.length - 1;
    const m = marks(entry, c.code);
    entry = [];
    if (m.every(function (k) { return k === 'hit'; })) c.done = 'won';
    else if (c.guesses.length >= allowed(c) && c.extra >= EXTRA_TRIES) { c.done = 'lost'; loseLife(); }
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
      else { Sounds.play(m.indexOf('hit') >= 0 ? 'correct' : 'wrong'); buzz(m.indexOf('hit') >= 0 ? 25 : [20, 60, 20]); render(); }
    }, c.code.length * 120 + 450);
  }

  // ---- hints: each one shows one correct digit in its place ----
  function hint() {
    const c = save.cur;
    if (c.done || busy) return;
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

  // ---- extra tries: 2 locked rows, each opened with an ad or coins ----
  function allowed(c) { return MAX_TRIES + Math.min(EXTRA_TRIES, c.extra || 0); }
  let extraOut = false;
  function offerExtra(out) {
    const c = save.cur;
    if (c.done || c.extra >= EXTRA_TRIES) return;
    extraOut = !!out;
    $('ex-title').textContent = out ? 'OUT OF TRIES' : 'EXTRA TRY';
    coinText($('ex-coins'), 'USE ' + EXTRA_TRY_PRICE + ' 🪙');
    $('ex-coins').disabled = save.coins < EXTRA_TRY_PRICE;
    $('ex-close').textContent = out ? 'GIVE UP' : 'NOT NOW';
    $('extra-modal').classList.remove('hidden');
  }
  function addTry() {
    const c = save.cur;
    if (c.done || c.extra >= EXTRA_TRIES) return;
    c.extra++;
    store();
    $('extra-modal').classList.add('hidden');
    Sounds.play('hint');
    buzz([30, 40, 30]);
    toast('🔓 +1 try!');
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
    const c = save.cur;
    if (extraOut && !c.done && c.guesses.length >= allowed(c)) { c.done = 'lost'; loseLife(); store(); lose(); }
  }

  function stars() { const n = save.cur.guesses.length; return n <= 2 ? 3 : n === 3 ? 2 : 1; }

  // ======================= WIN / LOSE =====================================
  function win() {
    const c = save.cur;
    const s = stars();
    if (!c.paid) {                     // count the stars only once, even after a reload
      c.paid = true;
      save.stars += s;
      save.wins++;
      const d = daily();
      d.wins++;
      store();
      if (DAILY_TARGETS.some(function (t) { return t.levels === d.wins; })) setTimeout(function () { toast('🎯 Daily target reached!'); }, 900);
    }
    Sounds.playWin(4000);
    buzz([40, 60, 40, 60, 120]);
    confetti();
    render();
    showModal({
      icon: '🔓', title: 'ESCAPED!', cls: 'won',
      stars: s,
      line: 'The code was ' + c.code.join(''),
      coins: true,
      button: '▶ WATCH AD · GET ' + (WIN_COINS * 2) + ' 🪙', action: watchForDouble,
      button2: 'COLLECT ' + WIN_COINS + ' 🪙', action2: function () { collect(1); }
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
    const amount = WIN_COINS * times;
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
  }
  function next() { save.level++; newPuzzle(); hideModal(); render(); }
  function retry() {
    if (save.lives <= 0) { App.livesModal(); return; }
    newPuzzle(); hideModal(); render();
  }
  function buzz(p) { if (window.App) App.buzz(p); }

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
    coinText($('m-coins'), '+' + WIN_COINS + ' 🪙');
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
    $('shop-buy').onclick = buyHints;
    $('shop-close').onclick = function () { $('shop').classList.add('hidden'); };
    $('help-btn').onclick = function () { $('help').classList.remove('hidden'); };
    $('help-close').onclick = function () { $('help').classList.add('hidden'); save.seenHelp = true; store(); };
    $('home-btn').onclick = function () { App.home(); };
    $('lives-chip').onclick = function () { App.livesModal(); };
    $('ex-ad').onclick = extraByAd;
    $('ex-coins').onclick = extraByCoins;
    $('ex-close').onclick = extraClose;
    Ads.banner($('ad-banner'));
    document.addEventListener('keydown', function (e) {
      if (!playing) return;
      if (/^[0-9]$/.test(e.key)) type(+e.key);
      else if (e.key === 'Backspace') back();
      else if (e.key === 'Enter') { if ($('modal').classList.contains('hidden') && $('extra-modal').classList.contains('hidden')) submit(); }
    });
    // stop double-tap zoom on iPhone while tapping keys fast
    document.addEventListener('dblclick', function (e) { e.preventDefault(); }, { passive: false });

    const c = save.cur;
    if (c.done === 'won' && c.collected) { save.level++; newPuzzle(); }   // closed during the level-break ad
    regenLives();
    setInterval(regenLives, 15000);
  }

  // opened from the home page; false if there are no lives to play with
  let playing = false;
  function open() {
    regenLives();
    const c = save.cur;
    if (save.lives <= 0 && (c.done === 'lost' || c.guesses.length === 0)) { App.livesModal(); return false; }
    if (c.done === 'lost') newPuzzle();
    playing = true;
    wasOpen = null;
    render();
    if (!save.seenHelp) $('help').classList.remove('hidden');
    else if (save.cur.done === 'won') win();
    else if (!save.cur.done && save.cur.guesses.length >= allowed(save.cur)) offerExtra(true);
    return true;
  }
  function close() { playing = false; hideModal(); $('shop').classList.add('hidden'); $('extra-modal').classList.add('hidden'); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return {
    data: function () { return save; }, persist: store, open: open, close: close,
    render: function () { if (playing) render(); },
    regenLives: regenLives, nextLifeIn: nextLifeIn, refillLives: refillLives, randomName: randomName,
    addCoins: function (n) { save.coins += n; store(); },
    buyHints: function () { if (save.coins < HINT_PACK_PRICE) return false; save.coins -= HINT_PACK_PRICE; save.hints += HINT_PACK_SIZE; store(); return true; },
    afterRefill: function () { if (playing && save.cur.done === 'lost') retry(); },
    daily: daily, dailyReady: dailyReady, claimDaily: claimDaily, DAILY_TARGETS: DAILY_TARGETS,
    toast: toast, musicHooks: musicHooks, LIVES_MAX: LIVES_MAX, LIFE_REFILL_PRICE: LIFE_REFILL_PRICE, AD_COINS: AD_COINS,
    HINT_PACK_PRICE: HINT_PACK_PRICE, HINT_PACK_SIZE: HINT_PACK_SIZE,
    // testing helpers
    _state: function () { return save; },
    _render: function () { wasOpen = null; render(); },
    _new: function () { newPuzzle(); render(); },
    _reset: function () { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } location.reload(); }
  };
})();

// Works offline and can be added to the home screen (only over https / localhost).
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(function () { /* not important */ });
}
