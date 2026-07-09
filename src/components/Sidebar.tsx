import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageCircle, 
  ShieldCheck, 
  CircleDashed, 
  Users, 
  Phone, 
  Compass, 
  Share2, 
  MoreHorizontal, 
  Youtube, 
  Facebook, 
  Instagram, 
  ExternalLink,
  Download
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import { UserProfile } from '../types';
import { cn } from '../utils';

interface SidebarProps {
  profile: UserProfile;
  selectedChat?: any;
}

export default function Sidebar({ profile, selectedChat }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const [copied, setCopied] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const handleShare = async () => {
    let shareUrl = window.location.origin;
    let title = 'ChatApp';
    let text = 'Join me on ChatApp!';

    if (selectedChat?.isGroup && selectedChat?.uid) {
      shareUrl = `${window.location.origin}/?join=${selectedChat.uid}`;
      title = selectedChat.displayName || 'Community Invite';
      text = `Join my community "${selectedChat.displayName || 'Community'}" on ChatApp!`;
    }

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
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const navItems = [
    { path: '/', label: 'Chats', icon: MessageCircle },
    { path: '/status', label: 'Updates', icon: CircleDashed },
    { path: '/contacts', label: 'Communities', icon: Users },
    { path: '/explore', label: 'Explore', icon: Compass },
    { path: '/downloads', label: 'Downloads', icon: Download },
  ];

  if (profile.role === 'admin' || profile.email === 'abdulrehmanhabib.com@gmail.com' || profile.email === 'teemabdulrehman.com@gmail.com') {
    navItems.push({ path: '/admin', label: 'Admin', icon: ShieldCheck });
  }

  return (
    <>
      {showMore && (
        <div 
          className="fixed inset-0 z-40 bg-black/10 dark:bg-black/30 backdrop-blur-[2px]" 
          onClick={() => setShowMore(false)} 
        />
      )}
      
      <div className="fixed-footer w-full bg-white/80 dark:bg-[#111b21]/80 backdrop-blur-xl border-t border-gray-100 dark:border-white/5 flex flex-col items-center z-50 safe-area-bottom shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
        <div className="flex flex-row items-center justify-around w-full max-w-screen-xl mx-auto h-[65px] px-2 relative">
          
          {/* Floating Dropdown Popover */}
          <AnimatePresence>
            {showMore && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute bottom-[75px] right-4 w-64 bg-white dark:bg-[#222e35] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-gray-100 dark:border-white/10 py-2 z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="px-4 py-2 border-b border-gray-100 dark:border-white/5">
                  <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Connect & Share</h4>
                </div>
                
                {/* 1. Follow on WhatsApp */}
                <a
                  href="https://whatsapp.com/channel/0029Vb84Skx7NoZxmLHWPI1K"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowMore(false)}
                  className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#182229] flex items-center justify-between group transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-[#00a884] rounded-lg">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Follow on WhatsApp</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-[#00a884] transition-colors" />
                </a>

                {/* 2. Subscribe on YouTube */}
                <a
                  href="https://youtube.com/@ulfhachat"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowMore(false)}
                  className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#182229] flex items-center justify-between group transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-50 dark:bg-red-950/40 text-red-600 rounded-lg">
                      <Youtube className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Sub on YouTube</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-red-600 transition-colors" />
                </a>

                {/* 3. Follow on Facebook */}
                <a
                  href="https://www.facebook.com/share/19UFkJK6wE/"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowMore(false)}
                  className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#182229] flex items-center justify-between group transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-lg">
                      <Facebook className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Follow on Facebook</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-blue-600 transition-colors" />
                </a>

                {/* 4. Follow on Instagram */}
                <a
                  href="https://www.instagram.com/ulfhachat?igsh=aGZnNnZ0bDVlZmI="
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowMore(false)}
                  className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#182229] flex items-center justify-between group transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-pink-50 dark:bg-pink-950/40 text-pink-600 rounded-lg">
                      <Instagram className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Follow on Instagram</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-pink-600 transition-colors" />
                </a>

                <div className="h-px bg-gray-100 dark:bg-white/5 my-1" />

                {/* 5. Share App */}
                <button
                  onClick={() => {
                    setShowMore(false);
                    handleShare();
                  }}
                  className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#182229] flex items-center justify-between group transition-colors text-left w-full"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg transition-colors",
                      copied ? "bg-emerald-100 dark:bg-emerald-950/60 text-[#00a884]" : "bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300"
                    )}>
                      <Share2 className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      {copied ? 'Link Copied!' : 'Share App'}
                    </span>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

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
                    <Icon className={cn("w-6 h-6 transition-transform duration-300", isActive && "scale-110")} />
                  </div>
                  
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-nav-active"
                      className="absolute inset-[-4px] bg-[#D9FDD3] dark:bg-[#075E54]/30 rounded-2xl -z-0"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </div>
                
                <span className={cn(
                  "text-[10px] font-bold mt-1 transition-all duration-300",
                  isActive ? "text-[#075E54] dark:text-emerald-400 opacity-100 scale-100" : "text-[#54656F] opacity-70 scale-95"
                )}>
                  {item.label}
                </span>

                {/* Unread Indicator placeholder */}
                {item.path === '/' && (
                  <div className="absolute top-2 right-1/4 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#111b21]" />
                )}
              </motion.button>
            );
          })}

          {/* More Action Button (Replaces Share) */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowMore(!showMore)}
            className="flex flex-col items-center justify-center flex-1 h-full relative group"
          >
            <div className="relative">
              <div className={cn(
                "p-1.5 rounded-xl transition-all duration-300 relative z-10",
                showMore ? "text-[#00a884]" : "text-[#54656F] group-hover:text-[#00a884]"
              )}>
                <MoreHorizontal className={cn("w-6 h-6 transition-transform duration-300", showMore && "scale-110 text-[#00a884]")} />
              </div>
              
              {showMore && (
                <motion.div
                  layoutId="sidebar-more-active"
                  className="absolute inset-[-4px] bg-[#D9FDD3] dark:bg-[#075E54]/30 rounded-2xl -z-0"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
            </div>
            
            <span className={cn(
              "text-[10px] font-bold mt-1 transition-all duration-300",
              showMore ? "text-[#075E54] dark:text-emerald-400 opacity-100 scale-100" : "text-[#54656F] opacity-70 scale-95"
            )}>
              More
            </span>
          </motion.button>
        </div>
      </div>
    </>
  );
}
