import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, X, ChevronRight, Sparkles, MessageCircle, Share2 } from 'lucide-react';
import { cn } from '../utils';

// Update this version whenever you make significant changes to the app
const CURRENT_VERSION = '1.4.0';

// List of recent changes to show the user
const LATEST_CHANGES = [
  {
    title: 'Login Fix',
    description: 'Fixed a critical issue where some users were stuck on the loading screen after signing in. Accessing your account is now faster and more reliable.',
    icon: RefreshCw,
    color: 'text-emerald-500'
  },
  {
    title: 'Verse of the Day',
    description: 'A beautiful daily Quranic verse widget is now available in the Explore section.',
    icon: Sparkles,
    color: 'text-amber-500'
  },
  {
    title: 'Visual Improvements',
    description: 'Cleaned up the Explore section and improved overall app performance.',
    icon: Share2,
    color: 'text-blue-500'
  }
];

export default function UpdateNotification() {
  const [showNotification, setShowNotification] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const lastSeenVersion = localStorage.getItem('ulfha_app_version');
    
    // If it's a new version (or first time seeing it), show notification
    if (lastSeenVersion !== CURRENT_VERSION) {
      // Delay slightly for better UX
      const timer = setTimeout(() => setShowNotification(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('ulfha_app_version', CURRENT_VERSION);
    setShowNotification(false);
  };

  const handleViewChanges = () => {
    setShowModal(true);
    setShowNotification(false);
  };

  const handleCloseModal = () => {
    localStorage.setItem('ulfha_app_version', CURRENT_VERSION);
    setShowModal(false);
  };

  return (
    <>
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-4 left-4 right-4 z-[2000] flex justify-center pointer-events-none"
          >
            <div className="bg-white dark:bg-[#202c33] shadow-2xl rounded-2xl p-4 border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-4 max-w-md w-full pointer-events-auto ring-4 ring-emerald-500/10">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                <RefreshCw className="w-6 h-6 animate-spin-slow" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">App Updated! (v{CURRENT_VERSION})</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">Tap to see what's new in Ulfha Chat.</p>
              </div>
              <button 
                onClick={handleViewChanges}
                className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg transition-colors shadow-sm"
              >
                <ChevronRight size={20} />
              </button>
              <button 
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-[#111b21] w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl border border-white/10"
            >
              <div className="bg-emerald-500 p-8 text-white relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <RefreshCw size={120} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Version {CURRENT_VERSION}</span>
                  </div>
                  <h2 className="text-3xl font-black tracking-tight mb-2">What's New?</h2>
                  <p className="text-emerald-50 text-sm opacity-90 leading-relaxed">
                    We've updated Ulfha Chat with new features and improvements to make your experience even better.
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {LATEST_CHANGES.map((change, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex gap-4 items-start"
                  >
                    <div className={cn("p-3 rounded-2xl bg-gray-50 dark:bg-white/5", change.color)}>
                      <change.icon size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">{change.title}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                        {change.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="p-6 bg-gray-50 dark:bg-white/5 flex flex-col gap-3">
                <button
                  onClick={handleCloseModal}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles size={20} />
                  Got it!
                </button>
                <p className="text-[10px] text-center text-gray-400 uppercase tracking-widest font-bold">
                  Thank you for using Ulfha Chat
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
