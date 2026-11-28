/* ==========================================================================
   EXTRAS - login streak, star chests, achievements, keypad styles,
            daily puzzle and race-a-friend screens
   ========================================================================== */
'use strict';

// ---------------- SETTINGS (easy to change) ----------------
// LOGIN STREAK: a reward for every day in a row the game is opened (then it starts again at day 1)
const STREAK_REWARDS = [
  { coins: 50 }, { coins: 75 }, { coins: 100 }, { coins: 150 }, { coins: 200 }, { coins: 300 }, { coins: 500, elims: 1 }
];
// STAR CHESTS: every CHEST_STARS stars collected opens a chest
const CHEST_STARS = 30;
const CHEST_COINS = [150, 400];          // random coins between these
const CHEST_HINT_CHANCE = 0.5;           // chance of a free hint
const CHEST_ELIM_CHANCE = 0.25;          // chance of a free eliminate
// ACHIEVEMENTS: value() = progress, goal = target, coins = reward, skin = keypad style it unlocks
const ACHIEVEMENTS = [
  { id: 'first',   icon: '🔓', title: 'First Escape',     text: 'Win your first level',                      goal: 1,   coins: 50,   value: function (s) { return s.wins; } },
  { id: 'onetry',  icon: '🔮', title: 'Mind Reader',      text: 'Crack a code in 1 try',                     goal: 1,   coins: 500,  value: function (s) { return s.stats.oneTry; } },
  { id: 'quick',   icon: '⚡', title: 'Quick Thinker',    text: 'Crack 10 codes in 2 tries or fewer',        goal: 10,  coins: 200,  value: function (s) { return s.stats.quick; } },
  { id: 'clean',   icon: '🧠', title: 'Pure Skill',       text: 'Win 10 levels in a row without hints',      goal: 10,  coins: 300,  value: function (s) { return s.stats.cleanBest; } },
  { id: 'padlock', icon: '🔒', title: 'Lock Picker',      text: 'Beat 10 padlock levels',                    goal: 10,  coins: 200,  value: function (s) { return s.stats.padlocks; } },
  { id: 'web',     icon: '🕸️', title: 'Web Breaker',      text: 'Beat 10 spider web levels',                 goal: 10,  coins: 200,  value: function (s) { return s.stats.webs; } },
  { id: 'ice',     icon: '❄️', title: 'Ice Breaker',      text: 'Beat 10 ice levels',                        goal: 10,  coins: 200,  value: function (s) { return s.stats.ices; }, skin: 'frost' },
  { id: 'chain',   icon: '⛓️', title: 'Chain Breaker',    text: 'Beat 10 chain levels',                      goal: 10,  coins: 200,  value: function (s) { return s.stats.chains; } },
  { id: 'fog',     icon: '🌫️', title: 'Fog Walker',       text: 'Beat 10 fog levels',                        goal: 10,  coins: 200,  value: function (s) { return s.stats.fogs; } },
  { id: 'boss',    icon: '👑', title: 'Boss Slayer',      text: 'Defeat 5 bosses',                           goal: 5,   coins: 500,  value: function (s) { return s.stats.bosses; }, skin: 'gold' },
  { id: 'close',   icon: '😅', title: 'Nerves of Steel',  text: 'Win 10 levels on your last try',            goal: 10,  coins: 200,  value: function (s) { return s.stats.closeCalls; } },
  { id: 'daily',   icon: '📅', title: 'Daily Devotee',    text: 'Solve 7 daily puzzles',                     goal: 7,   coins: 300,  value: function (s) { return s.stats.dailies; } },
  { id: 'race',    icon: '⚔️', title: 'Racer',            text: 'Win 3 races against friends',               goal: 3,   coins: 300,  value: function (s) { return s.stats.raceWins; }, skin: 'neon' },
  { id: 'chests',  icon: '🧰', title: 'Treasure Hunter',  text: 'Open 5 star chests',                        goal: 5,   coins: 300,  value: function (s) { return s.stats.chests; } },
  { id: 'streak',  icon: '🔥', title: 'Loyal Explorer',   text: 'Play 7 days in a row',                      goal: 7,   coins: 300,  value: function (s) { return s.stats.streakBest; } },
  { id: 'lvl50',   icon: '🗺️', title: 'Explorer',         text: 'Reach level 50',                            goal: 50,  coins: 250,  value: function (s) { return s.level; }, skin: 'forest' },
  { id: 'lvl100',  icon: '🏰', title: 'Adventurer',       text: 'Reach level 100',                           goal: 100, coins: 500,  value: function (s) { return s.level; }, skin: 'royal' },
  { id: 'lvl200',  icon: '🐉', title: 'Legend',           text: 'Reach level 200',                           goal: 200, coins: 1000, value: function (s) { return s.level; } }
];
// KEYPAD & CODE BOX STYLES (unlocked by the achievement that names them)
const SKINS = [
  { id: 'classic', name: 'Classic' }, { id: 'forest', name: 'Forest' }, { id: 'frost', name: 'Frost' },
  { id: 'gold', name: 'Gold' }, { id: 'neon', name: 'Neon' }, { id: 'royal', name: 'Royal' }
];
// -----------------------------------------------------------

