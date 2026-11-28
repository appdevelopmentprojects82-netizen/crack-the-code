/* ==========================================================================
   LEADERBOARD - every player's level and stars in one online list
   --------------------------------------------------------------------------
   Uses a free Firebase Realtime Database (no extra code library needed).
   To switch it on:
     1. Go to https://console.firebase.google.com and add a project (free).
     2. Build > Realtime Database > Create database > "Start in test mode".
     3. Copy the database address (like https://code-quest-1234-default-rtdb.firebaseio.com)
        into LEADERBOARD_URL below and publish.
     4. Under "Rules" paste this (players, daily puzzle ranking and races):
          { "rules": {
              "players": { ".read": true, "$id": { ".write": true } },
              "daily":   { ".read": true, "$day": { "$id": { ".write": true } } },
              "races":   { ".read": true, "$race": { ".write": true } },
              "inbox":   { "$id": { ".read": true, ".write": true } } } }
   While LEADERBOARD_URL is empty the leaderboard shows only this player.

   COMPUTER PLAYERS: 100 made-up players (made the same way every time, never
   stored online) fill the all-time and weekly boards. Real players push them
   off the bottom of the board as more people play.
   ========================================================================== */
'use strict';

const LEADERBOARD_URL = 'https://code-quest-bf804-default-rtdb.firebaseio.com';
const LEADERBOARD_SIZE = 100;     // how many players the all-time list shows
const WEEKLY_SIZE = 50;           // how many players the weekly list shows
const WEEKLY_PRIZES = [10000, 5000, 2500];   // coins for 1st, 2nd and 3rd of each week
const BOT_COUNT = 100;            // computer players
const BOT_TOP_LEVEL = 203;        // the best computer player's level
const BOT_WEEKLY_SHARE = 0.45;    // about this many of them play in any one week

