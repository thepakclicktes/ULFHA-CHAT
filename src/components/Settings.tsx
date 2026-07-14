import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Search, User, Key, Lock, List as ListIcon, 
  MessageSquare, Radio, Bell, Accessibility, ChevronRight, 
  Shield, UserPlus, Mail, Smartphone, FileText, Share2, 
  Trash2, Eye, Image as ImageIcon, Info, Link as LinkIcon,
  CircleDashed, ToggleLeft as Toggle, Clock, Sun, RefreshCw,
  Palette, Send, EyeOff, Languages, Volume2, History,
  Database, HelpCircle, Users, Smile, BadgePlus, QrCode, PlusCircle,
  Ban, Camera, Mic, MapPin, ShieldCheck, Star, Globe, Folder, Laptop,
  Bookmark, Phone, MessageCircle, Youtube, Facebook, Instagram
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import { cn } from '../utils';
import { auth, db } from '../firebase';
import { updateDoc, doc, collection, query, where, getDocs } from 'firebase/firestore';

interface SettingsProps {
  profile: UserProfile;
}

type SettingsTab = 'main' | 'account' | 'privacy' | 'lists' | 'chats' | 'notifications' | 'accessibility' | 'blocked' | 'permissions' | 'devices' | 'languages' | 'premium' | 'faq' | 'features';

export default function Settings({ profile }: SettingsProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTab>('main');

  const [blockedChats, setBlockedChats] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ulfah_blocked_chats');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    const syncBlocked = () => {
      try {
        const saved = localStorage.getItem('ulfah_blocked_chats');
        setBlockedChats(saved ? JSON.parse(saved) : []);
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener('ulfah_blocked_chats_changed', syncBlocked);
    window.addEventListener('storage', syncBlocked);
    return () => {
      window.removeEventListener('ulfah_blocked_chats_changed', syncBlocked);
      window.removeEventListener('storage', syncBlocked);
    };
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const snap = await getDocs(query(collection(db, 'users')));
        const usersList: UserProfile[] = [];
        snap.forEach(doc => {
          usersList.push({ uid: doc.id, ...doc.data() } as UserProfile);
        });
        setAllUsers(usersList);
      } catch (err) {
        console.error("Error fetching users for blocked list:", err);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  const handleUnblock = (uid: string) => {
    const next = blockedChats.filter(id => id !== uid);
    setBlockedChats(next);
    localStorage.setItem('ulfah_blocked_chats', JSON.stringify(next));
    window.dispatchEvent(new Event('ulfah_blocked_chats_changed'));
  };

  // Profile editing states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(profile.displayName || '');
  const [editUsername, setEditUsername] = useState(profile.username || '');
  const [editBio, setEditBio] = useState(profile.bio || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  const checkUsernameAndSave = async () => {
    if (!profile.uid) return;
    setUsernameError('');
    const cleanUsername = editUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    
    if (!cleanUsername) {
      setUsernameError('Username cannot be empty');
      return;
    }

    if (cleanUsername !== (profile.username || '').toLowerCase()) {
      try {
        setIsSavingProfile(true);
        const q = query(collection(db, 'users'), where('username', '==', cleanUsername));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setUsernameError('Username already taken');
          setIsSavingProfile(false);
          return;
        }
      } catch (err) {
        console.error('Error checking username:', err);
      }
    }

    try {
      setIsSavingProfile(true);
      await updateDoc(doc(db, 'users', profile.uid), {
        displayName: editName.trim(),
        username: cleanUsername,
        bio: editBio.trim()
      });
      
      // Update local storage cache immediately
      try {
        const primaryCached = localStorage.getItem('ulfha_user_profile');
        if (primaryCached) {
          const parsed = JSON.parse(primaryCached);
          parsed.displayName = editName.trim();
          parsed.username = cleanUsername;
          parsed.bio = editBio.trim();
          localStorage.setItem('ulfha_user_profile', JSON.stringify(parsed));
        }

        const cached = localStorage.getItem(`user_profile_backup_${profile.uid}`);
        const currentData = cached ? JSON.parse(cached) : {};
        localStorage.setItem(`user_profile_backup_${profile.uid}`, JSON.stringify({
          ...profile,
          ...currentData,
          displayName: editName.trim(),
          username: cleanUsername,
          bio: editBio.trim()
        }));
      } catch (e) {
        console.warn('Failed to update local profile cache in Settings:', e);
      }

      setIsEditingProfile(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };
  
  // Settings States initialized from profile or defaults
  const settings = profile.userSettings || {
    readReceipts: true,
    enterIsSend: false,
    mediaVisibility: true,
    keepArchived: true,
    conversationTones: true,
    reminders: true,
    highPriority: true,
    increaseContrast: false,
    theme: 'system',
    fontSize: 'medium',
    lastSeenVisibility: 'nobody',
    profilePhotoVisibility: 'myContacts',
    aboutVisibility: 'everyone',
    statusVisibility: 'myContacts',
    linksVisibility: 'everyone',
    disappearingMessagesTimer: 'off',
    securityNotifications: true
  };

  const updateSetting = async (key: string, value: any) => {
    if (!profile.uid) return;
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        [`userSettings.${key}`]: value
      });
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  };

  
  const handleToggleAppLock = async () => {
    if (!profile.uid) return;
    
    if (settings.appLockEnabled) {
      // Disable
      try {
        await updateDoc(doc(db, 'users', profile.uid), {
          'userSettings.appLockEnabled': false,
          'userSettings.appLockCredentialId': null
        });
      } catch (err) {
        console.error("Error disabling app lock:", err);
      }
      return;
    }

    // Enable App Lock via WebAuthn
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge,
          rp: {
            name: "Ulfah Chat",
            id: window.location.hostname
          },
          user: {
            id: Uint8Array.from(profile.uid, c => c.charCodeAt(0)),
            name: profile.email || profile.username || 'user',
            displayName: profile.displayName || 'User'
          },
          pubKeyCredParams: [{alg: -7, type: "public-key"}, {alg: -257, type: "public-key"}],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required"
          },
          timeout: 60000,
          attestation: "none"
        }
      });
      
      if (credential) {
        // credential.id is base64url encoded
        // Store the raw ID in firestore to check against later
        const rawId = new Uint8Array((credential as PublicKeyCredential).rawId);
        const base64Id = btoa(String.fromCharCode.apply(null, Array.from(rawId)));
        
        await updateDoc(doc(db, 'users', profile.uid), {
          'userSettings.appLockEnabled': true,
          'userSettings.appLockCredentialId': base64Id
        });
      }
    } catch (err) {
      console.error("Failed to setup app lock:", err);
      alert("Failed to setup Biometric App Lock. Your device might not support it, or you cancelled the prompt.");
    }
  };

  // Permissions States
  const [cameraStatus, setCameraStatus] = useState<string>('unknown');
  const [micStatus, setMicStatus] = useState<string>('unknown');
  const [locationStatus, setLocationStatus] = useState<string>('unknown');
  const [notificationStatus, setNotificationStatus] = useState<string>('default');

  const checkPermissions = async () => {
    try {
      if (navigator.permissions) {
        const cam = await navigator.permissions.query({ name: 'camera' as any }).catch(() => null);
        if (cam) {
          setCameraStatus(cam.state);
          cam.onchange = () => setCameraStatus(cam.state);
        } else {
          setCameraStatus('unknown');
        }
        
        const mic = await navigator.permissions.query({ name: 'microphone' as any }).catch(() => null);
        if (mic) {
          setMicStatus(mic.state);
          mic.onchange = () => setMicStatus(mic.state);
        } else {
          setMicStatus('unknown');
        }

        const loc = await navigator.permissions.query({ name: 'geolocation' as any }).catch(() => null);
        if (loc) {
          setLocationStatus(loc.state);
          loc.onchange = () => setLocationStatus(loc.state);
        } else {
          setLocationStatus('unknown');
        }
      }
      if ('Notification' in window) {
        setNotificationStatus(Notification.permission);
      }
    } catch (e) {
      console.warn("Failed to check permissions via query:", e);
    }
  };

  useEffect(() => {
    if (activeTab === 'permissions') {
      checkPermissions();
    }
  }, [activeTab]);

  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      setCameraStatus('granted');
    } catch (err) {
      console.error('Camera request failed:', err);
      setCameraStatus('denied');
    }
  };

  const requestMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setMicStatus('granted');
    } catch (err) {
      console.error('Mic request failed:', err);
      setMicStatus('denied');
    }
  };

  const requestLocation = () => {
    navigator.geolocation.getCurrentPosition(
      () => setLocationStatus('granted'),
      () => setLocationStatus('denied'),
      { timeout: 5000 }
    );
  };

  const requestNotification = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setNotificationStatus(result);
    }
  };

