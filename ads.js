/* ==========================================================================
   ADS
   --------------------------------------------------------------------------
   Until ADSENSE_CLIENT is filled in, the game shows PLACEHOLDER ads (a grey
   banner and a 5-second "ad" screen) so you can see where and when ads appear.

   To switch on real Google ads:
     1. Get a Google AdSense account approved for the site.
     2. In AdSense, sign up for the "H5 games ads" (Ad Placement API) - that is
        what plays the double-coins ad and the level-break ads.
     3. Make a 320x50 display ad unit for the banner.
     4. Fill in the two values below, set ADS_TEST_MODE to false, and publish.
   ========================================================================== */
const ADSENSE_CLIENT = '';        // e.g. 'ca-pub-1234567890123456'
const BANNER_SLOT    = '';        // the banner ad unit's number, e.g. '1234567890'
const ADS_TEST_MODE  = true;      // true = Google shows test ads only (no earnings)
const AD_SECONDS = 30;            // a rewarded ad lasts at least this long; shorter ads are played back to back
const MAX_ADS_IN_A_ROW = 4;       // never more than this many ads for one reward
let PLACEHOLDER_AD_SECONDS = AD_SECONDS;

const Ads = (function () {
  const real = /^ca-pub-\d+$/.test(ADSENSE_CLIENT);

  if (real) {
    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + ADSENSE_CLIENT;
    s.setAttribute('data-ad-frequency-hint', '30s');
    if (ADS_TEST_MODE) s.setAttribute('data-adbreak-test', 'on');
    document.head.appendChild(s);
    window.adsbygoogle = window.adsbygoogle || [];
    window.adBreak = window.adConfig = function (o) { window.adsbygoogle.push(o); };
    window.adConfig({ preloadAdBreaks: 'on', sound: 'on' });
  }

  // ---- banner under the keypad ----
  function banner(el) {
    if (!el) return;
    // 320 x 50 is the standard mobile banner size (IAB / AdMob "BANNER")
    if (real && BANNER_SLOT) {
      const ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.cssText = 'display:inline-block;width:320px;height:50px';
      ins.setAttribute('data-ad-client', ADSENSE_CLIENT);
      ins.setAttribute('data-ad-slot', BANNER_SLOT);
      if (ADS_TEST_MODE) ins.setAttribute('data-adtest', 'on');
      el.appendChild(ins);
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { /* ad blocked */ }
    } else {
      el.innerHTML = '<div class="ad-ph">AD BANNER · 320 × 50</div>';
    }
  }

  // ---- full-screen ad between levels. done() is always called. ----
  function interstitial(done, hooks) {
    hooks = hooks || {};
    if (!real) { placeholder(false, function () { done(); }, hooks); return; }
    let started = false, finished = false;
    const end = function () { if (finished) return; finished = true; if (started && hooks.after) hooks.after(); done(); };
    window.adBreak({
      type: 'next', name: 'level_break',
      beforeAd: function () { started = true; if (hooks.before) hooks.before(); },
      afterAd: function () { if (hooks.after) hooks.after(); started = false; },
      adBreakDone: end
    });
    setTimeout(function () { if (!started) end(); }, 2500);   // no ad (or blocked): carry on
  }

  // ---- rewarded ad. done(true) only if it was watched. ----
  // If an ad is shorter than AD_SECONDS, more ads play one after the other until
  // the time is reached; then the player taps CLAIM REWARD.
  function reward(done, hooks) {
    hooks = hooks || {};
    if (!real) { placeholder(true, done, hooks); return; }
    let watched = 0, count = 0, anyViewed = false;
    if (hooks.before) hooks.before();
    function finish(ok) { if (hooks.after) hooks.after(); if (ok) claimScreen(function () { done(true); }); else done(false); }
    function one() {
      count++;
      let shown = false, viewed = false, ended = false, startAt = 0;
      const end = function () {
        if (ended) return; ended = true;
        if (viewed) { anyViewed = true; watched += (Date.now() - startAt) / 1000; }
        if (viewed && watched < AD_SECONDS && count < MAX_ADS_IN_A_ROW) { one(); return; }
        finish(anyViewed && (viewed || watched > 0));
      };
      window.adBreak({
        type: 'reward', name: 'reward_' + count,
        beforeReward: function (showAdFn) { shown = true; startAt = Date.now(); showAdFn(); },
        adViewed: function () { viewed = true; },
        adDismissed: function () { viewed = false; },
        adBreakDone: end
      });
      setTimeout(function () { if (!shown) end(); }, 2500);   // no more ads available
    }
    one();
  }

  // the screen after a rewarded ad
  function claimScreen(onClaim) {
    const box = document.createElement('div');
    box.className = 'ad-overlay';
    box.innerHTML = '<div class="ad-card"><div class="m-big">🎁</div><div class="ad-big">Reward earned!</div>' +
      '<button class="big-btn ad-close">CLAIM REWARD</button></div>';
    document.body.appendChild(box);
    box.querySelector('.ad-close').onclick = function () { box.remove(); onClaim(); };
  }

  // ---- stand-in until real ads are set up ----
  function placeholder(isReward, done, hooks) {
    if (hooks.before) hooks.before();
    const box = document.createElement('div');
    box.className = 'ad-overlay';
    box.innerHTML = '<div class="ad-card"><div class="ad-tag">AD</div>' +
      '<div class="ad-big">Your ad here</div>' +
      '<div class="ad-small">Placeholder — a real ' + (isReward ? 'rewarded' : 'full-screen') + ' ad will play here once AdSense is set up.</div>' +
      '<div class="ad-count"></div><button class="big-btn ad-close hidden"></button></div>';
    document.body.appendChild(box);
    const count = box.querySelector('.ad-count');
    const close = box.querySelector('.ad-close');
    let left = isReward ? PLACEHOLDER_AD_SECONDS : 5;   // level-break ads: 5 seconds
    count.textContent = left;
    const t = setInterval(function () {
      left--;
      if (left > 0) { count.textContent = left; return; }
      clearInterval(t);
      count.textContent = isReward ? 'Reward earned ✓' : '';
      close.textContent = isReward ? 'CLAIM REWARD' : 'CLOSE ✕';
      close.classList.remove('hidden');
    }, 1000);
    close.onclick = function () {
      box.remove();
      if (hooks.after) hooks.after();
      done(true);
    };
  }

  return { banner: banner, interstitial: interstitial, reward: reward, real: real,
           _seconds: function (n) { PLACEHOLDER_AD_SECONDS = n; } };   // testing helper
})();
