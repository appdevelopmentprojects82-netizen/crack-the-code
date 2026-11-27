/* ==========================================================================
   SCREENS - loading screen, home, shop, leaderboard, profile, settings
   ========================================================================== */
'use strict';

// ---------------- SETTINGS (easy to change) ----------------
const SPLASH_MIN_SECONDS = 2.2;   // the loading screen shows at least this long
const SUPPORT_EMAIL = '';         // e.g. 'help@yourgame.com' - adds an "Email support" button to Help & Support

// 30 characters for the profile picture. lvl = level needed to unlock it.
const AVATARS = [
  { e: '🦊', lvl: 1 },   { e: '🐼', lvl: 1 },   { e: '🐸', lvl: 1 },   { e: '🐱', lvl: 3 },   { e: '🐶', lvl: 5 },
  { e: '🐵', lvl: 8 },   { e: '🐯', lvl: 10 },  { e: '🐨', lvl: 13 },  { e: '🐷', lvl: 16 },  { e: '🐰', lvl: 20 },
  { e: '🦁', lvl: 25 },  { e: '🐻', lvl: 30 },  { e: '🐙', lvl: 35 },  { e: '🦉', lvl: 40 },  { e: '🐧', lvl: 45 },
  { e: '🤖', lvl: 50 },  { e: '👻', lvl: 60 },  { e: '👽', lvl: 70 },  { e: '🎃', lvl: 80 },  { e: '🦄', lvl: 90 },
  { e: '🐲', lvl: 100 }, { e: '🧙', lvl: 115 }, { e: '🥷', lvl: 130 }, { e: '🧛', lvl: 145 }, { e: '🧜', lvl: 160 },
  { e: '🧞', lvl: 175 }, { e: '🦸', lvl: 190 }, { e: '🧟', lvl: 210 }, { e: '💀', lvl: 230 }, { e: '🤴', lvl: 250 }
];
const AVATAR_COLOURS = ['#ff8a3d', '#4cc9ff', '#25c45f', '#c77dff', '#ff5c8a', '#ffd84a'];
const AVATAR_MOVES = ['bob', 'wiggle', 'bounce', 'tilt', 'pulse'];
// -----------------------------------------------------------

