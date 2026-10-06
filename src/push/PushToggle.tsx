import React from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { usePush } from './usePush';

interface PushToggleProps {
  userId?: string | null;
  className?: string;
}

export default function PushToggle({ userId, className = '' }: PushToggleProps) {
  const { supported, permission, subscribed, loading, subscribe, unsubscribe } = usePush(userId);

  if (!supported) {
    return (
      <div className={`flex items-center justify-between p-3 bg-[#202C33] rounded-xl border border-[#2a3942] ${className}`}>
        <div className="flex items-center gap-3">
          <BellOff className="text-gray-500" size={18} />
          <div>
            <div className="text-xs font-bold text-gray-400">Push Notifications</div>
            <div className="text-[10px] text-gray-500">Not supported on this browser</div>
          </div>
        </div>
      </div>
    );
  }

  const handleToggle = async () => {
    if (subscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <div className={`flex items-center justify-between p-3 bg-[#202C33] rounded-xl border border-[#2a3942] ${className}`}>
      <div className="flex items-center gap-3">
        {subscribed ? (
          <Bell className="text-[#00A884]" size={18} />
        ) : (
          <BellOff className="text-gray-400" size={18} />
        )}
        <div>
          <div className="text-xs font-bold text-white">Push Notifications</div>
          <div className="text-[10px] text-gray-400">
            {permission === 'denied'
              ? 'Blocked by browser settings'
              : subscribed
              ? 'Active (On)'
              : 'Disabled (Off)'}
          </div>
        </div>
      </div>

      <button
        onClick={handleToggle}
        disabled={loading || permission === 'denied'}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
          subscribed
            ? 'bg-red-900/30 text-red-400 border border-red-800/40 hover:bg-red-900/50'
            : 'bg-[#00A884] text-white hover:bg-[#008f72]'
        } disabled:opacity-50`}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : subscribed ? (
          'Unsubscribe'
        ) : (
          'Enable Push'
        )}
      </button>
    </div>
  );
}
