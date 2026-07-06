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

// Handle FCM background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: '/logo.png', // Using local logo
    tag: 'chat'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle generic Web Push messages
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.', event);
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.warn('Failed to parse push data as JSON');
      return; // If not JSON, we don't know how to handle it
    }
  }

  const notification = data.notification || {};
  const title = notification.title || 'Ulfah Chat';
  const options = {
    body: notification.body || 'New message received',
    icon: '/logo.png', // Using local logo
    badge: '/logo.png',
    tag: notification.tag || 'chat',
    data: notification.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing window, otherwise open a new one
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
