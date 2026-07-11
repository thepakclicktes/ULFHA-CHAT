import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Auth from './components/Auth';
import ProfileSetupModal from './components/ProfileSetupModal';
import Sidebar from './components/Sidebar';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';

// Lazy load non-critical components for faster startup
const Explore = lazy(() => import('./components/Explore'));
const Status = lazy(() => import('./components/Status'));
const Contacts = lazy(() => import('./components/Contacts'));
const CallHistory = lazy(() => import('./components/CallHistory'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const Settings = lazy(() => import('./components/Settings'));
const VoiceCall = lazy(() => import('./components/VoiceCall'));
const NoorAIChat = lazy(() => import('./components/NoorAIChat'));

import ReplyBridge from './components/ReplyBridge';
import { UserProfile, AppSettings, Announcement, Call } from './types';
import { doc, setDoc, onSnapshot, collection, query, orderBy, where, updateDoc, limit, getDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { reload, updatePassword } from 'firebase/auth';
import { db, messaging, auth } from './firebase';
import { handleFirestoreError, OperationType } from './firebaseError';
import { ShieldAlert, Phone, PhoneOff, Mail, RefreshCw, LogOut, Clock, Video , Lock, MessageCircle, Loader2 } from 'lucide-react';
import { cn, resolveApiUrl } from './utils';
import Header from './components/Header';
import { motion, AnimatePresence } from 'motion/react';
import { syncPendingMessages } from './utils/SyncManager';
import { Toaster, toast } from 'sonner';

const DEFAULT_VAPID_KEY = 'BARsQajcr4y6I9nCfTXGorq433uPL-sAYxTtRlDQbkANR_LSc993JKKlev2TrxjHX4rE_3f4tBVRKlZ70__I708';
const DEFAULT_APP_LOGO = '/logo.png'; // Improved high-quality fallback logo placeholder

const resolveLogo = (url?: string) => {
  if (!url || url.includes('mosque.png') || url.includes('icons8.com') || url.includes('encrypted-tbn0.gstatic.com')) {
    return DEFAULT_APP_LOGO;
  }
  return url;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function App() {
  const { user: authUser, profile, loading } = useAuth();
  const user = authUser || (profile ? { uid: profile.uid, email: profile.email, phoneNumber: profile.phoneNumber, displayName: profile.displayName, photoURL: profile.photoURL } as any : null);
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedChat, setSelectedChat] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('ulfha_selected_chat');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [appSettings, setAppSettings] = useState<AppSettings | null>(() => {
    try {
      const saved = localStorage.getItem('ulfha_app_settings');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    try {
      const saved = localStorage.getItem('ulfha_announcements');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [nicknames, setNicknames] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('ulfha_nicknames');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (!profile?.uid) return;
    const unsubscribe = onSnapshot(collection(db, 'users', profile.uid, 'contacts'), (snap) => {
      const map: Record<string, string> = {};
      snap.docs.forEach(d => {
        map[d.id] = d.data().nickname;
      });
      setNicknames(map);
      localStorage.setItem('ulfha_nicknames', JSON.stringify(map));
    });
    return () => unsubscribe();
  }, [profile?.uid]);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSInvite, setShowIOSInvite] = useState(false);
  const [isAppUnlocked, setIsAppUnlocked] = useState(false);
  const [isAuthenticatingLock, setIsAuthenticatingLock] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // iOS Detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    if (isIOS && !isStandalone) {
      // Show iOS invite after a short delay
      const timer = setTimeout(() => setShowIOSInvite(true), 3000);
      return () => clearTimeout(timer);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    // Request permissions proactively on first load for better mobile integration
    if (!loading && user) {
      const requestAll = async () => {
        try {
          // Notifications
          if (Notification.permission === 'default') {
            await Notification.requestPermission();
          }
          
          // Only request media if we haven't asked this session
          const hasRequested = sessionStorage.getItem('ulfha_permissions_requested');
          if (!hasRequested) {
            // Geolocation
            navigator.geolocation.getCurrentPosition(() => {}, () => {}, { timeout: 1000 });
            
            // Try to trigger camera/mic dialog if supported
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
               // We don't actually need to keep the stream, just trigger the prompt
               const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true }).catch(() => null);
               if (stream) stream.getTracks().forEach(t => t.stop());
            }
            sessionStorage.setItem('ulfha_permissions_requested', 'true');
          }
        } catch (e) {
          console.warn('Proactive permission request failed:', e);
        }
      };
      requestAll();
    }
  }, [loading, user]);

  
  useEffect(() => {
    if (!loading && profile) {
      if (profile.userSettings?.appLockEnabled && !isAppUnlocked) {
        // Trigger passkey authentication
        handleAppLockAuth();
      } else {
        setIsAppUnlocked(true);
      }
    }
  }, [loading, profile, isAppUnlocked]);

  const handleAppLockAuth = async () => {
    if (!profile?.userSettings?.appLockCredentialId) {
       setIsAppUnlocked(true);
       return;
    }
    
    try {
      setIsAuthenticatingLock(true);
      const credentialIdBuffer = Uint8Array.from(atob(profile.userSettings.appLockCredentialId), c => c.charCodeAt(0));
      
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32), // dummy challenge for simple lock
          allowCredentials: [{
            id: credentialIdBuffer,
            type: 'public-key'
          }],
          timeout: 60000,
          userVerification: "required"
        }
      });
      
      if (assertion) {
        setIsAppUnlocked(true);
      }
    } catch (err) {
      console.error("App lock auth failed:", err);
    } finally {
      setIsAuthenticatingLock(false);
    }
  };