const App = (function () {
  const $ = function (id) { return document.getElementById(id); };
  const S = function () { return Game.data(); };
  let screen = 'splash';

  // ======================= LOADING SCREEN =================================
  function splash() {
    const box = document.querySelector('.splash-digits');
    for (let i = 0; i < 16; i++) {
      const d = document.createElement('span');
      d.textContent = Math.floor(Math.random() * 10);
      d.style.left = (4 + Math.random() * 92) + '%';
      d.style.fontSize = (14 + Math.random() * 30) + 'px';
      d.style.animationDelay = (-Math.random() * 7) + 's';
      d.style.animationDuration = (5 + Math.random() * 5) + 's';
      box.appendChild(d);
    }
    const files = ['art/splash.jpg', 'art/wood.jpg', 'pictures/' + (((S().level - 1) % PICTURES) + 1) + '.jpg'];
    let loaded = 0;
    const start = Date.now();
    const bar = $('load-bar');
    let shown = 0;
    const tick = setInterval(function () {
      const byTime = Math.min(1, (Date.now() - start) / (SPLASH_MIN_SECONDS * 1000));
      const target = Math.min(byTime, (loaded + 0.5) / files.length);
      shown += (target - shown) * 0.25;
      bar.style.width = Math.round(shown * 100) + '%';
      if (loaded >= files.length && byTime >= 1) {
        clearInterval(tick);
        bar.style.width = '100%';
        $('load-text').textContent = 'READY!';
        setTimeout(function () {
          $('splash').classList.add('gone');
          show('home');
          setTimeout(function () { $('splash').remove(); }, 700);
        }, 250);
      }
    }, 50);
    files.forEach(function (f) {
      const im = new Image();
      im.onload = im.onerror = function () { loaded++; };
      im.src = f;
    });
  }

  // ======================= SCREENS ========================================
  function show(name, fromHistory) {
    if (name === screen) { update(); return; }
    if (screen === 'game') Game.close();
    // the phone's back button returns to the home page
    if (!fromHistory && name !== 'home' && screen === 'home') { try { history.pushState({ sub: 1 }, ''); } catch (e) { /* ignore */ } }
    screen = name;
    ['home', 'shop-screen', 'ranks', 'app'].forEach(function (id) { $(id).classList.add('hidden'); });
    const map = { home: 'home', shop: 'shop-screen', ranks: 'ranks', game: 'app' };
    $(map[name]).classList.remove('hidden');
    $('nav').classList.toggle('hidden', name === 'game');
    document.querySelectorAll('#nav button').forEach(function (b) { b.classList.toggle('on', b.dataset.go === name); });
    document.body.classList.toggle('in-game', name === 'game');
    if (name === 'shop') buildShop();
    if (name === 'ranks') buildRanks();
    update();
  }
  function home() {
    closeModals();
    if (history.state && history.state.sub) history.back();   // popstate brings us home
    else show('home', true);
  }
  window.addEventListener('popstate', function () { closeModals(); show('home', true); });
  function closeModals() { ['lives-modal', 'profile', 'settings', 'notice', 'daily'].forEach(function (id) { $(id).classList.add('hidden'); }); }

  function play() {
    show('game');
    if (!Game.open()) show('home', true);
  }

  // ======================= HOME ===========================================
  function avatarHTML(el, i) {
    const a = AVATARS[i] || AVATARS[0];
    el.style.setProperty('--av', AVATAR_COLOURS[i % AVATAR_COLOURS.length]);
    el.innerHTML = '';
    const f = document.createElement('span');
    f.className = 'fig ' + AVATAR_MOVES[i % AVATAR_MOVES.length];
    f.textContent = a.e;
    el.appendChild(f);
  }
  function update() {
    const s = S();
    Game.regenLives();
    ['home-coins', 'shop-coins'].forEach(function (id) { coinText($(id), '🪙 ' + s.coins.toLocaleString()); });
    $('home-lives').firstElementChild.textContent = s.lives;
    document.querySelectorAll('.heart').forEach(function (h) { h.classList.toggle('full', s.lives >= Game.LIVES_MAX); });
    $('daily-btn').classList.toggle('ready', Game.dailyReady());
    if (!$('daily').classList.contains('hidden')) fillDaily();
    $('play-level').textContent = s.level;
    avatarHTML($('pfp-btn'), s.avatar);
    const wait = Game.nextLifeIn();
    if (s.lives <= 0) $('play-note').textContent = wait ? '❤️ Next life in ' + clock(wait) : 'Out of lives';
    else if (s.level === 101) $('play-note').textContent = 'NEW: 5-DIGIT CODES!';
    else if (s.level === 201) $('play-note').textContent = 'NEW: 6-DIGIT CODES!';
    else $('play-note').textContent = '⭐ ' + s.stars;
    Game.render();
    if (!$('lives-modal').classList.contains('hidden')) fillLives();
    if (screen === 'shop') refreshShop();
  }
  function clock(ms) {
    const t = Math.ceil(ms / 1000);
    const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, sec = t % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(sec).padStart(2, '0');
  }
  setInterval(function () { if (screen === 'home' || !$('lives-modal').classList.contains('hidden') || !$('daily').classList.contains('hidden')) update(); }, 1000);

  function watchAdForCoins() {
    Ads.reward(function (watched) {
      if (!watched) { Game.toast('No ad available right now — try again later'); return; }
      Game.addCoins(Game.AD_COINS);
      Sounds.play('correct');
      buzz(40);
      Game.toast('+' + Game.AD_COINS + ' 🪙');
      ['home-coins', 'shop-coins', 'coins'].forEach(function (id) { const c = $(id); c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); });
      update();
    }, Game.musicHooks);
  }

  // ======================= LIVES ==========================================
  function livesModal() {
    fillLives();
    $('lives-modal').classList.remove('hidden');
  }
  function fillLives() {
    const s = S();
    const full = s.lives >= Game.LIVES_MAX;
    const wait = Game.nextLifeIn();
    $('lm-count').textContent = s.lives;
    $('lm-title').textContent = s.lives <= 0 ? 'OUT OF LIVES' : full ? 'LIVES FULL' : 'LIVES';
    $('lm-text').textContent = '';
    $('lm-timer').textContent = full ? '' : (wait ? '❤️ +1 in ' + clock(wait) : '');
    coinText($('lm-refill'), 'REFILL ❤️ · ' + Game.LIFE_REFILL_PRICE.toLocaleString() + ' 🪙');
    $('lm-refill').disabled = full || s.coins < Game.LIFE_REFILL_PRICE;
    $('lm-refill').classList.toggle('hidden', full);
    const short = $('lm-short');
    short.innerHTML = '';
    if (!full && s.coins < Game.LIFE_REFILL_PRICE) {
      const need = document.createElement('span');
      coinText(need, 'You need ' + (Game.LIFE_REFILL_PRICE - s.coins).toLocaleString() + ' more 🪙  ');
      short.appendChild(need);
      const go = document.createElement('button');
      go.className = 'inline-link'; go.textContent = 'Get coins →';
      go.onclick = function () { $('lives-modal').classList.add('hidden'); Game.close(); show('shop'); };
      short.appendChild(go);
    }
  }
  function refill() {
    if (!Game.refillLives()) return;
    Sounds.play('hint');
    buzz([30, 50, 30]);
    $('lives-modal').classList.add('hidden');
    Game.toast('❤️ Lives refilled!');
    update();
    Game.afterRefill();
  }
  function livesChanged(full) {
    update();
    if (!full) return;
    const s = S();
    if (document.hidden && s.settings.notify && window.Notification && Notification.permission === 'granted') {
      const opts = { body: 'Your lives are full ❤️ Come back and crack the next code!', icon: 'icons/icon-192.png', tag: 'lives' };
      if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(function (r) { r.showNotification('Code Quest', opts); });
      else { try { new Notification('Code Quest', opts); } catch (e) { /* not allowed here */ } }
    }
  }

  // ======================= DAILY TARGETS ==================================
  function openDaily() { fillDaily(); $('daily').classList.remove('hidden'); }
  function fillDaily() {
    const d = Game.daily();
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    $('dl-reset').textContent = '⏳ ' + clock(midnight - now);
    const list = $('dl-list');
    const key = d.day + '|' + d.wins + '|' + d.claimed.join(',');
    if (list.dataset.key === key) return;              // only redraw when something changed
    list.dataset.key = key;
    list.innerHTML = '';
    Game.DAILY_TARGETS.forEach(function (t, i) {
      const done = d.claimed[i], ready = !done && d.wins >= t.levels;
      const r = document.createElement('div');
      r.className = 'dl-row' + (done ? ' done' : ready ? ' ready' : '');
      const info = document.createElement('div'); info.className = 'dl-info';
      const b = document.createElement('b'); b.textContent = 'Complete ' + t.levels + ' levels'; info.appendChild(b);
      const bar = document.createElement('div'); bar.className = 'dl-bar';
      const fill = document.createElement('i'); fill.style.width = Math.min(100, d.wins / t.levels * 100) + '%'; bar.appendChild(fill);
      const n = document.createElement('span'); n.textContent = Math.min(d.wins, t.levels) + '/' + t.levels; bar.appendChild(n);
      info.appendChild(bar);
      const btn = document.createElement('button'); btn.className = 'dl-claim';
      if (done) { btn.textContent = '✓'; btn.disabled = true; }
      else coinText(btn, '+' + t.coins + ' 🪙');
      if (!ready) btn.disabled = true;
      btn.onclick = function () {
        const got = Game.claimDaily(i);
        if (!got) return;
        Sounds.play('correct'); buzz([30, 40, 30]);
        Game.toast('+' + got + ' 🪙');
        const c = $('home-coins'); c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
        update();
      };
      r.appendChild(info); r.appendChild(btn);
      list.appendChild(r);
    });
  }

  // ======================= PROFILE ========================================
  function openProfile() {
    const s = S();
    avatarHTML($('pf-pic'), s.avatar);
    $('pf-name').value = s.name;
    $('pf-level').textContent = s.level;
    $('pf-stars').textContent = s.stars;
    $('pf-wins').textContent = s.wins;
    const grid = $('pf-grid');
    grid.innerHTML = '';
    AVATARS.forEach(function (a, i) {
      const b = document.createElement('button');
      b.className = 'pfp tile';
      const open = s.level >= a.lvl;
      avatarHTML(b, i);
      if (!open) {
        b.classList.add('locked');
        const l = document.createElement('small'); l.textContent = '🔒 ' + a.lvl; b.appendChild(l);
        b.onclick = function () { Game.toast('Unlocks at level ' + a.lvl); };
      } else {
        if (i === s.avatar) b.classList.add('chosen');
        b.onclick = function () { s.avatar = i; Game.persist(); buzz(15); openProfile(); update(); };
      }
      grid.appendChild(b);
    });
    $('profile').classList.remove('hidden');
  }
  function saveName() {
    const s = S();
    const clean = $('pf-name').value.replace(/[^\p{L}\p{N}_ .-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16);
    if (clean.length >= 3) s.name = clean;
    $('pf-name').value = s.name;
    Game.persist();
  }

  // ======================= SETTINGS =======================================
  function openSettings() {
    fillSettings();
    $('set-note').textContent = '';
    $('settings').classList.remove('hidden');
  }
  function fillSettings() {
    const s = S();
    setToggle('set-sfx', Sounds.sfxOn());
    setToggle('set-music', Sounds.musicOn());
    setToggle('set-vibe', s.settings.vibrate);
    setToggle('set-notify', s.settings.notify && window.Notification && Notification.permission === 'granted');
    const a = Account.status();
    $('acct-kind').textContent = (a.icon ? a.icon + ' ' : '') + a.kind;
    $('acct-name').textContent = a.name;
    $('acct-name').classList.toggle('linked', a.linked);
  }
  function setToggle(id, on) { $(id).classList.toggle('on', !!on); $(id).setAttribute('aria-pressed', on ? 'true' : 'false'); }
  function toggleNotify() {
    const s = S();
    const note = $('set-note');
    if (s.settings.notify) { s.settings.notify = false; Game.persist(); fillSettings(); return; }
    if (!window.Notification) {
      note.textContent = 'This browser can’t show notifications. On iPhone, add the game to your Home Screen first.';
      return;
    }
    Notification.requestPermission().then(function (p) {
      s.settings.notify = p === 'granted';
      Game.persist();
      fillSettings();
      note.textContent = p === 'granted' ? 'We’ll tell you when your lives are full.' : 'Notifications are blocked — allow them in your phone’s settings.';
    });
  }
  function restore() {
    Pay.restore(function (items, msg) {
      const s = S();
      if (items.indexOf('remove_ads') >= 0 && !s.noAds) { s.noAds = true; Game.persist(); }
      notice('🔄', 'RESTORE PURCHASES', s.noAds ? 'Remove ads is active. ' + msg : msg);
    });
  }
  function openHelp() {
    const box = $('support-box');
    box.innerHTML = '';
    if (SUPPORT_EMAIL) {
      const a = document.createElement('a');
      a.className = 'wide-btn'; a.href = 'mailto:' + SUPPORT_EMAIL + '?subject=' + encodeURIComponent('Code Quest help');
      a.textContent = '✉️ EMAIL SUPPORT';
      box.appendChild(a);
    }
    $('help-close').textContent = 'GOT IT';
    $('settings').classList.add('hidden');
    $('help').classList.remove('hidden');
  }

  // ======================= SHOP ===========================================
  function buildShop() {
    const list = $('shop-list');
    list.innerHTML = '';
    const s = S();
    function row(icon, title, sub, btnText, cls, onBuy, tag) {
      const r = document.createElement('div');
      r.className = 'shop-row ' + (cls || '');
      const i = document.createElement('div'); i.className = 'shop-icon';
      if (typeof icon === 'number') {                 // a pile of gold coins
        i.classList.add('pile', 'p' + icon);
        for (let k = 0; k < icon; k++) { const c = document.createElement('i'); c.className = 'coin'; i.appendChild(c); }
      } else i.textContent = icon;
      const t = document.createElement('div'); t.className = 'shop-name';
      const b1 = document.createElement('b'); b1.textContent = title; t.appendChild(b1);
      if (sub) { const sm = document.createElement('small'); sm.textContent = sub; t.appendChild(sm); }
      const b = document.createElement('button'); b.className = 'price-btn'; coinText(b, btnText); b.onclick = onBuy;
      if (tag) { const tg = document.createElement('span'); tg.className = 'tag'; tg.textContent = tag; r.appendChild(tg); }
      r.appendChild(i); r.appendChild(t); r.appendChild(b);
      list.appendChild(r);
      return b;
    }
    row('🎬', '+' + Game.AD_COINS + ' coins', '', '▶ FREE', 'free', watchAdForCoins);
    PRODUCTS.forEach(function (p) {
      if (p.coins) {
        row(p.coins >= 10000 ? 3 : p.coins >= 5000 ? 2 : 1, p.coins.toLocaleString() + ' coins', '', Prices.local(p.usd), '',
            function () { buy(p); }, p.tag);
      } else if (p.noAds) {
        const b = row('🚫', 'Remove ads', '',
                      s.noAds ? 'OWNED ✓' : Prices.local(p.usd), 'noads', function () { if (!S().noAds) buy(p); });
        b.disabled = s.noAds;
      }
    });
    const hb = row('💡', Game.HINT_PACK_SIZE + ' hints', '', Game.HINT_PACK_PRICE + ' 🪙', 'coin-buy', function () {
      if (Game.buyHints()) { Sounds.play('hint'); Game.toast('+' + Game.HINT_PACK_SIZE + ' hints!'); update(); }
    });
    hb.dataset.cost = Game.HINT_PACK_PRICE;
    const lb = row('❤️', 'Refill lives', '', Game.LIFE_REFILL_PRICE.toLocaleString() + ' 🪙', 'coin-buy', refill);
    lb.dataset.cost = Game.LIFE_REFILL_PRICE; lb.dataset.lives = 1;
    refreshShop();
  }
  function refreshShop() {
    const s = S();
    document.querySelectorAll('#shop-list .price-btn[data-cost]').forEach(function (b) {
      b.disabled = s.coins < +b.dataset.cost || (b.dataset.lives && s.lives >= Game.LIVES_MAX);
    });
  }
  function buy(p) {
    Pay.buy(p, function (ok, msg) {
      if (!ok) { notice('🛒', 'COMING SOON', msg); return; }
      const s = S();
      if (p.coins) { Game.addCoins(p.coins); notice('🪙', '+' + p.coins.toLocaleString() + ' 🪙', msg); }
      if (p.noAds) { s.noAds = true; Game.persist(); notice('🚫', 'ADS REMOVED', msg); }
      Sounds.play('correct');
      buildShop(); update();
    });
  }
  function notice(icon, title, text) {
    coinText($('nt-icon'), icon); coinText($('nt-title'), title); $('nt-text').textContent = text;
    $('notice').classList.remove('hidden');
  }

  // ======================= LEADERBOARD ====================================
  function buildRanks() {
    const s = S();
    const body = $('ranks-body');
    body.innerHTML = '';
    const me = document.createElement('div'); me.className = 'rank-me';
    const pic = document.createElement('div'); pic.className = 'pfp'; avatarHTML(pic, s.avatar);
    const who = document.createElement('div'); who.className = 'rank-who';
    const n = document.createElement('b'); n.textContent = s.name; who.appendChild(n);
    const sm = document.createElement('small'); sm.textContent = 'LEVEL ' + s.level + ' · ⭐ ' + s.stars; who.appendChild(sm);
    me.appendChild(pic); me.appendChild(who);
    body.appendChild(me);
    const stats = document.createElement('div'); stats.className = 'rank-stats';
    [['🔓', s.wins, 'escapes'], ['⭐', s.stars, 'stars'], ['🏆', s.level, 'level']].forEach(function (x) {
      const d = document.createElement('div');
      d.innerHTML = '<i></i><b></b><span></span>';
      d.children[0].textContent = x[0]; d.children[1].textContent = x[1]; d.children[2].textContent = x[2];
      stats.appendChild(d);
    });
    body.appendChild(stats);
    const soon = document.createElement('div'); soon.className = 'rank-soon';
    soon.innerHTML = '<div class="m-big">🌍</div><b>WORLD RANKINGS COMING SOON</b>';
    body.appendChild(soon);
  }

  // ======================= LITTLE HELPERS =================================
  function buzz(p) {
    if (!S().settings.vibrate || !navigator.vibrate) return;
    try { navigator.vibrate(p); } catch (e) { /* not supported */ }
  }

  // ======================= START ==========================================
  function init() {
    document.querySelectorAll('#nav button').forEach(function (b) {
      b.onclick = function () {
        const go = b.dataset.go;
        if (go === 'home') home();
        else if (screen === 'home') show(go);
        else show(go, true);
      };
    });
    $('play-btn').onclick = play;
    $('home-ad').onclick = watchAdForCoins;
    $('home-lives').onclick = livesModal;
    $('pfp-btn').onclick = openProfile;
    $('daily-btn').onclick = openDaily;
    $('dl-close').onclick = function () { $('daily').classList.add('hidden'); };
    $('settings-btn').onclick = openSettings;
    $('lm-refill').onclick = refill;
    $('lm-close').onclick = function () { $('lives-modal').classList.add('hidden'); };
    $('pf-name').addEventListener('change', saveName);
    $('pf-name').addEventListener('keydown', function (e) { if (e.key === 'Enter') { saveName(); $('pf-name').blur(); } });
    $('pf-done').onclick = function () { saveName(); $('profile').classList.add('hidden'); update(); };
    $('set-sfx').onclick = function () { Sounds.setSfx(!Sounds.sfxOn()); fillSettings(); };
    $('set-music').onclick = function () { Sounds.setMusic(!Sounds.musicOn()); fillSettings(); };
    $('set-vibe').onclick = function () { const s = S(); s.settings.vibrate = !s.settings.vibrate; Game.persist(); fillSettings(); buzz(30); };
    $('set-notify').onclick = toggleNotify;
    $('set-restore').onclick = restore;
    $('set-help').onclick = openHelp;
    $('set-close').onclick = function () { $('settings').classList.add('hidden'); };
    $('nt-ok').onclick = function () { $('notice').classList.add('hidden'); };
    Prices.refresh(function () { if (screen === 'shop') buildShop(); });
    Account.signIn(function () { if (!$('settings').classList.contains('hidden')) fillSettings(); });
    // the free-life clock keeps running while the phone is away
    document.addEventListener('visibilitychange', function () { if (!document.hidden) update(); });
    splash();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { home: home, show: show, livesModal: livesModal, livesChanged: livesChanged, buzz: buzz, update: update };
})();
