// ══════════════════════════════════════════════
// LNX Cameratrap Check — Service Worker
// Ermöglicht Offline-Nutzung der App
// ══════════════════════════════════════════════

const CACHE = 'lnx-cameratrap-v1';

// Dateien die beim ersten Laden gecacht werden
const PRECACHE = [
  './',
  './index.html',
  './LNX_Trailcam_Check.html'
];

// Installation: App-Dateien cachen
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Aktivierung: alten Cache löschen
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: Cache-First für App-Dateien, Network-First für Google Sheets
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Google Apps Script / Sheets → immer online versuchen, kein Cache
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('maps.google.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', {status: 503})));
    return;
  }

  // App-Dateien → Cache-First (offline-fähig)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Nur erfolgreiche Antworten cachen
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match('./LNX_Trailcam_Check.html'));
    })
  );
});