useEffect(() => {
    if (selectedChat) {
      localStorage.setItem('ulfha_selected_chat', JSON.stringify(selectedChat));
    } else {
      localStorage.removeItem('ulfha_selected_chat');
    }
  }, [selectedChat]);

  // Synchronize pending offline messages from IndexedDB / localStorage when coming online
  useEffect(() => {
    const handleOnline = () => {
      console.log('App came online, triggering syncPendingMessages...');
      syncPendingMessages().catch(err => console.error('Failed to sync pending messages:', err));
    };

    window.addEventListener('online', handleOnline);
    
    // Listen for background sync trigger from the Service Worker
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'TRIGGER_BACKGROUND_SYNC') {
        console.log('[App] Received TRIGGER_BACKGROUND_SYNC from Service Worker, syncing messages...');
        syncPendingMessages().catch(err => console.error('Background sync failed:', err));
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }
    
    // Also try syncing initially if already online
    if (navigator.onLine) {
      syncPendingMessages().catch(err => console.error('Initial offline sync failed:', err));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, []);

  useEffect(() => {
    const handleQuotaError = () => {
      setQuotaExceeded(true);
    };
    window.addEventListener('firestore-quota-exceeded', handleQuotaError);

    const handleGlobalError = (event: ErrorEvent) => {
      const msg = event.message || '';
      if (
        msg.includes('FIRESTORE') ||
        msg.includes('firestore') ||
        msg.includes('Unexpected state') ||
        msg.includes('Quota limit exceeded') ||
        msg.includes('RESOURCE_EXHAUSTED')
      ) {
        setQuotaExceeded(true);
        event.preventDefault(); // Prevent standard browser crash overlay
      }
    };

    const handleGlobalRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg = reason instanceof Error ? reason.message : String(reason);
      if (
        msg.includes('FIRESTORE') ||
        msg.includes('firestore') ||
        msg.includes('Unexpected state') ||
        msg.includes('Quota limit exceeded') ||
        msg.includes('RESOURCE_EXHAUSTED')
      ) {
        setQuotaExceeded(true);
        event.preventDefault(); // Prevent standard browser crash overlay
      }
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleGlobalRejection);

    return () => {
      window.removeEventListener('firestore-quota-exceeded', handleQuotaError);
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleGlobalRejection);
    };
  }, []);

  useEffect(() => {
    if (!profile?.userSettings) return;
    
    const theme = profile.userSettings.theme;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    if (profile.userSettings.increaseContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }

    if (profile.userSettings.fontSize) {
      document.documentElement.setAttribute('data-font-size', profile.userSettings.fontSize);
    }
  }, [profile?.userSettings?.theme, profile?.userSettings?.increaseContrast, profile?.userSettings?.fontSize]);

  useEffect(() => {
    if (incomingCall) {
      if (!ringtoneRef.current) {
        ringtoneRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3');
        ringtoneRef.current.loop = true;
      }
      ringtoneRef.current.play().catch(e => console.warn('Ringtone autoplay blocked or failed:', e));
    } else {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
    }
  }, [incomingCall]);

  useEffect(() => {
    if (!user) return;

    const setupNotifications = async () => {
      if (!('Notification' in window)) return;

      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('Notification permission granted.');
          
          // Get FCM Token
          // Fetch VAPID key from server or use fallback
          let vapidKey = appSettings?.vapidKey || DEFAULT_VAPID_KEY;
          try {
            if (navigator.onLine) {
              const res = await fetch(resolveApiUrl('/api/push-public-key'));
              if (res.ok) {
                const data = await res.json();
                if (data.publicKey) {
                  vapidKey = data.publicKey;
                }
              }
            }
          } catch (err) {
            console.warn('Could not fetch public key from server:', err);
          }

          if (vapidKey && vapidKey !== 'BPE-YOUR-VAPID-KEY-HERE') {
            try {
              // Explicitly register service worker to ensure it's ready
              const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
              await navigator.serviceWorker.ready;

              // 1. FCM Token setup
              try {
                if (navigator.onLine) {
                  const token = await getToken(messaging, { 
                    vapidKey: vapidKey,
                    serviceWorkerRegistration: registration
                  });
                  if (token) {
                    const userRef = doc(db, 'users', user.uid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists() && userSnap.data().fcmToken !== token) {
                      await updateDoc(userRef, { fcmToken: token });
                    } else if (!userSnap.exists()) {
                      // Handle case where profile might not exist yet (though useAuth usually handles this)
                      await setDoc(userRef, { fcmToken: token }, { merge: true });
                    }
                  }
                }
              } catch (fcmErr) {
                console.warn('FCM registration failed:', fcmErr);
              }

              // 2. Standard Web Push Registration
              try {
                if (navigator.onLine) {
                  const existingSubscription = await registration.pushManager.getSubscription();
                  if (existingSubscription) {
                    // Check if key matches by comparing it to the new one
                    // But for simplicity and to ensure things work, we can just use the existing or re-subscribe
                    // Re-subscribing ensures we are using the latest server key
                    await existingSubscription.unsubscribe();
                  }

                  const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidKey)
                  });
                  
                  const subStr = JSON.stringify(subscription);
                  const userRef = doc(db, 'users', user.uid);
                  const userSnap = await getDoc(userRef);
                  if (userSnap.exists()) {
                    const userData = userSnap.data();
                    const existingSubs: string[] = userData.webPushSubscriptions || [];
                    if (!existingSubs.includes(subStr)) {
                      await updateDoc(userRef, {
                        webPushSubscriptions: [...existingSubs, subStr]
                      });
                      console.log('Registered Web Push Subscription successfully');
                    }
                  }
                }
              } catch (pushSubErr) {
                console.error('Web Push registration failed:', pushSubErr);
              }
            } catch (swErr) {
              console.error('Service worker setup failed:', swErr);
            }
          }

          // Listen for foreground messages
          onMessage(messaging, (payload) => {
            console.log('Foreground message received:', payload);
            if (payload.notification) {
              toast(payload.notification.title || 'New Message', {
                description: payload.notification.body,
                icon: (
                  <img 
                    src={resolveLogo(appSettings?.appLogoUrl)} 
                    className="w-10 h-10 rounded-full object-cover border border-gray-100 shadow-sm" 
                    alt="Logo" 
                  />
                )
              });

              if (Notification.permission === 'granted' && document.visibilityState !== 'visible') {
                new Notification(payload.notification.title || 'New Message', {
                  body: payload.notification.body,
                  icon: resolveLogo(appSettings?.appLogoUrl)
                });
              }
            }
          });
        }
      } catch (error) {
        if (!navigator.onLine) {
          console.warn('Notification setup failed (client is offline):', error);
        } else {
          console.error('Notification setup failed:', error);
        }
      }
    };

    setupNotifications();
  }, [user]);

  // Client-side notification listener for new messages (Elite Feature)
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'messages'),
      where('receiverId', '==', user.uid),
      limit(10)
    );

    let isInitialLoad = true;
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isInitialLoad) {
        isInitialLoad = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const msg = change.doc.data();
          // Verify that this is a very recently sent message to avoid notification floods of older messages
          const msgTime = msg.timestamp?.seconds ? msg.timestamp.seconds * 1000 : Date.now();
          if (Date.now() - msgTime < 15000) {
            // Show in-app popup
            toast(msg.senderName || 'New Message', {
              description: msg.text,
              icon: (
                <img 
                  src={msg.senderPhoto || resolveLogo(appSettings?.appLogoUrl)} 
                  className="w-10 h-10 rounded-full object-cover border border-gray-100 shadow-sm" 
                  alt="Avatar" 
                />
              )
            });

            if (Notification.permission === 'granted' && document.visibilityState !== 'visible') {
              new Notification(msg.senderName || 'New Message', {
                body: msg.text,
                icon: resolveLogo(appSettings?.appLogoUrl)
              });
            }
          }
        }
      });
    }, (error) => handleFirestoreError(error, OperationType.GET, 'messages'));

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const logo = resolveLogo(appSettings?.appLogoUrl);
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = logo;
  }, [appSettings?.appLogoUrl]);

  useEffect(() => {
    const unsubS = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as AppSettings;
        setAppSettings(data);
        localStorage.setItem('ulfha_app_settings', JSON.stringify(data));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });

    return () => unsubS();
  }, []);

  useEffect(() => {
    if (!user) return;

    const qA = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(10));
    const unsubA = onSnapshot(qA, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
      setAnnouncements(data);
      localStorage.setItem('ulfha_announcements', JSON.stringify(data));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'announcements');
    });

    return () => {
      unsubA();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'calls'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'calling')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const callDoc = snapshot.docs[0];
        const callData = { id: callDoc.id, ...callDoc.data() } as Call;
        
        // Only show if not already in a call
        if (!activeCall && !incomingCall) {
          setIncomingCall(callData);
          
          // Auto-missed after 30 seconds
          const timer = setTimeout(async () => {
             const currentDoc = await getDoc(doc(db, 'calls', callDoc.id));
             if (currentDoc.exists() && currentDoc.data().status === 'calling') {
               await updateDoc(doc(db, 'calls', callDoc.id), { status: 'missed' });
             }
          }, 30000);
          
          return () => clearTimeout(timer);
        }
      } else {
        setIncomingCall(null);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'calls'));

    return () => unsubscribe();
  }, [user, activeCall, incomingCall]);

  const [ringtone] = useState(() => new Audio('https://assets.mixkit.co/active_storage/sfx/1350/1350-preview.mp3'));

  useEffect(() => {
    if (incomingCall) {
      ringtone.loop = true;
      ringtone.play().catch(e => console.warn('Ringtone autoplay blocked:', e));
    } else {
      ringtone.pause();
      ringtone.currentTime = 0;
    }
  }, [incomingCall, ringtone]);

  const handleAcceptCall = () => {
    if (incomingCall) {
      ringtone.pause();
      ringtone.currentTime = 0;
      setActiveCall(incomingCall);
      setIncomingCall(null);
    }
  };

  const handleDeclineCall = async () => {
    if (incomingCall?.id) {
      ringtone.pause();
      ringtone.currentTime = 0;
      await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'rejected' });
      setIncomingCall(null);
    }
  };

  useEffect(() => {
    if (user && profile?.mustChangePassword && profile.pendingPassword) {
      const forcePasswordChange = async () => {
        const confirmChange = confirm(`An administrator has reset your password. Your temporary password is: ${profile.pendingPassword}. Would you like to update it now to something secure?`);
        if (confirmChange) {
          const newPass = prompt('Enter your new secure password:');
          if (newPass && newPass.length >= 6) {
            try {
              await updatePassword(user, newPass);
              await updateDoc(doc(db, 'users', user.uid), {
                mustChangePassword: false,
                pendingPassword: null
              });
              alert('Password updated successfully!');
            } catch (error: any) {
              console.error('Forced password update failed:', error);
              if (error.code === 'auth/requires-recent-login') {
                alert('Please log out and log back in with your temporary password to update it.');
              } else {
                alert('Failed to update password: ' + error.message);
              }
            }
          } else {
            alert('Password must be at least 6 characters.');
          }
        }
      };
      forcePasswordChange();
    }
  }, [user, profile?.mustChangePassword]);

  useEffect(() => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      let lastUpdate = 0;
      let lastStatus = true;
      
      const updateStatus = async (isOnline: boolean) => {
        const now = Date.now();
        // Only update if status changed OR if it's been more than 1 minute since last update
        if (isOnline === lastStatus && now - lastUpdate < 60000) return;
        
        try {
          await updateDoc(userRef, { 
            isOnline, 
            lastSeen: new Date().toISOString() 
          });
          lastUpdate = now;
          lastStatus = isOnline;
        } catch (error) {
          console.debug("Status update skipped or failed:", error);
        }
      };

      updateStatus(true);

      const handleVisibilityChange = () => {
        const isOnline = document.visibilityState === 'visible';
        updateStatus(isOnline);
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, [user?.uid]); // Use user.uid to avoid re-running on every user object change

  useEffect(() => {
    const isOwnerAdmin = user && (user.email === 'abdulrehmanhabib.com@gmail.com' || user.email === 'teemabdulrehman.com@gmail.com');
    if (isOwnerAdmin && profile?.isBanned) {
      const unbanAdmin = async () => {
        try {
          await updateDoc(doc(db, 'users', user.uid), { isBanned: false });
        } catch (error) {
          console.error("Failed to unban admin:", error);
        }
      };
      unbanAdmin();
    }
  }, [user?.uid, profile?.isBanned]);

  // Deep Link handler to let new users join easily via a shareable URL parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const joinId = params.get('join');
    if (joinId && user) {
      const handleJoinCommunityByUrl = async () => {
        try {
          const q = query(collection(db, 'groups'), where('uid', '==', joinId));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const docRef = snap.docs[0].ref;
            const groupData = snap.docs[0].data();
            const members = groupData.members || [];
            
            if (!members.includes(user.uid)) {
              const updatedMembers = [...members, user.uid];
              await updateDoc(docRef, { members: updatedMembers });
              groupData.members = updatedMembers;
            }
            
            alert(`Joined community ${groupData.displayName} successfully!`);
            setSelectedChat({ uid: groupData.uid, ...groupData });
            navigate('/', { replace: true });
          } else {
            alert('Community invite link is invalid or of an expired resource.');
            navigate('/', { replace: true });
          }
        } catch (err) {
          console.error("Failed joining community via share link:", err);
          navigate('/', { replace: true });
        }
      };
      handleJoinCommunityByUrl();
    }
  }, [location.search, user, navigate]);

  const handleStartCall = (otherUser: UserProfile, type: 'voice' | 'video') => {
    if (!profile) return;
    setActiveCall({
      callerId: profile.uid,
      callerName: profile.displayName || 'User',
      callerPhoto: profile.photoURL || '',
      receiverId: otherUser.uid,
      status: 'calling',
      type: type,
      timestamp: new Date()
    });
  };

  if (loading && !profile) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#F0F2F5] dark:bg-[#111B21] transition-colors duration-500">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          <div className="w-16 h-16 border-4 border-[#00A884]/20 border-t-[#00A884] rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <img src="/logo.png" className="w-8 h-8 opacity-20" alt="" />
          </div>
        </motion.div>
        <p className="mt-4 text-[#667781] text-sm font-medium Urdu animate-pulse">درخواست پر کارروائی ہو رہی ہے...</p>
      </div>
    );
  }

  const LoadingFallback = () => (
    <div className="h-full w-full flex items-center justify-center bg-transparent">
      <Loader2 className="w-8 h-8 text-[#00A884] animate-spin" />
    </div>
  );

  const path = location.pathname;

  if (path === '/reply') {
    return (
      <Routes>
        <Route path="/reply" element={<ReplyBridge />} />
        <Route path="*" element={<Navigate to="/reply" replace />} />
      </Routes>
    );
  }

  if (!user || !profile) {
    return (
      <Routes>
        <Route path="/login" element={<Auth />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Profile Setup popup if logged in with phone number but setup is incomplete
  const isProfileSetupNeeded = profile && profile.phoneNumber && (profile.isProfileSetupComplete === false || !profile.email || !profile.username || profile.displayName === 'User' || profile.username?.startsWith('user_'));

  if (isProfileSetupNeeded) {
    return (
      <ProfileSetupModal 
        profile={profile} 
        onComplete={() => {
          // Updated automatically via onSnapshot
        }} 
      />
    );
  }

  // Active Tab Derived from path
  const activeTab = path === '/admin' ? 'admin' : path === '/status' ? 'status' : path === '/explore' ? 'explore' : path === '/contacts' ? 'contacts' : path === '/settings' ? 'settings' : 'chats';

  // Email Verification Check Removed

  // Maintenance Mode Check (Admins bypass)
  const isAdmin = profile.role === 'admin' || user.email === 'abdulrehmanhabib.com@gmail.com' || user.email === 'teemabdulrehman.com@gmail.com';
  if (appSettings?.isMaintenanceMode && !isAdmin) {
    return (
      <div className="h-dvh w-full flex flex-col items-center justify-center bg-[#111B21] text-white p-6 text-center">
        <ShieldAlert size={64} className="text-red-500 mb-6 animate-pulse" />
        <h1 className="text-3xl font-bold mb-4">System Under Maintenance</h1>
        <p className="text-[#667781] max-w-md leading-relaxed">
          We are currently performing scheduled maintenance to improve your experience. 
          Please check back in a few minutes.
        </p>
        <div className="mt-8 px-6 py-3 bg-[#202C33] rounded-xl border border-[#2b2b2b] text-sm text-[#858585]">
          Estimated time: 15-30 minutes
        </div>
      </div>
    );
  }

  const isBypassedFromBan = user.email === 'abdulrehmanhabib.com@gmail.com' || user.email === 'teemabdulrehman.com@gmail.com';
  if (profile.isBanned && !isBypassedFromBan) {
    return (
      <div className="flex items-center justify-center h-dvh bg-[#F0F2F5]">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Account Banned</h1>
          <p className="text-[#54656F]">Your account has been suspended for violating our terms of service.</p>
        </div>
      </div>
    );
  }

  const isReaderPage = path === '/explore' || path === '/status' || path === '/settings';

  
  if (!isAppUnlocked && profile?.userSettings?.appLockEnabled) {
    return (
      <div className="flex flex-col items-center justify-center h-dvh bg-[#F0F2F5] animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-gray-200 rounded-full mb-8 flex items-center justify-center shadow-inner overflow-hidden border-4 border-white">
          <img 
            src={resolveLogo(appSettings?.appLogoUrl)} 
            className="w-full h-full object-cover"
            alt="Ulfah Chat Logo"
            referrerPolicy="no-referrer"
          />
        </div>
        <h1 className="text-2xl font-bold text-[#111B21] mb-2">App Locked</h1>
        <p className="text-[#667781] text-sm mb-8">Please authenticate to continue.</p>
        
        <button
          onClick={handleAppLockAuth}
          disabled={isAuthenticatingLock}
          className="bg-[#00A884] hover:bg-[#008f70] text-white font-bold py-3 px-8 rounded-full transition-all shadow-md active:scale-95 flex items-center gap-2"
        >
          {isAuthenticatingLock ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Lock size={18} />
              Unlock App
            </>
          )}
        </button>
      </div>
    );
  }
return (
    <div 
      className={cn(activeTab === 'admin' ? "w-full h-dvh flex flex-col bg-[#1e1e1e] relative overflow-hidden" : "layout-shield relative")}
    >
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 w-full bg-red-500 text-white text-[10px] py-1 text-center font-bold z-[1000] animate-pulse">
          You are currently offline. Using cached data.
        </div>
      )}

      {/* PWA Install Banner */}
      {deferredPrompt && (
        <div className="fixed top-4 left-4 right-4 bg-white rounded-2xl p-4 shadow-2xl z-[1100] border border-gray-100 flex items-center justify-between animate-in fade-in slide-in-from-top duration-500">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#00A884] rounded-xl flex items-center justify-center text-white shadow-lg overflow-hidden">
              <img src={resolveLogo(appSettings?.appLogoUrl)} className="w-full h-full object-cover" alt="Logo" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Install Ulfah Chat</h3>
              <p className="text-[10px] text-gray-500 leading-tight">Add to home screen for original app experience</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setDeferredPrompt(null)}
              className="px-3 py-1.5 text-[10px] font-bold text-gray-400 hover:text-gray-600"
            >
              Later
            </button>
            <button 
              onClick={handleInstallClick}
              className="bg-[#00A884] text-white px-4 py-1.5 rounded-lg text-[10px] font-bold shadow-md active:scale-95 transition-transform"
            >
              Install
            </button>
          </div>
        </div>
      )}
      
      {/* iOS Install Guide */}
      {showIOSInvite && (
        <div className="fixed bottom-6 left-4 right-4 bg-white rounded-2xl p-5 shadow-2xl z-[1100] border border-gray-100 animate-in fade-in slide-in-from-bottom duration-700">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#00A884] rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
               <img src={resolveLogo(appSettings?.appLogoUrl)} className="w-full h-full object-cover" alt="Logo" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-sm">Install on iPhone</h3>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                1. Tap the <span className="font-bold text-[#007AFF]">Share</span> button in Safari.
                <br />
                2. Select <span className="font-bold text-gray-900">"Add to Home Screen"</span>.
              </p>
            </div>
            <button 
              onClick={() => setShowIOSInvite(false)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-center">
             <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium bg-gray-50 px-3 py-1.5 rounded-full">
                <span>Experience Ulfah Chat like a native app</span>
             </div>
          </div>
        </div>
      )}

      {quotaExceeded && (
        <div className="bg-amber-600 text-white py-3 px-4 relative z-[9999] shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left transition-all">
          <div className="flex items-center gap-3">
            <ShieldAlert size={20} className="shrink-0 text-amber-200 animate-pulse animate-bounce" />
            <div className="text-xs sm:text-sm font-medium">
              <span className="font-bold">Daily Database Quota Exceeded (Free Tier)!</span> Some database operations may fail until your Spark Plan quota resets tomorrow.
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a 
              href="https://console.firebase.google.com/project/gen-lang-client-0459240900/firestore/databases/ai-studio-14fe2e05-9393-4e2e-8fb5-2d753f28d925/data?openUpgradeDialog=true"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-amber-800 hover:bg-amber-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 shrink-0"
            >
              Enable Billing & Upgrade
            </a>
            <button 
              onClick={() => setQuotaExceeded(false)}
              className="text-white hover:text-amber-200 p-1 rounded transition-colors text-xs uppercase font-bold tracking-wider shrink-0"
              title="Close warning"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      {activeTab !== 'admin' && !isReaderPage && (
        <div className={cn(selectedChat ? "hidden xl:block" : "block")}>
          <Header profile={profile} onSearch={setSearchQuery} logoUrl={resolveLogo(appSettings?.appLogoUrl)} />
        </div>
      )}
      
      {/* System Announcement Ticker (Elite Feature) */}
      {activeTab !== 'admin' && appSettings?.tickerMessages && appSettings.tickerMessages.length > 0 && (
        <div className={cn("bg-[#008069] text-white py-1.5 px-4 overflow-hidden whitespace-nowrap relative z-50 border-b border-[#075E54]", selectedChat ? "hidden xl:block" : "block")}>
          <div className="inline-block animate-marquee hover:pause">
            {appSettings.tickerMessages.map((msg, i) => (
              <span key={i} className="mx-12 font-bold uppercase text-xs tracking-wider">
                📢 {msg}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Announcement Ticker */}
      {activeTab !== 'admin' && announcements.length > 0 && (
        <div className={cn("bg-[#25D366] text-white py-2 px-4 overflow-hidden whitespace-nowrap relative z-50", selectedChat ? "hidden xl:block" : "block")}>
          <div className="inline-block animate-marquee hover:pause">
            {announcements.map((a, i) => (
              <span key={a.id} className="mx-8 font-medium">
                {a.text}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Main Content Area */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <Routes>
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/" element={
              <>
            <div className={cn(
              "w-full xl:w-[400px] border-r border-[#D1D7DB] bg-white flex flex-col shrink-0",
              selectedChat ? "hidden xl:flex" : "flex"
            )}>
              <ChatList onSelectChat={setSelectedChat} selectedChat={selectedChat} searchQuery={searchQuery} nicknames={nicknames} appLogoUrl={resolveLogo(appSettings?.appLogoUrl)} />
            </div>
            <div className={cn(
              "flex-1 min-h-0 bg-[#F8F9FA] relative",
              selectedChat ? "flex" : "hidden xl:flex"
            )}>
              <AnimatePresence mode="wait">
                {selectedChat ? (
                  selectedChat.uid === 'noorai_assistant' || selectedChat.isNoorAI ? (
                    <Suspense fallback={<LoadingFallback />}>
                      <NoorAIChat onBack={() => setSelectedChat(null)} />
                    </Suspense>
                  ) : (
                    <ChatWindow 
                      key={selectedChat.uid}
                      chat={selectedChat} 
                      currentUser={profile} 
                      onBack={() => setSelectedChat(null)} 
                      appSettings={appSettings} 
                      onStartCall={handleStartCall}
                      nicknames={nicknames}
                    />
                  )
                ) : (
                  <div key="placeholder" className="flex flex-col items-center justify-center h-full text-center p-10 bg-[#f8f9fa] w-full">
                    <div className="w-64 h-64 bg-gray-200 rounded-full mb-8 flex items-center justify-center opacity-70 shadow-inner overflow-hidden border-4 border-white">
                      <img 
                        src={resolveLogo(appSettings?.appLogoUrl)} 
                        className="w-full h-full object-cover"
                        alt="Ulfah Chat Logo"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <h2 className="text-3xl font-light text-[#41525d] mb-4">Ulfah Chat Web</h2>
                    <p className="text-[#667781] text-sm max-w-sm leading-relaxed">
                      Send and receive messages without keeping your phone online.
                      Use Ulfah Chat on up to 4 linked devices and 1 phone at the same time.
                    </p>
                    <div className="mt-8 flex items-center gap-2 text-gray-400 text-xs">
                      <ShieldAlert size={14} />
                      <span>End-to-end encrypted</span>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </>
        } />
        <Route path="/contacts" element={
          <div className="w-full h-full min-h-0 border-r border-[#D1D7DB] bg-white flex flex-col">
            <Suspense fallback={<LoadingFallback />}>
              <Contacts onSelectChat={(u) => { setSelectedChat(u); navigate('/'); }} nicknames={nicknames} />
            </Suspense>
          </div>
        } />
        <Route path="/status" element={<Suspense fallback={<LoadingFallback />}><Status profile={profile} /></Suspense>} />
        <Route path="/explore" element={<Suspense fallback={<LoadingFallback />}><Explore /></Suspense>} />
        <Route path="/settings" element={<Suspense fallback={<LoadingFallback />}><Settings profile={profile} /></Suspense>} />
        <Route path="/admin" element={
          (profile.role === 'admin' || profile.email === 'abdulrehmanhabib.com@gmail.com' || profile.email === 'teemabdulrehman.com@gmail.com') ? 
          <Suspense fallback={<LoadingFallback />}><AdminPanel onExit={() => navigate('/')} /></Suspense> : 
          <Navigate to="/" replace />
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
        
        {/* Sidebar Navigation (Now at the bottom for mobile feel) */}
        {activeTab !== 'admin' && (
          <div className={cn(selectedChat ? "hidden xl:block" : "block")}>
            <Sidebar profile={profile} selectedChat={selectedChat} />
          </div>
        )}
      </div>

      {/* Incoming Call UI */}
      <Toaster position="top-center" richColors closeButton />
      <AnimatePresence>
        {incomingCall && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-[#111B21]/95 backdrop-blur-md flex flex-col items-center justify-between p-12 text-white"
          >
            <div className="flex flex-col items-center gap-6 mt-20">
              <div className="relative">
                <div className="absolute inset-0 bg-[#25D366] rounded-full animate-ping opacity-20"></div>
                <img 
                  src={incomingCall.callerPhoto || `https://ui-avatars.com/api/?name=${incomingCall.callerName}`}
                  className="w-32 h-32 rounded-full border-4 border-[#25D366] shadow-2xl relative z-10"
                  alt=""
                />
              </div>
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-2">{incomingCall.callerName}</h2>
                <p className="text-[#8696A0] text-lg animate-pulse font-medium">
                  {incomingCall.type === 'video' ? 'Incoming video call...' : 'Incoming voice call...'}
                </p>
              </div>
            </div>

            <div className="flex gap-16 mb-20">
              <div className="flex flex-col items-center gap-3">
                <button 
                  onClick={handleDeclineCall}
                  className="p-6 bg-red-500 rounded-full hover:bg-red-600 transition-all shadow-xl hover:scale-110 active:scale-95"
                >
                  <PhoneOff size={32} />
                </button>
                <span className="text-sm font-medium text-[#8696A0]">Decline</span>
              </div>

              <div className="flex flex-col items-center gap-3">
                <button 
                  onClick={handleAcceptCall}
                  className="p-6 bg-[#25D366] rounded-full hover:bg-[#128C7E] transition-all shadow-xl hover:scale-110 active:scale-95 animate-bounce"
                >
                  {incomingCall.type === 'video' ? <Video size={32} /> : <Phone size={32} />}
                </button>
                <span className="text-sm font-medium text-[#8696A0]">Accept</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Call Overlay */}
      <AnimatePresence>
        {activeCall && (
          <Suspense fallback={<LoadingFallback />}>
            <VoiceCall 
              currentUser={profile}
              otherUser={{ 
                uid: activeCall.callerId === profile.uid ? activeCall.receiverId : activeCall.callerId,
                displayName: activeCall.callerName,
                photoURL: activeCall.callerPhoto
              } as UserProfile}
              callId={activeCall.id}
              isIncoming={activeCall.receiverId === profile.uid}
              initialType={activeCall.type}
              onEnd={() => setActiveCall(null)}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
}
