import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, onSnapshot, setDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';

export function useTypingIndicator(chatUid: string, currentUserUid: string, isGroupOrChannel: boolean) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typistsRef = useRef<Record<string, number>>({});
  
  // Use a consistent chat ID for 1-on-1 chats, or the group/channel ID
  const typingDocId = isGroupOrChannel ? chatUid : [currentUserUid, chatUid].sort().join('_');

  const updateActiveTypists = useCallback(() => {
    const now = Date.now();
    // Filter typists who updated in the last 6 seconds to show active typing
    const active = Object.keys(typistsRef.current).filter(uid => 
      uid !== currentUserUid && (now - typistsRef.current[uid] < 6000)
    );
    setTypingUsers(active);
  }, [currentUserUid]);

  useEffect(() => {
    if (!chatUid || !typingDocId) return;

    // Listen to the 'status' sub-collection of the chat document
    const unsubscribe = onSnapshot(collection(db, 'chats', typingDocId, 'status'), (snapshot) => {
      const newTypists: Record<string, number> = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.isTyping) {
          newTypists[doc.id] = data.lastUpdate || 0;
        }
      });
      typistsRef.current = newTypists;
      updateActiveTypists();
    }, (error) => {
      console.warn("Typing indicator snapshot error:", error);
    });

    const interval = setInterval(updateActiveTypists, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [typingDocId, chatUid, updateActiveTypists]);

  const lastTypingUpdate = useRef(0);
  const typingTimeoutRef = useRef<any>(null);

  const stopTyping = useCallback(async () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    lastTypingUpdate.current = 0;
    try {
      await setDoc(doc(db, 'chats', typingDocId, 'status', currentUserUid), {
        isTyping: false,
        lastUpdate: Date.now()
      });
    } catch (e) {
      // ignore
    }
  }, [typingDocId, currentUserUid]);

  const handleTyping = useCallback(async () => {
    // Reset the "stopped typing" timeout whenever user types
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, 3000);

    const now = Date.now();
    // Throttle Firestore updates to every 2 seconds to save quota while staying responsive
    if (now - lastTypingUpdate.current > 2000) {
      lastTypingUpdate.current = now;
      try {
        await setDoc(doc(db, 'chats', typingDocId, 'status', currentUserUid), {
          isTyping: true,
          lastUpdate: now
        });
      } catch (e) {
        // ignore
      }
    }
  }, [typingDocId, currentUserUid, stopTyping]);

  // Cleanup typing status on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      stopTyping();
    };
  }, [stopTyping]);

  return { typingUsers, handleTyping };
}
