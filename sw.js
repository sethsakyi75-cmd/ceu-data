/* Keeps the CEU data tool on the phone so it opens without internet after the first visit.
   Opening with internet fetches the newest version; without internet the kept copy is used.
   Change VERSION when the tool changes. */
var VERSION = 'ceu-data-1';
var FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
function withTimeout(p, ms) {
  return new Promise(function (ok, bad) {
    var t = setTimeout(function () { bad(new Error('slow')); }, ms);
    p.then(function (v) { clearTimeout(t); ok(v); }, function (e) { clearTimeout(t); bad(e); });
  });
}
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    /* the page: newest when there is a signal (4 seconds at most), else the kept copy */
    e.respondWith(withTimeout(fetch(req), 4000).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put('index.html', copy); }); }
      return res;
    }).catch(function () {
      return caches.match('index.html').then(function (r) { return r || caches.match('./'); });
    }));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (r) { return r || fetch(req); }));
});
