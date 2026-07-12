import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { getDocWithRetry } from '../utils/firestoreRetry';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../firebaseError';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('ulfha_user_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Timeout fallback to prevent stuck loading screen
        const timeoutId = setTimeout(() => {
          setLoading(false);
        }, 6000);

        unsubProfile = onSnapshot(userRef, (docSnap) => {
          clearTimeout(timeoutId);
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            const isAdminEmail = firebaseUser.email === 'teemabdulrehman.com@gmail.com' || firebaseUser.email === 'abdulrehmanhabib.com@gmail.com';
            const mergedProfile = { 
              ...data, 
              uid: firebaseUser.uid,
              role: isAdminEmail ? 'admin' : data.role,
              username: data.username || (firebaseUser.email ? firebaseUser.email.split('@')[0].replace(/[^a-z0-9_]/g, '') : 'user_' + firebaseUser.uid.substring(0, 5))
            } as UserProfile;

            setProfile(mergedProfile);
            localStorage.setItem('ulfha_user_profile', JSON.stringify(mergedProfile));
            setLoading(false);
          } else {
            handleNewUser(firebaseUser);
          }
        }, (error) => {
          clearTimeout(timeoutId);
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          setLoading(false);
        });

        if (profile && profile.uid === firebaseUser.uid) {
          setLoading(false);
          clearTimeout(timeoutId);
        }
      } else {
        setProfile(null);
        localStorage.removeItem('ulfha_user_profile');
        setLoading(false);
      }
    });

    const handleNewUser = async (firebaseUser: User) => {
      const userRef = doc(db, 'users', firebaseUser.uid);
      let regDisplayName = firebaseUser.displayName || '';
      let regUsername = '';

      try {
        const pendingReg = localStorage.getItem('pending_registration');
        if (pendingReg) {
          const parsed = JSON.parse(pendingReg);
          regDisplayName = parsed.displayName || regDisplayName;
          regUsername = parsed.username || regUsername;
          localStorage.removeItem('pending_registration');
        }
      } catch (e) {
        // ignore
      }

      const isAdminEmail = firebaseUser.email === 'teemabdulrehman.com@gmail.com' || firebaseUser.email === 'abdulrehmanhabib.com@gmail.com';
      const newProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: regDisplayName || 'User',
        username: regUsername || (firebaseUser.email ? firebaseUser.email.split('@')[0].replace(/[^a-z0-9_]/g, '') : 'user_' + firebaseUser.uid.substring(0, 5)),
        photoURL: firebaseUser.photoURL || '',
        phoneNumber: firebaseUser.phoneNumber || '',
        balance: 0,
        role: isAdminEmail ? 'admin' : 'user',
        isOnline: true,
        lastSeen: new Date().toISOString(),
        isVerified: false,
        isBanned: false,
        level: 'Bronze',
        experience: 0,
        createdAt: new Date().toISOString()
      };
      
      try {
        await setDoc(userRef, newProfile, { merge: true });
        setProfile(newProfile);
        localStorage.setItem('ulfha_user_profile', JSON.stringify(newProfile));
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${firebaseUser.uid}`);
      } finally {
        setLoading(false);
      }
    };

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  return { user, profile, loading };
}
