/* ==========================================================================
   Attera Visual - Service Worker & Web Push Notification Handler
   Supports: iOS Safari 16.4+ (PWA Standalone), macOS Safari,
             Chrome Android, Chrome Desktop, Edge, and Firefox.
   ========================================================================== */

const CACHE_NAME = 'vena-cache-v1';

// Install event - activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event - claim clients immediately so pushes can be routed
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
    ])
  );
});

// Push event handler - receives push messages even when website is closed
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Attera Visual',
    body: 'Notifikasi baru diterima.',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    url: '/',
    tag: 'vena-push-' + Date.now(),
  };

  if (event.data) {
    try {
      const json = event.data.json();
      payload = {
        title: json.title || payload.title,
        body: json.body || json.message || payload.body,
        icon: json.icon || payload.icon,
        badge: json.badge || payload.badge,
        url: json.url || json.link || payload.url,
        tag: json.tag || json.id || payload.tag,
        data: json.data || { url: json.url || json.link || '/' },
      };
    } catch (e) {
      // Plain text fallback
      const text = event.data.text();
      if (text) {
        payload.body = text;
      }
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon,
    badge: payload.badge,
    tag: payload.tag,
    renotify: true,
    requireInteraction: false,
    vibrate: [100, 50, 100],
    data: {
      url: payload.url,
      dateOfArrival: Date.now(),
    },
    actions: [
      { action: 'open', title: 'Buka Aplikasi' },
      { action: 'dismiss', title: 'Tutup' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// Notification click handler - opens or focuses existing application window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there is already a window open
      for (const client of clientList) {
        if ('focus' in client) {
          // If the open client is on the same origin, navigate and focus
          if ('navigate' in client && targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // If no window is currently open, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle push subscription change event (e.g. keys rotated by browser push service)
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then((newSubscription) => {
        // Broadcast new subscription to active windows if any
        return self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'PUSH_SUBSCRIPTION_CHANGED',
              subscription: newSubscription.toJSON(),
            });
          });
        });
      })
      .catch((err) => {
        console.warn('[SW] pushsubscriptionchange failed:', err);
      })
  );
});
