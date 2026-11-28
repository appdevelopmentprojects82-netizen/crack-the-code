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
      t.appendChild(el('span', '', r.coins + ' 🪙' + (r.elims ? ' +🪄' : '')));
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
    reward(r.coins, r.elims ? ' +1 🪄' : '');
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
      if (elim) got.appendChild(el('div', '', '+1 🪄 ELIMINATE'));
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
    r.appendChild(el('span', 'rk', k < 0 ? '' : k < 3 ? ['🥇', '🥈', '🥉'][k] : String(k + 1)));
    const pic = el('div', 'pfp'); App.avatar(pic, p.avatar); r.appendChild(pic);
    r.appendChild(el('b', 'rn', p.name));
    r.appendChild(el('span', 'rl', a));
    r.appendChild(el('span', 'rs', b));
    if (p.id && p.id !== S().pid) { r.classList.add('tap'); r.onclick = function () { playerCard(p); }; }
    return r;
  }

  // ======================= FRIENDS ========================================
  function friends() { const s = S(); if (!s.friends) s.friends = {}; return s.friends; }
  function isFriend(pid) { return !!friends()[pid]; }
  function addFriend(p, quiet) {
    if (!p || !p.id || p.id === S().pid) return;
    friends()[p.id] = { name: p.name, avatar: p.avatar || 0 };
    Game.persist();
    // let them know (they can add you back)
    Board.send(p.id, 'f_' + S().pid, { type: 'friend', from: me(), at: Date.now() });
    if (!quiet) { Sounds.play('correct'); Game.toast('👥 ' + p.name + ' added as a friend!'); }
  }
  function removeFriend(pid) { delete friends()[pid]; Game.persist(); }
  function me() { const s = S(); return { pid: s.pid, name: s.name, avatar: s.avatar }; }

  // tapping a player on the leaderboard
  function playerCard(p) {
    if (!p || p.id === S().pid) return;
    const body = el('div', 'pcard');
    const pic = el('div', 'pfp huge'); App.avatar(pic, p.avatar); body.appendChild(pic);
    body.appendChild(el('div', 'race-vs', p.name));
    if (p.level) body.appendChild(el('div', 'dp-chips', '🏆 LEVEL ' + p.level + '   ⭐ ' + (p.stars || 0)));
    const fr = isFriend(p.id);
    sheet({ icon: '', title: fr ? 'FRIEND ✓' : 'PLAYER', body: body,
      main: fr ? { text: 'REMOVE FRIEND', action: function () { removeFriend(p.id); closeSheet(); Game.toast('Removed from friends'); } }
               : { text: '👥 ADD FRIEND', cls: 'green', action: function () { addFriend(p); closeSheet(); } } });
  }

  // the friends window: add by username, messages, your friends
  let inboxCache = {};
  function openFriends() {
    const body = el('div', 'fr-box');
    // add by exact username
    body.appendChild(el('div', 'field-label', 'ADD A FRIEND BY USERNAME'));
    const row = el('div', 'fr-add');
    const input = document.createElement('input');
    input.id = 'fr-name'; input.placeholder = 'Exact username'; input.maxLength = 16; input.autocomplete = 'off'; input.spellcheck = false;
    const go = el('button', 'fr-go', 'ADD');
    const msg = el('div', 'fr-msg');
    go.onclick = function () {
      const name = input.value.trim();
      if (name.length < 3) { msg.textContent = 'Type the full username'; return; }
      if (name.toLowerCase() === S().name.toLowerCase()) { msg.textContent = 'That’s you! 😄'; return; }
      msg.textContent = 'Searching…';
      Board.findByName(name, function (p) {
        if (p === undefined) { msg.textContent = 'Offline — try again later'; return; }
        if (!p) { msg.textContent = 'No player called “' + name + '”'; return; }
        if (isFriend(p.id)) { msg.textContent = p.name + ' is already your friend'; return; }
        addFriend(p); openFriends();
      });
    };
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') go.click(); });
    row.appendChild(input); row.appendChild(go);
    body.appendChild(row); body.appendChild(msg);
    // messages
    const inbox = el('div', 'fr-inbox');
    body.appendChild(inbox);
    fillInbox(inbox);
    // your friends
    const ids = Object.keys(friends());
    body.appendChild(el('div', 'field-label', 'YOUR FRIENDS (' + ids.length + ')'));
    const list = el('div', 'rank-list small');
    if (!ids.length) list.appendChild(el('div', 'rank-wait', 'NO FRIENDS YET — ADD THEM HERE OR FROM THE LEADERBOARD'));
    ids.forEach(function (id) {
      const f = friends()[id];
      const r = rankRow(-1, { id: id, name: f.name, avatar: f.avatar }, '', '');
      const x = el('button', 'fr-x', '✕');
      x.onclick = function (e) { e.stopPropagation(); removeFriend(id); openFriends(); };
      r.appendChild(x);
      list.appendChild(r);
    });
    body.appendChild(list);
    // show their levels
    Board.players(function (all) {
      if (!all) return;
      ids.forEach(function (id, k) {
        const r = list.children[k]; if (!r || !all[id]) return;
        friends()[id].name = all[id].name || friends()[id].name; friends()[id].avatar = +all[id].avatar || 0;
        r.querySelector('.rn').textContent = friends()[id].name;
        r.querySelector('.rl').textContent = 'LV ' + (all[id].level || 1);
      });
      Game.persist();
    });
    sheet({ icon: '👥', title: 'FRIENDS', body: body });
    markSeen();
  }
  function fillInbox(box) {
    box.innerHTML = '';
    Board.inbox(S().pid, function (m) {
      if (!m) return;
      inboxCache = m;
      const keys = Object.keys(m).sort(function (a, b) { return (m[b].at || 0) - (m[a].at || 0); });
      const items = keys.filter(function (k) { return m[k] && (m[k].type !== 'race' || m[k].day === Game.utcDay()); });
      if (!items.length) return;
      box.appendChild(el('div', 'field-label', 'MESSAGES'));
      items.forEach(function (k) {
        const x = m[k], from = x.from || {};
        const r = el('div', 'fr-msgrow');
        const pic = el('div', 'pfp'); App.avatar(pic, from.avatar || 0); r.appendChild(pic);
        const t = el('div', 'fr-text', x.type === 'race' ? '⚔️ ' + from.name + ' invited you to a race' : '👥 ' + from.name + ' added you as a friend');
        r.appendChild(t);
        const b = el('button', 'fr-act', x.type === 'race' ? 'JOIN' : isFriend(from.pid) ? 'OK' : 'ADD BACK');
        b.onclick = function () {
          Board.unsend(S().pid, k);
          if (x.type === 'race') { closeSheet(); joinRace(x.race); }
          else { if (!isFriend(from.pid)) addFriend({ id: from.pid, name: from.name, avatar: from.avatar }); r.remove(); }
        };
        r.appendChild(b);
        box.appendChild(r);
      });
    });
  }
  // a red "!" on the friends / race buttons when there are new messages
  function checkInbox(announce) {
    Board.inbox(S().pid, function (m) {
      if (!m) return;
      inboxCache = m;
      const seen = S().seenMsgs || {};
      const fresh = Object.keys(m).filter(function (k) { return m[k] && !seen[k] && (m[k].type !== 'race' || m[k].day === Game.utcDay()); });
      $('friends-btn').classList.toggle('ready', fresh.length > 0);
      $('race-btn').classList.toggle('ready', fresh.some(function (k) { return m[k].type === 'race'; }));
      if (announce && fresh.length) {
        const r = fresh.filter(function (k) { return m[k].type === 'race'; })[0];
        Game.toast(r ? '⚔️ ' + m[r].from.name + ' invited you to a race!' : '👥 ' + m[fresh[0]].from.name + ' added you as a friend');
      }
    });
  }
  function markSeen() {
    const s = S(); if (!s.seenMsgs) s.seenMsgs = {};
    Object.keys(inboxCache || {}).forEach(function (k) { s.seenMsgs[k] = 1; });
    Game.persist();
    $('friends-btn').classList.remove('ready'); $('race-btn').classList.remove('ready');
  }

  // ======================= RACE (up to 10 friends, 100 coins each) =========
  function newId() { const c = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < 8; i++) s += c[Math.floor(Math.random() * c.length)]; return s; }
  function myRaces() { const s = S(); if (!s.myRaces) s.myRaces = []; return s.myRaces; }
  function remember(id) { const l = myRaces(); const i = l.indexOf(id); if (i >= 0) l.splice(i, 1); l.unshift(id); l.length = Math.min(l.length, 10); Game.persist(); }
  function raceLink(id) { return location.origin + location.pathname + '?race=' + id; }
  function shareRace(id) {
    const url = raceLink(id);
    const text = '⚔️ ' + S().name + ' challenged you to a Code Quest race! ' + Game.RACE_FEE + ' coins to enter — the winner takes them all.';
    if (navigator.share) { navigator.share({ title: 'Code Quest race', text: text, url: url }).catch(function () { /* closed */ }); return; }
    copy(url);
    window.open('https://wa.me/?text=' + encodeURIComponent(text + ' ' + url), '_blank');
  }
  function copy(t) {
    try { navigator.clipboard.writeText(t).then(function () { Game.toast('🔗 Link copied!'); }); }
    catch (e) { Game.toast(t); }
  }
  function untilUtcEnd() { return untilUtcMidnight(); }
  const RACE_CHIPS = function () { return '🎟️ ' + Game.RACE_FEE + ' 🪙 ENTRY   👥 UP TO ' + Game.RACE_MAX + '   🏆 WINNER TAKES ALL'; };
  function notEnough() {
    const body = el('div', 'race-box');
    body.appendChild(el('div', 'race-step', 'You need ' + Game.RACE_FEE + ' 🪙 to enter a race.'));
    sheet({ icon: '⚔️', title: 'NOT ENOUGH COINS', body: body,
      main: { text: '🪙 BUY MORE COINS', action: function () { closeSheet(); App.goShop(); } } });
  }

  // the race window: start a race or look at your races
  function openRaces() {
    markSeen();
    const body = el('div', 'race-box');
    body.appendChild(el('div', 'dp-chips', RACE_CHIPS()));
    const inbox = el('div', 'fr-inbox'); body.appendChild(inbox); fillInbox(inbox);
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
          r.textContent = '⚔️ ' + raceTitle(race) + ' · ' + raceStatus(race).short;
        });
      });
    }
    sheet({ icon: '⚔️', title: 'RACE FRIENDS', body: body, main: { text: '＋ NEW RACE', cls: 'green', action: pickFriends } });
  }
  // choose who to invite (or all friends at once)
  function pickFriends() {
    if (S().coins < Game.RACE_FEE) { notEnough(); return; }
    const ids = Object.keys(friends());
    const body = el('div', 'race-box');
    body.appendChild(el('div', 'dp-chips', RACE_CHIPS()));
    const chosen = {};
    const count = el('div', 'race-step');
    const max = Game.RACE_MAX - 1;
    function upd() { count.textContent = Object.keys(chosen).length + ' / ' + max + ' friends invited'; }
    if (ids.length) {
      const all = el('button', 'wide-btn', '📣 INVITE ALL FRIENDS');
      all.onclick = function () {
        const on = Object.keys(chosen).length < Math.min(max, ids.length);
        ids.forEach(function (id, k) { const cb = list.children[k]; if (on && Object.keys(chosen).length < max) { chosen[id] = 1; cb.classList.add('on'); } else if (!on) { delete chosen[id]; cb.classList.remove('on'); } });
        upd();
      };
      body.appendChild(all);
      body.appendChild(count);
      const list = el('div', 'rank-list small');
      ids.forEach(function (id) {
        const f = friends()[id];
        const r = rankRow(-1, { id: id, name: f.name, avatar: f.avatar }, '', '');
        r.classList.add('pick');
        r.onclick = function () {
          if (chosen[id]) { delete chosen[id]; r.classList.remove('on'); }
          else if (Object.keys(chosen).length < max) { chosen[id] = 1; r.classList.add('on'); }
          else Game.toast('Up to ' + Game.RACE_MAX + ' players in a race');
          upd();
        };
        list.appendChild(r);
      });
      body.appendChild(list);
      upd();
    } else {
      body.appendChild(el('div', 'race-step', '👥 Add friends to invite them — or share a link after you start.'));
    }
    sheet({ icon: '⚔️', title: 'NEW RACE', body: body,
      main: { text: 'START RACE · ' + Game.RACE_FEE + ' 🪙', cls: 'green', action: function () { createRace(Object.keys(chosen)); } } });
  }
  function createRace(invited) {
    const s = S();
    if (s.coins < Game.RACE_FEE) { notEnough(); return; }
    const id = newId();
    $('x-main').disabled = true;
    const race = { by: me(), at: Date.now(), day: Game.utcDay(), fee: Game.RACE_FEE, max: Game.RACE_MAX, invited: invited,
                   players: {} };
    race.players[s.pid] = { name: s.name, avatar: s.avatar, paid: true, done: false };
    Board.raceCreate(id, race, function (ok) {
      if (!ok) { $('x-main').disabled = false; Game.toast('Could not start the race — check your internet'); return; }
      s.coins -= Game.RACE_FEE; Game.persist(); App.update();
      remember(id);
      invited.forEach(function (pid) { Board.send(pid, 'r_' + id, { type: 'race', race: id, day: race.day, from: me(), at: Date.now() }); });
      const body = el('div', 'race-box');
      body.appendChild(el('div', 'race-step', invited.length ? '📨 ' + invited.length + ' friend' + (invited.length > 1 ? 's' : '') + ' invited!' : '1️⃣ Send the link to your friends'));
      const link = el('button', 'race-link', raceLink(id).replace(/^https?:\/\//, ''));
      link.onclick = function () { copy(raceLink(id)); };
      body.appendChild(link);
      const sh = el('button', 'wide-btn', '📤 SHARE LINK'); sh.onclick = function () { shareRace(id); };
      body.appendChild(sh);
      body.appendChild(el('div', 'race-step', '⏳ The race ends at midnight — fewest tries wins the pot!'));
      sheet({ icon: '⚔️', title: 'RACE STARTED', body: body,
        main: { text: '▶ PLAY MY TURN', cls: 'green', action: function () { closeSheet(); App.playMode('race', id); } } });
    });
  }
  // invited / opened a link: pay the entry and play
  function joinRace(id) {
    sheet({ icon: '⚔️', title: 'RACE', body: el('div', 'rank-wait', 'LOADING…') });
    Board.raceGet(id, function (race) {
      if (!race) { sheet({ icon: '⚔️', title: 'RACE', body: el('div', 'rank-wait', race === null ? 'THIS RACE WAS NOT FOUND' : 'OFFLINE — TRY AGAIN LATER') }); return; }
      remember(id);
      const mine = race.players.filter(function (p) { return p.id === S().pid; })[0];
      if (mine || raceStatus(race).final) { raceResult(id); return; }
      if (race.players.length >= (race.max || Game.RACE_MAX)) { sheet({ icon: '⚔️', title: 'RACE FULL', body: el('div', 'rank-wait', 'THIS RACE ALREADY HAS ' + race.players.length + ' PLAYERS') }); return; }
      const fee = race.fee || 0;
      const body = el('div', 'race-box');
      body.appendChild(el('div', 'race-vs', '⚔️ ' + ((race.by && race.by.name) || 'A friend') + ' challenged you!'));
      body.appendChild(el('div', 'dp-chips', '🎟️ ' + fee + ' 🪙 ENTRY   🏆 POT NOW ' + pot(race) + ' 🪙   👥 ' + race.players.length + '/' + (race.max || Game.RACE_MAX)));
      const time = el('div', 'lad-reset'); body.appendChild(time);
      sheet({ icon: '⚔️', title: 'RACE CHALLENGE', body: body,
        tick: function () { time.textContent = '⏳ ENDS IN ' + fmtClock(untilUtcEnd()); },
        main: S().coins < fee ? { text: '🪙 BUY MORE COINS', action: function () { closeSheet(); App.goShop(); } }
          : { text: 'JOIN & PLAY · ' + fee + ' 🪙', cls: 'green', action: function () {
            const s = S();
            if (s.coins < fee) { notEnough(); return; }
            $('x-main').disabled = true;
            Board.raceSubmit(id, s.pid, { name: s.name, avatar: s.avatar, paid: true, done: false });
            s.coins -= fee; Game.persist(); App.update();
            closeSheet(); App.playMode('race', id);
          } } });
    });
  }
  function pot(race) { return (race.fee || 0) * race.players.filter(function (p) { return p.paid; }).length; }
  // fewest tries first, then fastest. Only players who finished count.
  function ranking(players) {
    return players.filter(function (p) { return p.done && p.tries < 99; }).sort(function (a, b) { return a.tries - b.tries || a.ms - b.ms; });
  }
  function raceTitle(race) {
    const mine = S().pid;
    const others = race.players.filter(function (p) { return p.id !== mine; }).map(function (p) { return p.name; });
    return others.length ? 'vs ' + others.slice(0, 2).join(', ') + (others.length > 2 ? ' +' + (others.length - 2) : '') : 'Waiting for friends';
  }
  // the race is over at midnight (UTC), or once everyone invited (or 10 players) has finished
  function raceStatus(race) {
    const mine = S().pid;
    const me1 = race.players.filter(function (p) { return p.id === mine; })[0];
    const allDone = race.players.length > 0 && race.players.every(function (p) { return p.done; });
    const invitedIn = (race.invited || []).every(function (pid) { return race.players.some(function (p) { return p.id === pid; }); });
    const dayOver = race.day && race.day < Game.utcDay();
    const final = dayOver || (allDone && (race.players.length >= (race.max || Game.RACE_MAX) || ((race.invited || []).length > 0 && invitedIn)));
    const rank = ranking(race.players);
    const best = rank[0];
    const winners = best ? rank.filter(function (p) { return p.tries === best.tries && p.ms === best.ms; }) : [];
    const won = winners.some(function (p) { return p.id === mine; });
    let short = !me1 ? 'JOIN' : !me1.done ? 'YOUR TURN' : final ? (won ? 'YOU WON 🏆' : 'FINISHED') : 'WAITING';
    return { short: short, mine: me1, final: final, winners: winners, won: won, share: winners.length ? Math.floor(pot(race) / winners.length) : 0 };
  }
  function raceResult(id) {
    sheet({ icon: '⚔️', title: 'RACE', body: el('div', 'rank-wait', 'LOADING…') });
    Board.raceGet(id, function (race) {
      if (race === undefined) { sheet({ icon: '⚔️', title: 'RACE', body: el('div', 'rank-wait', 'OFFLINE — TRY AGAIN LATER') }); return; }
      if (race === null) { sheet({ icon: '⚔️', title: 'RACE', body: el('div', 'rank-wait', 'THIS RACE WAS NOT FOUND') }); return; }
      remember(id);
      const st = raceStatus(race);
      const body = el('div', 'race-box');
      body.appendChild(el('div', 'race-vs', raceTitle(race)));
      body.appendChild(el('div', 'dp-chips', '🏆 POT ' + pot(race) + ' 🪙   👥 ' + race.players.length + '/' + (race.max || Game.RACE_MAX)));
      const list = el('div', 'rank-list small');
      ranking(race.players).forEach(function (p, k) { list.appendChild(rankRow(k, p, p.tries + (p.tries === 1 ? ' TRY' : ' TRIES'), fmtClock(p.ms))); });
      race.players.filter(function (p) { return p.done && p.tries >= 99; }).forEach(function (p) { list.appendChild(rankRow(-1, p, '✗', '')); });
      race.players.filter(function (p) { return !p.done; }).forEach(function (p) { list.appendChild(rankRow(-1, p, st.final ? '—' : 'PLAYING', '')); });
      body.appendChild(list);
      const time = el('div', 'lad-reset');
      let main = null;
      if (!st.final) {
        body.appendChild(time);
        if (!st.mine) main = { text: 'JOIN · ' + (race.fee || 0) + ' 🪙', cls: 'green', action: function () { joinRace(id); } };
        else if (!st.mine.done) main = { text: '▶ PLAY MY TURN', cls: 'green', action: function () { closeSheet(); App.playMode('race', id); } };
        else main = { text: '📤 INVITE MORE', action: function () { shareRace(id); } };
      } else {
        const s = S();
        if (!s.raceWon) s.raceWon = {};
        const names = st.winners.map(function (p) { return p.name; }).join(' & ');
        body.appendChild(el('div', 'race-win ' + (st.won ? 'won' : 'lost'),
          st.won ? (st.winners.length > 1 ? '🤝 TIE — YOU SHARE THE POT!' : '🏆 YOU WON THE POT!') : names ? '🏆 ' + names + ' won' : 'Nobody finished'));
        if (st.won && !s.raceWon[id] && st.share > 0) {
          main = { text: 'CLAIM REWARD · ' + st.share + ' 🪙', action: function () {
            if (s.raceWon[id]) return;
            s.raceWon[id] = true; s.coins += st.share; Game.stat('raceWins'); Game.persist();
            closeSheet(); reward(st.share);
          } };
        } else main = { text: '⚔️ NEW RACE', cls: 'green', action: pickFriends };
      }
      sheet({ icon: '⚔️', title: st.final ? 'RACE RESULT' : 'RACE', body: body, main: main,
        tick: st.final ? null : function () { time.textContent = '⏳ ENDS IN ' + fmtClock(untilUtcEnd()); } });
    });
  }
  // a friend opened a race link
  function joinFromLink() {
    let id = null;
    try { id = new URLSearchParams(location.search).get('race'); } catch (e) { /* old browser */ }
    if (!id || !/^[a-z0-9]{4,16}$/.test(id)) return false;
    try { history.replaceState(history.state, '', location.pathname); } catch (e) { /* ignore */ }
    joinRace(id);
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
    checkInbox(true);
    setInterval(function () { if (!document.hidden) checkInbox(false); }, 60000);
  }

  function init() {
    $('x-close').onclick = closeSheet;
    $('dp-btn').onclick = dailyBoard;
    $('race-btn').onclick = openRaces;
    $('friends-btn').onclick = openFriends;
    $('chest-btn').onclick = openChestScreen;
    $('ach-btn').onclick = openAchievements;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { onStart: onStart, refreshHome: refreshHome, dailyBoard: dailyBoard, dailyList: dailyList, raceResult: raceResult,
           playerCard: playerCard, openFriends: openFriends, checkInbox: checkInbox,
           fillSkins: fillSkins, applySkin: applySkin, showStreak: showStreak, closeSheet: closeSheet };
})();
