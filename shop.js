/* ==========================================================================
   SHOP - products, local-currency prices and purchases
   --------------------------------------------------------------------------
   PRICES: set in US dollars below. Each player sees them in their own
   currency, rounded UP to end in .49 or .99 (7.53 -> 7.99, 1.31 -> 1.49).
   Currencies without cents (yen, won...) end in 9 instead (312 -> 319).
   Exchange rates come from open.er-api.com (free, refreshed once a day);
   if that can't be reached the built-in rates below are used.

   PAYMENTS: not connected yet. While PAYMENTS_LIVE is false:
     - on the live site, "buy" explains that purchases open soon
     - on your own computer (localhost) a TEST purchase is given for free,
       so you can try the shop
   To take real money the game needs a payment provider. In the store
   version (see account.js) that is Apple / Google billing, e.g. with the
   plugin "cordova-plugin-purchase"; purchases then belong to the player's
   Apple ID or Google account, which is what "Restore purchases" uses.
   ========================================================================== */
const PRODUCTS = [
  { id: 'coins_1000',  coins: 1000,  usd: 1.99 },
  { id: 'coins_5000',  coins: 5000,  usd: 7.99,  tag: 'POPULAR' },
  { id: 'coins_10000', coins: 10000, usd: 13.99, tag: 'BEST VALUE' },
  { id: 'remove_ads',  noAds: true,  usd: 7.99 }
];
const PAYMENTS_LIVE = false;

// Used only when the live exchange rates can't be loaded (units per 1 US dollar).
const FALLBACK_RATES = {
  USD: 1, EUR: 0.92, GBP: 0.79, AED: 3.6725, SAR: 3.75, QAR: 3.64, KWD: 0.307, BHD: 0.376, OMR: 0.385,
  JOD: 0.709, EGP: 48.5, PKR: 280, INR: 84, BDT: 120, LKR: 300, NPR: 134, CAD: 1.37, AUD: 1.52, NZD: 1.68,
  JPY: 150, KRW: 1380, CNY: 7.2, HKD: 7.8, SGD: 1.34, MYR: 4.45, IDR: 15800, PHP: 57, THB: 35, VND: 25400,
  TRY: 34, ZAR: 18.3, NGN: 1600, KES: 129, MAD: 9.9, CHF: 0.88, SEK: 10.6, NOK: 10.8, DKK: 6.9, PLN: 4.0,
  CZK: 23, HUF: 365, RON: 4.6, ILS: 3.7, MXN: 19.5, BRL: 5.6, ARS: 980, CLP: 940, COP: 4100, PEN: 3.75, RUB: 95, UAH: 41
};

