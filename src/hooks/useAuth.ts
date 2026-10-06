import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { getDocWithRetry } from '../utils/firestoreRetry';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../firebaseError';

export function useAuth() {
  const [user, setUser] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('ulfha_user_credential');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('ulfha_user_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(() => {
    try {
      const savedCred = localStorage.getItem('ulfha_user_credential');
      const savedProf = localStorage.getItem('ulfha_user_profile');
      return !(savedCred && savedProf);
    } catch {
      return true;
    }
  });

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    // Safety timeout to ensure loading never gets stuck indefinitely
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 2500);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(safetyTimer);
      setUser(firebaseUser);
      
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (firebaseUser) {
        // Cache the minimal credential in localStorage for instant reload
        try {
          localStorage.setItem('ulfha_user_credential', JSON.stringify({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            emailVerified: firebaseUser.emailVerified
          }));
        } catch (e) {
          console.warn('Failed to save credentials to localStorage:', e);
        }

        const fetchProfile = async () => {
          try {
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userSnap = await getDocWithRetry(userRef);

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
              setProfile(newProfile);
              localStorage.setItem('ulfha_user_profile', JSON.stringify(newProfile));
            }

            // Listen for real-time profile updates for all logged-in users (newly registered or existing)
            unsubProfile = onSnapshot(userRef, (docSnap) => {
              if (docSnap.exists()) {
                const data = docSnap.data() as UserProfile;
                const isAdminEmail = firebaseUser.email === 'teemabdulrehman.com@gmail.com' || firebaseUser.email === 'abdulrehmanhabib.com@gmail.com';
                const mergedProfile = { 
                  ...data, 
                  role: isAdminEmail ? 'admin' : data.role,
                  username: data.username || (firebaseUser.email ? firebaseUser.email.split('@')[0].replace(/[^a-z0-9_]/g, '') : 'user_' + firebaseUser.uid.substring(0, 5))
                } as UserProfile;

                setProfile(mergedProfile);
                localStorage.setItem('ulfha_user_profile', JSON.stringify(mergedProfile));
              }
            }, (error) => {
              handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
            });
          } catch (error) {
            handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          } finally {
            setLoading(false);
          }
        };

        // Direct localStorage check for freshly cached profiles from Auth.tsx (crucial after logout/re-login)
        let currentProfile = profile;
        if (!currentProfile) {
          try {
            const saved = localStorage.getItem('ulfha_user_profile');
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed && parsed.uid === firebaseUser.uid) {
                currentProfile = parsed;
                setProfile(currentProfile);
              }
            }
          } catch (e) {
            console.warn('Failed to parse cached profile in useAuth:', e);
          }
        }

        // If we already have a cached profile matching this uid, we can turn off loading instantly
        if (currentProfile && currentProfile.uid === firebaseUser.uid) {
          setLoading(false);
          fetchProfile(); // refresh and listen in background
        } else {
          await fetchProfile(); // block loading if we don't have matching cache
        }
      } else {
        setProfile(null);
        localStorage.removeItem('ulfha_user_profile');
        localStorage.removeItem('ulfha_user_credential');
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  return { user, profile, loading };
}
