/* ==========================================================================
   ACCOUNT - automatic sign-in with the phone's own account
   --------------------------------------------------------------------------
   iPhone / iPad : Apple Game Center (the player's Apple ID)
   Android       : Google Play Games (the player's Google account)

   This needs the store version of the game (the web game wrapped with
   Capacitor) plus the plugin "@openforge/capacitor-game-connect".
   In there the player is signed in silently when the game starts, and
   "Restore purchases" asks the App Store / Google Play for everything bought
   with that same account.
   In a normal web browser there is no Apple or Google account to read, so
   the player plays as a guest (progress is kept on the phone).
   ========================================================================== */
'use strict';

const Account = (function () {
  const ua = navigator.userAgent || '';
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const platform = ios ? 'apple' : android ? 'google' : 'web';
  const KEY = 'ctcm-account';

  let user = null;
  try { user = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { /* ignore */ }

  function isNative() { return !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()); }
  function plugin() { return window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.CapacitorGameConnect; }

  // silent sign-in when the game starts; done(user or null)
  function signIn(done) {
    const p = isNative() && plugin();
    if (!p) { if (done) done(user); return; }
    p.signIn().then(function (r) {
      user = { provider: platform, id: r && r.player_id, name: r && r.player_name };
      try { localStorage.setItem(KEY, JSON.stringify(user)); } catch (e) { /* ignore */ }
      if (done) done(user);
    }).catch(function () { if (done) done(null); });
  }

  // what the settings show: icon, account type, signed-in name or status
  function status() {
    const kind = platform === 'google' ? 'Google Play' : platform === 'apple' ? 'Apple ID' : 'Account';
    const icon = platform === 'google' ? '▶️' : platform === 'apple' ? '' : '👤';
    if (user && user.id) return { icon: icon, kind: kind, name: user.name || 'Signed in', linked: true };
    return { icon: icon, kind: kind, name: 'Guest', linked: false };
  }

  return { platform: platform, isNative: isNative, signIn: signIn, status: status, user: function () { return user; } };
})();
