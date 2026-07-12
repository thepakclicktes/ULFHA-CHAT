import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageCircle, 
  ShieldCheck, 
  CircleDashed, 
  Users, 
  Compass, 
  User
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { UserProfile } from '../types';
import { cn } from '../utils';

interface SidebarProps {
  profile: UserProfile;
  selectedChat?: any;
}

const Sidebar = React.memo(({ profile, selectedChat }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'messages'),
      where('receiverId', '==', auth.currentUser.uid),
      where('status', '!=', 'read')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTotalUnread(snapshot.size);
    });

    return () => unsubscribe();
  }, []);

  const navItems = [
    { path: '/', label: 'Chats', icon: MessageCircle },
    { path: '/status', label: 'Updates', icon: CircleDashed },
    { path: '/contacts', label: 'Communities', icon: Users },
    { path: '/explore', label: 'Explore', icon: Compass },
    { path: '/settings', label: 'Profile', icon: User },
  ];

  if (profile.role === 'admin' || profile.email === 'abdulrehmanhabib.com@gmail.com' || profile.email === 'teemabdulrehman.com@gmail.com') {
    navItems.push({ path: '/admin', label: 'Admin', icon: ShieldCheck });
  }

  return (
    <>
      <div className="fixed-footer w-full bg-white/80 dark:bg-[#111b21]/80 backdrop-blur-xl border-t border-gray-100 dark:border-white/5 flex flex-col items-center z-50 safe-area-bottom shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
        <div className="flex flex-row items-center justify-around w-full max-w-screen-xl mx-auto h-[55px] sm:h-[65px] px-2 relative">

          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            const Icon = item.icon;
            
            return (
              <motion.button
                key={item.path}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center justify-center flex-1 h-full relative group"
              >
                <div className="relative">
                  <div className={cn(
                    "p-1.5 rounded-xl transition-all duration-300 relative z-10",
                    isActive ? "text-[#00a884]" : "text-[#54656F] group-hover:text-[#00a884]"
                  )}>
                    <Icon className={cn("w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300", isActive && "scale-110")} />
                  </div>
                  
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-nav-active"
                      className="absolute inset-[-4px] bg-[#dcf8c6] dark:bg-[#075E54]/30 rounded-2xl -z-0 shadow-sm"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </div>
                
                <span className={cn(
                  "text-[9px] sm:text-[10px] font-bold mt-1 transition-all duration-300",
                  isActive ? "text-[#075E54] dark:text-emerald-400 opacity-100 scale-100" : "text-[#54656F] opacity-70 scale-95"
                )}>
                  {item.label}
                </span>

                {/* Unread Indicator with Count */}
                {item.path === '/' && totalUnread > 0 && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#FF3B30] text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-lg border-2 border-white dark:border-[#111b21] z-20"
                  >
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </>
  );
});

export default Sidebar;