const Extras = (function () {
  const $ = function (id) { return document.getElementById(id); };
  const S = function () { return Game.data(); };
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) coinText(e, text); return e; }
  function fmtClock(ms) {
    const t = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
  }
  function reward(coins, extra) {
    Sounds.play('correct'); App.buzz([30, 40, 30]);
    Game.toast('+' + coins + ' 🪙' + (extra || ''));
    App.update();
  }

  // ---------------- one window for all of these ----------------
  // sheet({ icon, title, body: element, main: { text, action, disabled, cls }, closeText })
  let sheetTick = null;
  function sheet(o) {
    clearInterval(sheetTick); sheetTick = null;
    $('x-icon').textContent = o.icon || '';
    $('x-title').textContent = o.title || '';
    const body = $('x-body');
    body.innerHTML = '';
    if (o.body) body.appendChild(o.body);
    const m = $('x-main');
    if (o.main) {
      m.classList.remove('hidden');
      coinText(m, o.main.text);
      m.disabled = !!o.main.disabled;
      m.className = 'big-btn ' + (o.main.cls || '');
      m.onclick = o.main.action;
    } else m.classList.add('hidden');
    $('x-close').textContent = o.closeText || 'CLOSE';
    $('x-modal').classList.remove('hidden');
    if (o.tick) { o.tick(); sheetTick = setInterval(function () { if ($('x-modal').classList.contains('hidden')) { clearInterval(sheetTick); return; } o.tick(); }, 1000); }
  }
  function closeSheet() { $('x-modal').classList.add('hidden'); clearInterval(sheetTick); }

  // ======================= LOGIN STREAK ===================================
  function dayBefore() { const d = new Date(); d.setDate(d.getDate() - 1); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function streakDue() {
    const s = S(), st = s.streak || {};
    if (st.claimed === Game.today()) return 0;
    return st.last === dayBefore() ? (st.day % STREAK_REWARDS.length) + 1 : 1;
  }
  function showStreak() {
    const day = streakDue();
    if (!day) return false;
    const row = el('div', 'streak-row');
    STREAK_REWARDS.forEach(function (r, i) {
      const n = i + 1;
      const t = el('div', 'streak-day' + (n < day ? ' past' : n === day ? ' now' : '') + (n === STREAK_REWARDS.length ? ' big' : ''));
      t.appendChild(el('small', '', 'DAY ' + n));
      t.appendChild(el('b', '', n < day ? '✓' : (n === STREAK_REWARDS.length ? '🎁' : '')));
      t.appendChild(el('span', '', r.coins + ' 🪙' + (r.elims ? ' +🧹' : '')));
      row.appendChild(t);
    });
    sheet({ icon: '🔥', title: 'DAY ' + day + ' STREAK!', body: row,
      main: { text: 'CLAIM REWARD', action: function () { claimStreak(day); } }, closeText: 'LATER' });
    return true;
  }
  function claimStreak(day) {
    const s = S(), st = s.streak || {};
    if (st.claimed === Game.today()) return;
    const r = STREAK_REWARDS[day - 1];
    const run = st.last === dayBefore() ? (st.run || 0) + 1 : 1;
    s.streak = { last: Game.today(), day: day, claimed: Game.today(), run: run };
    s.stats.streakBest = Math.max(s.stats.streakBest || 0, run);
    s.coins += r.coins;
    if (r.elims) s.elims += r.elims;
    Game.persist();
    closeSheet();
    reward(r.coins, r.elims ? ' +1 🧹' : '');
  }

  // ======================= STAR CHESTS ====================================
  function chestReady() { return S().chestStars >= CHEST_STARS; }
  function openChestScreen() {
    const s = S();
    const ready = chestReady();
    const body = el('div', 'chest-box');
    const chest = el('div', 'chest' + (ready ? ' ready' : ''), '🧰');
    body.appendChild(chest);
    const bar = el('div', 'chest-bar');
    const fill = el('i'); fill.style.width = Math.min(100, s.chestStars / CHEST_STARS * 100) + '%'; bar.appendChild(fill);
    bar.appendChild(el('span', '', '⭐ ' + Math.min(s.chestStars, CHEST_STARS) + '/' + CHEST_STARS));
    body.appendChild(bar);
    sheet({ icon: '', title: 'STAR CHEST', body: body,
      main: { text: ready ? 'OPEN CHEST' : 'WIN LEVELS FOR STARS', disabled: !ready, action: function () { openChest(chest, body); } } });
  }
  function openChest(chest, body) {
    const s = S();
    if (s.chestStars < CHEST_STARS) return;
    s.chestStars -= CHEST_STARS;
    const coins = Math.round((CHEST_COINS[0] + Math.random() * (CHEST_COINS[1] - CHEST_COINS[0])) / 10) * 10;
    const hint = Math.random() < CHEST_HINT_CHANCE, elim = Math.random() < CHEST_ELIM_CHANCE;
    s.coins += coins; if (hint) s.hints++; if (elim) s.elims++;
    Game.stat('chests');
    Game.persist();
    chest.classList.add('opening');
    Sounds.play('hint'); App.buzz([40, 60, 40, 60, 120]);
    $('x-main').disabled = true;
    setTimeout(function () {
      chest.textContent = '✨';
      const got = el('div', 'chest-got');
      got.appendChild(el('div', '', '+' + coins + ' 🪙'));
      if (hint) got.appendChild(el('div', '', '+1 💡 HINT'));
      if (elim) got.appendChild(el('div', '', '+1 🧹 ELIMINATE'));
      body.appendChild(got);
      const m = $('x-main');
      m.disabled = false; coinText(m, 'CLAIM REWARD');
      m.onclick = function () { closeSheet(); reward(coins); if (chestReady()) setTimeout(openChestScreen, 400); };
    }, 900);
  }

  // ======================= ACHIEVEMENTS ===================================
  function achState(a) {
    const s = S();
    if (!s.achv) s.achv = {};
    const v = Math.min(a.goal, a.value(s) || 0);
    return { value: v, claimed: !!s.achv[a.id], ready: !s.achv[a.id] && v >= a.goal };
  }
  function achReady() { return ACHIEVEMENTS.some(function (a) { return achState(a).ready; }); }
  function skinName(id) { const k = SKINS.filter(function (x) { return x.id === id; })[0]; return k ? k.name : id; }
  function openAchievements() {
    const list = el('div', 'ach-list');
    const order = ACHIEVEMENTS.slice().sort(function (a, b) {
      const sa = achState(a), sb = achState(b);
      const rank = function (x) { return x.ready ? 0 : x.claimed ? 2 : 1; };
      return rank(sa) - rank(sb);
    });
    order.forEach(function (a) {
      const st = achState(a);
      const r = el('div', 'ach' + (st.ready ? ' ready' : st.claimed ? ' done' : ''));
      r.appendChild(el('div', 'ach-icon', a.icon));
      const mid = el('div', 'ach-mid');
      mid.appendChild(el('b', '', a.title));
      mid.appendChild(el('small', '', a.text + (a.skin ? ' · unlocks ' + skinName(a.skin) + ' style' : '')));
      const bar = el('div', 'ach-bar'); const f = el('i'); f.style.width = (st.value / a.goal * 100) + '%'; bar.appendChild(f);
      bar.appendChild(el('span', '', st.value + '/' + a.goal));
      mid.appendChild(bar);
      r.appendChild(mid);
      const b = el('button', 'ach-btn', st.claimed ? '✓' : st.ready ? 'CLAIM REWARD' : '+' + a.coins + ' 🪙');
      b.disabled = !st.ready;
      b.onclick = function () { claimAch(a); };
      r.appendChild(b);
      list.appendChild(r);
    });
    sheet({ icon: '🏅', title: 'ACHIEVEMENTS', body: list });
  }
  function claimAch(a) {
    const s = S();
    if (!achState(a).ready) return;
    s.achv[a.id] = true;
    s.coins += a.coins;
    Game.persist();
    reward(a.coins, a.skin ? ' · ' + skinName(a.skin) + ' style unlocked!' : '');
    openAchievements();
  }

  // ======================= KEYPAD STYLES ==================================
  function skinOpen(id) {
    if (id === 'classic') return true;
    const a = ACHIEVEMENTS.filter(function (x) { return x.skin === id; })[0];
    return !!(a && S().achv && S().achv[a.id]);
  }
  function applySkin() { document.body.dataset.skin = skinOpen(S().skin) ? S().skin : 'classic'; }
  function fillSkins(box) {
    box.innerHTML = '';
    SKINS.forEach(function (k) {
      const open = skinOpen(k.id);
      const b = el('button', 'skin-tile' + (S().skin === k.id ? ' chosen' : '') + (open ? '' : ' locked'));
      b.dataset.skin = k.id;
      const pv = el('div', 'skin-prev');
      ['1', '2', '?'].forEach(function (d, i) { pv.appendChild(el('i', i === 2 ? 'cb' : 'kb', d)); });
      b.appendChild(pv);
      const a = ACHIEVEMENTS.filter(function (x) { return x.skin === k.id; })[0];
      b.appendChild(el('small', '', open ? k.name : '🔒 ' + (a ? a.title : '')));
      b.onclick = function () {
        if (!open) { Game.toast('🏅 Unlock with “' + a.title + '”: ' + a.text); return; }
        S().skin = k.id; Game.persist(); applySkin(); fillSkins(box); App.buzz(15);
      };
      box.appendChild(b);
    });
  }

  // ======================= DAILY PUZZLE ===================================
  function untilUtcMidnight() { const n = new Date(); return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1) - n.getTime(); }
  function dailyBoard() {
    const dp = Game.dailyState();
    const body = el('div', 'dp-box');
    if (dp && dp.done) {
      const n = dp.guesses.length;
      body.appendChild(el('div', 'dp-result ' + dp.done, dp.done === 'won'
        ? '✅ Solved in ' + n + ' ' + (n === 1 ? 'try' : 'tries') + ' · ' + fmtClock(dp.ms || 0)
        : '❌ Not cracked today — the code was ' + dp.code.join('')));
    } else {
      body.appendChild(el('div', 'dp-chips', '🔢 5 DIGITS   🎯 ' + Game.DAILY_TRIES + ' TRIES   +' + Game.DAILY_COINS + ' 🪙'));
    }
    const next = el('div', 'lad-reset');
    body.appendChild(next);
    const list = el('div', 'rank-list small');
    list.appendChild(el('div', 'rank-wait', 'LOADING…'));
    body.appendChild(el('div', 'field-label', '🏆 TODAY’S BEST'));
    body.appendChild(list);
    dailyList(list);
    const play = !(dp && dp.done);
    sheet({ icon: '📅', title: 'DAILY PUZZLE', body: body,
      main: play ? { text: '▶ PLAY', cls: 'green', action: function () { closeSheet(); App.playMode('daily'); } } : null,
      tick: function () { next.textContent = '⏳ NEW PUZZLE IN ' + fmtClock(untilUtcMidnight()); } });
  }
  function dailyList(box) {
    Board.dailyLoad(Game.utcDay(), function (list) {
      box.innerHTML = '';
      if (!list) { box.appendChild(el('div', 'rank-wait', 'OFFLINE — TRY AGAIN LATER')); return; }
      if (!list.length) { box.appendChild(el('div', 'rank-wait', 'NOBODY HAS SOLVED IT YET!')); return; }
      list.slice(0, 50).forEach(function (p, k) { box.appendChild(rankRow(k, p, p.tries + (p.tries === 1 ? ' TRY' : ' TRIES'), fmtClock(p.ms))); });
    });
  }
  function rankRow(k, p, a, b) {
    const r = el('div', 'rank-row' + (p.id === S().pid ? ' me' : ''));
    r.appendChild(el('span', 'rk', k < 3 ? ['🥇', '🥈', '🥉'][k] : String(k + 1)));
    const pic = el('div', 'pfp'); App.avatar(pic, p.avatar); r.appendChild(pic);
    r.appendChild(el('b', 'rn', p.name));
    r.appendChild(el('span', 'rl', a));
    r.appendChild(el('span', 'rs', b));
    return r;
  }

  // ======================= RACE A FRIEND ==================================
  function newId() { const c = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < 8; i++) s += c[Math.floor(Math.random() * c.length)]; return s; }
  function myRaces() { const s = S(); if (!s.myRaces) s.myRaces = []; return s.myRaces; }
  function remember(id) { const l = myRaces(); const i = l.indexOf(id); if (i >= 0) l.splice(i, 1); l.unshift(id); l.length = Math.min(l.length, 10); Game.persist(); }
  function raceLink(id) { return location.origin + location.pathname + '?race=' + id; }
  function shareRace(id) {
    const url = raceLink(id);
    const text = '⚔️ ' + S().name + ' challenged you to a Code Quest race! Same code, fewest tries wins.';
    if (navigator.share) { navigator.share({ title: 'Code Quest race', text: text, url: url }).catch(function () { /* closed */ }); return; }
    copy(url);
    window.open('https://wa.me/?text=' + encodeURIComponent(text + ' ' + url), '_blank');
  }
  function copy(t) {
    try { navigator.clipboard.writeText(t).then(function () { Game.toast('🔗 Link copied!'); }); }
    catch (e) { Game.toast(t); }
  }
  // who won? fewest tries, then fastest. Only players who finished count.
  function ranking(players) {
    return players.filter(function (p) { return p.done; }).sort(function (a, b) { return a.tries - b.tries || a.ms - b.ms; });
  }
  function openRaces() {
    const body = el('div', 'race-box');
    body.appendChild(el('div', 'dp-chips', '🔢 4 DIGITS   🎯 ' + Game.RACE_TRIES + ' TRIES   🏆 +' + Game.RACE_WIN_COINS + ' 🪙'));
    const ids = myRaces();
    if (ids.length) {
      body.appendChild(el('div', 'field-label', 'YOUR RACES'));
      const list = el('div', 'rank-list small');
      body.appendChild(list);
      ids.forEach(function (id) {
        const r = el('button', 'race-row', '⚔️ …');
        r.onclick = function () { raceResult(id); };
        list.appendChild(r);
        Board.raceGet(id, function (race) {
          if (!race) { r.textContent = '⚔️ Race ' + id.toUpperCase() + ' · offline'; return; }
          r.textContent = '⚔️ ' + raceTitle(race) + ' · ' + raceStatus(id, race).short;
        });
      });
    }
    sheet({ icon: '⚔️', title: 'RACE A FRIEND', body: body,
      main: { text: '＋ NEW RACE', cls: 'green', action: createRace } });
  }
  function raceTitle(race) {
    const me = S().pid;
    const others = race.players.filter(function (p) { return p.id !== me; }).map(function (p) { return p.name; });
    if (race.by && race.by.pid !== me && others.indexOf(race.by.name) < 0) others.unshift(race.by.name);
    return others.length ? 'vs ' + others.slice(0, 2).join(', ') + (others.length > 2 ? ' +' + (others.length - 2) : '') : 'Waiting for a friend';
  }
  function raceStatus(id, race) {
    const me = S().pid;
    const mine = race.players.filter(function (p) { return p.id === me; })[0];
    const others = race.players.filter(function (p) { return p.id !== me && p.done; });
    if (!mine || !mine.done) return { short: 'YOUR TURN', mine: null };
    if (!others.length) return { short: 'WAITING', mine: mine };
    const best = ranking(race.players)[0];
    return { short: best.id === me ? 'YOU WON 🏆' : 'YOU LOST', mine: mine, won: best.id === me, final: true };
  }
  function createRace() {
    const id = newId();
    $('x-main').disabled = true;
    Board.raceCreate(id, { pid: S().pid, name: S().name, avatar: S().avatar }, function (ok) {
      if (!ok) { $('x-main').disabled = false; Game.toast('Could not create the race — check your internet'); return; }
      remember(id);
      const body = el('div', 'race-box');
      body.appendChild(el('div', 'race-step', '1️⃣ Send the link to a friend'));
      const link = el('button', 'race-link', raceLink(id).replace(/^https?:\/\//, ''));
      link.onclick = function () { copy(raceLink(id)); };
      body.appendChild(link);
      const sh = el('button', 'wide-btn', '📤 SHARE LINK'); sh.onclick = function () { shareRace(id); };
      body.appendChild(sh);
      body.appendChild(el('div', 'race-step', '2️⃣ Crack the code — fewest tries wins!'));
      sheet({ icon: '⚔️', title: 'RACE CREATED', body: body,
        main: { text: '▶ PLAY MY TURN', cls: 'green', action: function () { closeSheet(); App.playMode('race', id); } } });
    });
  }
  function raceResult(id) {
    sheet({ icon: '⚔️', title: 'RACE', body: el('div', 'rank-wait', 'LOADING…') });
    Board.raceGet(id, function (race) {
      if (race === undefined) { sheet({ icon: '⚔️', title: 'RACE', body: el('div', 'rank-wait', 'OFFLINE — TRY AGAIN LATER') }); return; }
      if (race === null) { sheet({ icon: '⚔️', title: 'RACE', body: el('div', 'rank-wait', 'THIS RACE WAS NOT FOUND') }); return; }
      remember(id);
      const st = raceStatus(id, race);
      const body = el('div', 'race-box');
      body.appendChild(el('div', 'race-vs', raceTitle(race)));
      const list = el('div', 'rank-list small');
      const done = ranking(race.players);
      done.forEach(function (p, k) { list.appendChild(rankRow(k, p, p.tries >= 99 ? '✗' : p.tries + (p.tries === 1 ? ' TRY' : ' TRIES'), fmtClock(p.ms))); });
      race.players.filter(function (p) { return !p.done; }).forEach(function (p) { list.appendChild(rankRow(9, p, 'PLAYING', '')); });
      if (!race.players.length) list.appendChild(el('div', 'rank-wait', 'NOBODY HAS PLAYED YET'));
      body.appendChild(list);
      let main = null;
      if (!st.mine) main = { text: '▶ PLAY', cls: 'green', action: function () { closeSheet(); App.playMode('race', id); } };
      if (st.short === 'WAITING') {
        body.appendChild(el('div', 'race-step', '⏳ Waiting for your friend…'));
        main = { text: '📤 SHARE LINK AGAIN', action: function () { shareRace(id); } };
      }
      if (st.final) {
        body.appendChild(el('div', 'race-win ' + (st.won ? 'won' : 'lost'), st.won ? '🏆 YOU WON!' : 'YOU LOST — REMATCH?'));
        const s = S();
        if (!s.raceWon) s.raceWon = {};
        if (st.won && !s.raceWon[id]) {
          main = { text: 'CLAIM REWARD · ' + Game.RACE_WIN_COINS + ' 🪙', action: function () {
            if (s.raceWon[id]) return;
            s.raceWon[id] = true; s.coins += Game.RACE_WIN_COINS; Game.stat('raceWins'); Game.persist();
            closeSheet(); reward(Game.RACE_WIN_COINS);
          } };
        } else main = { text: '⚔️ NEW RACE', cls: 'green', action: createRace };
      }
      sheet({ icon: '⚔️', title: 'RACE', body: body, main: main });
    });
  }
  // a friend opened a race link
  function joinFromLink() {
    let id = null;
    try { id = new URLSearchParams(location.search).get('race'); } catch (e) { /* old browser */ }
    if (!id || !/^[a-z0-9]{4,16}$/.test(id)) return false;
    try { history.replaceState(history.state, '', location.pathname); } catch (e) { /* ignore */ }
    Board.raceGet(id, function (race) {
      if (!race) { Game.toast(race === null ? 'That race was not found' : 'Offline — open the link again later'); return; }
      remember(id);
      const mine = race.players.filter(function (p) { return p.id === S().pid; })[0];
      if (mine) { raceResult(id); return; }
      const body = el('div', 'race-box');
      body.appendChild(el('div', 'race-vs', '⚔️ ' + ((race.by && race.by.name) || 'A friend') + ' challenged you!'));
      body.appendChild(el('div', 'dp-chips', '🔢 4 DIGITS   🎯 ' + Game.RACE_TRIES + ' TRIES   🏆 +' + Game.RACE_WIN_COINS + ' 🪙'));
      sheet({ icon: '⚔️', title: 'RACE CHALLENGE', body: body,
        main: { text: '▶ ACCEPT & PLAY', cls: 'green', action: function () { closeSheet(); App.playMode('race', id); } } });
    });
    return true;
  }

  // ======================= HOME PAGE ======================================
  function refreshHome() {
    const s = S();
    const dp = Game.dailyState();
    $('dp-btn').classList.toggle('ready', !(dp && dp.done));
    $('chest-btn').classList.toggle('ready', chestReady());
    $('chest-fill').style.height = Math.min(100, s.chestStars / CHEST_STARS * 100) + '%';
    $('ach-btn').classList.toggle('ready', achReady());
  }
  // after the loading screen: race link first, otherwise the daily streak
  function onStart() {
    applySkin();
    if (!joinFromLink()) setTimeout(showStreak, 300);
  }

  function init() {
    $('x-close').onclick = closeSheet;
    $('dp-btn').onclick = dailyBoard;
    $('race-btn').onclick = openRaces;
    $('chest-btn').onclick = openChestScreen;
    $('ach-btn').onclick = openAchievements;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { onStart: onStart, refreshHome: refreshHome, dailyBoard: dailyBoard, dailyList: dailyList, raceResult: raceResult,
           fillSkins: fillSkins, applySkin: applySkin, showStreak: showStreak, closeSheet: closeSheet };
})();
