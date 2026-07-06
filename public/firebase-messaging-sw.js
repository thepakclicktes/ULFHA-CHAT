importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

const firebaseConfig = {
  projectId: "ulfhachat",
  appId: "1:684407740624:web:cb4aa9ccf5f935999766d5",
  apiKey: "AIzaSyBo0Ml2F90R0Sw3zw2XjiE99N78joBXQJM",
  authDomain: "ulfhachat.firebaseapp.com",
  storageBucket: "ulfhachat.firebasestorage.app",
  messagingSenderId: "684407740624",
  measurementId: ""
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'https://storage.googleapis.com/test-media-objects/643ljz7fuma5cdqt7xpc5p/75971609428/7f8a7065-27a3-4903-8898-d142b655da03.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.', event);
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.warn('Failed to parse push data as JSON, using text:', event.data.text());
      data = { notification: { title: 'Ulfah Chat', body: event.data.text() } };
    }
  }

  const notification = data.notification || {};
  const title = notification.title || 'Ulfah Chat';
  const options = {
    body: notification.body || 'New notification received',
    icon: notification.icon || 'https://img.icons8.com/deco/200/000000/mosque.png',
    badge: notification.badge || 'https://img.icons8.com/deco/200/000000/mosque.png',
    data: notification.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
