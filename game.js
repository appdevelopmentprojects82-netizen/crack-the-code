/* ==========================================================================
   CRACK THE CODE - MOBILE PUZZLE GAME
   --------------------------------------------------------------------------
   Every level hides a code inside a coded clue. Decode the clue, type the
   code, and use the coloured boxes to fix your mistakes:
     green  = right digit in the right place
     yellow = the digit is in the code, but somewhere else
     grey   = the digit is not in the code
   ========================================================================== */
'use strict';

// ---------------- SETTINGS (easy to change) ----------------
const MAX_TRIES        = 4;     // guesses per level
const WIN_COINS        = 40;    // coins for winning a level (an ad doubles them)
const START_COINS      = 0;     // coins a new player starts with
const HINT_PACK_PRICE  = 700;   // coins for a pack of hints
const HINT_PACK_SIZE   = 3;     // hints in one pack
const PICTURES         = 5;     // pictures/1.jpg ... 5.jpg, one per level, repeating
const NO_REPEAT_LEVELS = 10;    // a clue type does not come back within this many levels
const TIER_2_FROM      = 9;     // harder clue types join from this level
const TIER_3_FROM      = 21;    // the hardest ones join from this level

// Code length: 4 digits up to level 100, 5 digits from 101, 6 digits from 201.
function digitsForLevel(level) { return level > 200 ? 6 : level > 100 ? 5 : 4; }

// LOCKED BOXES (a clue box whose symbol is hidden at the start)
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

