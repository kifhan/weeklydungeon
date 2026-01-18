import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '../firebase';

let messaging: Messaging | null = null;

// Initialize FCM messaging
export async function initializeFCM(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  
  try {
    if ('serviceWorker' in navigator) {
      messaging = getMessaging();
      return messaging;
    }
  } catch (error) {
    console.warn('FCM initialization failed:', error);
  }
  return null;
}

// Request notification permission and get token
export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.warn('Notification permission denied');
    return null;
  }

  try {
    const messagingInstance = await initializeFCM();
    if (!messagingInstance) {
      return null;
    }

    // Get FCM VAPID key from Firebase config (you'll need to add this)
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn('VAPID key not configured');
      return null;
    }

    // Ensure the service worker is registered
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const token = await getToken(messagingInstance, { vapidKey, serviceWorkerRegistration: registration });
    if (token) {
      // Register token with backend
      const user = auth.currentUser;
      if (user) {
        const functions = getFunctions();
        const registerToken = httpsCallable(functions, 'registerNotificationToken');
        await registerToken({ uid: user.uid, token, platform: 'web' });
      }
      return token;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
  }
  return null;
}

// Listen for foreground messages
export function setupForegroundMessageHandler(callback: (payload: any) => void) {
  if (typeof window === 'undefined') return;
  
  initializeFCM().then((messagingInstance) => {
    if (messagingInstance) {
      onMessage(messagingInstance, (payload) => {
        callback(payload);
      });
    }
  });
}
