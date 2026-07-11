import { Message, UserProfile } from '../types';

const DB_NAME = 'UlfhaLocalCacheDB';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

export const initLocalDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('messages')) {
        const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
        messageStore.createIndex('chatId', 'chatId', { unique: false });
        messageStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('user_profiles')) {
        db.createObjectStore('user_profiles', { keyPath: 'uid' });
      }
      
      if (!db.objectStoreNames.contains('groups_channels')) {
        db.createObjectStore('groups_channels', { keyPath: 'uid' });
      }
      
      if (!db.objectStoreNames.contains('preferences')) {
        db.createObjectStore('preferences', { keyPath: 'key' });
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

// --- MESSAGES CACHE ---
export const saveLocalMessage = async (msg: Message, chatId: string): Promise<void> => {
  try {
    const db = await initLocalDB();
    const transaction = db.transaction(['messages'], 'readwrite');
    const store = transaction.objectStore('messages');
    
    // Store message with chatId reference for easy querying
    const dataToSave = {
      ...msg,
      chatId,
      // Handle server timestamp fallback if it is a Firestore FieldValue
      timestamp: msg.timestamp && typeof msg.timestamp === 'object' && 'seconds' in msg.timestamp
        ? msg.timestamp
        : { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
    };
    
    store.put(dataToSave);
  } catch (e) {
    console.error('saveLocalMessage failed:', e);
  }
};

export const saveLocalMessages = async (msgs: Message[], chatId: string): Promise<void> => {
  try {
    const db = await initLocalDB();
    const transaction = db.transaction(['messages'], 'readwrite');
    const store = transaction.objectStore('messages');
    
    msgs.forEach((msg) => {
      if (!msg.id) return;
      const dataToSave = {
        ...msg,
        chatId,
        timestamp: msg.timestamp && typeof msg.timestamp === 'object' && 'seconds' in msg.timestamp
          ? msg.timestamp
          : { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
      };
      store.put(dataToSave);
    });
  } catch (e) {
    console.error('saveLocalMessages failed:', e);
  }
};

export const getLocalMessagesForChat = async (chatId: string): Promise<Message[]> => {
  try {
    const db = await initLocalDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['messages'], 'readonly');
      const store = transaction.objectStore('messages');
      const index = store.index('chatId');
      const request = index.getAll(IDBKeyRange.only(chatId));
      
      request.onsuccess = () => {
        const results = request.result as any[];
        // Sort chronologically (oldest to newest)
        results.sort((a, b) => {
          const tA = (a.timestamp?.seconds || 0) * 1000 + Math.floor((a.timestamp?.nanoseconds || 0) / 1000000);
          const tB = (b.timestamp?.seconds || 0) * 1000 + Math.floor((b.timestamp?.nanoseconds || 0) / 1000000);
          return tA - tB;
        });
        resolve(results);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (e) {
    console.error('getLocalMessagesForChat failed:', e);
    return [];
  }
};

// --- USER PROFILES CACHE ---
export const saveCachedUserProfile = async (profile: UserProfile): Promise<void> => {
  try {
    const db = await initLocalDB();
    const transaction = db.transaction(['user_profiles'], 'readwrite');
    const store = transaction.objectStore('user_profiles');
    store.put(profile);
  } catch (e) {
    console.error('saveCachedUserProfile failed:', e);
  }
};

export const saveCachedUserProfiles = async (profiles: UserProfile[]): Promise<void> => {
  try {
    const db = await initLocalDB();
    const transaction = db.transaction(['user_profiles'], 'readwrite');
    const store = transaction.objectStore('user_profiles');
    profiles.forEach((profile) => {
      if (profile.uid) {
        store.put(profile);
      }
    });
  } catch (e) {
    console.error('saveCachedUserProfiles failed:', e);
  }
};

export const getAllCachedUserProfiles = async (): Promise<UserProfile[]> => {
  try {
    const db = await initLocalDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['user_profiles'], 'readonly');
      const store = transaction.objectStore('user_profiles');
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (e) {
    console.error('getAllCachedUserProfiles failed:', e);
    return [];
  }
};

// --- GROUPS & CHANNELS CACHE ---
export const saveCachedGroupOrChannel = async (item: any): Promise<void> => {
  try {
    const db = await initLocalDB();
    const transaction = db.transaction(['groups_channels'], 'readwrite');
    const store = transaction.objectStore('groups_channels');
    store.put(item);
  } catch (e) {
    console.error('saveCachedGroupOrChannel failed:', e);
  }
};

export const saveCachedGroupsAndChannels = async (items: any[]): Promise<void> => {
  try {
    const db = await initLocalDB();
    const transaction = db.transaction(['groups_channels'], 'readwrite');
    const store = transaction.objectStore('groups_channels');
    items.forEach((item) => {
      if (item.uid) {
        store.put(item);
      }
    });
  } catch (e) {
    console.error('saveCachedGroupsAndChannels failed:', e);
  }
};

export const getAllCachedGroupsAndChannels = async (): Promise<any[]> => {
  try {
    const db = await initLocalDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['groups_channels'], 'readonly');
      const store = transaction.objectStore('groups_channels');
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (e) {
    console.error('getAllCachedGroupsAndChannels failed:', e);
    return [];
  }
};

// --- PREFERENCES CACHE ---
export const saveLocalPreference = async (key: string, value: any): Promise<void> => {
  try {
    const db = await initLocalDB();
    const transaction = db.transaction(['preferences'], 'readwrite');
    const store = transaction.objectStore('preferences');
    store.put({ key, value });
  } catch (e) {
    console.error('saveLocalPreference failed:', e);
  }
};

export const getLocalPreference = async (key: string): Promise<any | null> => {
  try {
    const db = await initLocalDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['preferences'], 'readonly');
      const store = transaction.objectStore('preferences');
      const request = store.get(key);
      
      request.onsuccess = () => {
        resolve(request.result ? request.result.value : null);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (e) {
    console.error('getLocalPreference failed:', e);
    return null;
  }
};
