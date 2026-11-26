// Keeps the game working offline once it has been opened.
// Change VERSION whenever you change a file, so phones fetch the new one.
const VERSION = 'ctcm-4';
const FILES = [
  './', 'index.html', 'style.css?v=4', 'sounds.js?v=4', 'game.js?v=4', 'manifest.json',
  'icons/icon-192.png', 'icons/icon-512.png',
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
