import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Message } from '../types';

const DB_NAME = 'UlfhaSyncDB';
const DB_VERSION = 1;
const STORE_NAME = 'pending_messages';

let dbInstance: IDBDatabase | null = null;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = (event: any) => {
      dbInstance = event.target.result;
      resolve(dbInstance!);
    };
    request.onerror = (event: any) => {
      reject(event.target.error);
    };
  });
};

export const queuePendingMessage = async (msg: Message): Promise<number> => {
  try {
    const idb = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = idb.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // Store the message copy with status 'sent' or 'pending'
      const pendingData = {
        ...msg,
        // Replace firestore serverTimestamp with a placeholder to avoid serialization failure
        timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
        isPendingSync: true,
      };

      const request = store.add(pendingData);
      request.onsuccess = () => {
        resolve(request.result as number);
        // Also dispatch a custom event to notify components that queue changed
        window.dispatchEvent(new CustomEvent('ulfha_pending_queue_changed'));

        // Try to register Background Sync with Service Worker
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          navigator.serviceWorker.ready.then((reg: any) => {
            return reg.sync.register('sync-messages');
          }).catch((err) => {
            console.warn('Background sync registration failed inside queuePendingMessage:', err);
          });
        }
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (e) {
    console.error('IndexedDB queuePendingMessage failed, falling back to localStorage:', e);
    const queue = JSON.parse(localStorage.getItem('msg_queue') || '[]');
    queue.push(msg);
    localStorage.setItem('msg_queue', JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('ulfha_pending_queue_changed'));
    return Date.now();
  }
};

export const getPendingMessages = async (): Promise<any[]> => {
  try {
    const idb = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = idb.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (e) {
    console.error('IndexedDB getPendingMessages failed, falling back to localStorage:', e);
    return JSON.parse(localStorage.getItem('msg_queue') || '[]');
  }
};

export const deletePendingMessage = async (id: number): Promise<void> => {
  try {
    const idb = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = idb.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => {
        resolve();
        window.dispatchEvent(new CustomEvent('ulfha_pending_queue_changed'));
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (e) {
    console.error('IndexedDB deletePendingMessage failed:', e);
  }
};

const MAX_RETRIES = 3;

const retryOperation = async (operation: () => Promise<any>, retries: number): Promise<any> => {
  try {
    return await operation();
  } catch (err) {
    if (retries > 0) {
      console.warn(`Sync failed, retrying... (${retries} attempts left)`);
      // Add a small delay before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      return await retryOperation(operation, retries - 1);
    }
    throw err;
  }
};

export const syncPendingMessages = async (enrichMessageFn?: (msg: Message) => Message): Promise<void> => {
  if (!navigator.onLine) return;
  
  window.dispatchEvent(new CustomEvent('ulfha_sync_started'));
  
  // 1. Sync IndexedDB messages
  try {
    const pending = await getPendingMessages();
    if (pending.length > 0) {
      console.log(`Syncing ${pending.length} pending messages from IndexedDB...`);
      for (const item of pending) {
        const { id, isPendingSync, ...msgToSend } = item;
        try {
          const processedMsg = {
            ...msgToSend,
            timestamp: serverTimestamp(),
          };
          const enriched = enrichMessageFn ? enrichMessageFn(processedMsg as Message) : processedMsg;
          
          await retryOperation(() => addDoc(collection(db, 'messages'), enriched), MAX_RETRIES);
          await deletePendingMessage(id);
          window.dispatchEvent(new CustomEvent('ulfha_sync_progress', { detail: { processed: 1 } }));
        } catch (err) {
          console.error('Failed to sync individual message from IndexedDB after retries:', err);
        }
      }
    }
  } catch (e) {
    console.error('IndexedDB sync failed:', e);
    window.dispatchEvent(new CustomEvent('ulfha_sync_failed'));
  }

  // 2. Sync localStorage fallback messages
  try {
    const queueStr = localStorage.getItem('msg_queue');
    if (queueStr) {
      const queue = JSON.parse(queueStr);
      if (queue.length > 0) {
        console.log(`Syncing ${queue.length} pending messages from localStorage...`);
        const remaining: any[] = [];
        for (const msg of queue) {
          try {
            const processedMsg = {
              ...msg,
              timestamp: serverTimestamp(),
            };
            const enriched = enrichMessageFn ? enrichMessageFn(processedMsg as Message) : processedMsg;
            
            await retryOperation(() => addDoc(collection(db, 'messages'), enriched), MAX_RETRIES);
            window.dispatchEvent(new CustomEvent('ulfha_sync_progress', { detail: { processed: 1 } }));
          } catch (err) {
            console.error('Failed to sync individual message from localStorage after retries:', err);
            remaining.push(msg);
          }
        }
        if (remaining.length > 0) {
          localStorage.setItem('msg_queue', JSON.stringify(remaining));
        } else {
          localStorage.removeItem('msg_queue');
        }
        window.dispatchEvent(new CustomEvent('ulfha_pending_queue_changed'));
      }
    }
  } catch (e) {
    console.error('localStorage sync failed:', e);
  }
  
  window.dispatchEvent(new CustomEvent('ulfha_sync_completed'));
};
