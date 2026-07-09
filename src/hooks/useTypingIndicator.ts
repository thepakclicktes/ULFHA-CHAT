import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export function useTypingIndicator(chatUid: string, currentUserUid: string, isGroupOrChannel: boolean) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typistsRef = useRef<Record<string, number>>({});
  
  const typingDocId = isGroupOrChannel ? chatUid : [currentUserUid, chatUid].sort().join('_');

  const updateActiveTypists = useCallback(() => {
    const now = Date.now();
    const active = Object.keys(typistsRef.current).filter(uid => 
      uid !== currentUserUid && (now - typistsRef.current[uid] < 4000)
    );
    setTypingUsers(active);
  }, [currentUserUid]);

  useEffect(() => {
    if (!chatUid) return;

    const unsubscribe = onSnapshot(doc(db, 'typingStates', typingDocId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        typistsRef.current = data.typists || {};
        updateActiveTypists();
      } else {
        typistsRef.current = {};
        setTypingUsers([]);
      }
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
  const handleTyping = useCallback(async () => {
    const now = Date.now();
    // Throttle updates to every 2 seconds
    if (now - lastTypingUpdate.current > 2000) {
      lastTypingUpdate.current = now;
      try {
        await setDoc(doc(db, 'typingStates', typingDocId), {
          typists: {
            [currentUserUid]: now
          }
        }, { merge: true });
      } catch (e) {
        // ignore errors
      }
    }
  }, [typingDocId, currentUserUid]);

  return { typingUsers, handleTyping };
}
