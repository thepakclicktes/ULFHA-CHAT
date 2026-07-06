import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../firebaseError';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
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
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
            let regDisplayName = firebaseUser.displayName || '';
            let regUsername = '';

            try {
              const pendingReg = localStorage.getItem('pending_registration');
              if (pendingReg) {
                const parsed = JSON.parse(pendingReg);
                if (parsed.displayName) regDisplayName = parsed.displayName;
                if (parsed.username) regUsername = parsed.username;
                localStorage.removeItem('pending_registration');
              }
            } catch (e) {
              console.error('Pending registration parsing error:', e);
            }

            const isAdminEmail = firebaseUser.email === 'teemabdulrehman.com@gmail.com' || firebaseUser.email === 'abdulrehmanhabib.com@gmail.com';
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: regDisplayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
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
            };
            await setDoc(userRef, newProfile);
            try {
              localStorage.setItem(`user_profile_backup_${firebaseUser.uid}`, JSON.stringify(newProfile));
            } catch (e) {
              console.warn('Failed to cache new user profile:', e);
            }
            setProfile(newProfile);
          } else {
            // Listen for real-time profile updates (like balance)
            unsubProfile = onSnapshot(userRef, (docSnap) => {
              if (docSnap.exists()) {
                const data = docSnap.data() as UserProfile;
                const isAdminEmail = firebaseUser.email === 'teemabdulrehman.com@gmail.com' || firebaseUser.email === 'abdulrehmanhabib.com@gmail.com';
                if (isAdminEmail && data.role !== 'admin') {
                  setDoc(userRef, { role: 'admin' }, { merge: true }).catch(console.error);
                }
                const mergedProfile = { 
                  ...data, 
                  role: isAdminEmail ? 'admin' : data.role,
                  username: data.username || (firebaseUser.email ? firebaseUser.email.split('@')[0].replace(/[^a-z0-9_]/g, '') : 'user_' + firebaseUser.uid.substring(0, 5))
                } as UserProfile;

                try {
                  localStorage.setItem(`user_profile_backup_${firebaseUser.uid}`, JSON.stringify(mergedProfile));
                } catch (e) {
                  console.warn('Failed to cache user profile snapshot:', e);
                }

                setProfile(mergedProfile);
              }
            }, (error) => {
              // On quota, let's still have a basic profile so app continues to run
              const isAdminEmail = firebaseUser.email === 'teemabdulrehman.com@gmail.com' || firebaseUser.email === 'abdulrehmanhabib.com@gmail.com';
              let cachedProfile: UserProfile | null = null;
              try {
                const cached = localStorage.getItem(`user_profile_backup_${firebaseUser.uid}`);
                if (cached) {
                  cachedProfile = JSON.parse(cached);
                }
              } catch (e) {
                console.warn('Failed to parse cached profile:', e);
              }

              setProfile(cachedProfile || {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                username: firebaseUser.email ? firebaseUser.email.split('@')[0].replace(/[^a-z0-9_]/g, '') : 'user_' + firebaseUser.uid.substring(0, 5),
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
              });
              setLoading(false);
              handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
            });
          }
        } catch (error) {
          let cachedProfile: UserProfile | null = null;
          try {
            const cached = localStorage.getItem(`user_profile_backup_${firebaseUser.uid}`);
            if (cached) {
              cachedProfile = JSON.parse(cached);
            }
          } catch (e) {
            console.warn('Failed to parse cached profile in catch:', e);
          }

          setProfile(cachedProfile || {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            username: firebaseUser.email ? firebaseUser.email.split('@')[0].replace(/[^a-z0-9_]/g, '') : 'user_' + firebaseUser.uid.substring(0, 5),
            photoURL: firebaseUser.photoURL || '',
            phoneNumber: firebaseUser.phoneNumber || '',
            balance: 0,
            role: 'user',
            isOnline: true,
            lastSeen: new Date().toISOString(),
            isVerified: false,
            isBanned: false,
            level: 'Bronze',
            experience: 0,
          });
          setLoading(false);
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  return { user, profile, loading };
}
