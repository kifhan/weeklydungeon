// Service Worker for Firebase Cloud Messaging
// Note: This file must be served from the root of your domain
importScripts('https://www.gstatic.com/firebasejs/12.3.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.3.0/firebase-messaging-compat.js');

// This file is served from /public (not Vite-processed), so we can't read import.meta.env here.
// Instead we import a generated script that sets `self.__FIREBASE_CONFIG__`.
importScripts('/firebase-config.js');

const firebaseConfig = self.__FIREBASE_CONFIG__;
if (!firebaseConfig) {
  throw new Error(
    'Missing Firebase config. Ensure public/firebase-config.js is generated from .env before starting.'
  );
}

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'Life Question';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.questionText || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data;
  if (data?.deliveryId) {
    // Open app and navigate to inbox
    event.waitUntil(
      clients.openWindow(`/?deliveryId=${data.deliveryId}`)
    );
  }
});