const Board = (function () {
  function base() {
    let u = LEADERBOARD_URL;
    try { u = localStorage.getItem('ctcm-lb-url') || u; } catch (e) { /* ignore */ }   // testing override
    return u.replace(/\/+$/, '');
  }
  function on() { return !!base() && !!window.fetch; }

  // ======================= COMPUTER PLAYERS ================================
  // a fixed random number maker: the same seed always gives the same numbers
  function seeded(seed) {
    let h = 1779033703 ^ String(seed).length;
    for (let i = 0; i < String(seed).length; i++) { h = Math.imul(h ^ String(seed).charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
    let a = h >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  let botList = null;
  function bots() {
    if (botList) return botList;
    const r = seeded('code-quest-players');
    const seen = {};
    botList = [];
    for (let i = 0; i < BOT_COUNT; i++) {
      // levels spread from BOT_TOP_LEVEL down to 1, more of them low than high
      const f = (BOT_COUNT - 1 - i) / (BOT_COUNT - 1);
      let level = i === 0 ? BOT_TOP_LEVEL : Math.round(1 + (BOT_TOP_LEVEL - 6) * Math.pow(f, 1.7) + (r() * 6 - 3));
      level = Math.max(1, Math.min(i === 0 ? BOT_TOP_LEVEL : BOT_TOP_LEVEL - 4, level));
      let name;
      do { name = Game.randomName(r); } while (seen[name.toLowerCase()]);
      seen[name.toLowerCase()] = 1;
      const open = (typeof AVATARS !== 'undefined' ? AVATARS : [{ lvl: 1 }]).map(function (a, k) { return a.lvl <= level ? k : -1; }).filter(function (k) { return k >= 0; });
      const id = (1690000000000 + Math.floor(r() * 4e10)).toString(36) + r().toString(36).slice(2, 8);
      botList.push({ id: id, name: name, avatar: open[Math.floor(r() * open.length)] || 0, level: level,
                     stars: Math.round((level - 1) * (1.9 + r() * 0.9)), wins: level - 1, bot: true, seed: i });
    }
    return botList;
  }
  function isBot(id) { return bots().some(function (b) { return b.id === id; }); }
  function bot(id) { return bots().filter(function (b) { return b.id === id; })[0] || null; }

  // ======================= WEEKS ===========================================
  // a week runs Monday 00:00 to Sunday 24:00 (UTC); its key is the Monday, e.g. "2026-11-23"
  function weekKey(t) {
    const d = new Date(t === undefined ? Date.now() : t);
    const m = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - (d.getUTCDay() + 6) % 7);
    return new Date(m).toISOString().slice(0, 10);
  }
  function weekStart(key) { return Date.parse(key + 'T00:00:00Z'); }
  function lastWeekKey() { return weekKey(weekStart(weekKey()) - 86400000); }
  function weekEndsIn() { return weekStart(weekKey()) + 7 * 86400000 - Date.now(); }
  // keep this player's "levels won this week" up to date (call before reading or adding to it)
  function weekRoll(s) {
    const k = weekKey();
    if (s.wk === k) return;
    if (s.wk) { s.pwk = s.wk; s.pww = s.ww || 0; }
    s.wk = k; s.ww = 0;
  }
  // levels a computer player has won in a week (grows through the week)
  function botWeek(b, key, now) {
    const r = seeded(b.id + '|' + key);
    if (r() > BOT_WEEKLY_SHARE) return 0;
    const pace = (1.5 + r() * 9) * (0.45 + b.level / BOT_TOP_LEVEL * 0.8);       // levels a day
    const days = Math.max(0, Math.min(7, ((now || Date.now()) - weekStart(key)) / 86400000));
    return Math.floor(pace * days + r() * 2);
  }

  // ======================= THIS PLAYER =====================================
  let last = '';
  // send this player's entry (only when something changed)
  function push(s) {
    if (!on()) return;
    weekRoll(s);
    const me = { name: s.name, avatar: s.avatar, level: s.level, stars: s.stars, wins: s.wins, at: Date.now(),
                 wk: s.wk, ww: s.ww || 0, pwk: s.pwk || '', pww: s.pww || 0 };
    const key = [me.name, me.avatar, me.level, me.stars, me.wk, me.ww].join('|');
    if (key === last) return;
    last = key;
    fetch(base() + '/players/' + encodeURIComponent(s.pid) + '.json', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(me)
    }).catch(function () { last = ''; });
  }

  function get(path, done) {
    if (!on()) { done(null); return; }
    fetch(base() + path + '.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { done(j); }).catch(function () { done(undefined); });     // undefined = offline
  }
  function put(path, obj, done) {
    if (!on()) { if (done) done(false); return; }
    fetch(base() + path + '.json', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) })
      .then(function (r) { if (done) done(r.ok); }).catch(function () { if (done) done(false); });
  }
  function del(path, done) {
    if (!on()) { if (done) done(false); return; }
    fetch(base() + path + '.json', { method: 'DELETE' }).then(function (r) { if (done) done(r.ok); }).catch(function () { if (done) done(false); });
  }
  function human(id, p) {
    p = p || {};
    return { id: id, name: String(p.name || 'Player').slice(0, 16), avatar: +p.avatar || 0, level: +p.level || 1, stars: +p.stars || 0,
             at: +p.at || 0, wk: p.wk || '', ww: +p.ww || 0, pwk: p.pwk || '', pww: +p.pww || 0 };
  }
  // real players first; computer players fill the places that are left
  function fill(humans, botsList, size, better) {
    humans.sort(better); botsList.sort(better);
    const room = Math.max(0, size - humans.length);
    return humans.concat(botsList.slice(0, room)).sort(better);
  }

  // ---- all-time board: done(top list, full list) - best first ----
  function load(done) {
    get('/players', function (all) {
      if (all === undefined || all === null && !on()) { done(null); return; }
      const humans = Object.keys(all || {}).map(function (id) { return human(id, all[id]); });
      const list = fill(humans, bots().slice(), LEADERBOARD_SIZE, function (a, b) { return b.level - a.level || b.stars - a.stars; });
      done(list.slice(0, LEADERBOARD_SIZE), list);
    });
  }
  // ---- weekly board: levels won this week. which = 'this' or 'last' ----
  function weekly(which, done) {
    const key = which === 'last' ? lastWeekKey() : weekKey();
    const end = which === 'last' ? weekStart(key) + 7 * 86400000 : Date.now();
    get('/players', function (all) {
      if (all === undefined || all === null && !on()) { done(null); return; }
      const humans = Object.keys(all || {}).map(function (id) { return human(id, all[id]); }).map(function (p) {
        p.score = p.wk === key ? p.ww : p.pwk === key ? p.pww : 0; return p;
      }).filter(function (p) { return p.score > 0; });
      const bl = bots().map(function (b) { return Object.assign({ score: botWeek(b, key, end) }, b); }).filter(function (b) { return b.score > 0; });
      done(fill(humans, bl, WEEKLY_SIZE, function (a, b) { return b.score - a.score || b.level - a.level; }).slice(0, WEEKLY_SIZE), key);
    });
  }

  const clean = function (p) {
    // a computer player in a race "finishes" at its finish time, not before
    const fin = +p.fin || 0;
    return { name: String(p.name || 'Player').slice(0, 16), avatar: +p.avatar || 0, tries: +p.tries || 99, ms: +p.ms || 0,
             done: !!p.done && !(fin > Date.now()), paid: !!p.paid, fin: fin };
  };

  // ---- friends: find a player by their exact username (not case sensitive) ----
  function findByName(name, done) {
    players(function (all) {
      if (all === null) { done(undefined); return; }
      const want = String(name).trim().toLowerCase();
      const id = Object.keys(all).filter(function (k) { return String((all[k] || {}).name || '').toLowerCase() === want; })[0];
      done(id ? { id: id, name: all[id].name, avatar: +all[id].avatar || 0, level: +all[id].level || 1, stars: +all[id].stars || 0 } : null);
    });
  }
  // everyone (real and computer players) as { id: entry }
  function players(done) {
    get('/players', function (all) {
      if (all === undefined) { done(null); return; }
      const out = {};
      bots().forEach(function (b) { out[b.id] = b; });
      Object.keys(all || {}).forEach(function (id) { out[id] = all[id]; });
      done(out);
    });
  }
  // real players seen in the last few days (for random races)
  function active(days, done) {
    get('/players', function (all) {
      if (!all) { done([]); return; }
      const since = Date.now() - days * 86400000;
      done(Object.keys(all).map(function (id) { return human(id, all[id]); }).filter(function (p) { return p.at >= since; }));
    });
  }

  // ---- messages between players (race invites, "added you as a friend") ----
  function inbox(pid, done) { get('/inbox/' + encodeURIComponent(pid), function (m) { done(m === undefined ? null : m || {}); }); }
  function send(toPid, msgId, msg, done) {
    if (isBot(toPid)) { if (done) done(true); return; }          // computer players have no inbox
    put('/inbox/' + encodeURIComponent(toPid) + '/' + msgId, msg, done);
  }
  function unsend(pid, msgId) { del('/inbox/' + encodeURIComponent(pid) + '/' + msgId); }

  // ---- daily puzzle: fewest tries first, then fastest ----
  function dailyPush(day, pid, me) { put('/daily/' + day + '/' + encodeURIComponent(pid), me); }
  function dailyLoad(day, done) {
    get('/daily/' + day, function (all) {
      if (all === undefined) { done(null); return; }
      const list = Object.keys(all || {}).map(function (id) { return Object.assign({ id: id }, clean(all[id])); });
      list.sort(function (a, b) { return a.tries - b.tries || a.ms - b.ms; });
      done(list);
    });
  }

  // ---- races ----
  function raceCreate(id, race, done) { put('/races/' + id, race, done); }
  function raceCancel(id) { del('/races/' + id); }
  function raceGet(id, done) {
    get('/races/' + id, function (r) {
      if (r === undefined) { done(undefined); return; }
      if (!r) { done(null); return; }
      const players = Object.keys(r.players || {}).map(function (pid) { return Object.assign({ id: pid }, clean(r.players[pid])); });
      done({ by: r.by || {}, at: r.at || 0, day: r.day || '', fee: +r.fee || 0, max: +r.max || 10, invited: r.invited || [],
             random: !!r.random, players: players });
    });
  }
  function raceSubmit(id, pid, me, done) { put('/races/' + id + '/players/' + encodeURIComponent(pid), me, done); }

  return { on: on, push: push, load: load, weekly: weekly, dailyPush: dailyPush, dailyLoad: dailyLoad,
           raceCreate: raceCreate, raceCancel: raceCancel, raceGet: raceGet, raceSubmit: raceSubmit,
           findByName: findByName, players: players, active: active, inbox: inbox, send: send, unsend: unsend,
           bots: bots, isBot: isBot, bot: bot, seeded: seeded,
           weekKey: weekKey, lastWeekKey: lastWeekKey, weekEndsIn: weekEndsIn, weekRoll: weekRoll };
})();
