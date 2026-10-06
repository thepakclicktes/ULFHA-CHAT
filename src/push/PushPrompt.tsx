import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Smartphone } from 'lucide-react';
import { usePush } from './usePush';

interface PushPromptProps {
  userId?: string | null;
}

export default function PushPrompt({ userId }: PushPromptProps) {
  const { supported, permission, subscribed, subscribe } = usePush(userId);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (!supported || permission === 'granted' || permission === 'denied' || subscribed) {
      return;
    }

    // Check localStorage for "Later" or "Denied"
    const pushLaterUntil = localStorage.getItem('ulfah_push_prompt_later');
    if (pushLaterUntil && Date.now() < parseInt(pushLaterUntil, 10)) {
      return;
    }

    // Track page views
    const pageViews = parseInt(localStorage.getItem('ulfah_page_views') || '0', 10) + 1;
    localStorage.setItem('ulfah_page_views', pageViews.toString());

    // Check iOS platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    const standaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

    setIsIOS(iosDevice);
    setIsStandalone(!!standaloneMode);

    // Show after 10 seconds or on 2nd page view
    if (pageViews >= 2) {
      setVisible(true);
    } else {
      const timer = setTimeout(() => {
        setVisible(true);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [supported, permission, subscribed]);

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) {
      setVisible(false);
    }
  };

  const handleLater = () => {
    // Hide for 7 days
    const sevenDays = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem('ulfah_push_prompt_later', sevenDays.toString());
    setVisible(false);
  };

  if (!visible || !supported || permission === 'granted' || permission === 'denied' || subscribed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 bg-[#111B21] border border-[#00A884]/40 text-white p-4 rounded-2xl shadow-2xl backdrop-blur-md animate-slide-up">
      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#00A884]/20 border border-[#00A884]/40 flex items-center justify-center shrink-0 text-[#00A884]">
          <Bell size={20} className="animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            Enable Push Notifications
          </h4>
          <p className="text-xs text-gray-300 mt-1 leading-relaxed">
            Stay updated with new chat messages, prayer reminders, and Islamic community updates.
          </p>

          {isIOS && !isStandalone && (
            <div className="mt-2 p-2 bg-amber-900/30 border border-amber-500/30 rounded-lg text-[11px] text-amber-200 flex items-center gap-1.5">
              <Smartphone size={14} className="shrink-0" />
              <span>iOS Notice: Tap "Share" and "Add to Home Screen" first for push support.</span>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleEnable}
              className="flex-1 bg-[#00A884] hover:bg-[#008f72] text-white py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check size={14} /> Enable
            </button>
            <button
              onClick={handleLater}
              className="bg-[#202C33] hover:bg-[#2a3942] text-gray-300 py-2 px-3 rounded-xl text-xs font-bold transition-all border border-[#2a3942] cursor-pointer"
            >
              Later
            </button>
          </div>
        </div>
        <button
          onClick={handleLater}
          className="text-gray-400 hover:text-white p-1 transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
