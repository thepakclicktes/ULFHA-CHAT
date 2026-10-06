import { useState, useEffect, useCallback } from 'react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePush(userId?: string | null) {
  const [supported, setSupported] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
      setSupported(true);
      setPermission(Notification.permission);
    } else {
      setSupported(false);
      setLoading(false);
    }
  }, []);

  const checkSubscription = useCallback(async () => {
    if (!supported) return;
    try {
      setLoading(true);
      let registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
      }
      const existingSub = await registration.pushManager.getSubscription();
      setSubscribed(!!existingSub);
      setPermission(Notification.permission);

      if (existingSub && Notification.permission === 'granted') {
        // Silently refresh subscription on backend
        fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: existingSub.toJSON(),
            ua: navigator.userAgent,
            userId: userId || null
          })
        }).catch(err => console.warn('Push sync error:', err));
      }
    } catch (err) {
      console.warn('Check push subscription failed:', err);
    } finally {
      setLoading(false);
    }
  }, [supported, userId]);

  useEffect(() => {
    if (supported) {
      checkSubscription();
    }
  }, [supported, checkSubscription]);

  const subscribe = async () => {
    if (!supported) {
      alert('Push notifications are not supported on this device/browser.');
      return false;
    }

    try {
      setLoading(true);
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        setLoading(false);
        return false;
      }

      // Register SW
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Get VAPID Public Key
      const keyRes = await fetch('/api/push/public-key');
      const keyData = await keyRes.json();
      const rawKey = keyData.key || keyData.publicKey;

      if (!rawKey) {
        throw new Error('VAPID public key not found on server');
      }

      const applicationServerKey = urlBase64ToUint8Array(rawKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      // Send to backend
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          ua: navigator.userAgent,
          userId: userId || null
        })
      });

      if (res.ok) {
        setSubscribed(true);
        setLoading(false);
        return true;
      } else {
        throw new Error('Failed to save push subscription on server');
      }
    } catch (err: any) {
      console.error('Push subscribe error:', err);
      setLoading(false);
      return false;
    }
  };

  const unsubscribe = async () => {
    if (!supported) return false;
    try {
      setLoading(true);
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (registration) {
        const sub = await registration.pushManager.getSubscription();
        if (sub) {
          const endpoint = sub.endpoint;
          await sub.unsubscribe();
          await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint })
          });
        }
      }
      setSubscribed(false);
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Push unsubscribe error:', err);
      setLoading(false);
      return false;
    }
  };

  return {
    supported,
    permission,
    subscribed,
    loading,
    subscribe,
    unsubscribe
  };
}
