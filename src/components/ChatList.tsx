import React, { useState, useEffect, useDeferredValue } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, getDocs, or, orderBy, updateDoc, addDoc, serverTimestamp, limit, doc, setDoc, getDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../firebaseError';
import { UserProfile, GroupOrChannel } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Search, UserPlus, Circle, MoreVertical, Filter, BadgeCheck, Users, Megaphone, Plus, Globe, Check, X, ShieldAlert, Archive, Lock, VolumeX, Pin, CheckCheck, ListPlus, Ban, Eraser, Trash2, MessageSquare, Smartphone, Sparkles } from 'lucide-react';
import { cn, resolveApiUrl } from '../utils';

const ChatSkeleton = () => (
  <div className="flex items-center p-3 border-b border-[#F5F6F6] animate-pulse">
    <div className="w-12 h-12 rounded-full bg-gray-200 mr-3" />
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-1/3" />
      <div className="h-3 bg-gray-100 rounded w-1/2" />
    </div>
  </div>
);

const ChatItem = React.memo(({ 
  chatItem, 
  selectedChat, 
  nicknames, 
  lockedChats, 
  mutedChats, 
  pinnedChats, 
  unreadCounts,
  onSelect,
  onContextMenu,
  onDelete,
  onToggleArchive,
  handleTouchStart,
  handleTouchEnd,
  handleTouchMove
}: {
  chatItem: any;
  selectedChat: any;
  nicknames: Record<string, string>;
  lockedChats: string[];
  mutedChats: string[];
  pinnedChats: string[];
  unreadCounts: Record<string, number>;
  onSelect: (chat: any) => void;
  onContextMenu: (e: React.MouseEvent, chat: any) => void;
  onDelete: (chat: any) => void;
  onToggleArchive: (uid: string) => void;
  handleTouchStart: (e: React.TouchEvent, chat: any) => void;
  handleTouchEnd: () => void;
  handleTouchMove: (e: React.TouchEvent) => void;
}) => {
  const isGrp = chatItem.isGroup;
  const isChnl = chatItem.isChannel;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="relative overflow-hidden chat-item-container"
    >
      {/* Swipe Actions Background */}
      <div className="absolute inset-0 flex">
        <div className="flex-1 bg-[#25D366] flex items-center pl-8 text-white">
          <Archive size={24} />
        </div>
        <div className="flex-1 bg-[#FF3B30] flex items-center justify-end pr-8 text-white">
          <Trash2 size={24} />
        </div>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={(_, info) => {
          const threshold = 80;
          if (info.offset.x > threshold) {
            onToggleArchive(chatItem.uid);
          } else if (info.offset.x < -threshold) {
            if (confirm("Are you sure you want to delete this conversation? This will remove all messages for you.")) {
              onDelete(chatItem);
            }
          }
        }}
        onClick={() => onSelect(chatItem)}
        onContextMenu={(e) => onContextMenu(e, chatItem)}
        onTouchStart={(e) => handleTouchStart(e, chatItem)}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        className={cn(
          "flex items-center p-3 cursor-pointer bg-white dark:bg-[#111b21] hover:bg-[#F5F6F6] dark:hover:bg-[#202c33] transition-colors duration-200 group relative z-10",
          selectedChat?.uid === chatItem.uid && "bg-[#F0F2F5] dark:bg-[#2a3942]"
        )}
      >
        <div className="relative flex-shrink-0">
          <img
            src={chatItem.photoURL || `https://ui-avatars.com/api/?name=${chatItem.displayName}`}
            alt={chatItem.displayName || ''}
            className={cn(
              "w-12 h-12 rounded-full object-cover border-2",
              isGrp ? "border-blue-400" : isChnl ? "border-purple-400" : "border-transparent"
            )}
            referrerPolicy="no-referrer"
          />
          {isGrp && (
            <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1 rounded-full border border-white">
              <Users size={10} />
            </div>
          )}
          {isChnl && (
            <div className="absolute -bottom-1 -right-1 bg-purple-500 text-white p-1 rounded-full border border-white">
              <Megaphone size={10} />
            </div>
          )}
          {!isGrp && !isChnl && chatItem.isOnline && (
            <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-[#25D366] rounded-full border-2 border-white shadow-sm"></div>
          )}
        </div>
        
        <div className="flex-1 min-w-0 ml-3 border-b border-[#F5F6F6] py-2 h-full">
          <div className="flex justify-between items-baseline mb-0.5">
            <h3 className="font-semibold text-[#111B21] truncate text-base flex items-center gap-1.5">
              {nicknames[chatItem.uid] || chatItem.displayName}
              {chatItem.isNoorAI && (
                <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-0.5 animate-pulse">
                  <Sparkles size={10} /> AI
                </span>
              )}
              {chatItem.isWhatsAppContact && (
                <span className="bg-[#25D366] text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-0.5">
                  <MessageSquare size={10} /> WA
                </span>
              )}
              {chatItem.isVerified && <BadgeCheck size={14} className="text-[#3b82f6] fill-[#3b82f6]/10 flex-shrink-0" />}
              {isGrp && <span className="bg-blue-50 text-blue-600 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider">Group</span>}
              {isChnl && <span className="bg-purple-50 text-purple-600 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider">Channel</span>}
            </h3>
            <span className="text-[10px] text-[#667781] font-semibold">
              {chatItem.isNoorAI ? '@noorai' : (isGrp ? `${chatItem.members?.length || 0} members` : isChnl ? 'Megaphone Feed' : (chatItem.isOnline ? 'Online' : 'Offline'))}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[12px] text-[#667781] truncate flex-1 leading-normal">
              {chatItem.bio || chatItem.email || (isGrp ? 'Click to read and message.' : 'Click to read latest announcements.')}
            </p>
            <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
              {lockedChats.includes(chatItem.uid) && <Lock size={12} className="text-[#008069]" />}
              {mutedChats.includes(chatItem.uid) && <VolumeX size={12} className="text-[#8696A0]" />}
              {pinnedChats.includes(chatItem.uid) && <Pin size={12} className="text-[#008069] -rotate-45" />}
              {unreadCounts[chatItem.uid] > 0 && (
                <div className="min-w-[20px] h-5 bg-[#FF3B30] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-lg animate-in zoom-in duration-300 ring-2 ring-white">
                  {unreadCounts[chatItem.uid]}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

interface ChatListProps {
  onSelectChat: (chat: any) => void;
  selectedChat: any | null;
  searchQuery?: string;
  nicknames: Record<string, string>;
  appLogoUrl?: string;
}

export default function ChatList({ onSelectChat, selectedChat, searchQuery = '', nicknames, appLogoUrl }: ChatListProps) {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem('ulfha_recent_chats');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [groups, setGroups] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('ulfha_recent_groups');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modal and creation states
  const [showCreateOption, setShowCreateOption] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showUlfhaModal, setShowUlfhaModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);

  // WhatsApp contact inputs
  const [waName, setWaName] = useState('');
  const [waPhone, setWaPhone] = useState('');
  const [waCountryCode, setWaCountryCode] = useState('+92');

  // Ulfha contact inputs
  const [ulfhaSearch, setUlfhaSearch] = useState('');
  const [ulfhaNickname, setUlfhaNickname] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);

  const handleSaveWhatsAppContact = async () => {
    if (!waName.trim() || !waPhone.trim() || !auth.currentUser) return;
    setIsSavingContact(true);
    try {
      const cleanPhone = (waCountryCode + waPhone).replace(/[^\d+]/g, '');
      const waUid = 'wa_' + cleanPhone.replace(/[^\d]/g, '');
      
      const waProfile = {
        uid: waUid,
        displayName: waName.trim(),
        email: `${waUid}@whatsapp.ulfha`,
        phoneNumber: cleanPhone,
        photoURL: 'https://cdn-icons-png.flaticon.com/512/124/124034.png',
        bio: '🟢 WhatsApp Contact (Saved)',
        isWhatsAppContact: true,
        lastSeen: new Date().toISOString(),
        role: 'user',
        isOnline: true,
        isVerified: true,
        balance: 0,
        experience: 0,
        level: 'Bronze',
        clickCount: 0,
        wallpaper: 'default',
        webPushSubscriptions: []
      };

      const contactData = {
        nickname: waName.trim(),
        isWhatsApp: true
      };

      const response = await fetch(resolveApiUrl('/api/whatsapp/save-contact'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          waUid,
          waProfile,
          userId: auth.currentUser.uid,
          contactData,
          systemMessageText: `WhatsApp contact saved: ${waName}`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save contact via server');
      }
      
      setShowWhatsAppModal(false);
      setWaName('');
      setWaPhone('');
      alert("WhatsApp contact saved and added to recent chats!");
    } catch (e) {
      console.error("WhatsApp Save Error:", e);
      alert("Failed to save WhatsApp contact: " + String(e));
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleSaveUlfhaContact = async () => {
    if (!ulfhaSearch.trim() || !ulfhaNickname.trim() || !auth.currentUser) return;
    setIsSavingContact(true);
    try {
      const lowerSearch = ulfhaSearch.trim().toLowerCase();
      const q = query(
        collection(db, 'users'),
        or(
          where('email', '==', lowerSearch),
          where('username', '==', lowerSearch)
        ),
        limit(1)
      );
      
      const snap = await getDocs(q);
      if (snap.empty) {
        alert("User not found with that email or username.");
        return;
      }
      
      const targetUser = { uid: snap.docs[0].id, ...snap.docs[0].data() } as any;
      
      // Use server API for Ulfha contacts too to avoid permission issues and get system message
      const contactData = {
        nickname: ulfhaNickname.trim()
      };

      const response = await fetch(resolveApiUrl('/api/whatsapp/save-contact'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          waUid: targetUser.uid,
          waProfile: targetUser, // Already exists but ensure it's synced
          userId: auth.currentUser.uid,
          contactData,
          systemMessageText: `Ulfha contact saved as: ${ulfhaNickname}`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save contact via server');
      }

      setShowUlfhaModal(false);
      setUlfhaSearch('');
      setUlfhaNickname('');
      alert("Ulfha contact saved and added to recent chats!");
    } catch (e) {
      console.error("Ulfha Save Error:", e);
      alert("Failed to save Ulfha contact: " + String(e));
    } finally {
      setIsSavingContact(false);
    }
  };

  // Group creation inputs
  const [groupName, setGroupName] = useState('');
  const [groupBio, setGroupBio] = useState('');
  const [groupIsPublic, setGroupIsPublic] = useState(true);
  const [allUsersForSelection, setAllUsersForSelection] = useState<UserProfile[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Channel creation inputs
  const [channelName, setChannelName] = useState('');
  const [channelBio, setChannelBio] = useState('');
  const [channelIsPublic, setChannelIsPublic] = useState(true);

  // Discover state
  const [publicChats, setPublicChats] = useState<any[]>([]);
  const [discoverSearchTerm, setDiscoverSearchTerm] = useState('');

  // Context Menu and Interaction States
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    chat: any;
  } | null>(null);

  const [showArchivedOnly, setShowArchivedOnly] = useState(false);

  // Preference arrays persisted in localStorage
  const [pinnedChats, setPinnedChats] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ulfah_pinned_chats');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [archivedChats, setArchivedChats] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ulfah_archived_chats');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [mutedChats, setMutedChats] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ulfah_muted_chats');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [lockedChats, setLockedChats] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ulfah_locked_chats');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [unreadChats, setUnreadChats] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ulfah_unread_chats');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [blockedChats, setBlockedChats] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ulfah_blocked_chats');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const togglePinChat = (uid: string) => {
    setPinnedChats(prev => {
      const next = prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid];
      localStorage.setItem('ulfah_pinned_chats', JSON.stringify(next));
      return next;
    });
  };

  const toggleArchiveChat = (uid: string) => {
    setArchivedChats(prev => {
      const next = prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid];
      localStorage.setItem('ulfah_archived_chats', JSON.stringify(next));
      return next;
    });
  };

  const toggleMuteChat = (uid: string) => {
    setMutedChats(prev => {
      const next = prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid];
      localStorage.setItem('ulfah_muted_chats', JSON.stringify(next));
      return next;
    });
  };

  const toggleLockChat = (uid: string) => {
    setLockedChats(prev => {
      const next = prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid];
      localStorage.setItem('ulfah_locked_chats', JSON.stringify(next));
      return next;
    });
  };

  const toggleUnreadChat = (uid: string) => {
    setUnreadChats(prev => {
      const next = prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid];
      localStorage.setItem('ulfah_unread_chats', JSON.stringify(next));
      return next;
    });
  };

  const toggleBlockChat = (uid: string) => {
    setBlockedChats(prev => {
      const next = prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid];
      localStorage.setItem('ulfah_blocked_chats', JSON.stringify(next));
      return next;
    });
  };

  // Mobile Long-Press Logic
  const longPressTimeout = React.useRef<any>(null);
  const longPressActive = React.useRef(false);
  const chatTouchStartPos = React.useRef({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent, chat: any) => {
    longPressActive.current = false;
    const touch = e.touches[0];
    chatTouchStartPos.current = { x: touch.clientX, y: touch.clientY };

    longPressTimeout.current = setTimeout(() => {
      longPressActive.current = true;
      setContextMenu({
        x: touch.clientX,
        y: touch.clientY,
        chat
      });
      if (navigator.vibrate) {
        navigator.vibrate(40);
      }
    }, 600); // 600ms long press threshold
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
    if (longPressActive.current) {
      // Prevent click triggers
      e.preventDefault();
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!longPressTimeout.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - chatTouchStartPos.current.x;
    const dy = touch.clientY - chatTouchStartPos.current.y;
    // Allow up to 10 pixels of wobble before canceling long press
    if (Math.sqrt(dx * dx + dy * dy) > 10) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
  };

  const handleSyncDeviceContacts = async () => {
    // Check if running in an iframe (AI Studio preview)
    const isIframe = window.self !== window.top;
    if (isIframe) {
      alert("Device contacts can only be accessed when the app is opened in a new tab. Please click the 'Open in new tab' icon in the top right corner of the preview frame.");
      return;
    }

    if (!('contacts' in navigator)) {
      alert("Contact Picker API not supported on this browser/device.");
      return;
    }

    try {
      // @ts-ignore - Contact Picker API is experimental in some TS versions
      const props = ['name', 'tel'];
      const opts = { multiple: true };
      // @ts-ignore
      const contacts = await navigator.contacts.select(props, opts);
      
      if (contacts && contacts.length > 0) {
        setIsLoading(true);
        let syncCount = 0;
        
        for (const contact of contacts) {
          const name = contact.name?.[0] || "Unknown Device Contact";
          const rawPhone = contact.tel?.[0] || "";
          const cleanPhone = rawPhone.replace(/[^\d]/g, '');
          
          if (cleanPhone) {
            // Find user by phone number
            // We search for both with and without leading +
            const q = query(collection(db, 'users'), where('phoneNumber', 'in', [`+${cleanPhone}`, cleanPhone]));
            const snap = await getDocs(q);
            
            if (!snap.empty) {
              const targetUser = snap.docs[0];
              // Add to my contacts subcollection
              await setDoc(doc(db, 'users', auth.currentUser!.uid, 'contacts', targetUser.id), {
                nickname: name,
                savedAt: serverTimestamp()
              });
              syncCount++;
            }
          }
        }
        alert(`Successfully synced ${syncCount} contacts from your device!`);
      }
    } catch (err: any) {
      console.error('Contact selection failed:', err);
      if (err.name !== 'AbortError') {
        alert("Could not access device contacts: " + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const [allRegisteredUsers, setAllRegisteredUsers] = useState<UserProfile[]>([]);


  // Sync internal search with prop search from header
  useEffect(() => {
    if (searchQuery !== undefined) {
      setSearchTerm(searchQuery);
    }
  }, [searchQuery]);

  // Load quick selection users (contacts) when opening group modal
  useEffect(() => {
    if (showGroupModal) {
      const loadUsers = async () => {
        try {
          const snap = await getDocs(query(collection(db, 'users'), limit(50)));
          const userList = snap.docs
            .map(d => ({ uid: d.id, ...d.data() } as UserProfile))
            .filter(u => u.uid !== auth.currentUser?.uid);
          setAllUsersForSelection(userList);
        } catch (e) {
          console.error("Failed to load user list for group selection", e);
        }
      };
      loadUsers();
    }
  }, [showGroupModal]);

  // Load public groups & channels for Discover Modal
  useEffect(() => {
    if (showDiscoverModal) {
      const loadDiscover = async () => {
        try {
          const snap = await getDocs(query(collection(db, 'groups'), where('isPublic', '==', true), limit(30)));
          const list = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
          setPublicChats(list);
        } catch (e) {
          console.error("Failed to load public chats:", e);
        }
      };
      loadDiscover();
    }
  }, [showDiscoverModal]);

  // Real-time listener for current user's direct messages (recent chats)
  useEffect(() => {
    if (!auth.currentUser) return;

    // Immediately load cached users and groups for instant offline display
    try {
      const cachedUsersStr = localStorage.getItem(`cached_users_${auth.currentUser.uid}`);
      if (cachedUsersStr) {
        setUsers(JSON.parse(cachedUsersStr));
      }
      const cachedGroupsStr = localStorage.getItem(`cached_groups_${auth.currentUser.uid}`);
      if (cachedGroupsStr) {
        setGroups(JSON.parse(cachedGroupsStr));
      }
    } catch (e) {
      console.warn('Failed to pre-load cached users or groups:', e);
    }

    const q = query(
      collection(db, 'messages'),
      or(
        where('senderId', '==', auth.currentUser.uid),
        where('receiverId', '==', auth.currentUser.uid)
      ),
      limit(150)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      setIsLoading(true);
      const activeUserIds = new Set<string>();
      const counts: Record<string, number> = {};
      
      // Sort documents client-side by timestamp descending to ensure we process newest first if needed
      const docs = [...snapshot.docs];
      docs.sort((a, b) => {
        const tA = a.data().timestamp?.seconds || 0;
        const tB = b.data().timestamp?.seconds || 0;
        return tB - tA;
      });

      docs.forEach(async (d) => {
        const data = d.data();
        if (data.senderId !== auth.currentUser?.uid && !data.receiverId?.startsWith('group_') && !data.receiverId?.startsWith('channel_') && !data.isGroupMode && !data.isChannelMode) {
          activeUserIds.add(data.senderId);
        }
        if (data.receiverId !== auth.currentUser?.uid && !data.receiverId?.startsWith('group_') && !data.receiverId?.startsWith('channel_') && !data.isGroupMode && !data.isChannelMode) {
          activeUserIds.add(data.receiverId);
        }

        // Mark messages as delivered (Read Receipts Logic)
        if (data.receiverId === auth.currentUser?.uid && data.status === 'sent') {
          try {
            await updateDoc(d.ref, { status: 'delivered' });
          } catch (e) {
            console.error('Failed to update delivery status:', e);
          }
        }

        // Unread counts for DMs
        if (data.receiverId === auth.currentUser?.uid && data.status !== 'read') {
          counts[data.senderId] = (counts[data.senderId] || 0) + 1;
        }
      });

      setUnreadCounts(counts);

      if (activeUserIds.size === 0) {
        setUsers([]);
        setIsLoading(false);
        return;
      }

      try {
        // Fetch user profiles for active conversations
        const userQueries = Array.from(activeUserIds).map(uid => getDocs(query(collection(db, 'users'), where('__name__', '==', uid))));
        const userSnaps = await Promise.all(userQueries);
        const activeUsers = userSnaps.flatMap(snap => snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
        
        setUsers(activeUsers);
        // Cache newly loaded user profiles locally
        try {
          localStorage.setItem(`cached_users_${auth.currentUser.uid}`, JSON.stringify(activeUsers));
        } catch (e) {
          console.warn('Failed to save user profiles to local cache:', e);
        }
      } catch (err) {
        console.warn('Failed to fetch active users profiles online, keeping current display:', err);
      }
      setIsLoading(false);
    }, (error) => {
      setIsLoading(false);
      handleFirestoreError(error, OperationType.LIST, 'messages');
      // If Firestore subscription failed or went offline, read from local cache
      try {
        const cachedUsersStr = localStorage.getItem(`cached_users_${auth.currentUser?.uid}`);
        if (cachedUsersStr) {
          setUsers(JSON.parse(cachedUsersStr));
        }
      } catch (e) {
        console.warn('Failed to load cached users on Firestore subscription error:', e);
      }
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  // Real-time listener for Groups and Channels
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'groups'),
      where('members', 'array-contains', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));
      setGroups(list);
      // Cache newly loaded groups locally
      try {
        localStorage.setItem(`cached_groups_${auth.currentUser?.uid}`, JSON.stringify(list));
      } catch (e) {
        console.warn('Failed to save groups to local cache:', e);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'groups');
      // Fallback to cached groups when offline or subscription fails
      try {
        const cachedGroupsStr = localStorage.getItem(`cached_groups_${auth.currentUser?.uid}`);
        if (cachedGroupsStr) {
          setGroups(JSON.parse(cachedGroupsStr));
        }
      } catch (e) {
        console.warn('Failed to load cached groups on Firestore subscription error:', e);
      }
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  const handleSelectChatLocal = async (chatItem: any) => {
    if (chatItem.isVirtual) {
      try {
        const { isVirtual, ...profileData } = chatItem;
        
        const response = await fetch(resolveApiUrl('/api/whatsapp/save-contact'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            waUid: chatItem.uid,
            waProfile: {
              ...profileData,
              isWhatsAppContact: true,
              bio: '🟢 Active WhatsApp click-to-chat contact',
              lastSeen: new Date().toISOString()
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to persist contact via server');
        }

        // Select the newly persisted chat
        onSelectChat({
          ...profileData,
          isWhatsAppContact: true,
          bio: '🟢 Active WhatsApp click-to-chat contact'
        });
        // Remove from search virtual list
        setSearchResults(prev => prev.map(item => item.uid === chatItem.uid ? { ...item, isVirtual: false } : item));
        return;
      } catch (err) {
        console.error("Failed to persist virtual WhatsApp contact, but proceeding to open chat anyway:", err);
        // Proceed to open chat even if persistence fails, as per user request to fix click-to-chat
        onSelectChat({
          ...chatItem,
          isWhatsAppContact: true,
          bio: '🟢 WhatsApp contact (unsaved)'
        });
      }
    }
    onSelectChat(chatItem);
  };

  // Run real-time automatic search whenever searchTerm changes
  useEffect(() => {
    const triggerSearch = async () => {
      if (!deferredSearchTerm.trim() || !auth.currentUser) {
        setSearchResults([]);
        return;
      }
      setIsLoading(true);
      try {
        const cleanSearch = deferredSearchTerm.trim();
        const lowerSearch = cleanSearch.toLowerCase();
        const cleanPhone = cleanSearch.replace(/[^\d+]/g, '');

        // To search with absolute reliability across any number of users, we use a multi-path query strategy:
        // 1. Prefix query on username
        // 2. Prefix query on email
        // 3. Prefix query on displayName
        // 4. Exact query on username
        // 5. Exact query on email
        // 6. Local substring fallback from a scan
        const queryPromises = [];

        // Prefix query on username
        queryPromises.push(
          getDocs(query(
            collection(db, 'users'),
            where('username', '>=', lowerSearch),
            where('username', '<=', lowerSearch + '\uf8ff'),
            limit(100)
          )).catch(err => {
            console.warn("Username prefix query failed:", err);
            return null;
          })
        );

        // Prefix query on email
        queryPromises.push(
          getDocs(query(
            collection(db, 'users'),
            where('email', '>=', lowerSearch),
            where('email', '<=', lowerSearch + '\uf8ff'),
            limit(100)
          )).catch(err => {
            console.warn("Email prefix query failed:", err);
            return null;
          })
        );

        // Exact query on username
        queryPromises.push(
          getDocs(query(
            collection(db, 'users'),
            where('username', '==', lowerSearch),
            limit(10)
          )).catch(err => {
            console.warn("Username exact query failed:", err);
            return null;
          })
        );

        // Exact query on email
        queryPromises.push(
          getDocs(query(
            collection(db, 'users'),
            where('email', '==', lowerSearch),
            limit(10)
          )).catch(err => {
            console.warn("Email exact query failed:", err);
            return null;
          })
        );

        // Fallback scan query
        queryPromises.push(
          getDocs(query(collection(db, 'users'), limit(300))).catch(err => {
            console.warn("Users fallback scan failed:", err);
            return null;
          })
        );

        const snapshots = await Promise.all(queryPromises);
        
        // Merge results from all queries
        const mergedUsersMap = new Map<string, UserProfile>();
        
        snapshots.forEach(snapshot => {
          if (!snapshot) return;
          snapshot.docs.forEach(docSnap => {
            const data = docSnap.data();
            const uid = docSnap.id;
            if (uid !== auth.currentUser?.uid) {
              mergedUsersMap.set(uid, { uid, ...data } as UserProfile);
            }
          });
        });

        // Convert to array and run fine-grained client-side filtering for high accuracy
        let results = Array.from(mergedUsersMap.values()).filter(u => {
          const displayNameLower = (u.displayName || '').toLowerCase();
          const emailLower = (u.email || '').toLowerCase();
          const usernameLower = (u.username || '').toLowerCase();
          const phoneClean = (u.phoneNumber || '').replace(/[^\d+]/g, '');

          return (
            displayNameLower.includes(lowerSearch) ||
            emailLower.includes(lowerSearch) ||
            usernameLower.includes(lowerSearch) ||
            (cleanPhone && phoneClean.includes(cleanPhone)) ||
            (cleanSearch && (u.phoneNumber || '').includes(cleanSearch))
          );
        });

        // If search term looks like a phone number and no direct user exists, inject virtual WhatsApp Contact
        const isPhonePattern = /^\+?[\d\s-]{7,20}$/.test(cleanSearch) && /[\d]/.test(cleanSearch);
        if (isPhonePattern) {
          const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
          const exists = results.some(u => {
            const up = u.phoneNumber ? u.phoneNumber.replace(/[^\d+]/g, '') : '';
            return up === cleanPhone || up === formattedPhone;
          });

          if (!exists) {
            results.push({
              uid: 'wa_' + cleanPhone.replace(/[^\d]/g, ''),
              displayName: `WhatsApp: ${cleanSearch}`,
              phoneNumber: cleanSearch,
              email: `wa_${cleanPhone}@whatsapp.local`,
              photoURL: 'https://cdn-icons-png.flaticon.com/512/124/124034.png',
              bio: '🟢 Tap to start WhatsApp Direct Chat',
              balance: 0,
              role: 'user',
              isOnline: true,
              isVerified: true,
              isBanned: false,
              isWhatsAppContact: true,
              isVirtual: true,
              lastSeen: new Date().toISOString(),
              level: 'Bronze',
              experience: 0
            } as any);
          }
        }
        
        const uniqueResults = Array.from(new Map(results.map(u => [u.uid, u])).values());
        setSearchResults(uniqueResults);
      } catch (error) {
        console.error("Auto search failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      triggerSearch();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [deferredSearchTerm, auth.currentUser]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
  };

  // Create Group Handler
  const handleCreateGroup = async () => {
    if (!groupName.trim() || !auth.currentUser) return;
    try {
      const groupUid = 'group_' + Date.now() + Math.random().toString(36).substr(2, 5);
      const newGroupObj = {
        uid: groupUid,
        isGroup: true,
        isChannel: false,
        displayName: groupName.trim(),
        bio: groupBio.trim() || 'Welcome to our Group!',
        creatorId: auth.currentUser.uid,
        members: [auth.currentUser.uid, ...selectedMembers],
        admins: [auth.currentUser.uid],
        isPublic: groupIsPublic,
        createdAt: new Date(),
        photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(groupName)}&backgroundColor=00a884`
      };

      await addDoc(collection(db, 'groups'), newGroupObj);
      
      // Auto-select and notify
      onSelectChat(newGroupObj);
      setGroupName('');
      setGroupBio('');
      setSelectedMembers([]);
      setShowGroupModal(false);
    } catch (e) {
      alert("Failed to create group. Please check rules or connection.");
    }
  };

  // Create Channel Handler
  const handleCreateChannel = async () => {
    if (!channelName.trim() || !auth.currentUser) return;
    try {
      const channelUid = 'channel_' + Date.now() + Math.random().toString(36).substr(2, 5);
      const newChannelObj = {
        uid: channelUid,
        isGroup: false,
        isChannel: true,
        displayName: channelName.trim(),
        bio: channelBio.trim() || 'Welcome to our Broadcast Channel!',
        creatorId: auth.currentUser.uid,
        members: [auth.currentUser.uid],
        admins: [auth.currentUser.uid],
        isPublic: channelIsPublic,
        createdAt: new Date(),
        photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(channelName)}&backgroundColor=003a2e`
      };

      await addDoc(collection(db, 'groups'), newChannelObj);

      // Auto-select and notify
      onSelectChat(newChannelObj);
      setChannelName('');
      setChannelBio('');
      setShowChannelModal(false);
    } catch (e) {
      alert("Failed to create channel. Please check rules or connection.");
    }
  };

  // Join Public Group or Channel
  const handleJoinPublic = async (chat: any) => {
    if (!auth.currentUser) return;
    try {
      // Find the group document ref in collection by its field values (we'll fetch and update)
      const q = query(collection(db, 'groups'), where('uid', '==', chat.uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docRef = snap.docs[0].ref;
        const currentMembers = snap.docs[0].data().members || [];
        if (!currentMembers.includes(auth.currentUser.uid)) {
          const updatedMembers = [...currentMembers, auth.currentUser.uid];
          await updateDoc(docRef, { members: updatedMembers });
          alert(`Successfully joined ${chat.displayName}!`);
        }
        // Force update UI by selecting it
        const joinedChatObj = { ...chat, members: [...currentMembers, auth.currentUser.uid] };
        onSelectChat(joinedChatObj);
        setShowDiscoverModal(false);
      }
    } catch (e) {
      alert("Error joining: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  // Toggle selection for group member
  const toggleMemberSelection = (uid: string) => {
    setSelectedMembers(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  // Virtual Noor AI Assistant Chat Item
  const noorAIChatItem = {
    uid: 'noorai_assistant',
    displayName: 'Noor AI',
    username: 'noorai',
    isNoorAI: true,
    photoURL: appLogoUrl || '/logo.png',
    bio: '✨ Online Islamic Assistant - Talk to me!',
    isOnline: true,
    lastSeen: new Date().toISOString()
  };

  // Combine both user profiles and group collections for unified display listing
  const allChats = [noorAIChatItem, ...users, ...groups];

  // Apply visual category filters - Default to showing all
  let filteredChats = allChats;

  const displayedChats = searchTerm
    ? [
        ...searchResults,
        ...allChats.filter(c => 
          c.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
          (c.email && c.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (c.username && c.username?.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (c.bio && c.bio?.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      ]
    : filteredChats;

  // Deduplicate chats
  const deduplicatedChats = Array.from(new Map(displayedChats.map(c => [c.uid, c])).values());

  // Filter based on blocked list
  const nonBlockedChats = deduplicatedChats.filter(c => !blockedChats.includes(c.uid));

  // Filter based on Archive state
  const finalChats = showArchivedOnly 
    ? nonBlockedChats.filter(c => archivedChats.includes(c.uid))
    : nonBlockedChats.filter(c => !archivedChats.includes(c.uid));

  // Sort: Pinned chats at the very top
  const uniqueDisplayedChats = [...finalChats].sort((a, b) => {
    const aPinned = pinnedChats.includes(a.uid);
    const bPinned = pinnedChats.includes(b.uid);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });

  // Filter public search inside Discover Modal
  const filteredPublicChats = discoverSearchTerm
    ? publicChats.filter(c => 
        c.displayName?.toLowerCase().includes(discoverSearchTerm.toLowerCase()) ||
        c.bio?.toLowerCase().includes(discoverSearchTerm.toLowerCase())
      )
    : publicChats;

  const menuWidth = 224;
  const menuHeight = 360;

  let adjustedX = contextMenu ? contextMenu.x : 0;
  let adjustedY = contextMenu ? contextMenu.y : 0;

  if (contextMenu) {
    if (adjustedX + menuWidth > window.innerWidth) {
      adjustedX = window.innerWidth - menuWidth - 10;
    }
    if (adjustedY + menuHeight > window.innerHeight) {
      adjustedY = window.innerHeight - menuHeight - 10;
    }
    if (adjustedX < 10) adjustedX = 10;
    if (adjustedY < 10) adjustedY = 10;
  }

  const handleDeleteChat = async (chat: any) => {
    if (!auth.currentUser) return;
    
    try {
      setIsLoading(true);
      // Fetch messages for this conversation
      const q = query(
        collection(db, 'messages'),
        or(
          where('senderId', '==', auth.currentUser.uid),
          where('receiverId', '==', auth.currentUser.uid)
        )
      );
      
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      let count = 0;
      
      snap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const isParticipant = (data.senderId === chat.uid && data.receiverId === auth.currentUser?.uid) ||
                              (data.senderId === auth.currentUser?.uid && data.receiverId === chat.uid);
        const isGroupMsg = data.receiverId === chat.uid;
        
        if (isParticipant || ((chat.isGroup || chat.isChannel) && isGroupMsg)) {
          batch.delete(docSnap.ref);
          count++;
        }
      });
      
      if (count > 0) {
        await batch.commit();
        alert(`Conversation with ${chat.displayName || 'this user'} deleted successfully. ${count} messages removed.`);
      } else {
        alert("No messages found in this conversation to delete.");
      }
      
      if (selectedChat?.uid === chat.uid) {
        onSelectChat(null);
      }
    } catch (err: any) {
      console.error("Delete failed:", err);
      alert("Failed to delete chat: " + (err.message || String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Top Header of Chat list with Telegram triggers */}
      <div className="px-5 py-4 bg-white flex items-center justify-between border-b border-[#F5F6F6] sticky top-0 z-30">
        <h2 className="text-2xl font-bold text-[#111B21]">Chats</h2>
        <div className="flex items-center gap-3">
          {/* Create button was removed from here */}
        </div>
      </div>

      {/* Search Bar - styled like standard WhatsApp/Telegram, supports real-time global user searches */}
      <div className="px-4 sm:px-5 py-2 sm:py-2.5 bg-white border-b border-[#F5F6F6] z-10">
        <div className="relative flex items-center bg-[#F0F2F5] rounded-xl px-3 py-1.5 sm:py-2 border border-transparent focus-within:border-[#008069] transition-all">
          <Search size={16} className="text-[#667781] mr-2" />
          <input
            id="chat-list-search-input"
            type="text"
            placeholder="Search email, username, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-xs sm:text-sm text-[#111B21] outline-none placeholder:text-[#667781]"
          />
          {searchTerm && (
            <button 
              id="chat-list-clear-search-btn"
              onClick={() => setSearchTerm('')} 
              className="p-0.5 hover:bg-gray-200 rounded-full text-[#667781] transition-all"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>


      {/* MAIN LIST container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        <AnimatePresence mode="popLayout">
          {/* ... existing list content ... */}
        </AnimatePresence>
        
        {/* FAB Create button */}
        <div className="absolute bottom-6 right-6 z-50">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowCreateOption(!showCreateOption)}
            className="w-14 h-14 bg-[#25D366] text-white rounded-full shadow-xl flex items-center justify-center hover:bg-[#128C7E] transition-all duration-300"
          >
            <Plus size={28} className={cn("transition-transform duration-300", showCreateOption && "rotate-45")} />
          </motion.button>
          
          {/* Sub menu popover positioned above the FAB */}
          <AnimatePresence>
            {showCreateOption && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="absolute bottom-16 right-0 mb-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl py-2 z-50 overflow-hidden"
              >
                <button
                  onClick={() => { setShowCreateOption(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-emerald-50 flex items-center gap-3 text-sm text-[#008069] font-bold border-b border-gray-50 transition-colors"
                >
                  <ListPlus size={16} className="text-[#008069]" />
                  <span>View My Contacts</span>
                </button>
                <button
                  onClick={() => { setShowCreateOption(false); handleSyncDeviceContacts(); }}
                  className="w-full text-left px-4 py-3 hover:bg-emerald-50 flex items-center gap-3 text-sm text-[#008069] font-bold border-b border-gray-50 transition-colors"
                >
                  <Smartphone size={16} className="text-[#008069]" />
                  <span>Sync Device Contacts</span>
                </button>
                <button
                  onClick={() => { setShowCreateOption(false); setShowWhatsAppModal(true); }}
                  className="w-full text-left px-4 py-3 hover:bg-emerald-50 flex items-center gap-3 text-sm text-[#111B21] font-bold border-b border-gray-50 transition-colors"
                >
                  <MessageSquare size={16} className="text-[#25D366]" />
                  <span>WhatsApp Contact</span>
                </button>
                <button
                  onClick={() => { setShowCreateOption(false); setShowUlfhaModal(true); }}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-3 text-sm text-[#111B21] font-bold border-b border-gray-50 transition-colors"
                >
                  <UserPlus size={16} className="text-blue-500" />
                  <span>Ulfha Chat Contact</span>
                </button>
                <button
                  onClick={() => { setShowCreateOption(false); setShowGroupModal(true); }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-sm text-[#111B21] font-medium border-b border-gray-50 transition-colors"
                >
                  <Users size={16} className="text-blue-500" />
                  <span>Create Telegram Group</span>
                </button>
                <button
                  onClick={() => { setShowCreateOption(false); setShowChannelModal(true); }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-sm text-[#111B21] font-medium border-b border-gray-50 transition-colors"
                >
                  <Megaphone size={16} className="text-purple-500" />
                  <span>Create Telegram Channel</span>
                </button>
                <button
                  onClick={() => { setShowCreateOption(false); setShowDiscoverModal(true); }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-sm text-[#008069] font-bold transition-colors"
                >
                  <Globe size={16} className="text-emerald-600 animate-pulse" />
                  <span>Discover Public Spaces</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="popLayout">
          {isLoading ? (
            Array.from({ length: 10 }).map((_, i) => <ChatSkeleton key={i} />)
          ) : (
            <div key="chat-list-content">
              {/* Back header for archived view */}
              {showArchivedOnly && (
                <div className="flex items-center gap-3 px-5 py-3.5 bg-gray-50 border-b border-[#F5F6F6] sticky top-0 z-10">
                  <button 
                    onClick={() => setShowArchivedOnly(false)}
                    className="p-1 hover:bg-gray-200 rounded-full transition-colors text-[#54656F]"
                  >
                    <X size={18} />
                  </button>
                  <span className="text-sm font-bold text-[#111B21]">Archived Chats ({archivedChats.length})</span>
                </div>
              )}

              {/* Archived Chats banner row */}
              {!showArchivedOnly && archivedChats.length > 0 && !searchTerm && (
                <div 
                  onClick={() => setShowArchivedOnly(true)}
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 border-b border-[#F5F6F6] transition-colors"
                >
                  <Archive size={18} className="text-[#008069] ml-1" />
                  <div className="flex-1">
                    <span className="text-sm font-bold text-[#111B21]">Archived</span>
                  </div>
                  <span className="text-xs font-bold text-[#008069] bg-[#D9FDD3] px-2 py-0.5 rounded-full">
                    {archivedChats.length}
                  </span>
                </div>
              )}

              {searchTerm && searchResults.length > 0 && (
                <div className="px-6 py-2 text-[10px] font-bold text-[#008069] uppercase tracking-wider bg-[#F0F2F5]/50">
                  Global Search
                </div>
              )}
              
              {!searchTerm && uniqueDisplayedChats.length > 0 && (
                <div className="px-6 py-2 text-[10px] font-bold text-[#667781] uppercase tracking-wider bg-[#F0F2F5]/50">
                  {showArchivedOnly ? "Archived Chats" : "Recent Conversations"}
                </div>
              )}

              {uniqueDisplayedChats.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-12 text-center flex flex-col items-center"
                >
                  <div className="w-20 h-20 bg-[#F0F2F5] rounded-full flex items-center justify-center mb-4 text-[#8696A0] shadow-inner">
                    <Search size={32} />
                  </div>
                  <p className="text-[#111B21] font-bold">
                    {searchTerm ? "No results found" : "No active chats yet"}
                  </p>
                  <p className="text-[#8696A0] text-xs mt-2 max-w-[200px] mx-auto leading-relaxed">
                    {searchTerm 
                      ? "Try searching for a full email address or exact username" 
                      : "Start a conversation, open a telegram Channel or Group from the Create menu!"}
                  </p>
                </motion.div>
              ) : (
                uniqueDisplayedChats.map((chatItem) => (
                  <ChatItem
                    key={chatItem.uid}
                    chatItem={chatItem}
                    selectedChat={selectedChat}
                    nicknames={nicknames}
                    lockedChats={lockedChats}
                    mutedChats={mutedChats}
                    pinnedChats={pinnedChats}
                    unreadCounts={unreadCounts}
                    onSelect={handleSelectChatLocal}
                    onContextMenu={(e, chat) => {
                      e.preventDefault();
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        chat: chat
                      });
                    }}
                    onDelete={handleDeleteChat}
                    onToggleArchive={toggleArchiveChat}
                    handleTouchStart={handleTouchStart}
                    handleTouchEnd={handleTouchEnd}
                    handleTouchMove={handleTouchMove}
                  />
                ))
              )}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* CREATE GROUP DIALOG MODAL */}
      <AnimatePresence>
        {showGroupModal && (
          <div className="fixed inset-0 bg-[#111B21]/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 bg-gradient-to-r from-blue-500 to-[#00a884] text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Create Telegram Group</h3>
                  <p className="text-xs opacity-90 mt-0.5">Everyone can join and message each other</p>
                </div>
                <button onClick={() => setShowGroupModal(false)} className="p-2 hover:bg-black/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Group Title</label>
                  <input
                    type="text"
                    placeholder="E.g., Quran Study Circle"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full bg-[#F0F2F5] py-3 px-4 rounded-xl text-sm focus:ring-2 focus:ring-[#25D366] focus:outline-none focus:bg-white border border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Description (Welcome message/rules)</label>
                  <textarea
                    placeholder="Rules, resources, and brief group mission"
                    value={groupBio}
                    onChange={(e) => setGroupBio(e.target.value)}
                    className="w-full bg-[#F0F2F5] py-3 px-4 rounded-xl text-sm focus:ring-2 focus:ring-[#25D366] focus:outline-none focus:bg-white border border-transparent transition-all h-20 resize-none"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-[#F0F2F5] rounded-2xl">
                  <div>
                    <span className="text-sm font-bold text-[#111B21] block">Public Group</span>
                    <span className="text-xs text-[#667781] block">Anyone can discover and join</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={groupIsPublic}
                    onChange={(e) => setGroupIsPublic(e.target.checked)}
                    className="w-5 h-5 accent-[#25D366] cursor-pointer"
                  />
                </div>

                {/* Member selector */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Select Members to Invite ({selectedMembers.length} selected)</label>
                  <div className="bg-[#F0F2F5] rounded-2xl p-3 max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
                    {allUsersForSelection.length === 0 ? (
                      <p className="text-xs text-[#8696A0] text-center py-4">No contacts found to invite.</p>
                    ) : (
                      allUsersForSelection.map((u) => {
                        const isSelected = selectedMembers.includes(u.uid);
                        return (
                          <div 
                            key={u.uid}
                            onClick={() => toggleMemberSelection(u.uid)}
                            className={cn(
                              "flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all hover:bg-white",
                              isSelected && "bg-white border border-blue-200"
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} alt="" className="w-8 h-8 rounded-full" />
                              <div>
                                <span className="text-xs font-bold text-[#111B21] block">{u.displayName}</span>
                                <span className="text-[10px] text-[#667781] block">{u.email}</span>
                              </div>
                            </div>
                            <div className={cn(
                              "w-5 h-5 rounded-md border flex items-center justify-center transition-colors",
                              isSelected ? "bg-blue-500 border-blue-500 text-white" : "border-gray-300 bg-white"
                            )}>
                              {isSelected && <Check size={12} />}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3 rounded-b-[32px]">
                <button
                  onClick={() => setShowGroupModal(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-[#667781] hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGroup}
                  disabled={!groupName.trim()}
                  className="px-6 py-2.5 bg-[#25D366] text-white hover:bg-[#128C7E] text-sm font-bold rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Group
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE CHANNEL DIALOG MODAL */}
      <AnimatePresence>
        {showChannelModal && (
          <div className="fixed inset-0 bg-[#111B21]/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 bg-gradient-to-r from-purple-600 to-[#00a884] text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Create Telegram Channel</h3>
                  <p className="text-xs opacity-90 mt-0.5">Only you/admins can post announcements</p>
                </div>
                <button onClick={() => setShowChannelModal(false)} className="p-2 hover:bg-black/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Channel Name</label>
                  <input
                    type="text"
                    placeholder="E.g., Daily Hadith broadcast"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    className="w-full bg-[#F0F2F5] py-3 px-4 rounded-xl text-sm focus:ring-2 focus:ring-[#25D366] focus:outline-none focus:bg-white border border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Description</label>
                  <textarea
                    placeholder="Channel content summary, schedule, etc."
                    value={channelBio}
                    onChange={(e) => setChannelBio(e.target.value)}
                    className="w-full bg-[#F0F2F5] py-3 px-4 rounded-xl text-sm focus:ring-2 focus:ring-[#25D366] focus:outline-none focus:bg-white border border-transparent transition-all h-24 resize-none"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-[#F0F2F5] rounded-2xl">
                  <div>
                    <span className="text-sm font-bold text-[#111B21] block">Public Channel</span>
                    <span className="text-xs text-[#667781] block">Anyone can search and subscribe</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={channelIsPublic}
                    onChange={(e) => setChannelIsPublic(e.target.checked)}
                    className="w-5 h-5 accent-[#25D366] cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3 rounded-b-[32px]">
                <button
                  onClick={() => setShowChannelModal(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-[#667781] hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateChannel}
                  disabled={!channelName.trim()}
                  className="px-6 py-2.5 bg-[#25D366] text-white hover:bg-[#128C7E] text-sm font-bold rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Channel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WHATSAPP CONTACT MODAL */}
      <AnimatePresence>
        {showWhatsAppModal && (
          <div className="fixed inset-0 bg-[#111B21]/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 bg-[#25D366] text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <MessageSquare size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Add WhatsApp Contact</h3>
                    <p className="text-xs opacity-90 mt-0.5">Save a direct WhatsApp bridge contact</p>
                  </div>
                </div>
                <button onClick={() => setShowWhatsAppModal(false)} className="p-2 hover:bg-black/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Contact Name</label>
                  <input
                    type="text"
                    placeholder="Enter friend's name..."
                    value={waName}
                    onChange={(e) => setWaName(e.target.value)}
                    className="w-full bg-[#F0F2F5] py-3.5 px-4 rounded-xl text-sm focus:ring-2 focus:ring-[#25D366] focus:outline-none focus:bg-white border border-transparent transition-all font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Phone Number</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="+92"
                      value={waCountryCode}
                      onChange={(e) => setWaCountryCode(e.target.value)}
                      className="w-20 bg-[#F0F2F5] py-3.5 px-3 rounded-xl text-sm focus:ring-2 focus:ring-[#25D366] focus:outline-none focus:bg-white border border-transparent transition-all font-bold text-center"
                    />
                    <input
                      type="text"
                      placeholder="3001234567"
                      value={waPhone}
                      onChange={(e) => setWaPhone(e.target.value)}
                      className="flex-1 bg-[#F0F2F5] py-3.5 px-4 rounded-xl text-sm focus:ring-2 focus:ring-[#25D366] focus:outline-none focus:bg-white border border-transparent transition-all font-bold"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium px-1">Example: +92 300 1234567</p>
                </div>

                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex gap-3 items-start">
                  <Globe size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                    This will create a dedicated WhatsApp bridge profile. You can start chatting instantly without having to search for them again.
                  </p>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3 rounded-b-[32px]">
                <button
                  onClick={() => setShowWhatsAppModal(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-[#667781] hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveWhatsAppContact}
                  disabled={!waName.trim() || !waPhone.trim() || isSavingContact}
                  className="px-8 py-3 bg-[#25D366] text-white hover:bg-[#128C7E] text-sm font-bold rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSavingContact ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : <Check size={18} />}
                  <span>Save Contact</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ULFHA CHAT CONTACT MODAL */}
      <AnimatePresence>
        {showUlfhaModal && (
          <div className="fixed inset-0 bg-[#111B21]/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <UserPlus size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Save Ulfha Contact</h3>
                    <p className="text-xs opacity-90 mt-0.5">Add an existing user with a nickname</p>
                  </div>
                </div>
                <button onClick={() => setShowUlfhaModal(false)} className="p-2 hover:bg-black/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Username or Email</label>
                  <input
                    type="text"
                    placeholder="Search by email or username..."
                    value={ulfhaSearch}
                    onChange={(e) => setUlfhaSearch(e.target.value)}
                    className="w-full bg-[#F0F2F5] py-3.5 px-4 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white border border-transparent transition-all font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Personal Nickname</label>
                  <input
                    type="text"
                    placeholder="E.g. Best Friend, Boss, Brother..."
                    value={ulfhaNickname}
                    onChange={(e) => setUlfhaNickname(e.target.value)}
                    className="w-full bg-[#F0F2F5] py-3.5 px-4 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white border border-transparent transition-all font-bold"
                  />
                  <p className="text-[10px] text-gray-400 font-medium px-1 italic">This name is only visible to you.</p>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3 rounded-b-[32px]">
                <button
                  onClick={() => setShowUlfhaModal(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-[#667781] hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveUlfhaContact}
                  disabled={!ulfhaSearch.trim() || !ulfhaNickname.trim() || isSavingContact}
                  className="px-8 py-3 bg-blue-600 text-white hover:bg-blue-700 text-sm font-bold rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSavingContact ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : <Check size={18} />}
                  <span>Save Profile</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DISCOVER PUBLIC GROUPS & CHANNELS MODAL */}
      <AnimatePresence>
        {showDiscoverModal && (
          <div className="fixed inset-0 bg-[#111B21]/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 bg-gradient-to-r from-emerald-600 to-[#00a884] text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Globe size={22} className="animate-spin-slow text-yellow-300" />
                    <span>Discover Public Spaces</span>
                  </h3>
                  <p className="text-xs opacity-90 mt-0.5">Find and join Telegram-style Groups & Channels instantly!</p>
                </div>
                <button onClick={() => setShowDiscoverModal(false)} className="p-2 hover:bg-black/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Global search in modal */}
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search spaces by name or keyword..."
                    className="w-full bg-[#F0F2F5] py-2.5 pl-11 pr-4 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#25D366] border border-transparent transition-all"
                    value={discoverSearchTerm}
                    onChange={(e) => setDiscoverSearchTerm(e.target.value)}
                  />
                  <Search className="absolute left-4 top-3 text-[#54656F]" size={16} />
                </div>
              </div>

              {/* Public list */}
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-3">
                {filteredPublicChats.length === 0 ? (
                  <div className="text-center py-12 flex flex-col items-center justify-center">
                    <Globe size={48} className="text-gray-300 mb-3 animate-pulse" />
                    <p className="text-sm font-bold text-[#111B21]">No public spaces found</p>
                    <p className="text-xs text-[#8696A0] mt-1">Be the first to create a public Group or Channel!</p>
                  </div>
                ) : (
                  filteredPublicChats.map((space) => {
                    const isAlreadyMember = space.members?.includes(auth.currentUser?.uid);
                    return (
                      <div 
                        key={space.uid}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-[#F2F7F5] transition-all border border-gray-100/50"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                          <img 
                            src={space.photoURL || `https://ui-avatars.com/api/?name=${space.displayName}`} 
                            alt="" 
                            className="w-12 h-12 rounded-full border border-gray-200" 
                          />
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-sm text-[#111B21] hover:text-[#075E54] block truncate flex items-center gap-1.5">
                              {space.displayName}
                              {space.isGroup ? (
                                <span className="bg-blue-50 text-blue-600 text-[8px] font-bold px-1 py-0.5 rounded uppercase font-sans">Group</span>
                              ) : (
                                <span className="bg-purple-50 text-purple-600 text-[8px] font-bold px-1 py-0.5 rounded uppercase font-sans">Channel</span>
                              )}
                            </span>
                            <span className="text-xs text-[#667781] block truncate italic mt-0.5">"{space.bio || 'Discover updates and participate!'}"</span>
                            <span className="text-[10px] text-gray-400 font-bold block mt-1 uppercase tracking-wider">
                              👥 {space.members?.length || 0} members
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => isAlreadyMember ? (onSelectChat(space), setShowDiscoverModal(false)) : handleJoinPublic(space)}
                          className={cn(
                            "px-4.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95",
                            isAlreadyMember 
                              ? "bg-gray-200 text-gray-600 hover:bg-gray-300"
                              : "bg-[#25D366] text-white hover:bg-[#128C7E]"
                          )}
                        >
                          {isAlreadyMember ? 'Open Chat' : 'Join Space'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <>
            {/* Transparent backdrop to catch clicks */}
            <div 
              className="fixed inset-0 z-[300] bg-transparent cursor-default"
              onClick={() => setContextMenu(null)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu(null);
              }}
            />
            
            {/* Context Menu Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              style={{ 
                left: adjustedX, 
                top: adjustedY 
              }}
              className="fixed z-[301] w-56 bg-white border border-gray-200/80 rounded-2xl shadow-xl py-2 overflow-hidden flex flex-col select-none"
            >
              <button
                onClick={() => {
                  toggleArchiveChat(contextMenu.chat.uid);
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-xs text-[#111B21] font-semibold transition-colors"
              >
                <Archive size={14} className="text-gray-500" />
                <span>{archivedChats.includes(contextMenu.chat.uid) ? 'Unarchive chat' : 'Archive chat'}</span>
              </button>

              <button
                onClick={() => {
                  toggleLockChat(contextMenu.chat.uid);
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-xs text-[#111B21] font-semibold transition-colors"
              >
                <Lock size={14} className="text-gray-500" />
                <span>{lockedChats.includes(contextMenu.chat.uid) ? 'Unlock chat' : 'Lock chat'}</span>
              </button>

              <button
                onClick={() => {
                  toggleMuteChat(contextMenu.chat.uid);
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-xs text-[#111B21] font-semibold transition-colors"
              >
                <VolumeX size={14} className="text-gray-500" />
                <span>{mutedChats.includes(contextMenu.chat.uid) ? 'Unmute notifications' : 'Mute notifications'}</span>
              </button>

              <button
                onClick={() => {
                  togglePinChat(contextMenu.chat.uid);
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-xs text-[#111B21] font-semibold transition-colors"
              >
                <Pin size={14} className="text-gray-500 -rotate-45" />
                <span>{pinnedChats.includes(contextMenu.chat.uid) ? 'Unpin chat' : 'Pin chat'}</span>
              </button>

              <button
                onClick={() => {
                  toggleUnreadChat(contextMenu.chat.uid);
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-xs text-[#111B21] font-semibold transition-colors"
              >
                <CheckCheck size={14} className="text-gray-500" />
                <span>{unreadChats.includes(contextMenu.chat.uid) ? 'Mark as read' : 'Mark as unread'}</span>
              </button>

              <button
                onClick={() => {
                  alert("Added to special category list!");
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-xs text-[#111B21] font-semibold transition-colors"
              >
                <ListPlus size={14} className="text-gray-500" />
                <span>Add to list</span>
              </button>

              <div className="border-t border-gray-100 my-1" />

              <button
                onClick={() => {
                  toggleBlockChat(contextMenu.chat.uid);
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-red-50 flex items-center gap-3 text-xs text-red-600 font-semibold transition-colors"
              >
                <Ban size={14} className="text-red-500" />
                <span>{blockedChats.includes(contextMenu.chat.uid) ? 'Unblock user' : 'Block'}</span>
              </button>

              <button
                onClick={() => {
                  if (confirm("Are you sure you want to clear all messages for this chat? This action cannot be undone.")) {
                    alert("Chat cleared successfully!");
                  }
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-red-50 flex items-center gap-3 text-xs text-red-600 font-semibold transition-colors"
              >
                <Eraser size={14} className="text-red-500" />
                <span>Clear chat</span>
              </button>

              <button
                onClick={() => {
                  if (confirm("Are you sure you want to delete this conversation? This will remove all messages for you.")) {
                    handleDeleteChat(contextMenu.chat);
                  }
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-red-50 flex items-center gap-3 text-xs text-red-600 font-semibold transition-colors"
              >
                <Trash2 size={14} className="text-red-500" />
                <span>Delete chat</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