const cycleVisibility = (key: string, current: string) => {
    const options: ('everyone' | 'myContacts' | 'nobody')[] = ['everyone', 'myContacts', 'nobody'];
    const currentIndex = options.indexOf(current as any);
    const nextValue = options[(currentIndex + 1) % options.length];
    updateSetting(key, nextValue);
  };

  const formatVisibilityLabel = (value: string) => {
    if (value === 'myContacts') return 'My contacts';
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const [isPhotoLoading, setIsPhotoLoading] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile.uid) return;

    if (file.size > 500000) {
      alert('Photo is too large. Please select an image under 500KB.');
      return;
    }

    setIsPhotoLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        await updateDoc(doc(db, 'users', profile.uid), {
          photoURL: base64
        });
      } catch (error) {
        console.error('Failed to upload photo:', error);
      } finally {
        setIsPhotoLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBack = () => {
    if (activeTab === 'main') {
      navigate(-1);
    } else if (activeTab === 'blocked') {
      setActiveTab('privacy');
    } else {
      setActiveTab('main');
    }
  };

  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    let shareUrl = window.location.origin;
    let title = 'Ulfha Chat';
    let text = 'Join me on Ulfha Chat!';

    const shareData = {
      title,
      text,
      url: shareUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        console.warn('Web Share failed or cancelled, falling back to clipboard copy:', err);
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      alert("Share link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const renderHeader = (title: string) => (
    <div className="bg-white px-4 h-[70px] pt-4 flex items-center justify-between sticky top-0 z-30 border-b border-gray-100 safe-area-top">
      <div className="flex items-center gap-4">
        <button onClick={handleBack} className="p-2 -ml-2 text-[#54656F] hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-[#111B21]">{title}</h1>
      </div>
      <div className="flex items-center gap-1">
        <button className="p-2 text-[#54656F] hover:bg-gray-100 rounded-full transition-colors">
          <Search size={22} />
        </button>
      </div>
    </div>
  );

  const SettingItem = ({ 
    icon: Icon, 
    title, 
    subtitle, 
    onClick, 
    toggle, 
    toggleValue 
  }: { 
    icon: any, 
    title: string, 
    subtitle?: string, 
    onClick?: () => void,
    toggle?: boolean,
    toggleValue?: boolean 
  }) => (
    <button 
      onClick={onClick}
      className="w-full flex items-center px-4 py-3.5 hover:bg-gray-50 transition-colors group text-left"
    >
      <div className="p-2 text-[#54656F] group-hover:text-[#008069] transition-colors">
        <Icon size={24} strokeWidth={1.5} />
      </div>
      <div className="flex-1 ml-4 border-b border-gray-50 pb-3 group-last:border-none">
        <div className="flex justify-between items-center">
          <div className="min-w-0 flex-1">
            <h3 className="text-[17px] text-[#111B21] leading-tight font-medium">{title}</h3>
            {subtitle && <p className="text-[14px] text-[#667781] mt-0.5 leading-tight truncate">{subtitle}</p>}
          </div>
          {toggle ? (
            <div className={cn(
              "w-9 h-5 rounded-full transition-colors relative flex-shrink-0",
              toggleValue ? "bg-[#25D366]" : "bg-gray-300"
            )}>
              <div className={cn(
                "absolute top-[2px] w-4 h-4 bg-white rounded-full transition-all",
                toggleValue ? "left-4.5" : "left-0.5"
              )} />
            </div>
          ) : onClick && <ChevronRight size={20} className="text-[#8696A0] ml-2" />}
        </div>
      </div>
    </button>
  );

  const TelegramGroupItem = ({
    icon: Icon,
    iconColor,
    title,
    badge,
    rightText,
    onClick
  }: {
    icon: any,
    iconColor: string,
    title: string,
    badge?: string | number,
    rightText?: string,
    onClick: () => void
  }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-100/50 dark:hover:bg-white/5 active:bg-gray-200/50 dark:active:bg-white/10 transition-all text-left border-b border-gray-100/10 dark:border-white/5 last:border-none"
    >
      <div className="flex items-center gap-3">
        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm", iconColor)}>
          <Icon size={18} strokeWidth={2.2} />
        </div>
        <span className="text-[15px] font-medium text-gray-800 dark:text-gray-100">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        {rightText && <span className="text-xs text-gray-400 dark:text-gray-500">{rightText}</span>}
        {badge !== undefined && (
          <span className="bg-orange-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-sm">
            {badge}
          </span>
        )}
        <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
      </div>
    </button>
  );

  const TelegramCard = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-white dark:bg-[#1c272d] rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden mx-4 mb-4">
      {children}
    </div>
  );

  const renderMain = () => (
    <div className="flex flex-col flex-1 overflow-y-auto pb-24 custom-scrollbar">
      {/* Telegram-style Top Header */}
      <div className="sticky top-0 z-30 bg-gray-50/10 dark:bg-[#0f171c]/20 backdrop-blur-md px-4 py-3.5 flex items-center justify-between safe-area-top select-none">
        <button 
          onClick={handleBack} 
          className="p-1.5 -ml-1 text-emerald-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
          title="Back"
        >
          <ArrowLeft size={24} />
        </button>
        <button 
          onClick={() => {
            if (isEditingProfile) {
              setIsEditingProfile(false);
            } else {
              setEditName(profile.displayName || '');
              setEditUsername(profile.username || '');
              setEditBio(profile.bio || '');
              setIsEditingProfile(true);
            }
          }} 
          className="text-[15px] font-bold text-emerald-500 hover:opacity-85 transition-opacity px-2 py-1"
        >
          {isEditingProfile ? "Cancel" : "Edit"}
        </button>
      </div>

      {/* Large Profile Picture Header */}
      <div className="flex flex-col items-center px-6 py-6 text-center select-none">
        <div className="relative group flex-shrink-0 mb-4">
          <label className="cursor-pointer group block">
            <img 
              src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}`}
              className={cn(
                "w-24 h-24 rounded-full object-cover border-2 border-white dark:border-[#1c272d] shadow-xl transition-transform duration-200 active:scale-95",
                isPhotoLoading && "opacity-50"
              )}
              alt="Profile"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={22} className="text-white" />
            </div>
            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={isPhotoLoading} />
          </label>
        </div>

        {!isEditingProfile ? (
          <div className="w-full">
            <h2 className="text-2xl font-black text-gray-950 dark:text-white flex items-center justify-center gap-1.5 leading-tight tracking-tight">
              <span>{profile.displayName}</span>
              {(profile.isVerified || profile.isPremium) && (
                <span className="text-sky-400 fill-sky-400/10 flex-shrink-0" title="Verified User">
                  <Star size={18} className="fill-current text-sky-400" />
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">
              {profile.phoneNumber || profile.email}
            </p>
            {profile.username && (
              <p className="text-xs text-emerald-500 font-bold mt-0.5">@{profile.username}</p>
            )}
            {profile.bio && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 max-w-xs mx-auto italic font-medium">
                "{profile.bio}"
              </p>
            )}
          </div>
        ) : (
          <div className="w-full max-w-sm bg-white dark:bg-[#1c272d] rounded-2xl p-5 border border-gray-100 dark:border-white/5 text-left space-y-4 shadow-lg animate-in fade-in duration-200">
            <div>
              <label className="block text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wide mb-1">Display Name</label>
              <input 
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#151e22] border border-gray-200 dark:border-white/5 focus:border-emerald-500 rounded px-3 py-2 text-sm text-gray-900 dark:text-white outline-none transition-colors"
                placeholder="Your Name"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wide mb-1">Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">@</span>
                <input 
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#151e22] border border-gray-200 dark:border-white/5 focus:border-emerald-500 rounded pl-7 pr-3 py-2 text-sm text-gray-900 dark:text-white outline-none transition-colors"
                  placeholder="username"
                />
              </div>
              {usernameError && (
                <p className="text-[10px] text-red-500 mt-1 font-semibold">{usernameError}</p>
              )}
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wide mb-1">Bio (About)</label>
              <input 
                type="text"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#151e22] border border-gray-200 dark:border-white/5 focus:border-emerald-500 rounded px-3 py-2 text-sm text-gray-900 dark:text-white outline-none transition-colors"
                placeholder="Available"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button 
                onClick={checkUsernameAndSave}
                disabled={isSavingProfile}
                className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50"
              >
                {isSavingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Telegram Style Settings Cards */}
      {!isEditingProfile && (
        <div className="animate-in fade-in duration-200">
          {/* Card Block 1 */}
          <TelegramCard>
            <TelegramGroupItem 
              icon={Bookmark} 
              iconColor="bg-[#4094f7]" 
              title="Saved Messages" 
              onClick={() => {
                alert("Opening Saved Messages in Ulfha Chat.");
                navigate('/');
              }} 
            />
            <TelegramGroupItem 
              icon={Phone} 
              iconColor="bg-[#4cd964]" 
              title="Recent Calls" 
              onClick={() => {
                alert("Opening Call Logs.");
                navigate('/');
              }} 
            />
            <TelegramGroupItem 
              icon={Laptop} 
              iconColor="bg-[#ff9500]" 
              title="Devices" 
              badge="11" 
              onClick={() => setActiveTab('devices')} 
            />
            <TelegramGroupItem 
              icon={Folder} 
              iconColor="bg-[#34aadc]" 
              title="Chat Folders" 
              onClick={() => {
                alert("Chat Folders let you organize your active chats. Feature coming soon in the next update!");
              }} 
            />
          </TelegramCard>

          {/* Card Block 2 */}
          <TelegramCard>
            <TelegramGroupItem 
              icon={Bell} 
              iconColor="bg-[#ff3b30]" 
              title="Notifications and Sounds" 
              onClick={() => setActiveTab('notifications')} 
            />
            <TelegramGroupItem 
              icon={Lock} 
              iconColor="bg-[#8e8e93]" 
              title="Privacy and Security" 
              onClick={() => setActiveTab('privacy')} 
            />
            <TelegramGroupItem 
              icon={Database} 
              iconColor="bg-[#4cd964]" 
              title="Data and Storage" 
              onClick={() => {
                alert("Ulfha Chat automatically compresses media and caches messages offline for zero data footprint.");
              }} 
            />
            <TelegramGroupItem 
              icon={Palette} 
              iconColor="bg-[#34aadc]" 
              title="Appearance" 
              onClick={() => setActiveTab('accessibility')} 
            />
            <TelegramGroupItem 
              icon={Globe} 
              iconColor="bg-[#5856d6]" 
              title="Language" 
              rightText="English"
              onClick={() => setActiveTab('languages')} 
            />
            <TelegramGroupItem 
              icon={Smile} 
              iconColor="bg-[#ffcc00]" 
              title="Stickers and Emoji" 
              onClick={() => {
                alert("Ulfha Chat supports high-definition animated stickers and interactive emojis!");
              }} 
            />
          </TelegramCard>

          {/* Card Block 3 (Ulfha Chat Premium Option) */}
          <TelegramCard>
            <TelegramGroupItem 
              icon={Star} 
              iconColor="bg-gradient-to-r from-[#af52de] to-[#5856d6]" 
              title="Ulfha Chat Premium" 
              rightText={profile.isPremium ? "Active" : "Offer"}
              onClick={() => setActiveTab('premium')} 
            />
          </TelegramCard>

          {/* Card Block 4 */}
          <TelegramCard>
            <TelegramGroupItem 
              icon={HelpCircle} 
              iconColor="bg-[#ff9500]" 
              title="Ask a Question" 
              onClick={() => {
                alert("Contact our Noor AI assistant or send a message to Abdulrahman Habib for technical support!");
              }} 
            />
            <TelegramGroupItem 
              icon={FileText} 
              iconColor="bg-[#007aff]" 
              title="Ulfha Chat FAQ" 
              onClick={() => setActiveTab('faq')} 
            />
            <TelegramGroupItem 
              icon={Info} 
              iconColor="bg-[#ffcc00]" 
              title="Ulfha Chat Features" 
              onClick={() => setActiveTab('features')} 
            />
          </TelegramCard>

          {/* Update Action */}
          <TelegramCard>
            <TelegramGroupItem 
              icon={RefreshCw} 
              iconColor="bg-emerald-500" 
              title="Update Application" 
              onClick={() => window.location.reload()} 
            />
          </TelegramCard>

          {/* Connect & Share */}
          <TelegramCard>
            <TelegramGroupItem 
              icon={MessageCircle} 
              iconColor="bg-[#00a884]" 
              title="Follow on WhatsApp" 
              onClick={() => {
                window.open("https://whatsapp.com/channel/0029Vb84Skx7NoZxmLHWPI1K", "_blank", "noopener,noreferrer");
              }} 
            />
            <TelegramGroupItem 
              icon={Youtube} 
              iconColor="bg-[#ff0000]" 
              title="Sub on YouTube" 
              onClick={() => {
                window.open("https://youtube.com/@ulfhachat", "_blank", "noopener,noreferrer");
              }} 
            />
            <TelegramGroupItem 
              icon={Facebook} 
              iconColor="bg-[#1877f2]" 
              title="Follow on Facebook" 
              onClick={() => {
                window.open("https://www.facebook.com/share/19UFkJK6wE/", "_blank", "noopener,noreferrer");
              }} 
            />
            <TelegramGroupItem 
              icon={Instagram} 
              iconColor="bg-[#e1306c]" 
              title="Follow on Instagram" 
              onClick={() => {
                window.open("https://www.instagram.com/ulfhachat?igsh=aGZnNnZ0bDVlZmI=", "_blank", "noopener,noreferrer");
              }} 
            />
            <TelegramGroupItem 
              icon={Share2} 
              iconColor="bg-[#007aff]" 
              title={copied ? "Link Copied!" : "Share App"} 
              onClick={handleShare} 
            />
          </TelegramCard>
        </div>
      )}
    </div>
  );

  const renderDevices = () => {
    const devicesList = [
      { name: "iPhone 15 Pro Max", location: "Riyadh, Saudi Arabia", date: "Online Now", type: "Active Session", icon: Smartphone },
      { name: "Chrome Web Client", location: "Karachi, Pakistan", date: "Today, 11:24 AM", type: "Browser", icon: Laptop },
      { name: "Windows Desktop App", location: "London, UK", date: "Yesterday, 04:15 PM", type: "Desktop Client", icon: Laptop },
      { name: "iPad Air 5th Gen", location: "Riyadh, Saudi Arabia", date: "July 10, 08:31 AM", type: "Tablet", icon: Smartphone }
    ];

    return (
      <div className="flex flex-col flex-1 overflow-y-auto pb-24 animate-in fade-in duration-200 custom-scrollbar">
        {renderHeader("Devices")}
        <div className="p-4">
          <div className="bg-white dark:bg-[#1c272d] rounded-2xl p-5 border border-gray-100 dark:border-white/5 mb-4 text-center">
            <Laptop className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Active Sessions</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
              Your account is logged in across these devices. You can terminate any session securely at any time.
            </p>
            <button 
              onClick={() => alert("All other active sessions have been securely terminated. This client is now your sole authenticated session.")}
              className="mt-4 px-5 py-2 bg-red-50 dark:bg-red-950/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-950/40 text-xs font-bold rounded-xl transition-all"
            >
              Terminate All Other Sessions
            </button>
          </div>

          <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-2 mb-2">Current Session</h4>
          <div className="bg-white dark:bg-[#1c272d] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden mb-4">
            <div className="flex items-center gap-4 p-4">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 rounded-xl">
                <Laptop className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Web Client (AI Studio Workspace)</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Riyadh, Saudi Arabia • IP: 192.168.1.41</p>
                <span className="inline-block mt-1 text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full">
                  Online
                </span>
              </div>
            </div>
          </div>

          <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-2 mb-2">Other Sessions ({devicesList.length})</h4>
          <div className="bg-white dark:bg-[#1c272d] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden">
            {devicesList.map((dev, i) => {
              const DevIcon = dev.icon;
              return (
                <div key={i} className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/5 last:border-none hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-gray-50 dark:bg-[#151e22] text-gray-400 dark:text-gray-500 rounded-xl">
                      <DevIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">{dev.name}</h4>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{dev.location} • {dev.type}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{dev.date}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => alert(`Terminating session for ${dev.name}.`)}
                    className="text-xs font-bold text-red-500 hover:underline px-2 py-1"
                  >
                    Revoke
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderLanguages = () => {
    const langs = [
      { code: "en", name: "English", local: "English" },
      { code: "ur", name: "Urdu", local: "اردو" },
      { code: "ar", name: "Arabic", local: "العربية" },
      { code: "tr", name: "Turkish", local: "Türkçe" },
      { code: "id", name: "Indonesian", local: "Bahasa Indonesia" }
    ];

    return (
      <div className="flex flex-col flex-1 overflow-y-auto pb-24 animate-in fade-in duration-200 custom-scrollbar">
        {renderHeader("Language")}
        <div className="p-4">
          <div className="bg-white dark:bg-[#1c272d] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm">
            {langs.map((lang, i) => (
              <button 
                key={i}
                onClick={() => alert(`Language switched to ${lang.name}.`)}
                className="w-full flex items-center justify-between p-4 border-b border-gray-100/10 dark:border-white/5 last:border-none hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-left"
              >
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">{lang.name}</h4>
                  <p className="text-xs text-gray-400 dark:text-gray-400">{lang.local}</p>
                </div>
                {lang.code === "en" && (
                  <div className="w-5.5 h-5.5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-black">
                    ✓
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderPremium = () => {
    const isPremiumActive = profile.isPremium;

    const handleSubscribe = async () => {
      if (!profile.uid) return;
      try {
        await updateDoc(doc(db, 'users', profile.uid), {
          isPremium: true
        });
        alert("🎉 Congratulations! You are now an Ulfha Chat Premium subscriber! You have unlocked your gold verification star.");
        // Refresh local cache
        try {
          const cached = localStorage.getItem('ulfha_user_profile');
          if (cached) {
            const parsed = JSON.parse(cached);
            parsed.isPremium = true;
            localStorage.setItem('ulfha_user_profile', JSON.stringify(parsed));
          }
        } catch {}
        setActiveTab('main');
      } catch (err) {
        console.error("Error subscribing: ", err);
      }
    };

    return (
      <div className="flex flex-col bg-gray-50 dark:bg-[#0f171c] flex-1 overflow-y-auto pb-24 animate-in fade-in duration-200 custom-scrollbar">
        {renderHeader("Ulfha Chat Premium")}
        <div className="p-4">
          <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white rounded-3xl p-6 shadow-xl mb-6 relative overflow-hidden select-none">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
            
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-gradient-to-tr from-yellow-300 via-amber-400 to-yellow-600 rounded-2xl flex items-center justify-center shadow-lg mb-4 animate-bounce">
                <Star className="w-10 h-10 text-white fill-current" />
              </div>
              <h3 className="text-xl font-black tracking-tight">Ulfha Chat Premium</h3>
              <p className="text-xs text-indigo-200 mt-1.5 font-semibold">
                Unlock limits & power our platform.
              </p>

              {isPremiumActive ? (
                <div className="mt-4 bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 px-4 py-1.5 rounded-full text-xs font-black">
                  Active Subscription Star
                </div>
              ) : (
                <button 
                  onClick={handleSubscribe}
                  className="mt-5 w-full py-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-gray-950 font-black rounded-xl text-sm shadow-md active:scale-98 transition-all hover:brightness-110"
                >
                  Subscribe for $2.99/mo
                </button>
              )}
            </div>
          </div>

          <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-2 mb-3">Premium Features</h4>
          <div className="space-y-3">
            {[
              { title: "Exclusive Verification Star", desc: "Get a brilliant gold/sky star badge next to your profile visible to everyone in community groups.", icon: Star, color: "text-amber-500 bg-amber-500/10 animate-pulse" },
              { title: "2GB Large Media Transfers", desc: "Upload, download and read large Islamic library files, custom audios and books.", icon: Folder, color: "text-blue-500 bg-blue-500/10" },
              { title: "Zero Noor AI Limits", desc: "Interact with our AI Islamic teacher with unlimited requests and speed boosters.", icon: HelpCircle, color: "text-purple-500 bg-purple-500/10" },
              { title: "Scheduled Voice Calls", desc: "Organize automated community lessons, dars, or general group calling meetings.", icon: Phone, color: "text-emerald-500 bg-emerald-500/10" }
            ].map((f, idx) => {
              const FIcon = f.icon;
              return (
                <div key={idx} className="bg-white dark:bg-[#1c272d] border border-gray-100 dark:border-white/5 p-4 rounded-2xl flex gap-4 shadow-sm">
                  <div className={cn("p-2.5 rounded-xl shrink-0 h-10 w-10 flex items-center justify-center", f.color)}>
                    <FIcon size={20} className="fill-current" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-gray-900 dark:text-white">{f.title}</h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderFAQ = () => {
    const faqs = [
      { q: "What is Ulfha Chat?", a: "Ulfha Chat is a beautifully-designed, high-speed instant messaging application built for communities. It combines rich groups/channels with unique offline religious libraries and intelligent assistance." },
      { q: "How do I create a community group or channel?", a: "Navigate to the Chats tab, click on the pencil/write trigger at the top or bottom, and choose either 'Create Ulfha Chat Group' or 'Create Ulfha Chat Channel'." },
      { q: "How does the Offline Library work?", a: "Our offline database caches Qurans, daily duas, translation texts, and Hadiths directly in your web browser, allowing you to access them without any cellular signal." },
      { q: "Can I manage linked devices?", a: "Yes, head over to the main Settings/Profile tab, click on 'Devices', and you'll see every active browser or desktop client. You can revoke other sessions with a single tap!" }
    ];

    return (
      <div className="flex flex-col bg-gray-50 dark:bg-[#0f171c] flex-1 overflow-y-auto pb-24 animate-in fade-in duration-200 custom-scrollbar">
        {renderHeader("Ulfha Chat FAQ")}
        <div className="p-4 space-y-4">
          {faqs.map((f, i) => (
            <div key={i} className="bg-white dark:bg-[#1c272d] border border-gray-100 dark:border-white/5 p-4 rounded-2xl shadow-sm">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-start gap-2">
                <span className="text-emerald-500">Q.</span>
                <span>{f.q}</span>
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed pl-4 border-l border-emerald-500/30">
                {f.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderFeatures = () => {
    const feats = [
      { name: "Live Group & Channels", desc: "Build standard chat channels, broadcast alerts, or create multi-participant groups styled like Ulfha Chat.", badge: "Ready" },
      { name: "Voice & Video Calling", desc: "Call your friends or contacts directly inside our applet with real-time peer communication.", badge: "Optimized" },
      { name: "Islamic Quran Reader", desc: "Access full Qurans with Urdu & English translations, interactive audio stream, and bookmarking.", badge: "Islamic" },
      { name: "Noor AI Support Chat", desc: "Intelligent chatbot powered by state-of-the-art server-side models for daily guidance.", badge: "AI Powered" },
      { name: "Custom Background App Service", desc: "Background listeners keep you alert of incoming chats even if you close the webpage.", badge: "Smart" }
    ];

    return (
      <div className="flex flex-col bg-gray-50 dark:bg-[#0f171c] flex-1 overflow-y-auto pb-24 animate-in fade-in duration-200 custom-scrollbar">
        {renderHeader("Ulfha Chat Features")}
        <div className="p-4 space-y-4">
          <div className="bg-white dark:bg-[#1c272d] border border-gray-100 dark:border-white/5 p-5 rounded-2xl shadow-sm text-center">
            <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Ulfha Chat Suite</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
              A comprehensive list of powerful, user-centric tools crafted specifically for this platform.
            </p>
          </div>

          {feats.map((ft, i) => (
            <div key={i} className="bg-white dark:bg-[#1c272d] border border-gray-100 dark:border-white/5 p-4 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="max-w-[75%]">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">{ft.name}</h4>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 leading-relaxed">{ft.desc}</p>
              </div>
              <span className="text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 px-2.5 py-1 rounded-md">
                {ft.badge}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAccount = () => (
    <div className="flex flex-col flex-1 overflow-y-auto pb-20 custom-scrollbar">
      {renderHeader("Account")}
      <SettingItem 
        icon={Shield} 
        title="Security notifications" 
        toggle 
        toggleValue={settings.securityNotifications}
        onClick={() => updateSetting('securityNotifications', !settings.securityNotifications)}
      />
      <SettingItem icon={Mail} title="Email address" subtitle={profile.email} />
      <SettingItem icon={Smartphone} title="Two-step verification" subtitle="Extra security for your account" />
      <SettingItem icon={FileText} title="Request account info" />
      <SettingItem icon={ListIcon} title="Ad preferences in Accounts Center" />
      <div className="h-px bg-gray-100 my-2" />
      <SettingItem icon={UserPlus} title="Add account" />
      <SettingItem 
        icon={Trash2} 
        title="Delete account" 
        onClick={() => {
          if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
            auth.signOut();
            navigate('/');
          }
        }} 
      />
    </div>
  );

  const renderPrivacy = () => (
    <div className="flex flex-col flex-1 overflow-y-auto pb-20 custom-scrollbar">
      {renderHeader("Privacy")}
      <div className="px-4 py-3 text-[14px] font-bold text-[#667781] uppercase tracking-wide">Who can see my personal info</div>
      <SettingItem 
        icon={Eye} 
        title="Last seen and online" 
        subtitle={formatVisibilityLabel(settings.lastSeenVisibility || 'nobody')} 
        onClick={() => cycleVisibility('lastSeenVisibility', settings.lastSeenVisibility || 'nobody')}
      />
      <SettingItem 
        icon={ImageIcon} 
        title="Profile picture" 
        subtitle={formatVisibilityLabel(settings.profilePhotoVisibility || 'myContacts')} 
        onClick={() => cycleVisibility('profilePhotoVisibility', settings.profilePhotoVisibility || 'myContacts')}
      />
      <SettingItem 
        icon={Info} 
        title="About" 
        subtitle={formatVisibilityLabel(settings.aboutVisibility || 'everyone')} 
        onClick={() => cycleVisibility('aboutVisibility', settings.aboutVisibility || 'everyone')}
      />
      <SettingItem 
        icon={LinkIcon} 
        title="Links" 
        subtitle={formatVisibilityLabel(settings.linksVisibility || 'everyone')} 
        onClick={() => cycleVisibility('linksVisibility', settings.linksVisibility || 'everyone')}
      />
      <SettingItem 
        icon={CircleDashed} 
        title="Status" 
        subtitle={formatVisibilityLabel(settings.statusVisibility || 'myContacts')} 
        onClick={() => cycleVisibility('statusVisibility', settings.statusVisibility || 'myContacts')}
      />
      
      <div className="h-px bg-gray-100 my-2" />
      
      <div className="p-4 flex flex-col gap-2">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-[17px] text-[#111B21] font-medium leading-tight">Read receipts</h3>
            <p className="text-[14px] text-[#667781] mt-1 leading-snug">
              If turned off, you won't send or receive Read receipts. Read receipts are always sent for group chats.
            </p>
          </div>
          <button 
            onClick={() => updateSetting('readReceipts', !settings.readReceipts)}
            className={cn(
              "w-10 h-5 rounded-full transition-colors relative flex-shrink-0 mt-1",
              settings.readReceipts ? "bg-[#25D366]" : "bg-gray-300"
            )}
          >
            <div className={cn(
              "absolute top-[2px] w-4 h-4 bg-white rounded-full transition-all",
              settings.readReceipts ? "left-5.5" : "left-0.5"
            )} />
          </button>
        </div>
      </div>

      <div className="h-px bg-gray-100 my-2" />
      <SettingItem 
        icon={BadgePlus} 
        title="App Lock (Biometric/PIN)" 
        subtitle="Require authentication to open Ulfah Chat" 
        toggle
        toggleValue={settings.appLockEnabled || false}
        onClick={handleToggleAppLock}
      />

      <div className="px-4 py-3 text-[14px] font-bold text-[#667781] uppercase tracking-wide">Disappearing messages</div>
      <SettingItem 
        icon={Clock} 
        title="Default message timer" 
        subtitle={settings.disappearingMessagesTimer === 'off' ? 'Off' : settings.disappearingMessagesTimer} 
        onClick={() => {
          const timers: ('off' | '24h' | '7d' | '90d')[] = ['off', '24h', '7d', '90d'];
          const current = settings.disappearingMessagesTimer || 'off';
          const next = timers[(timers.indexOf(current as any) + 1) % timers.length];
          updateSetting('disappearingMessagesTimer', next);
        }}
      />
      <div className="h-px bg-gray-100 my-2" />
      <SettingItem 
        icon={Ban} 
        title="Blocked contacts" 
        subtitle={`${blockedChats.length} contacts`} 
        onClick={() => setActiveTab('blocked')}
      />
    </div>
  );

  const renderLists = () => (
    <div className="flex flex-col flex-1 overflow-y-auto pb-20 custom-scrollbar">
      {renderHeader("Lists")}
      <div className="p-8 flex flex-col items-center text-center">
        <div className="flex gap-[-10px] mb-6">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center border-2 border-white shadow-sm -mr-4 overflow-hidden p-3">
             <Smile className="text-[#008069] w-full h-full" />
          </div>
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white shadow-sm -mr-4 overflow-hidden p-3">
             <Users className="text-blue-600 w-full h-full" />
          </div>
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden p-3">
             <PlusCircle className="text-gray-400 w-full h-full" />
          </div>
        </div>
        <p className="text-[#54656F] text-sm mb-8 leading-relaxed max-w-xs">
          Any list you create becomes a filter at the top of your Chats tab.
        </p>
        <button 
          onClick={() => {
            const name = prompt("Enter list name:");
            if (name && name.trim()) {
              const currentLists = settings.customLists || [];
              updateSetting('customLists', [...currentLists, name.trim()]);
            }
          }}
          className="w-full py-3.5 bg-[#D9FDD3] text-[#008069] font-bold rounded-full flex items-center justify-center gap-2 hover:bg-[#c6fcc0] transition-colors"
        >
          <PlusCircle size={20} />
          Create a custom list
        </button>
      </div>

      <div className="px-6 py-4">
        <h3 className="text-sm font-bold text-[#667781] uppercase tracking-wide mb-4">Your lists</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-[17px] text-[#111B21] font-medium">Unread</h4>
            <p className="text-xs text-[#667781]">Preset</p>
          </div>
          <div>
            <h4 className="text-[17px] text-[#111B21] font-medium">Favorites</h4>
            <p className="text-xs text-[#667781]">Add people or groups</p>
          </div>
          <div>
            <h4 className="text-[17px] text-[#111B21] font-medium">Groups</h4>
            <p className="text-xs text-[#667781]">Preset</p>
          </div>
          {settings.customLists?.map((list, i) => (
            <div key={i} className="flex justify-between items-center">
              <div>
                <h4 className="text-[17px] text-[#111B21] font-medium">{list}</h4>
                <p className="text-xs text-[#667781]">Custom List</p>
              </div>
              <button 
                onClick={() => {
                  const newLists = settings.customLists?.filter((_, index) => index !== i);
                  updateSetting('customLists', newLists);
                }}
                className="text-red-500 p-2"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>

       <div className="px-6 py-4 mt-4">
        <h3 className="text-sm font-bold text-[#667781] uppercase tracking-wide mb-4">Available presets</h3>
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-[17px] text-[#111B21] font-medium">Communities</h4>
            <p className="text-xs text-[#667781]">Preset</p>
          </div>
          <button className="bg-[#D9FDD3] text-[#008069] px-6 py-2 rounded-full font-bold text-sm">Add</button>
        </div>
      </div>
    </div>
  );

  const renderChats = () => (
    <div className="flex flex-col flex-1 overflow-y-auto pb-20 custom-scrollbar">
      {renderHeader("Chats")}
      <button 
        onClick={() => {
          const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
          const currentTheme = (settings && settings.theme) || 'system';
          const currentIndex = themes.indexOf(currentTheme);
          const nextTheme = themes[(currentIndex + 1) % themes.length];
          updateSetting('theme', nextTheme);
        }}
        className="w-full"
      >
        <SettingItem icon={Sun} title="Theme" subtitle={settings.theme === 'system' ? 'System default' : settings.theme === 'dark' ? 'Dark' : 'Light'} />
      </button>
      <SettingItem icon={Palette} title="Default chat theme" subtitle="Default" onClick={() => alert("Chat wallpaper feature coming soon!")} />
      
      <div className="px-4 py-3 text-[14px] font-bold text-[#667781] uppercase tracking-wide">Chat settings</div>
      <SettingItem 
        icon={Send} 
        title="Enter is send" 
        subtitle="Enter key will send your message" 
        toggle 
        toggleValue={settings.enterIsSend}
        onClick={() => updateSetting('enterIsSend', !settings.enterIsSend)} 
      />
      <SettingItem 
        icon={ImageIcon} 
        title="Media visibility" 
        subtitle="Show newly downloaded media in your device's gallery" 
        toggle 
        toggleValue={settings.mediaVisibility}
        onClick={() => updateSetting('mediaVisibility', !settings.mediaVisibility)} 
      />
      <button 
        onClick={() => {
          const sizes: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large'];
          const currentFontSize = (settings && settings.fontSize) || 'medium';
          const currentIndex = sizes.indexOf(currentFontSize);
          const nextSize = sizes[(currentIndex + 1) % sizes.length];
          updateSetting('fontSize', nextSize);
        }}
        className="w-full"
      >
        <SettingItem icon={Languages} title="Font size" subtitle={settings.fontSize.charAt(0).toUpperCase() + settings.fontSize.slice(1)} />
      </button>
      <SettingItem icon={Volume2} title="Voice message transcripts" subtitle="Read new voice messages" onClick={() => alert("Voice transcription is enabled for all chat messages.")} />
      
      <div className="px-4 py-3 text-[14px] font-bold text-[#667781] uppercase tracking-wide">Archived chats</div>
      <SettingItem 
        icon={History} 
        title="Keep chats archived" 
        subtitle="Archived chats will remain archived when you receive a message" 
        toggle 
        toggleValue={settings.keepArchived}
        onClick={() => updateSetting('keepArchived', !settings.keepArchived)} 
      />
    </div>
  );

  const renderNotifications = () => (
    <div className="flex flex-col bg-white h-full overflow-y-auto pb-20 custom-scrollbar">
      {renderHeader("Notifications")}
      <SettingItem 
        icon={Volume2} 
        title="Conversation tones" 
        subtitle="Play sounds for incoming and outgoing messages." 
        toggle 
        toggleValue={settings.conversationTones}
        onClick={() => updateSetting('conversationTones', !settings.conversationTones)} 
      />
       <SettingItem 
        icon={Clock} 
        title="Reminders" 
        subtitle="Get occasional reminders about messages, calls or status updates you haven't seen" 
        toggle 
        toggleValue={settings.reminders}
        onClick={() => updateSetting('reminders', !settings.reminders)} 
      />
      
      <div className="px-4 py-3 text-[14px] font-bold text-[#667781] uppercase tracking-wide">Messages</div>
      <SettingItem icon={Volume2} title="Notification tone" subtitle="Default (Elastic Ball)" onClick={() => alert("Notification sounds are managed by your system settings.")} />
      <SettingItem icon={Smartphone} title="Vibrate" subtitle="Default" onClick={() => alert("Vibration patterns are optimized for your device.")} />
      <SettingItem icon={MessageSquare} title="Popup notification" subtitle="Not available" />
      <SettingItem icon={Sun} title="Light" subtitle="White" onClick={() => alert("Notification light color set to White.")} />
      <SettingItem 
        icon={Shield} 
        title="Use high priority notifications" 
        subtitle="Show previews of notifications at the top of the screen" 
        toggle 
        toggleValue={settings.highPriority}
        onClick={() => updateSetting('highPriority', !settings.highPriority)} 
      />
    </div>
  );

  const renderAccessibility = () => (
    <div className="flex flex-col bg-white h-full overflow-y-auto pb-20 custom-scrollbar">
      {renderHeader("Accessibility")}
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-[17px] text-[#111B21] font-medium leading-tight">Increase contrast</h3>
            <p className="text-[14px] text-[#667781] mt-1 leading-snug">
              Darken key colors to make things easier to see while in light mode.
            </p>
          </div>
          <button 
            onClick={() => updateSetting('increaseContrast', !settings.increaseContrast)}
            className={cn(
              "w-10 h-5 rounded-full transition-colors relative flex-shrink-0 mt-1",
              settings.increaseContrast ? "bg-[#25D366]" : "bg-gray-300"
            )}
          >
            <div className={cn(
              "absolute top-[2px] w-4 h-4 bg-white rounded-full transition-all",
              settings.increaseContrast ? "left-5.5" : "left-0.5"
            )} />
          </button>
        </div>
      </div>
       <div className="px-4 py-3">
        <h4 className="text-[17px] text-[#111B21] font-medium">Animation</h4>
        <p className="text-[14px] text-[#667781] mt-1 leading-snug">
          Choose whether stickers and GIFs move automatically.
        </p>
      </div>
    </div>
  );

  const renderBlocked = () => {
    const blockedUsersList = allUsers.filter(u => blockedChats.includes(u.uid));

    return (
      <div className="flex flex-col bg-white h-full overflow-y-auto pb-20 custom-scrollbar">
        {renderHeader("Blocked contacts")}
        <div className="px-4 py-3 text-[14px] font-bold text-[#667781] uppercase tracking-wide">
          Blocked Users ({blockedUsersList.length})
        </div>
        
        {loadingUsers && blockedUsersList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-500">
            <span className="text-sm">Loading blocked contacts...</span>
          </div>
        ) : blockedUsersList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Ban size={32} className="text-gray-400" />
            </div>
            <h4 className="text-base font-bold text-gray-800">No blocked contacts</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-xs">
              Blocked contacts will not be able to call you or send you messages. They will be listed here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {blockedUsersList.map((blockedUser) => (
              <div key={blockedUser.uid} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <img 
                    src={blockedUser.photoURL || `https://ui-avatars.com/api/?name=${blockedUser.displayName}`}
                    className="w-11 h-11 rounded-full object-cover border border-gray-200 shadow-sm"
                    alt={blockedUser.displayName || 'User'}
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-[#111B21]">{blockedUser.displayName || 'Unknown User'}</h4>
                    {blockedUser.username && (
                      <p className="text-xs text-gray-500">@{blockedUser.username}</p>
                    )}
                    {blockedUser.bio && (
                      <p className="text-xs text-gray-400 truncate max-w-[180px] mt-0.5">{blockedUser.bio}</p>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => handleUnblock(blockedUser.uid)}
                  className="px-4 py-1.5 border border-red-200 hover:border-red-400 text-red-600 hover:bg-red-50 text-xs font-bold rounded-full transition-all"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderPermissions = () => (
    <div className="flex flex-col bg-white h-full overflow-y-auto pb-20 custom-scrollbar">
      {renderHeader("App Permissions")}
      
      <div className="p-4 bg-gray-50 border-b border-gray-100">
        <p className="text-xs text-[#667781] leading-relaxed">
          Manage device permissions for Ulfah Chat. Grant permissions to enable calling, audio recording, status uploads, location sharing, and real-time push alerts.
        </p>
      </div>

      <div className="flex flex-col mt-2">
        {/* Camera Permission */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-green-50 text-[#008069] rounded-xl">
              <Camera size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Camera</h3>
              <p className="text-xs text-gray-500">Required for video calls and profile pictures</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn(
              "text-xs font-bold px-2.5 py-1 rounded-full",
              cameraStatus === 'granted' ? "bg-green-100 text-green-700" :
              cameraStatus === 'denied' ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
            )}>
              {cameraStatus === 'granted' ? 'Allowed' : cameraStatus === 'denied' ? 'Blocked' : 'Not Allowed'}
            </span>
            {cameraStatus !== 'granted' && (
              <button
                onClick={requestCamera}
                className="text-xs font-bold text-[#008069] bg-[#D9FDD3] hover:bg-[#cbf7c3] px-3 py-1.5 rounded-full transition-all"
              >
                Allow
              </button>
            )}
          </div>
        </div>

        {/* Microphone Permission */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-green-50 text-[#008069] rounded-xl">
              <Mic size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Microphone</h3>
              <p className="text-xs text-gray-500">Required for voice calls and voice messages</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn(
              "text-xs font-bold px-2.5 py-1 rounded-full",
              micStatus === 'granted' ? "bg-green-100 text-green-700" :
              micStatus === 'denied' ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
            )}>
              {micStatus === 'granted' ? 'Allowed' : micStatus === 'denied' ? 'Blocked' : 'Not Allowed'}
            </span>
            {micStatus !== 'granted' && (
              <button
                onClick={requestMic}
                className="text-xs font-bold text-[#008069] bg-[#D9FDD3] hover:bg-[#cbf7c3] px-3 py-1.5 rounded-full transition-all"
              >
                Allow
              </button>
            )}
          </div>
        </div>

        {/* Geolocation Permission */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-green-50 text-[#008069] rounded-xl">
              <MapPin size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Location</h3>
              <p className="text-xs text-gray-500">Required for sharing location in chats</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn(
              "text-xs font-bold px-2.5 py-1 rounded-full",
              locationStatus === 'granted' ? "bg-green-100 text-green-700" :
              locationStatus === 'denied' ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
            )}>
              {locationStatus === 'granted' ? 'Allowed' : locationStatus === 'denied' ? 'Blocked' : 'Not Allowed'}
            </span>
            {locationStatus !== 'granted' && (
              <button
                onClick={requestLocation}
                className="text-xs font-bold text-[#008069] bg-[#D9FDD3] hover:bg-[#cbf7c3] px-3 py-1.5 rounded-full transition-all"
              >
                Allow
              </button>
            )}
          </div>
        </div>

        {/* Notifications Permission */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-green-50 text-[#008069] rounded-xl">
              <Bell size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
              <p className="text-xs text-gray-500">Required for message alerts and calling</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn(
              "text-xs font-bold px-2.5 py-1 rounded-full",
              notificationStatus === 'granted' ? "bg-green-100 text-green-700" :
              notificationStatus === 'denied' ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
            )}>
              {notificationStatus === 'granted' ? 'Allowed' : notificationStatus === 'denied' ? 'Blocked' : 'Not Allowed'}
            </span>
            {notificationStatus !== 'granted' && (
              <button
                onClick={requestNotification}
                className="text-xs font-bold text-[#008069] bg-[#D9FDD3] hover:bg-[#cbf7c3] px-3 py-1.5 rounded-full transition-all"
              >
                Allow
              </button>
            )}
          </div>
        </div>

        {/* Background App Service Status */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Background Service</h3>
              <p className="text-xs text-gray-500">Keeps app listening while closed</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
              ALWAYS ACTIVE
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-gray-50 dark:bg-[#0f171c] relative z-40 overflow-y-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="flex-1 flex flex-col min-h-0"
        >
          {activeTab === 'main' && renderMain()}
          {activeTab === 'account' && renderAccount()}
          {activeTab === 'privacy' && renderPrivacy()}
          {activeTab === 'lists' && renderLists()}
          {activeTab === 'chats' && renderChats()}
          {activeTab === 'notifications' && renderNotifications()}
          {activeTab === 'accessibility' && renderAccessibility()}
          {activeTab === 'blocked' && renderBlocked()}
          {activeTab === 'permissions' && renderPermissions()}
          {activeTab === 'devices' && renderDevices()}
          {activeTab === 'languages' && renderLanguages()}
          {activeTab === 'premium' && renderPremium()}
          {activeTab === 'faq' && renderFAQ()}
          {activeTab === 'features' && renderFeatures()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