const Game = (function () {
  const $ = function (id) { return document.getElementById(id); };
  function pick(l) { return l[Math.floor(Math.random() * l.length)]; }
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function table(str) { const a = Array.from(str); return function (d) { return a[d]; }; }
  function words(list) { return function (d) { return list[d]; }; }
  function range(n) { const a = []; for (let i = 0; i < n; i++) a.push(i); return a; }

  // ======================= CLUE TYPES =====================================
  // enc(d) turns ONE digit into a symbol. hint = the subtle nudge a player can
  // buy; explain = the full answer, shown after the level.
  const SCHEMES = [
    { name: 'letters', tier: 1,
      hint: 'Letters can count. Ignore the decorations.',
      explain: 'A = 1, B = 2 … I = 9, and "nil" = 0. The accents are only there to confuse you.',
      enc: function (d) {
        return pick([['nil'], ['À','Á','Â','Ã','Ä','Å','Ā'], ['Ḃ','Ɓ','Ƀ'], ['Ç','Ć','Č','Ĉ'], ['Ď','Đ','Ḋ'], ['È','É','Ê','Ë','Ē'],
                     ['Ḟ','Ƒ'], ['Ĝ','Ğ','Ġ','Ģ'], ['Ĥ','Ħ','Ḧ'], ['Ì','Í','Î','Ï','Ī']][d]); } },
    { name: 'keyboard symbols', tier: 1,
      hint: 'Find these on a computer keyboard. Which key do you hold down?',
      explain: 'Shift + a number key: ! = 1, @ = 2, # = 3 … ( = 9, ) = 0.',
      enc: table(')!@#$%^&*(') },
    { name: 'phone keys', tier: 1,
      hint: 'Before touch screens, phones typed letters with number keys.',
      explain: 'Phone keypad: ABC is on 2, DEF on 3 … WXYZ on 9. "." is 1 and "_" (space) is 0.',
      enc: function (d) { return pick(Array.from(['_', '.', 'ABC', 'DEF', 'GHI', 'JKL', 'MNO', 'PQRS', 'TUV', 'WXYZ'][d])); } },
    { name: 'sums', tier: 1,
      hint: 'Each tile hides one digit. Put its two numbers together.',
      explain: 'Add the two numbers on each tile: 31 → 3 + 1 = 4.',
      enc: function (d) { const a = Math.floor(Math.random() * (d + 1)); return '' + Math.max(a, d - a) + Math.min(a, d - a); } },
    { name: 'differences', tier: 1,
      hint: 'Each tile hides one digit. How far apart are its two numbers?',
      explain: 'Subtract the two numbers on each tile: 95 → 9 − 5 = 4.',
      enc: function (d) { const a = d + Math.floor(Math.random() * (10 - d)); return '' + a + (a - d); } },
    { name: 'drawings', tier: 1,
      hint: 'Count legs, wheels, points, leaves, colours … even lives.',
      explain: '🐍 0 legs · 🦄 1 horn · 🚲 2 wheels · ☘️ 3 leaves · 🐄 4 legs · ⭐ 5 points · 🐜 6 legs · 🌈 7 colours · 🕷️ 8 legs · 🐱 9 lives.',
      enc: function (d) {
        return pick([['🐍', '🐟'], ['🦄'], ['🧍', '🚲', '🐔'], ['☘️', '🚦'], ['🐄', '🚗', '🍀'], ['⭐', '🖐️'], ['🐜', '❄️', '🐝'], ['🌈'], ['🕷️', '🐙', '🎱'], ['🐱']][d]); } },
    { name: 'planets', tier: 1,
      hint: 'Look up at the sky and start counting from the hottest thing there.',
      explain: 'Order from the Sun: ☿ Mercury 1, ♀ Venus 2, 🌍 Earth 3, ♂ Mars 4, ♃ Jupiter 5, ♄ Saturn 6, ♅ Uranus 7, ♆ Neptune 8, ♇ Pluto 9. The Sun ☀️ is 0.',
      enc: words(['☀️', '☿', '♀', '🌍', '♂', '♃', '♄', '♅', '♆', '♇']) },
    { name: 'sequences', tier: 1,
      hint: 'Every tile is a number pattern with one gap.',
      explain: 'Each tile is a sequence; the missing number (?) is the digit: 1,4,?,10 → 7.',
      enc: function (d) {
        const step = pick([2, 3, 4, 6, 7, -3, -4, -6]), at = pick([1, 2]), out = [];
        for (let i = 0; i < 4; i++) out.push(i === at ? '?' : d + (i - at) * step);
        return out.join(','); } },
    { name: 'maya', tier: 1,
      hint: 'An ancient people of Central America counted like this.',
      explain: 'Maya numbers: each dot is 1, each bar is 5, the shell 🐚 is 0.',
      enc: function (d) { return d === 0 ? '🐚' : '•'.repeat(d % 5) + '▬'.repeat(Math.floor(d / 5)); } },

    { name: 'backwards letters', tier: 2,
      hint: 'Letters again — but read the alphabet from the other end.',
      explain: 'Z = 1, Y = 2, X = 3 … R = 9. Ω, the last Greek letter, is 0.',
      enc: table('ΩZYXWVUTSR') },
    { name: 'alphabet last digit', tier: 2,
      hint: 'Find each letter\'s place in the alphabet. Only the last digit counts.',
      explain: 'K is the 11th letter → 1, T is the 20th → 0, Z is the 26th → 6.',
      enc: function (d) { return pick(['JT', 'KU', 'LV', 'MW', 'NX', 'OY', 'PZ', 'Q', 'R', 'S'][d].split('')); } },
    { name: 'keyboard columns', tier: 2,
      hint: 'On a computer keyboard, look straight down from the number keys.',
      explain: 'Q, A and Z sit under 1; W, S, X under 2; E, D, C under 3 … I, K under 8; O, L under 9; P under 0.',
      enc: function (d) { return pick(['P', 'QAZ', 'WSX', 'EDC', 'RFV', 'TGB', 'YHN', 'UJM', 'IK', 'OL'][d].split('')); } },
    { name: 'loops', tier: 2,
      hint: 'Ignore what the numbers say. Count the holes in them.',
      explain: 'Count closed loops: 8 has two, 0, 6 and 9 have one, every other digit has none.',
      enc: function (d) {
        let twos = Math.floor(d / 2);
        if (twos > 0 && d <= 6 && Math.random() < 0.5) twos--;
        const parts = [];
        for (let i = 0; i < twos; i++) parts.push('8');
        for (let i = 0; i < d - 2 * twos; i++) parts.push(pick(['0', '6', '9']));
        const fill = parts.length === 0 ? 3 : parts.length >= 4 ? 1 : 2;
        for (let i = 0; i < fill; i++) parts.push(pick(['1', '2', '3', '5', '7']));
        return shuffle(parts).join(''); } },
    { name: 'colours', tier: 2,
      hint: 'Electricians read numbers from coloured stripes.',
      explain: 'Resistor colour code: 🖤 black 0, 🤎 brown 1, ❤️ red 2, 🧡 orange 3, 💛 yellow 4, 💚 green 5, 💙 blue 6, 💜 violet 7, 🩶 grey 8, 🤍 white 9.',
      enc: words(['🖤', '🤎', '❤️', '🧡', '💛', '💚', '💙', '💜', '🩶', '🤍']) },
    { name: 'morse', tier: 2,
      hint: 'Beep beeeep beep. An old way of sending messages.',
      explain: 'Morse code: ·−−−− = 1, ··−−− = 2 … ····· = 5 … −−−−· = 9, −−−−− = 0.',
      enc: words(['−−−−−', '·−−−−', '··−−−', '···−−', '····−', '·····', '−····', '−−···', '−−−··', '−−−−·']) },
    { name: 'binary dots', tier: 2,
      hint: 'Only two kinds of dot: on and off. Computers count like this.',
      explain: 'Binary, read left to right: ● = on, ○ = off, worth 8 4 2 1. ○●○● = 4 + 1 = 5.',
      enc: function (d) { return ('000' + d.toString(2)).slice(-4).replace(/1/g, '●').replace(/0/g, '○'); } },
    { name: 'shifted', tier: 2,
      hint: 'Every digit has been pushed forward by the same amount.',
      explain: 'Each digit was moved up by the number on the ⟲ badge (after 9 comes 0). Move each one back down.',
      make: function (c) {
        const k = 2 + Math.floor(Math.random() * 7);
        return { parts: c.map(function (d) { return String((d + k) % 10); }), note: '⟲ ' + k }; } },
    { name: 'star signs', tier: 2,
      hint: 'The zodiac year starts in spring.',
      explain: 'Star sign order from Aries: ♈ 1, ♉ 2, ♊ 3 … ♐ 9, ♑ 10 → 0, ♒ 11 → 1, ♓ 12 → 2.',
      enc: function (d) { return pick([['♑'], ['♈', '♒'], ['♉', '♓'], ['♊'], ['♋'], ['♌'], ['♍'], ['♎'], ['♏'], ['♐']][d]); } },
    { name: 'character codes', tier: 2,
      hint: 'This is how a computer stores the digits 0 to 9.',
      explain: 'Computer character codes: "0" is 48, "1" is 49 … "9" is 57. Take away 48.',
      enc: function (d) { return String(48 + d); } },
    { name: 'languages', tier: 2,
      hint: 'Count to ten — just not in English.',
      explain: 'Number words in Finnish, Swahili, Hungarian, Welsh, Korean or Filipino.',
      enc: function (d) {
        return pick([['NOLLA', 'YKSI', 'KAKSI', 'KOLME', 'NELJÄ', 'VIISI', 'KUUSI', 'SEITSEMÄN', 'KAHDEKSAN', 'YHDEKSÄN'],
                     ['SIFURI', 'MOJA', 'MBILI', 'TATU', 'NNE', 'TANO', 'SITA', 'SABA', 'NANE', 'TISA'],
                     ['NULLA', 'EGY', 'KETTŐ', 'HÁROM', 'NÉGY', 'ÖT', 'HAT', 'HÉT', 'NYOLC', 'KILENC'],
                     ['DIM', 'UN', 'DAU', 'TRI', 'PEDWAR', 'PUMP', 'CHWECH', 'SAITH', 'WYTH', 'NAW'],
                     ['YEONG', 'IL', 'I', 'SAM', 'SA', 'O', 'YUK', 'CHIL', 'PAL', 'GU'],
                     ['SERO', 'ISA', 'DALAWA', 'TATLO', 'APAT', 'LIMA', 'ANIM', 'PITO', 'WALO', 'SIYAM']])[d]; } },

    { name: 'braille', tier: 3,
      hint: 'Some people read this with their fingertips.',
      explain: 'Braille: ⠁ 1, ⠃ 2, ⠉ 3, ⠙ 4, ⠑ 5, ⠋ 6, ⠛ 7, ⠓ 8, ⠊ 9, ⠚ 0 (the same dots as the letters A–J).',
      enc: table('⠚⠁⠃⠉⠙⠑⠋⠛⠓⠊') },
    { name: 'banking numerals', tier: 3,
      hint: 'Banks in China write numbers like this so nobody can change them.',
      explain: 'Chinese banking numerals: 壹 1, 贰 2, 叁 3, 肆 4, 伍 5, 陆 6, 柒 7, 捌 8, 玖 9, 零 0.',
      enc: table('零壹贰叁肆伍陆柒捌玖') },
    { name: 'scripts', tier: 3,
      hint: 'These are ordinary digits — from another part of the world.',
      explain: 'Digits written in Thai, Khmer, Bengali or Gujarati script. Several look like ours.',
      enc: function (d) { return Array.from(pick(['๐๑๒๓๔๕๖๗๘๙', '០១២៣៤៥៦៧៨៩', '০১২৩৪৫৬৭৮৯', '૦૧૨૩૪૫૬૭૮૯']))[d]; } },
    { name: 'picture initials', tier: 3,
      hint: 'Name each picture. Only its first letter matters.',
      explain: 'First letter of each picture, then A = 1 … I = 9, J = 0. 🍇 Grape → G → 7.',
      enc: function (d) {
        return pick([['🤹', '🕹️', '👖'], ['🐜', '🍎', '⚓'], ['🐻', '🍌', '🎈'], ['🐈', '🐄', '🥕'], ['🦆', '🥁', '🐬'], ['🥚', '🦅', '🐘'],
                     ['🐸', '🔥', '🐟'], ['👻', '🍇', '🎸'], ['🏠', '🎩', '🔨'], ['🦎', '🧊', '🍦']][d]); } },
    { name: 'elements', tier: 3,
      hint: 'These hang on the wall of every chemistry classroom.',
      explain: 'The last digit of each element\'s atomic number: H 1, He 2 … Na 11 → 1, Ca 20 → 0.',
      enc: function (d) { return pick([['Ne', 'Ca'], ['H', 'Na'], ['He', 'Mg'], ['Li', 'Al'], ['Be', 'Si'], ['B', 'P'], ['C', 'S'], ['N', 'Cl'], ['O', 'Ar'], ['F', 'K']][d]); } },
    { name: 'mixed', tier: 3, mixed: true,
      hint: 'Every tile uses a different trick.',
      explain: '' }   // built per level
  ];
  const MIXABLE = ['letters', 'keyboard symbols', 'keyboard columns', 'sums', 'drawings', 'colours',
                   'star signs', 'loops', 'phone keys', 'planets', 'alphabet last digit', 'maya'];
  function scheme(name) { return SCHEMES.filter(function (s) { return s.name === name; })[0]; }

  function makeClue(s, code) {
    if (s.make) return s.make(code);
    if (s.mixed) {
      const kinds = shuffle(MIXABLE.slice());
      return {
        parts: code.map(function (d, i) { return scheme(kinds[i]).enc(d); }),
        explain: code.map(function (d, i) { return 'Tile ' + (i + 1) + ': ' + scheme(kinds[i]).explain; }).join('\n')
      };
    }
    return { parts: code.map(s.enc) };
  }

  // ======================= SAVED PROGRESS =================================
  let save = load();
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { /* ignore */ }
    if (!s || !(s.level >= 1)) s = { level: 1, stars: 0, recent: [], cur: null, seenHelp: false };
    if (typeof s.coins !== 'number') { s.coins = START_COINS; s.hints = 0; }   // the old free hints are gone
    if (typeof s.hints !== 'number') s.hints = 0;
    if (s.cur) {                                // saves from the first version
      s.cur.revealed = s.cur.revealed || [];
      s.cur.locks = s.cur.locks || {};
    }
    return s;
  }
  function store() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* private mode */ } }

  // ======================= PUZZLES ========================================
  function chooseScheme(level) {
    const maxTier = level >= TIER_3_FROM ? 3 : level >= TIER_2_FROM ? 2 : 1;
    let pool = SCHEMES.filter(function (s) { return s.tier <= maxTier; });
    // new tiers show up more often right after they are unlocked
    if (maxTier > 1 && Math.random() < 0.5) pool = pool.filter(function (s) { return s.tier === maxTier; });
    const fresh = pool.filter(function (s) { return save.recent.indexOf(s.name) < 0; });
    return pick(fresh.length ? fresh : pool);
  }
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
  function newPuzzle(sameScheme) {
    const s = sameScheme ? scheme(save.cur.scheme) : chooseScheme(save.level);
    const n = digitsForLevel(save.level);
    const code = shuffle(range(10)).slice(0, n);           // all digits different
    const clue = makeClue(s, code);
    if (!sameScheme) {
      save.recent.push(s.name);
      while (save.recent.length > NO_REPEAT_LEVELS) save.recent.shift();
    }
    save.cur = { code: code, scheme: s.name, parts: clue.parts, note: clue.note || '', explain: clue.explain || s.explain,
                 guesses: [], revealed: [], locks: makeLocks(n), done: '', paid: false, collected: false };
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

  // positions already known: green in a guess, or shown by a hint
  function found(c) {
    const f = {};
    c.guesses.forEach(function (g) { marks(g, c.code).forEach(function (k, i) { if (k === 'hit') f[i] = true; }); });
    c.revealed.forEach(function (i) { f[i] = true; });
    return f;
  }
  function webNeed(c) { return Math.min(WEB_BREAKS_AFTER, c.code.length - 1); }
  function isOpen(c, i, f) {
    if (c.done) return true;
    f = f || found(c);
    if (c.locks.padlock === i) return !!f[c.locks.key];
    if (c.locks.web === i) {
      const n = Object.keys(f).filter(function (k) { return +k !== i; }).length;
      return n >= webNeed(c);
    }
    return true;
  }

  // ======================= DRAWING ========================================
  let entry = [];
  let busy = false;
  let flipRow = -1;           // only the row just entered gets the flip animation
  let wasOpen = null;         // which clue boxes were open last time (to animate unlocking)

  function render() {
    const c = save.cur;
    const n = c.code.length;
    const f = found(c);
    $('level').textContent = 'LEVEL ' + save.level;
    $('stars').textContent = '⭐ ' + save.stars;
    $('coins').textContent = '🪙 ' + save.coins;
    document.body.style.setProperty('--bg', 'url("pictures/' + (((save.level - 1) % PICTURES) + 1) + '.jpg")');

    // hint button
    const hb = $('hint-btn');
    hb.innerHTML = '';
    if (save.hints > 0) {
      hb.appendChild(document.createTextNode('💡 HINT '));
      const b = document.createElement('b'); b.textContent = save.hints; hb.appendChild(b);
    } else {
      hb.appendChild(document.createTextNode('💡 +' + HINT_PACK_SIZE + ' HINTS '));
      const b = document.createElement('b'); b.textContent = HINT_PACK_PRICE + ' 🪙'; hb.appendChild(b);
    }
    hb.disabled = !!c.done;

    // clue boxes
    const box = $('clue');
    box.innerHTML = '';
    const longest = Math.max.apply(null, c.parts.map(function (p) { return Array.from(p).length; }));
    const wide = longest > 3;
    box.className = (longest > 6 ? 'long' : wide ? 'mid' : '') + (n > 4 ? ' many' : '');
    box.style.gridTemplateColumns = 'repeat(' + (wide ? Math.ceil(n / 2) : n) + ', 1fr)';
    const nowOpen = [];
    c.parts.forEach(function (p, i) {
      const t = document.createElement('div');
      t.className = 'clue-part';
      const open = isOpen(c, i, f);
      nowOpen.push(open);
      const sym = document.createElement('span');
      sym.className = 'sym';
      if (!open && c.locks.padlock === i) {
        t.classList.add('locked', 'padlock');
        sym.textContent = '🔒';
        const cap = document.createElement('small'); cap.textContent = 'FIND THE 🔑'; t.appendChild(cap);
      } else if (!open && c.locks.web === i) {
        t.classList.add('locked', 'web');
        sym.textContent = '🕸️';
        const have = Object.keys(f).filter(function (k) { return +k !== i; }).length;
        const cap = document.createElement('small'); cap.textContent = 'FIND ' + have + '/' + webNeed(c); t.appendChild(cap);
      } else {
        sym.textContent = p;
        if (wasOpen && wasOpen[i] === false) t.classList.add('unlocking');
      }
      t.insertBefore(sym, t.firstChild);
      if (c.locks.key === i && !c.done && !f[i]) {
        const k = document.createElement('i'); k.className = 'badge key'; k.textContent = '🔑'; t.appendChild(k);
      }
      if (c.revealed.indexOf(i) >= 0) {
        t.classList.add('told');
        const d = document.createElement('i'); d.className = 'badge digit'; d.textContent = c.code[i]; t.appendChild(d);
      } else if (f[i]) t.classList.add('found');
      box.appendChild(t);
    });
    const unlocked = wasOpen && nowOpen.some(function (o, i) { return o && wasOpen[i] === false; });
    wasOpen = nowOpen;
    if (unlocked && !c.done) { Sounds.play('hint'); toast('🔓 A box has been unlocked!'); }
    $('clue-note').textContent = c.note;
    $('clue-note').classList.toggle('hidden', !c.note);

    // guess grid
    const grid = $('grid');
    grid.innerHTML = '';
    for (let r = 0; r < MAX_TRIES; r++) {
      const row = document.createElement('div');
      row.className = 'row' + (r === flipRow ? ' reveal' : '');
      const g = c.guesses[r];
      const m = g ? marks(g, c.code) : null;
      for (let i = 0; i < n; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        if (g) { cell.textContent = g[i]; cell.classList.add(m[i]); cell.style.animationDelay = (i * 0.12) + 's'; }
        else if (r === c.guesses.length && !c.done) {
          row.classList.add('active');
          if (entry[i] !== undefined) { cell.textContent = entry[i]; cell.classList.add('typed'); }
        }
        row.appendChild(cell);
      }
      grid.appendChild(row);
    }
    const left = MAX_TRIES - c.guesses.length;
    $('tries').textContent = n + '-DIGIT CODE · ' + left + ' ' + (left === 1 ? 'TRY' : 'TRIES') + ' LEFT';
    $('enter').disabled = entry.length !== n;
    fitGrid();
  }

  // make the guess boxes as big as the free space allows (small phones, long codes)
  function fitGrid() {
    const n = save.cur ? save.cur.code.length : 4;
    const board = $('board');
    const free = board.clientHeight - $('tries').offsetHeight - 6 - (MAX_TRIES - 1) * 7;
    const byHeight = Math.floor(free / MAX_TRIES);
    const byWidth = Math.floor((board.clientWidth - (n - 1) * 7) / n);
    $('grid').style.setProperty('--cell', Math.max(24, Math.min(58, byHeight, byWidth)) + 'px');
  }
  window.addEventListener('resize', fitGrid);

  // ======================= PLAYING ========================================
  function type(d) {
    if (busy || save.cur.done || entry.length >= save.cur.code.length) return;
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
    if (entry.length !== c.code.length) { shake($('grid')); return; }
    c.guesses.push(entry.slice());
    flipRow = c.guesses.length - 1;
    const m = marks(entry, c.code);
    entry = [];
    if (m.every(function (k) { return k === 'hit'; })) c.done = 'won';
    else if (c.guesses.length >= MAX_TRIES) c.done = 'lost';
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
      else { Sounds.play(m.indexOf('hit') >= 0 ? 'correct' : 'wrong'); render(); }
    }, c.code.length * 120 + 450);
  }

  // ---- hints: each one shows one correct digit in its place ----
  function hint() {
    const c = save.cur;
    if (c.done || busy) return;
    if (save.hints <= 0) { openShop(); return; }
    const f = found(c);
    const unknown = range(c.code.length).filter(function (i) { return !f[i]; });
    if (unknown.length <= 1) { toast('Only one digit left — you can do it!'); return; }
    save.hints--;
    const i = pick(unknown);
    c.revealed.push(i);
    store();
    Sounds.play('hint');
    toast('💡 Box ' + (i + 1) + ' is ' + c.code[i]);
    render();
  }
  function openShop() {
    $('shop-have').textContent = 'You have ' + save.coins + ' 🪙';
    $('shop-buy').disabled = save.coins < HINT_PACK_PRICE;
    $('shop-short').textContent = save.coins < HINT_PACK_PRICE
      ? 'You need ' + (HINT_PACK_PRICE - save.coins) + ' more coins. Win levels to earn ' + WIN_COINS + ' 🪙 each (×2 with an ad).' : '';
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

  function stars() { const n = save.cur.guesses.length; return n <= 1 ? 3 : n === 2 ? 2 : 1; }

  // ======================= WIN / LOSE =====================================
  function win() {
    const c = save.cur;
    const s = stars();
    if (!c.paid) {                     // count the stars only once, even after a reload
      c.paid = true;
      save.stars += s;
      store();
    }
    Sounds.playWin(4000);
    confetti();
    render();
    showModal({
      icon: '🔓', title: 'ESCAPED!', cls: 'won',
      stars: s,
      line: 'The code was ' + c.code.join(''),
      explain: c.explain,
      coins: true,
      button: '▶ WATCH AD · GET ' + (WIN_COINS * 2) + ' 🪙', action: watchForDouble,
      button2: 'COLLECT ' + WIN_COINS + ' 🪙', action2: function () { collect(1); }
    });
  }
  function watchForDouble() {
    Ads.reward(function (watched) {
      if (watched) collect(2);
      else toast('No ad available right now — collect your ' + WIN_COINS + ' 🪙 or try again');
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
      if (adAfterLevel(save.level)) Ads.interstitial(next, musicHooks);   // the ad comes AFTER the coins
      else next();
    }, 1100);
  }
  function lose() {
    const c = save.cur;
    Sounds.play('wrong');
    render();
    showModal({
      icon: '🔒', title: 'LOCKED IN', cls: 'lost',
      line: 'The code was ' + c.code.join(''),
      explain: c.explain,
      extra: 'Same kind of clue, new code. You know the trick now!',
      button: 'TRY AGAIN ↻', action: retry
    });
  }
  function next() { save.level++; newPuzzle(false); hideModal(); render(); }
  function retry() { newPuzzle(true); hideModal(); render(); }

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
    t.textContent = text;
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
    $('m-explain').textContent = o.explain;
    $('m-extra').textContent = o.extra || '';
    $('m-coins').classList.toggle('hidden', !o.coins);
    $('m-coins').textContent = '+' + WIN_COINS + ' 🪙';
    const b = $('m-button');
    b.textContent = o.button; b.onclick = o.action; b.disabled = false;
    const b2 = $('m-button2');
    b2.classList.toggle('hidden', !o.button2);
    b2.textContent = o.button2 || ''; b2.onclick = o.action2 || null; b2.disabled = false;
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
    $('m-coins').textContent = '+' + amount + ' 🪙';
    $('m-coins').classList.remove('pop'); void $('m-coins').offsetWidth; $('m-coins').classList.add('pop');
    const chip = $('coins');
    chip.classList.remove('pop'); void chip.offsetWidth; chip.classList.add('pop');
    Sounds.play('correct');
  }

  function setMusicIcon() {
    let on = true;
    try { on = localStorage.getItem('ctc-music-on') !== '0'; } catch (e) { /* ignore */ }
    $('mute-btn').textContent = on ? '🔊' : '🔇';
  }

  // ======================= START ==========================================
  function init() {
    if (!save.cur) newPuzzle(false);
    // build the keypad: 1-9, ⌫, 0, ✓
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
    $('mute-btn').onclick = function () { Sounds.toggleMusic(); setMusicIcon(); };
    setMusicIcon();
    Ads.banner($('ad-banner'));
    document.addEventListener('keydown', function (e) {
      if (/^[0-9]$/.test(e.key)) type(+e.key);
      else if (e.key === 'Backspace') back();
      else if (e.key === 'Enter') { if ($('modal').classList.contains('hidden')) submit(); }
    });
    // stop double-tap zoom on iPhone while tapping keys fast
    document.addEventListener('dblclick', function (e) { e.preventDefault(); }, { passive: false });

    const c = save.cur;
    if (c.done === 'won' && c.collected) { next(); return; }   // closed during the level-break ad
    render();
    if (!save.seenHelp) $('help').classList.remove('hidden');
    else if (c.done === 'won') win();
    else if (c.done === 'lost') lose();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return {
    // testing helpers
    _state: function () { return save; },
    _render: function () { wasOpen = null; render(); },
    _new: function () { newPuzzle(false); render(); },
    _clues: function (code) { const o = {}; SCHEMES.forEach(function (s) { o[s.name] = makeClue(s, code).parts.join(' | '); }); return o; },
    _reset: function () { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } location.reload(); }
  };
})();

// Works offline and can be added to the home screen (only over https / localhost).
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(function () { /* not important */ });
}
