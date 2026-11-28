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
              "races":   { ".read": true, "$race": { ".write": true } } } }
   While LEADERBOARD_URL is empty the leaderboard shows only this player.
   ========================================================================== */
'use strict';

const LEADERBOARD_URL = 'https://code-quest-bf804-default-rtdb.firebaseio.com';
const LEADERBOARD_SIZE = 100;     // how many players the list shows

const Board = (function () {
  function base() {
    let u = LEADERBOARD_URL;
    try { u = localStorage.getItem('ctcm-lb-url') || u; } catch (e) { /* ignore */ }   // testing override
    return u.replace(/\/+$/, '');
  }
  function on() { return !!base() && !!window.fetch; }

  let last = '';
  // send this player's entry (only when something changed)
  function push(s) {
    if (!on()) return;
    const me = { name: s.name, avatar: s.avatar, level: s.level, stars: s.stars, wins: s.wins, at: Date.now() };
    const key = [me.name, me.avatar, me.level, me.stars].join('|');
    if (key === last) return;
    last = key;
    fetch(base() + '/players/' + encodeURIComponent(s.pid) + '.json', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(me)
    }).catch(function () { last = ''; });
  }

  // done(list or null): best first
  function load(done) {
    if (!on()) { done(null); return; }
    fetch(base() + '/players.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (all) {
      const list = Object.keys(all || {}).map(function (id) {
        const p = all[id] || {};
        return { id: id, name: String(p.name || 'Player').slice(0, 16), avatar: +p.avatar || 0, level: +p.level || 1, stars: +p.stars || 0 };
      });
      list.sort(function (a, b) { return b.level - a.level || b.stars - a.stars; });
      done(list.slice(0, LEADERBOARD_SIZE), list);
    }).catch(function () { done(null); });
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
  const clean = function (p) { return { name: String(p.name || 'Player').slice(0, 16), avatar: +p.avatar || 0, tries: +p.tries || 99, ms: +p.ms || 0, done: !!p.done }; };

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

  // ---- race a friend ----
  function raceCreate(id, host, done) { put('/races/' + id, { by: host, at: Date.now() }, done); }
  function raceGet(id, done) {
    get('/races/' + id, function (r) {
      if (r === undefined) { done(undefined); return; }
      if (!r) { done(null); return; }
      const players = Object.keys(r.players || {}).map(function (pid) { return Object.assign({ id: pid }, clean(r.players[pid])); });
      done({ by: r.by || {}, at: r.at || 0, players: players });
    });
  }
  function raceSubmit(id, pid, me) { put('/races/' + id + '/players/' + encodeURIComponent(pid), me); }

  return { on: on, push: push, load: load, dailyPush: dailyPush, dailyLoad: dailyLoad,
           raceCreate: raceCreate, raceGet: raceGet, raceSubmit: raceSubmit };
})();
