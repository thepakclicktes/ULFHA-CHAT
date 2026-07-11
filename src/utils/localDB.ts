import Dexie, { Table } from 'dexie';
import { Message, UserProfile } from '../types';

export interface LocalMessage extends Message {
  chatId: string;
}

export class UlfhaDatabase extends Dexie {
  messages!: Table<LocalMessage, string>;
  user_profiles!: Table<UserProfile, string>;
  groups_channels!: Table<any, string>;
  preferences!: Table<{ key: string; value: any }, string>;

  constructor() {
    super('UlfhaDexieCacheDB');
    this.version(1).stores({
      messages: 'id, chatId, timestamp, type',
      user_profiles: 'uid, displayName, phoneNumber',
      groups_channels: 'uid, name',
      preferences: 'key'
    });
  }
}

export const db = new UlfhaDatabase();

// --- MESSAGES CACHE ---
export const saveLocalMessage = async (msg: Message, chatId: string): Promise<void> => {
  if (!msg.id) return;
  try {
    const dataToSave = {
      ...msg,
      chatId,
      timestamp: msg.timestamp && typeof msg.timestamp === 'object' && 'seconds' in msg.timestamp
        ? msg.timestamp
        : { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
    };
    await db.messages.put(dataToSave as LocalMessage);
  } catch (e) {
    console.error('saveLocalMessage failed:', e);
  }
};

export const saveLocalMessages = async (msgs: Message[], chatId: string): Promise<void> => {
  try {
    const dataToSave = msgs
      .filter(msg => msg.id)
      .map(msg => ({
        ...msg,
        chatId,
        timestamp: msg.timestamp && typeof msg.timestamp === 'object' && 'seconds' in msg.timestamp
          ? msg.timestamp
          : { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
      }));
    if (dataToSave.length > 0) {
      await db.messages.bulkPut(dataToSave as LocalMessage[]);
    }
  } catch (e) {
    console.error('saveLocalMessages failed:', e);
  }
};

export const getLocalMessagesForChat = async (chatId: string): Promise<Message[]> => {
  try {
    const results = await db.messages.where('chatId').equals(chatId).toArray();
    // Sort chronologically (oldest to newest)
    results.sort((a, b) => {
      const tA = (a.timestamp?.seconds || 0) * 1000 + Math.floor((a.timestamp?.nanoseconds || 0) / 1000000);
      const tB = (b.timestamp?.seconds || 0) * 1000 + Math.floor((b.timestamp?.nanoseconds || 0) / 1000000);
      return tA - tB;
    });
    return results;
  } catch (e) {
    console.error('getLocalMessagesForChat failed:', e);
    return [];
  }
};

// Complex Query: Search messages by text
export const searchLocalMessages = async (queryText: string, chatId?: string): Promise<Message[]> => {
  try {
    let collection = chatId 
      ? db.messages.where('chatId').equals(chatId) 
      : db.messages.toCollection();
    
    const lowercaseQuery = queryText.toLowerCase();
    const results = await collection.filter(msg => 
      msg.text ? msg.text.toLowerCase().includes(lowercaseQuery) : false
    ).toArray();

    // Sort chronologically (oldest to newest like chat history)
    results.sort((a, b) => {
      const tA = (a.timestamp?.seconds || 0) * 1000 + Math.floor((a.timestamp?.nanoseconds || 0) / 1000000);
      const tB = (b.timestamp?.seconds || 0) * 1000 + Math.floor((b.timestamp?.nanoseconds || 0) / 1000000);
      return tA - tB;
    });
    return results;
  } catch (e) {
    console.error('searchLocalMessages failed:', e);
    return [];
  }
};

// Complex Query: Get media messages (images, videos, documents, audio)
export const getLocalMediaMessages = async (chatId: string): Promise<Message[]> => {
  try {
    const results = await db.messages
      .where('chatId')
      .equals(chatId)
      .filter(msg => !!msg.type && ['image', 'video', 'file', 'audio', 'voice'].includes(msg.type))
      .toArray();

    results.sort((a, b) => {
      const tA = (a.timestamp?.seconds || 0) * 1000 + Math.floor((a.timestamp?.nanoseconds || 0) / 1000000);
      const tB = (b.timestamp?.seconds || 0) * 1000 + Math.floor((b.timestamp?.nanoseconds || 0) / 1000000);
      return tB - tA; // Newest first for media gallery
    });
    return results;
  } catch (e) {
    console.error('getLocalMediaMessages failed:', e);
    return [];
  }
};

// --- USER PROFILES CACHE ---
export const saveCachedUserProfile = async (profile: UserProfile): Promise<void> => {
  if (!profile.uid) return;
  try {
    await db.user_profiles.put(profile);
  } catch (e) {
    console.error('saveCachedUserProfile failed:', e);
  }
};

export const saveCachedUserProfiles = async (profiles: UserProfile[]): Promise<void> => {
  try {
    const validProfiles = profiles.filter(p => p.uid);
    if (validProfiles.length > 0) {
      await db.user_profiles.bulkPut(validProfiles);
    }
  } catch (e) {
    console.error('saveCachedUserProfiles failed:', e);
  }
};

export const getAllCachedUserProfiles = async (): Promise<UserProfile[]> => {
  try {
    return await db.user_profiles.toArray();
  } catch (e) {
    console.error('getAllCachedUserProfiles failed:', e);
    return [];
  }
};

// --- GROUPS & CHANNELS CACHE ---
export const saveCachedGroupOrChannel = async (item: any): Promise<void> => {
  if (!item.uid) return;
  try {
    await db.groups_channels.put(item);
  } catch (e) {
    console.error('saveCachedGroupOrChannel failed:', e);
  }
};

export const saveCachedGroupsAndChannels = async (items: any[]): Promise<void> => {
  try {
    const validItems = items.filter(item => item.uid);
    if (validItems.length > 0) {
      await db.groups_channels.bulkPut(validItems);
    }
  } catch (e) {
    console.error('saveCachedGroupsAndChannels failed:', e);
  }
};

export const getAllCachedGroupsAndChannels = async (): Promise<any[]> => {
  try {
    return await db.groups_channels.toArray();
  } catch (e) {
    console.error('getAllCachedGroupsAndChannels failed:', e);
    return [];
  }
};

// --- PREFERENCES CACHE ---
export const saveLocalPreference = async (key: string, value: any): Promise<void> => {
  try {
    await db.preferences.put({ key, value });
  } catch (e) {
    console.error('saveLocalPreference failed:', e);
  }
};

export const getLocalPreference = async (key: string): Promise<any | null> => {
  try {
    const record = await db.preferences.get(key);
    return record ? record.value : null;
  } catch (e) {
    console.error('getLocalPreference failed:', e);
    return null;
  }
};
