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

// PWA requirement: Cache assets for offline use
const CACHE_NAME = 'ulfha-chat-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/logo.png',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use Map to avoid duplicate failures or cache gracefully
      return Promise.all(
        ASSETS_TO_CACHE.map(url => {
          return cache.add(url).catch(err => {
            console.warn('[Service Worker] Failed to pre-cache asset:', url, err);
          });
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  
  // Exclude API requests
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request).then((fetchResponse) => {
      // Network success! Cache it and return.
      if (fetchResponse && fetchResponse.status === 200 && event.request.url.startsWith('http')) {
        const responseClone = fetchResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone).catch(err => {
            console.warn('[Service Worker] Failed to put in cache:', err);
          });
        }).catch(err => {
          console.warn('[Service Worker] Failed to open cache:', err);
        });
      }
      return fetchResponse;
    }).catch(() => {
      // Network failed! Fallback to cache
      return caches.match(event.request).then((response) => {
        if (response) return response;
        // Fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
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
