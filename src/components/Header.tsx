import React, { useState, useEffect } from 'react';
import { Search, MoreVertical, User, Wallet, Shield, Settings, LogOut, X, Camera, Check, Edit2, Key, Trash2, BadgeCheck, Menu, Users, Lock, Megaphone, Plus, Bookmark, UserPlus, ChevronDown, ChevronUp, Sun, Moon, HelpCircle, Phone, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, updateDoc, deleteDoc, collection, addDoc, query, orderBy, onSnapshot, limit, where } from 'firebase/firestore';
import { updatePassword, deleteUser } from 'firebase/auth';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';

interface HeaderProps {
  profile: UserProfile;
  onSearch: (query: string) => void;
  logoUrl?: string;
}

export default function Header({ profile, onSearch, logoUrl }: HeaderProps) {
  const DEFAULT_LOGO = '/logo.png';
  const resolveLogo = (url?: string) => {
    if (!url || url.includes('mosque.png') || url.includes('icons8.com') || url.includes('encrypted-tbn0.gstatic.com')) {
      return DEFAULT_LOGO;
    }
    return url;
  };
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    onSearch(searchQuery);
  }, [searchQuery, onSearch]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newBio, setNewBio] = useState(profile.bio || '');
  const [newName, setNewName] = useState(profile.displayName || '');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // States for premium account drawer sub-modals
  const [isAccountToggled, setIsAccountToggled] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isSecretChatOpen, setIsSecretChatOpen] = useState(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isSavedMessagesOpen, setIsSavedMessagesOpen] = useState(false);
  const [isCallsOpen, setIsCallsOpen] = useState(false);
  const [isFaqOpen, setIsFaqOpen] = useState(false);

  const handleChangePassword = async () => {
    if (!auth.currentUser || !newPassword) return;
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    setIsChangingPassword(true);
    try {
      await updatePassword(auth.currentUser, newPassword);
      alert('Password updated successfully!');
      setNewPassword('');
    } catch (error: any) {
      console.error('Password update failed:', error);
      if (error.code === 'auth/requires-recent-login') {
        alert('Please log out and log back in to change your password for security reasons.');
      } else {
        alert('Failed to update password: ' + error.message);
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return;
    if (!confirm('Are you sure you want to delete your account? This action is permanent and cannot be undone.')) return;
    
    setIsDeletingAccount(true);
    try {
      const uid = auth.currentUser.uid;
      // Delete Firestore data first
      await deleteDoc(doc(db, 'users', uid));
      // Delete Auth account
      await deleteUser(auth.currentUser);
      alert('Account deleted successfully.');
      window.location.href = '/';
    } catch (error: any) {
      console.error('Account deletion failed:', error);
      if (error.code === 'auth/requires-recent-login') {
        alert('Please log out and log back in to delete your account for security reasons.');
      } else {
        alert('Failed to delete account: ' + error.message);
      }
    } finally {
      setIsDeletingAccount(false);
    }
  };

  useEffect(() => {
    setNewBio(profile.bio || '');
    setNewName(profile.displayName || '');
  }, [profile]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const updateBio = async () => {
    if (!profile.uid) return;
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        bio: newBio
      });
      
      // Update local storage cache immediately
      try {
        const primaryCached = localStorage.getItem('ulfha_user_profile');
        if (primaryCached) {
          const parsed = JSON.parse(primaryCached);
          parsed.bio = newBio;
          localStorage.setItem('ulfha_user_profile', JSON.stringify(parsed));
        }
      } catch (e) {
        console.warn('Failed to update local storage in Header bio:', e);
      }

      setIsEditingBio(false);
    } catch (error) {
      console.error('Failed to update bio:', error);
    }
  };

  const updateName = async () => {
    if (!profile.uid) return;
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        displayName: newName
      });
      
      // Update local storage cache immediately
      try {
        const primaryCached = localStorage.getItem('ulfha_user_profile');
        if (primaryCached) {
          const parsed = JSON.parse(primaryCached);
          parsed.displayName = newName;
          localStorage.setItem('ulfha_user_profile', JSON.stringify(parsed));
        }
      } catch (e) {
        console.warn('Failed to update local storage in Header name:', e);
      }

      setIsEditingName(false);
    } catch (error) {
      console.error('Failed to update name:', error);
    }
  };

  const handleToggleTheme = async () => {
    if (!profile.uid) return;
    try {
      const currentTheme = profile.userSettings?.theme || 'light';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      await updateDoc(doc(db, 'users', profile.uid), {
        'userSettings.theme': newTheme
      });
      
      // Also update local cache so it triggers instantly
      try {
        const cached = localStorage.getItem(`user_profile_backup_${profile.uid}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          parsed.userSettings = parsed.userSettings || {};
          parsed.userSettings.theme = newTheme;
          localStorage.setItem(`user_profile_backup_${profile.uid}`, JSON.stringify(parsed));
        }
        
        const primaryCached = localStorage.getItem('ulfha_user_profile');
        if (primaryCached) {
          const parsed = JSON.parse(primaryCached);
          parsed.userSettings = parsed.userSettings || {};
          parsed.userSettings.theme = newTheme;
          localStorage.setItem('ulfha_user_profile', JSON.stringify(parsed));
        }
      } catch (e) {
        console.warn('Failed to update theme in local profile backup:', e);
      }
    } catch (err) {
      console.error('Failed to toggle theme:', err);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.origin;
    const title = 'Ulfah Chat';
    const text = 'Join me on Ulfah Chat - a premium, high-speed instant messaging experience!';
    
    const shareData = { title, text, url: shareUrl };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        console.warn('Web Share failed, falling back to clipboard:', err);
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('App invitation link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const isDark = profile.userSettings?.theme === 'dark';

  return (
    <>
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="fixed-header bg-white/95 dark:bg-[#111b21]/95 backdrop-blur-md text-[#075E54] dark:text-emerald-400 px-4 min-h-[60px] pb-2 flex items-center justify-between z-[100] border-b border-gray-100 dark:border-white/5 safe-area-top"
      >
        <div className="flex items-center justify-between w-full max-w-screen-xl mx-auto">
        <div className="flex items-center gap-3">
          {!isSearchExpanded && (
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="p-2 -ml-1 text-[#54656F] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors focus:outline-none"
              title="Open Account Menu"
              id="header-menu-button"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}
          <AnimatePresence mode="wait">
            {!isSearchExpanded ? (
              <motion.div 
                key="title"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm">
                  <img 
                    src={resolveLogo(logoUrl)} 
                    className="w-full h-full object-cover"
                    alt="Logo"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h1 className="text-[22px] font-bold text-[#25D366] dark:text-emerald-400 tracking-tight">
                  Ulfah Chat
                </h1>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1 flex-1 justify-end">
          <motion.div 
            initial={false}
            animate={{ width: isSearchExpanded ? '100%' : '40px' }}
            className="relative flex items-center justify-end max-w-md"
          >
            <AnimatePresence>
              {isSearchExpanded && (
                <motion.input
                  autoFocus
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#F0F2F5] dark:bg-[#202c33] border-none rounded-full py-2 pl-4 pr-10 text-sm focus:outline-none transition-all placeholder:text-gray-500 text-gray-800 dark:text-gray-100"
                />
              )}
            </AnimatePresence>
            <button 
              onClick={() => setIsSearchExpanded(!isSearchExpanded)}
              className="p-2.5 text-[#54656F] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors relative z-10"
            >
              {isSearchExpanded ? <X className="w-5.5 h-5.5" /> : <Search className="w-5.5 h-5.5" />}
            </button>
          </motion.div>
          
          {!isSearchExpanded && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-2.5 text-[#54656F] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
            >
              <Camera className="w-5.5 h-5.5" />
            </motion.button>
          )}

          <div className="relative flex items-center">
            {/* Real Avatar trigger for account drawer */}
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="w-9 h-9 rounded-full overflow-hidden hover:ring-2 hover:ring-[#25D366] transition-all focus:outline-none ml-1.5 shadow-sm shrink-0"
              title="View Account"
              id="header-avatar-button"
            >
              <img 
                src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}`}
                className="w-full h-full object-cover"
                alt="Account Avatar"
              />
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <div key="drawer-portal" className="fixed inset-0 z-[200]">
                  {/* Backdrop */}
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsMenuOpen(false)}
                    className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-[200]"
                  />
                  
                  {/* Drawer Content - Slides in from Left */}
                  <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                    className="fixed top-0 right-0 h-full w-[310px] bg-white dark:bg-[#1c272d] z-[201] shadow-[-10px_0_30px_rgba(0,0,0,0.15)] flex flex-col pt-0 text-gray-800 dark:text-gray-100 border-l border-gray-100 dark:border-white/5"
                  >
                    {/* Drawer Header (Telegram Style) */}
                    <div className="bg-[#5181b8] dark:bg-[#202c33] p-6 pb-4 text-white flex flex-col select-none safe-area-top shadow-sm">
                      <div className="flex justify-between items-start">
                        {/* Large perfect circle Avatar with white border */}
                        <div 
                          className="w-[68px] h-[68px] rounded-full border-2 border-white/90 overflow-hidden flex items-center justify-center cursor-pointer shadow-md transition-transform duration-200 active:scale-95" 
                          onClick={() => setIsProfileModalOpen(true)}
                        >
                          {profile.photoURL ? (
                            <img 
                              src={profile.photoURL}
                              className="w-full h-full object-cover"
                              alt="Profile"
                            />
                          ) : (
                            <div className="w-full h-full bg-purple-700 dark:bg-purple-800 flex items-center justify-center text-white text-2xl font-semibold">
                              {profile.displayName ? profile.displayName.charAt(0).toUpperCase() : 'A'}
                            </div>
                          )}
                        </div>
                        
                        {/* Dark/Night mode toggle button (Moon icon matching screenshot) */}
                        <motion.button 
                          onClick={handleToggleTheme}
                          whileTap={{ scale: 0.9 }}
                          className="p-1.5 hover:bg-white/10 dark:hover:bg-white/5 rounded-full text-white/95 transition-colors mt-0.5"
                          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        >
                          <motion.div
                            initial={false}
                            animate={{ rotate: isDark ? 180 : 0 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                          >
                            {isDark ? <Sun className="w-5.5 h-5.5 text-amber-400 fill-amber-400/10" /> : <Moon className="w-5.5 h-5.5 text-white/95" />}
                          </motion.div>
                        </motion.button>
                      </div>
                      
                      {/* Display Name & details block matching style */}
                      <div className="mt-5 flex items-center justify-between cursor-pointer group" onClick={() => setIsAccountToggled(!isAccountToggled)}>
                        <div className="flex-1 truncate">
                          <h2 className="text-[16px] font-bold flex items-center gap-1.5 leading-tight text-white/95">
                            <span className="truncate">{profile.displayName || 'Arman'}</span>
                            {profile.isVerified && <BadgeCheck size={16} className="text-blue-300 fill-blue-300/10 flex-shrink-0" />}
                          </h2>
                          <p className="text-white/80 text-xs mt-0.5 font-normal truncate">
                            {profile.phoneNumber || profile.email}
                          </p>
                        </div>
                        <motion.div
                          animate={{ rotate: isAccountToggled ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-white/80 group-hover:text-white pl-2"
                        >
                          <ChevronDown size={18} />
                        </motion.div>
                      </div>
                    </div>

                    {/* Interactive Account Toggling Sub-drawer */}
                    <AnimatePresence>
                      {isAccountToggled && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-[#4572a3] dark:bg-[#111b21] px-6 py-2.5 border-t border-white/10 text-white/90"
                        >
                          <div className="flex items-center justify-between py-2 border-b border-white/5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
                                <img src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}`} className="w-full h-full object-cover" alt="" />
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-white">{profile.displayName}</p>
                                <p className="text-[10px] text-white/60">Active Account</p>
                              </div>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                          </div>
                          <button 
                            onClick={() => alert("Multi-account support is a premium feature. Please contact support to link secondary numbers.")}
                            className="w-full flex items-center gap-3 py-2.5 text-left text-xs font-medium hover:text-white transition-colors"
                          >
                            <div className="p-1 bg-white/10 rounded-full text-white">
                              <Plus size={14} />
                            </div>
                            <span>Add Account</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Drawer Items (Matches the screenshot order and clean styling perfectly) */}
                    <div className="py-2.5 px-2.5 space-y-0.5 bg-white dark:bg-[#1c272d]">
                      {[
                        { icon: User, label: 'My Profile', onClick: () => setIsProfileModalOpen(true) },
                        { icon: Users, label: 'New Group', onClick: () => setIsCreateGroupOpen(true) },
                        { icon: Lock, label: 'New Secret Chat', onClick: () => setIsSecretChatOpen(true) },
                        { icon: Plus, label: 'New Channel', onClick: () => setIsCreateChannelOpen(true) },
                        { icon: Wallet, label: 'Wallet Info', onClick: () => setIsWalletOpen(true) },
                        { icon: Shield, label: 'Security Lock', onClick: () => setIsSecurityModalOpen(true) },
                        { icon: Bookmark, label: 'Saved Messages', onClick: () => setIsSavedMessagesOpen(true) },
                        { icon: Settings, label: 'App Settings', onClick: () => { navigate('/settings'); } },
                        { icon: UserPlus, label: 'Invite Friends', onClick: () => { handleShare(); } },
                        { icon: LogOut, label: 'Logout Account', onClick: handleLogout, isDanger: true },
                      ].map((item, idx) => {
                        const Icon = item.icon;
                        return (
                          <button 
                            key={idx}
                            onClick={() => { item.onClick(); setIsMenuOpen(false); }}
                            className={cn(
                              "w-full px-4.5 py-3 flex items-center gap-6 rounded-lg transition-all duration-150 group text-left select-none",
                              item.isDanger 
                                ? "text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/10 active:bg-red-100/40" 
                                : "text-gray-700 dark:text-gray-200 hover:bg-gray-100/60 dark:hover:bg-white/5 active:bg-gray-200/50 dark:active:bg-white/10"
                            )}
                          >
                            <div className={cn(
                              "shrink-0 transition-colors duration-150",
                              item.isDanger 
                                ? "text-red-500" 
                                : "text-slate-400 dark:text-gray-400 group-hover:text-[#5181b8] dark:group-hover:text-sky-400"
                            )}>
                              <Icon size={20} className="stroke-[1.75]" />
                            </div>
                            <span className={cn(
                              "text-[14.5px] tracking-wide",
                              item.isDanger ? "font-semibold text-red-500" : "font-medium"
                            )}>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.header>

      {/* Profile Modal */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="bg-[#075E54] p-6 text-white flex items-center justify-between">
                <h3 className="text-xl font-bold">Profile</h3>
                <button onClick={() => setIsProfileModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8">
                <div className="flex flex-col items-center mb-8">
                  <div className="relative group">
                    <img 
                      src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}`}
                      className="w-32 h-32 rounded-full border-4 border-[#25D366] shadow-lg object-cover"
                      alt={profile.displayName || ''}
                    />
                    <button className="absolute bottom-0 right-0 p-2 bg-[#25D366] text-white rounded-full shadow-lg hover:bg-[#128C7E] transition-colors">
                      <Camera size={20} />
                    </button>
                  </div>
                  <div className="mt-4 text-center w-full">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      {isEditingName ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="text-2xl font-bold text-gray-800 border-b-2 border-[#25D366] outline-none bg-transparent text-center"
                            autoFocus
                          />
                          <button onClick={updateName} className="text-[#25D366]">
                            <Check size={20} />
                          </button>
                          <button onClick={() => setIsEditingName(false)} className="text-red-400">
                            <X size={20} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <h4 className="text-2xl font-bold text-gray-800 flex items-center gap-1">
                            {profile.displayName}
                            {profile.isVerified && <BadgeCheck size={20} className="text-[#3b82f6] fill-[#3b82f6]/10 flex-shrink-0" />}
                          </h4>
                          <button onClick={() => setIsEditingName(true)} className="text-gray-400 hover:text-[#25D366]">
                            <Edit2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                    <p className="text-gray-500 font-medium">{profile.phoneNumber || 'No phone number'}</p>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-xl border border-green-100 mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#128C7E] text-white rounded-lg">
                      <Wallet size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-green-700 font-bold uppercase tracking-wider">Earning Balance</p>
                      <p className="text-xl font-black text-green-900">PKR {profile.balance?.toLocaleString() || '0'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setIsProfileModalOpen(false); navigate('/wallet'); }}
                    className="text-green-600 font-bold text-sm hover:underline"
                  >
                    View Wallet
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-[#128C7E] uppercase tracking-widest">About / Bio</label>
                      {!isEditingBio ? (
                        <button onClick={() => setIsEditingBio(true)} className="text-gray-400 hover:text-[#128C7E]">
                          <Edit2 size={16} />
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button onClick={() => setIsEditingBio(false)} className="text-red-400">
                            <X size={16} />
                          </button>
                          <button onClick={updateBio} className="text-[#128C7E]">
                            <Check size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                    {isEditingBio ? (
                      <textarea
                        value={newBio}
                        onChange={(e) => setNewBio(e.target.value)}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#25D366] focus:border-transparent outline-none transition-all resize-none"
                        rows={3}
                        placeholder="Tell us about yourself..."
                      />
                    ) : (
                      <p className="text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 italic">
                        {profile.bio || 'Hey there! I am using Ulfah Chat.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="bg-[#075E54] p-6 text-white flex items-center justify-between">
                <h3 className="text-xl font-bold">Settings</h3>
                <button onClick={() => setIsSettingsModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Settings size={20} className="text-gray-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">Dark Mode</p>
                      <p className="text-xs text-gray-500">Toggle dark theme</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      isDarkMode ? "bg-[#25D366]" : "bg-gray-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      isDarkMode ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Settings size={20} className="text-gray-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">Notification Sounds</p>
                      <p className="text-xs text-gray-500">Play sounds for new messages</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      isSoundEnabled ? "bg-[#25D366]" : "bg-gray-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      isSoundEnabled ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Security Modal */}
      <AnimatePresence>
        {isSecurityModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="bg-[#075E54] p-6 text-white flex items-center justify-between">
                <h3 className="text-xl font-bold">Security</h3>
                <button onClick={() => setIsSecurityModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-green-100 text-[#075E54] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield size={40} />
                </div>
                <h4 className="text-xl font-bold text-gray-800 mb-2">Account Verified</h4>
                <p className="text-gray-500 mb-6">Your account is protected with end-to-end encryption and real-time security monitoring.</p>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-left mb-6">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-3">Privacy Settings</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Last Seen</span>
                      <span className="text-sm font-bold text-[#128C7E]">Everyone</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Profile Photo</span>
                      <span className="text-sm font-bold text-[#128C7E]">My Contacts</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Read Receipts</span>
                      <span className="text-sm font-bold text-[#128C7E]">Enabled</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-left">
                    <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Change Password</label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="New Password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#25D366]"
                      />
                      <button
                        onClick={handleChangePassword}
                        disabled={isChangingPassword || !newPassword}
                        className="bg-[#128C7E] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#075E54] disabled:opacity-50"
                      >
                        {isChangingPassword ? 'Updating...' : 'Update'}
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isDeletingAccount}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={18} />
                      {isDeletingAccount ? 'Deleting...' : 'Delete Account Permanently'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sub-modals for Premium Telegram Account Drawer */}
      <AnimatePresence>
        {isSavedMessagesOpen && (
          <SavedMessagesModal 
            isOpen={isSavedMessagesOpen} 
            onClose={() => setIsSavedMessagesOpen(false)} 
            profile={profile} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isWalletOpen && (
          <WalletModal 
            isOpen={isWalletOpen} 
            onClose={() => setIsWalletOpen(false)} 
            profile={profile} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSecretChatOpen && (
          <SecretChatModal 
            isOpen={isSecretChatOpen} 
            onClose={() => setIsSecretChatOpen(false)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCreateGroupOpen && (
          <CreateGroupModal 
            isOpen={isCreateGroupOpen} 
            onClose={() => setIsCreateGroupOpen(false)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCreateChannelOpen && (
          <CreateChannelModal 
            isOpen={isCreateChannelOpen} 
            onClose={() => setIsCreateChannelOpen(false)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCallsOpen && (
          <CallsModal 
            isOpen={isCallsOpen} 
            onClose={() => setIsCallsOpen(false)} 
            profile={profile}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFaqOpen && (
          <FAQModal 
            isOpen={isFaqOpen} 
            onClose={() => setIsFaqOpen(false)} 
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ==========================================
// PREMIUM DRAWER SUB-COMPONENTS
// ==========================================

function SavedMessagesModal({ isOpen, onClose, profile }: { isOpen: boolean, onClose: () => void, profile: any }) {
  const [notes, setNotes] = useState<{ id: string; text: string; createdAt: string }[]>([]);
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    if (isOpen && profile.uid) {
      try {
        const stored = localStorage.getItem(`saved_notes_${profile.uid}`);
        if (stored) {
          setNotes(JSON.parse(stored));
        }
      } catch (e) {
        console.warn('Failed to load saved notes:', e);
      }
    }
  }, [isOpen, profile.uid]);

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const note = {
      id: 'note_' + Date.now(),
      text: newNote.trim(),
      createdAt: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const updatedNotes = [note, ...notes];
    setNotes(updatedNotes);
    localStorage.setItem(`saved_notes_${profile.uid}`, JSON.stringify(updatedNotes));
    setNewNote('');
  };

  const handleDeleteNote = (id: string) => {
    const updatedNotes = notes.filter(n => n.id !== id);
    setNotes(updatedNotes);
    localStorage.setItem(`saved_notes_${profile.uid}`, JSON.stringify(updatedNotes));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-[#1c272d] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
      >
        <div className="bg-[#075E54] dark:bg-[#202c33] p-5 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <Bookmark className="w-5 h-5 text-white" />
            <h3 className="text-lg font-bold text-white">Saved Messages</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5">
            This is your personal cloud storage space. You can store draft messages, links, ideas, or to-do lists here. It is saved securely on this device.
          </p>
          
          <div className="flex gap-2">
            <textarea
              placeholder="Type something to save..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="flex-1 bg-gray-50 dark:bg-[#111b21] border border-gray-200 dark:border-white/5 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#25D366] text-gray-800 dark:text-gray-100 resize-none h-14"
            />
            <button
              onClick={handleAddNote}
              disabled={!newNote.trim()}
              className="bg-[#128C7E] disabled:opacity-50 text-white px-4 rounded-xl text-sm font-bold hover:bg-[#075E54] transition-colors flex items-center justify-center"
            >
              Save
            </button>
          </div>

          <div className="space-y-2.5 pt-2">
            {notes.length === 0 ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500 italic text-sm">
                No saved messages yet. Write your first message above!
              </div>
            ) : (
              notes.map(note => (
                <div key={note.id} className="p-3.5 bg-gray-50 dark:bg-[#202c33] rounded-xl border border-gray-100 dark:border-white/5 group relative transition-all">
                  <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{note.text}</p>
                  <div className="flex justify-between items-center mt-2.5 text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                    <span>{note.createdAt}</span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(note.text);
                          alert('Copied to clipboard');
                        }}
                        className="px-1.5 py-0.5 bg-white dark:bg-[#111b21] hover:bg-gray-100 dark:hover:bg-white/10 rounded border border-gray-100 dark:border-white/5 text-[#128C7E] dark:text-emerald-400 text-[9px] font-bold transition-colors"
                        title="Copy text"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-950/20 rounded text-red-500 transition-colors"
                        title="Delete note"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function WalletModal({ isOpen, onClose, profile }: { isOpen: boolean, onClose: () => void, profile: any }) {
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('easypaisa');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleWithdraw = () => {
    if (!withdrawAmount || isNaN(Number(withdrawAmount)) || Number(withdrawAmount) <= 0) {
      alert('Please enter a valid withdraw amount.');
      return;
    }
    const currentBalance = profile.balance || 0;
    if (Number(withdrawAmount) > currentBalance) {
      alert('Insufficient balance.');
      return;
    }
    if (!paymentDetails.trim()) {
      alert('Please enter your account details/number.');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      alert(`Withdrawal request of PKR ${withdrawAmount} submitted successfully!\nOur team will process it via ${paymentMethod.toUpperCase()} in 24 hours.`);
      setWithdrawAmount('');
      setPaymentDetails('');
      setIsSubmitting(false);
      onClose();
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-[#1c272d] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="bg-[#075E54] dark:bg-[#202c33] p-5 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <Wallet className="w-5 h-5 text-white" />
            <h3 className="text-lg font-bold text-white">Wallet & Earnings</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-gradient-to-br from-emerald-50 to-green-100/50 dark:from-[#2a3942]/20 dark:to-[#202c33]/40 p-5 rounded-2xl border border-green-100/50 dark:border-white/5 flex flex-col items-center text-center shadow-inner">
            <div className="w-12 h-12 bg-[#128C7E] dark:bg-emerald-950/40 text-white dark:text-emerald-400 rounded-full flex items-center justify-center shadow-md mb-2.5">
              <Wallet size={22} />
            </div>
            <p className="text-[11px] text-green-700 dark:text-green-400 font-bold uppercase tracking-wider">Available Balance</p>
            <p className="text-3xl font-black text-green-950 dark:text-white mt-1">PKR {profile.balance?.toLocaleString() || '0'}</p>
          </div>

          <div className="space-y-3.5">
            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-white/5 pb-2">Request Cash Withdrawal</h4>
            
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase block mb-1">Amount (PKR)</label>
                <input
                  type="number"
                  placeholder="Enter amount to withdraw..."
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#111b21] border border-gray-200 dark:border-white/5 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#25D366] text-gray-800 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase block mb-1">Provider Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#111b21] border border-gray-200 dark:border-white/5 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#25D366] text-gray-800 dark:text-gray-100"
                >
                  <option value="easypaisa">EasyPaisa</option>
                  <option value="jazzcash">JazzCash</option>
                  <option value="nayapay">NayaPay</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase block mb-1">Account Details (Number & Holder Name)</label>
                <input
                  type="text"
                  placeholder="e.g. 03001234567 (Ali Khan)"
                  value={paymentDetails}
                  onChange={(e) => setPaymentDetails(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#111b21] border border-gray-200 dark:border-white/5 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#25D366] text-gray-800 dark:text-gray-100"
                />
              </div>
            </div>

            <button
              onClick={handleWithdraw}
              disabled={isSubmitting || !withdrawAmount}
              className="w-full py-3 bg-[#128C7E] hover:bg-[#075E54] disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-colors shadow-sm mt-3"
            >
              {isSubmitting ? 'Processing Request...' : 'Submit Withdrawal Request'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function SecretChatModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-[#1c272d] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-6 text-center border border-gray-100 dark:border-white/5"
      >
        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100 dark:border-amber-900/30 shadow-sm">
          <Lock size={26} />
        </div>
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">New Secret Chat</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
          Secret Chats are private end-to-end encrypted conversations. They leave no traces on our servers, allow self-destruct timers, and forbid forwarding or taking screenshots.
        </p>

        <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/5 text-left mb-6 space-y-3">
          <div className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-300">
            <span className="text-[#128C7E] dark:text-emerald-400 font-bold">●</span>
            <span>Use end-to-end encryption.</span>
          </div>
          <div className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-300">
            <span className="text-[#128C7E] dark:text-emerald-400 font-bold">●</span>
            <span>Leave no trace on our cloud servers.</span>
          </div>
          <div className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-300">
            <span className="text-[#128C7E] dark:text-emerald-400 font-bold">●</span>
            <span>Have an optional self-destruct timer for all messages.</span>
          </div>
          <div className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-300">
            <span className="text-[#128C7E] dark:text-emerald-400 font-bold">●</span>
            <span>Disallow standard forwarding or screen captures.</span>
          </div>
        </div>

        <button
          onClick={() => {
            alert("Secret chat is active! Open any private chat room, click the user profile header, and toggle 'Start Secret Chat' to create an E2EE room.");
            onClose();
          }}
          className="w-full py-3 bg-[#128C7E] text-white rounded-xl font-bold text-sm hover:bg-[#075E54] transition-colors shadow-sm"
        >
          Select contact to invite
        </button>
      </motion.div>
    </div>
  );
}

function CreateGroupModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [groupName, setGroupName] = useState('');
  const [groupBio, setGroupBio] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!groupName.trim()) {
      alert('Please enter a group name.');
      return;
    }
    setIsSubmitting(true);
    try {
      const groupUid = 'group_' + Date.now() + Math.random().toString(36).substring(2, 7);
      const newGroupObj = {
        uid: groupUid,
        isGroup: true,
        isChannel: false,
        displayName: groupName.trim(),
        bio: groupBio.trim() || 'Welcome to our Group!',
        creatorId: auth.currentUser?.uid || 'system',
        members: [auth.currentUser?.uid || 'system'],
        admins: [auth.currentUser?.uid || 'system'],
        isPublic,
        createdAt: new Date(),
        photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(groupName)}&backgroundColor=00a884`
      };
      await addDoc(collection(db, 'groups'), newGroupObj);
      alert(`Community Group "${groupName}" created successfully!\nIt is now visible in the Communities/Chats tab.`);
      setGroupName('');
      setGroupBio('');
      onClose();
    } catch (e: any) {
      alert('Failed creating group: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-[#1c272d] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="bg-[#075E54] dark:bg-[#202c33] p-5 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-white" />
            <h3 className="text-lg font-bold text-white">New Group</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase block mb-1">Group Name</label>
            <input
              type="text"
              placeholder="Enter group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#111b21] border border-gray-200 dark:border-white/5 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#25D366] text-gray-800 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase block mb-1">Group Bio / Description</label>
            <textarea
              placeholder="What is this group about..."
              value={groupBio}
              onChange={(e) => setGroupBio(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#111b21] border border-gray-200 dark:border-white/5 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#25D366] text-gray-800 dark:text-gray-100 resize-none h-20"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Public Group</p>
              <p className="text-xs text-gray-500 dark:text-gray-450">Anyone can discover and join this group</p>
            </div>
            <button 
              onClick={() => setIsPublic(!isPublic)}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                isPublic ? "bg-[#25D366]" : "bg-gray-300 dark:bg-white/10"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                isPublic ? "left-7" : "left-1"
              )} />
            </button>
          </div>

          <button
            onClick={handleCreate}
            disabled={isSubmitting || !groupName}
            className="w-full py-3 bg-[#128C7E] hover:bg-[#075E54] disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-colors shadow-sm mt-2"
          >
            {isSubmitting ? 'Creating Group...' : 'Create Group'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function CreateChannelModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [channelName, setChannelName] = useState('');
  const [channelBio, setChannelBio] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!channelName.trim()) {
      alert('Please enter a channel name.');
      return;
    }
    setIsSubmitting(true);
    try {
      const channelUid = 'channel_' + Date.now() + Math.random().toString(36).substring(2, 7);
      const newChannelObj = {
        uid: channelUid,
        isGroup: false,
        isChannel: true,
        displayName: channelName.trim(),
        bio: channelBio.trim() || 'Welcome to our Channel!',
        creatorId: auth.currentUser?.uid || 'system',
        members: [auth.currentUser?.uid || 'system'],
        admins: [auth.currentUser?.uid || 'system'],
        isPublic,
        createdAt: new Date(),
        photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(channelName)}&backgroundColor=003a2e`
      };
      await addDoc(collection(db, 'groups'), newChannelObj);
      alert(`Broadcast Channel "${channelName}" created successfully!\nIt is now visible in the Communities/Chats tab.`);
      setChannelName('');
      setChannelBio('');
      onClose();
    } catch (e: any) {
      alert('Failed creating channel: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-[#1c272d] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="bg-[#075E54] dark:bg-[#202c33] p-5 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <Megaphone className="w-5 h-5 text-white" />
            <h3 className="text-lg font-bold text-white">New Channel</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase block mb-1">Channel Name</label>
            <input
              type="text"
              placeholder="Enter channel name..."
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#111b21] border border-gray-200 dark:border-white/5 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#25D366] text-gray-800 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase block mb-1">Channel About / Description</label>
            <textarea
              placeholder="What is this channel about..."
              value={channelBio}
              onChange={(e) => setChannelBio(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#111b21] border border-gray-200 dark:border-white/5 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#25D366] text-gray-800 dark:text-gray-100 resize-none h-20"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Public Channel</p>
              <p className="text-xs text-gray-500 dark:text-gray-450">Anyone can search and subscribe to this channel</p>
            </div>
            <button 
              onClick={() => setIsPublic(!isPublic)}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                isPublic ? "bg-[#25D366]" : "bg-gray-300 dark:bg-white/10"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                isPublic ? "left-7" : "left-1"
              )} />
            </button>
          </div>

          <button
            onClick={handleCreate}
            disabled={isSubmitting || !channelName}
            className="w-full py-3 bg-[#128C7E] hover:bg-[#075E54] disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-colors shadow-sm mt-2"
          >
            {isSubmitting ? 'Creating Channel...' : 'Create Channel'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ==========================================
// DRAWER ADDITIONAL MODALS (Calls, FAQ)
// ==========================================

function CallsModal({ isOpen, onClose, profile }: { isOpen: boolean, onClose: () => void, profile: any }) {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !profile?.uid) return;
    const q = query(
      collection(db, 'calls'),
      where('participants', 'array-contains', profile.uid),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const callsData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((call: any) => ['ended', 'missed', 'rejected'].includes(call.status));
      
      callsData.sort((a: any, b: any) => {
        const timeA = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : (a.timestamp instanceof Date ? a.timestamp.getTime() : (typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : 0));
        const timeB = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : (b.timestamp instanceof Date ? b.timestamp.getTime() : (typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : 0));
        return timeB - timeA;
      });
      setCalls(callsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, profile?.uid]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-[#1c272d] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
      >
        <div className="bg-[#5181b8] dark:bg-[#202c33] p-5 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <Phone className="w-5 h-5 text-white" />
            <h3 className="text-lg font-bold text-white">Call History</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <span className="animate-pulse">Loading calls...</span>
            </div>
          ) : calls.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Phone className="w-12 h-12 mx-auto text-gray-350 dark:text-gray-600 mb-3 stroke-[1.2]" />
              <p className="font-semibold text-sm mb-1">No call history yet</p>
              <p className="text-xs text-gray-400 max-w-[240px] mx-auto">Voice and video calls you make or receive will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {calls.map((call) => {
                const isIncoming = call.callerId === profile.uid;
                const date = call.timestamp?.seconds 
                  ? new Date(call.timestamp.seconds * 1000) 
                  : (call.timestamp ? new Date(call.timestamp) : new Date());
                const timeString = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={call.id} className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 hover:border-gray-200 transition-all">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-full",
                        call.status === 'missed' || call.status === 'rejected'
                          ? "bg-red-50 dark:bg-red-950/20 text-red-500"
                          : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500"
                      )}>
                        {call.type === 'video' ? <Video size={16} /> : <Phone size={16} />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                          {isIncoming ? call.callerName : call.receiverName || 'Outgoing Call'}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                          <span>{isIncoming ? 'Incoming' : 'Outgoing'}</span>
                          <span>•</span>
                          <span>{timeString}</span>
                        </div>
                      </div>
                    </div>
                    <span className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-full",
                      call.status === 'missed' || call.status === 'rejected'
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-emerald-100 text-emerald-700 dark:bg-[#D9FDD3] dark:text-emerald-400"
                    )}>
                      {call.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function FAQModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const faqs = [
    {
      q: "What is Ulfah Chat?",
      a: "Ulfah Chat is a modern, high-speed instant messaging web platform built on standard cloud technologies. It features end-to-end secure chats, high-quality voice/video calling, channels, communities, and real-time announcements."
    },
    {
      q: "Is my personal data secure?",
      a: "Yes! Your personal information, profile, and messages are secured using strict Firestore Security Rules, protecting them from unauthorized access."
    },
    {
      q: "How can I start a Voice or Video call?",
      a: "Simply open any conversation in your chats list and click the Phone or Video icon in the top header. The other user will receive a call screen invitation in real time to accept or decline."
    },
    {
      q: "How do I create a new group or channel?",
      a: "Open the Left Drawer Menu by clicking the hamburger icon in the top-left corner. Click 'New Group' or 'New Channel', enter the name and details, and click create."
    },
    {
      q: "Can I use Ulfah Chat across multiple devices?",
      a: "Absolutely! Ulfah Chat syncs your conversations, settings, and profile details across all of your active devices instantly, so you can continue chatting seamlessly from any browser."
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-[#1c272d] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
      >
        <div className="bg-[#5181b8] dark:bg-[#202c33] p-5 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <HelpCircle className="w-5 h-5 text-white" />
            <h3 className="text-lg font-bold text-white">FAQ</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 p-3.5 rounded-xl border border-gray-100 dark:border-white/5 mb-4 leading-relaxed">
            Find answers to frequently asked questions about Ulfah Chat's features, security, and setup.
          </p>

          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div 
                key={idx} 
                className="border border-gray-100 dark:border-white/5 rounded-xl overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full px-4 py-3.5 bg-gray-50/50 dark:bg-[#111b21]/30 hover:bg-gray-100/50 dark:hover:bg-[#111b21]/50 flex items-center justify-between text-left transition-colors text-xs font-bold text-gray-800 dark:text-gray-200"
                >
                  <span>{faq.q}</span>
                  <ChevronDown 
                    size={16} 
                    className={cn(
                      "text-gray-400 transition-transform duration-200",
                      isOpen ? "rotate-180 text-sky-500" : ""
                    )} 
                  />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden bg-white dark:bg-[#1c272d] border-t border-gray-50 dark:border-white/5"
                    >
                      <p className="p-4 text-xs text-gray-600 dark:text-gray-350 leading-relaxed">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
