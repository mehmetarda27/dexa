const CACHE_NAME = 'dexa-shell-v1';
const APP_SHELL = ['/', '/login', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then((cached) => cached || caches.match('/login'))));
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Dexa bildirimi', body: event.data?.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Dexa bildirimi', {
      body: payload.body || payload.message || 'Yeni bildirim var.',
      icon: '/icons/icon-192.svg',
      badge: '/icons/icon-192.svg',
      data: { url: payload.url || '/courier/dashboard' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/courier/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        return existing.navigate(url);
      }
      return self.clients.openWindow(url);
    }),
  );
});
