// Keeps the game working offline once it has been opened.
// Change VERSION whenever you change a file, so phones fetch the new one.
const VERSION = 'ctcm-8';
const FILES = [
  './', 'index.html', 'style.css?v=8', 'sounds.js?v=8', 'ads.js?v=8', 'account.js?v=8', 'shop.js?v=8', 'game.js?v=8', 'app.js?v=8',
  'manifest.json', 'art/splash.jpg', 'art/wood.jpg', 'art/coin.svg',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'pictures/1.jpg', 'pictures/2.jpg', 'pictures/3.jpg', 'pictures/4.jpg', 'pictures/5.jpg'
];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(function (hit) {
    return hit || fetch(e.request);
  }));
});
// tapping a "lives are full" notification opens the game
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(function (list) {
    if (list.length) return list[0].focus();
    return self.clients.openWindow('./');
  }));
});