const Prices = (function () {
  // ---- which currency does this player use? (time zone first, then language) ----
  const ZONE_CURRENCY = {
    'Asia/Dubai': 'AED', 'Asia/Riyadh': 'SAR', 'Asia/Qatar': 'QAR', 'Asia/Kuwait': 'KWD', 'Asia/Bahrain': 'BHD',
    'Asia/Muscat': 'OMR', 'Asia/Amman': 'JOD', 'Africa/Cairo': 'EGP', 'Asia/Karachi': 'PKR', 'Asia/Kolkata': 'INR',
    'Asia/Calcutta': 'INR', 'Asia/Dhaka': 'BDT', 'Asia/Colombo': 'LKR', 'Asia/Kathmandu': 'NPR', 'Europe/London': 'GBP',
    'Europe/Dublin': 'EUR', 'America/Toronto': 'CAD', 'America/Vancouver': 'CAD', 'America/Edmonton': 'CAD',
    'America/Winnipeg': 'CAD', 'America/Halifax': 'CAD', 'Asia/Tokyo': 'JPY', 'Asia/Seoul': 'KRW', 'Asia/Shanghai': 'CNY',
    'Asia/Hong_Kong': 'HKD', 'Asia/Singapore': 'SGD', 'Asia/Kuala_Lumpur': 'MYR', 'Asia/Jakarta': 'IDR', 'Asia/Manila': 'PHP',
    'Asia/Bangkok': 'THB', 'Asia/Ho_Chi_Minh': 'VND', 'Asia/Saigon': 'VND', 'Europe/Istanbul': 'TRY',
    'Africa/Johannesburg': 'ZAR', 'Africa/Lagos': 'NGN', 'Africa/Nairobi': 'KES', 'Africa/Casablanca': 'MAD',
    'Europe/Zurich': 'CHF', 'Europe/Stockholm': 'SEK', 'Europe/Oslo': 'NOK', 'Europe/Copenhagen': 'DKK', 'Europe/Warsaw': 'PLN',
    'Europe/Prague': 'CZK', 'Europe/Budapest': 'HUF', 'Europe/Bucharest': 'RON', 'Asia/Jerusalem': 'ILS', 'Asia/Tel_Aviv': 'ILS',
    'America/Mexico_City': 'MXN', 'America/Sao_Paulo': 'BRL', 'America/Argentina/Buenos_Aires': 'ARS', 'America/Buenos_Aires': 'ARS',
    'America/Santiago': 'CLP', 'America/Bogota': 'COP', 'America/Lima': 'PEN', 'Europe/Moscow': 'RUB', 'Europe/Kiev': 'UAH',
    'Europe/Kyiv': 'UAH', 'Pacific/Auckland': 'NZD'
  };
  const REGION_CURRENCY = {
    US: 'USD', GB: 'GBP', AE: 'AED', SA: 'SAR', QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR', JO: 'JOD', EG: 'EGP', PK: 'PKR',
    IN: 'INR', BD: 'BDT', LK: 'LKR', NP: 'NPR', CA: 'CAD', AU: 'AUD', NZ: 'NZD', JP: 'JPY', KR: 'KRW', CN: 'CNY', HK: 'HKD',
    SG: 'SGD', MY: 'MYR', ID: 'IDR', PH: 'PHP', TH: 'THB', VN: 'VND', TR: 'TRY', ZA: 'ZAR', NG: 'NGN', KE: 'KES', MA: 'MAD',
    CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON', IL: 'ILS', MX: 'MXN', BR: 'BRL',
    AR: 'ARS', CL: 'CLP', CO: 'COP', PE: 'PEN', RU: 'RUB', UA: 'UAH',
    DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR', IE: 'EUR', PT: 'EUR', FI: 'EUR', GR: 'EUR',
    SK: 'EUR', SI: 'EUR', LT: 'EUR', LV: 'EUR', EE: 'EUR', LU: 'EUR', MT: 'EUR', CY: 'EUR', HR: 'EUR'
  };
  function detect() {
    let zone = '';
    try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* old browser */ }
    if (ZONE_CURRENCY[zone]) return ZONE_CURRENCY[zone];
    if (zone.indexOf('Australia/') === 0) return 'AUD';
    if (zone.indexOf('Europe/') === 0) return 'EUR';
    if (zone.indexOf('America/') === 0) {
      const langs = navigator.languages || [navigator.language || ''];
      for (const l of langs) { const r = (l.split('-')[1] || '').toUpperCase(); if (REGION_CURRENCY[r]) return REGION_CURRENCY[r]; }
      return 'USD';
    }
    const langs = navigator.languages || [navigator.language || ''];
    for (const l of langs) { const r = (l.split('-')[1] || '').toUpperCase(); if (REGION_CURRENCY[r]) return REGION_CURRENCY[r]; }
    return 'USD';
  }

  const RATE_KEY = 'ctcm-rates';
  let currency = detect();
  let rates = FALLBACK_RATES;
  try {
    const saved = JSON.parse(localStorage.getItem(RATE_KEY) || 'null');
    if (saved && saved.rates) rates = Object.assign({}, FALLBACK_RATES, saved.rates);
  } catch (e) { /* ignore */ }
  if (!rates[currency]) currency = 'USD';

  // refresh the rates once a day
  function refresh(onDone) {
    let fresh = false;
    try { const s = JSON.parse(localStorage.getItem(RATE_KEY) || 'null'); fresh = s && Date.now() - s.at < 864e5; } catch (e) { /* ignore */ }
    if (fresh || !window.fetch) return;
    fetch('https://open.er-api.com/v6/latest/USD').then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.rates) return;
      rates = Object.assign({}, FALLBACK_RATES, j.rates);
      try { localStorage.setItem(RATE_KEY, JSON.stringify({ at: Date.now(), rates: j.rates })); } catch (e) { /* ignore */ }
      if (onDone) onDone();
    }).catch(function () { /* offline: keep the built-in rates */ });
  }

  function decimals(cur) {
    try { return new Intl.NumberFormat('en', { style: 'currency', currency: cur }).resolvedOptions().maximumFractionDigits; }
    catch (e) { return 2; }
  }

  // round UP to .49 / .99 (or to ...9 for currencies without cents)
  function charm(x, cur) {
    if (cur === 'USD') return x;
    if (decimals(cur) === 0) {
      const step = Math.max(10, Math.pow(10, Math.floor(Math.log10(Math.max(x, 1))) - 1));
      return Math.ceil((x + 1) / step) * step - 1;
    }
    const whole = Math.floor(x);
    const cents = Math.round((x - whole) * 100);
    if (cents === 0) return whole - 0.01;          // exactly 7.00 -> 6.99
    if (cents <= 49) return whole + 0.49;
    return whole + 0.99;
  }

  function format(amount, cur) {
    const dp = decimals(cur) === 0 ? 0 : 2;
    try {
      return new Intl.NumberFormat(navigator.language || 'en', {
        style: 'currency', currency: cur, minimumFractionDigits: dp, maximumFractionDigits: dp
      }).format(amount);
    } catch (e) { return cur + ' ' + amount.toFixed(dp); }
  }

  // "AED 7.99" etc. for a price given in US dollars
  function local(usd) {
    const rate = rates[currency] || 1;
    return format(charm(usd * rate, currency), currency);
  }

  return { local: local, refresh: refresh, currency: function () { return currency; }, _charm: charm,
           _set: function (c) { if (rates[c]) currency = c; } };
})();

const Pay = (function () {
  const testing = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  // done(ok, message)
  function buy(product, done) {
    if (PAYMENTS_LIVE) { /* connect your payment provider here */ done(false, 'Payments are not connected.'); return; }
    if (testing) { done(true, 'TEST purchase (only on your computer — no money taken)'); return; }
    done(false, 'Purchases open soon! Keep playing to earn coins.');
  }
  // asks the App Store / Google Play for everything bought with the signed-in account
  function restore(done) {
    const st = window.CdvPurchase && CdvPurchase.store;
    const acct = Account.status();
    if (PAYMENTS_LIVE && st && Account.isNative()) {
      st.restorePurchases().then(function () {
        const owned = PRODUCTS.filter(function (p) { return p.noAds && st.owned(p.id); }).map(function (p) { return p.id; });
        done(owned, owned.length ? 'Restored from your ' + acct.kind + '.' : 'No purchases found on your ' + acct.kind + '.');
      }).catch(function () { done([], 'Could not reach the store. Try again later.'); });
      return;
    }
    done([], acct.linked ? 'No purchases found on your ' + acct.kind + '.' : 'Nothing to restore yet.');
  }
  return { buy: buy, restore: restore, testing: testing };
})();
