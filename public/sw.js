// UlfahChat PWA Web Push Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {
    title: 'UlfahChat Notification',
    body: 'You have a new update in UlfahChat',
    icon: '/logo.png',
    badge: '/logo.png',
    url: '/'
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      if (parsed.notification) {
        data = { ...data, ...parsed.notification };
        if (parsed.notification.data) {
          data.url = parsed.notification.data.url || parsed.notification.url || data.url;
        }
      } else {
        data = { ...data, ...parsed };
      }
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'New message received',
    icon: data.icon || '/logo.png',
    badge: data.badge || '/logo.png',
    image: data.image || undefined,
    tag: data.tag || 'ulfahchat-notification',
    requireInteraction: data.requireInteraction || false,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'UlfahChat', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    fetch('/api/push/public-key')
      .then(res => res.json())
      .then(data => {
        if (!data.key && !data.publicKey) return;
        const key = data.key || data.publicKey;
        return self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key
        });
      })
      .then(subscription => {
        if (subscription) {
          return fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscription: subscription.toJSON(),
              ua: navigator.userAgent
            })
          });
        }
      })
      .catch(err => console.error('Subscription refresh error in SW:', err))
  );
});
