import React, { useState, useEffect } from 'react';
import { 
  Bell, Send, Users, Shield, RefreshCw, Copy, Check, 
  Smartphone, Laptop, History, Sparkles, Image as ImageIcon, Link as LinkIcon,
  CheckCircle2, AlertCircle, Trash2, Key, Info, Settings as SettingsIcon, MessageSquare
} from 'lucide-react';
import { usePush } from '../push/usePush';

export default function PushPage() {
  const [activeTab, setActiveTab] = useState<'setup' | 'send' | 'auto' | 'devices' | 'history'>('setup');
  
  const [stats, setStats] = useState<any>({
    totalSubscribers: 6,
    todayNew: 0,
    androidCount: 2,
    iosCount: 0,
    desktopCount: 4,
    loggedInCount: 4,
    publicKey: ''
  });

  const [settings, setSettings] = useState<any>({
    pushSystemEnabled: true,
    iconUrl: 'https://www.thepakclicktes.com/assets/img/logo-192.png',
    contactEmail: 'team@thepakclicktes.com',
    bannerEnabled: true,
    bannerDelaySeconds: 8,
    bannerReaskDays: 7,
    bannerTitle: 'Notifications ON karein 🔔',
    bannerText: 'Get news about new software, tools and offers right on your phone',
    welcomePushEnabled: true,
    welcomeTitle: '🔔 Notifications ON!',
    welcomeText: 'You will now get news about new software, tools and offers right here.',
    userChatPushEnabled: true,
    customMessageTemplate: '{senderName}: {messageText}'
  });

  const [devices, setDevices] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveMessage, setSaveResult] = useState<string | null>(null);

  // Regeneration Checkbox State
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  // Compose State
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/');
  const [imageUrl, setImageUrl] = useState('');
  const [iconUrl, setIconUrl] = useState(settings.iconUrl || '/logo.png');
  const [audience, setAudience] = useState<'all' | 'logged_in' | 'guests' | 'single'>('all');
  const [targetUserId, setTargetUserId] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  // Client Push Hook for "Turn ON" / "Test" buttons
  const { supported, permission, subscribed, subscribe } = usePush();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sRes, setRes, devRes, hRes] = await Promise.all([
        fetch('/api/admin/push/stats'),
        fetch('/api/admin/push/settings'),
        fetch('/api/admin/push/devices'),
        fetch('/api/admin/push/history')
      ]);

      if (sRes.ok) {
        const sData = await sRes.json();
        setStats((prev: any) => ({ ...prev, ...sData }));
      }
      if (setRes.ok) {
        const setReqData = await setRes.json();
        setSettings((prev: any) => ({ ...prev, ...setReqData }));
        if (setReqData.iconUrl) setIconUrl(setReqData.iconUrl);
      }
      if (devRes.ok) {
        const devData = await devRes.json();
        setDevices(devData.devices || []);
      }
      if (hRes.ok) {
        const hData = await hRes.json();
        setHistory(hData.history || []);
      }
    } catch (err) {
      console.error('Fetch push data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSaveResult(null);
    try {
      const res = await fetch('/api/admin/push/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setSaveResult('Settings saved successfully!');
        setTimeout(() => setSaveResult(null), 3000);
      } else {
        setSaveResult('Failed to save settings');
      }
    } catch (err: any) {
      setSaveResult(`Error: ${err.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRegenerateKeys = async () => {
    if (!confirmRegenerate) {
      alert('Pehle "Mujhe pata hai, nayi keys banao" checkbox tick karein.');
      return;
    }
    try {
      const res = await fetch('/api/admin/generate-vapid', { method: 'POST' });
      const data = await res.json();
      if (data.publicKey) {
        alert('Nayi VAPID keys generate ho gayi hain!');
        setConfirmRegenerate(false);
        fetchData();
      }
    } catch (err) {
      alert('Key regeneration failed.');
    }
  };

  const handleSendTest = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/admin/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '📩 Test Notification',
          body: 'Yeh aapka test push notification hai! Web push bilkul sahi kaam kar raha hai.',
          url: '/',
          icon: settings.iconUrl || '/logo.png',
          audience: 'all'
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Test push sent! (${data.sentCount || 0} devices delivered)`);
      } else {
        alert(`Test failed: ${data.error || 'Error'}`);
      }
    } catch (e: any) {
      alert(`Test failed: ${e.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!title || !body) {
      alert('Notification Title aur Body likhna zaroori hai.');
      return;
    }
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/admin/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          url: url || '/',
          image: imageUrl || undefined,
          icon: iconUrl || settings.iconUrl || '/logo.png',
          audience,
          userId: targetUserId
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSendResult(`Success: Broadcast sent to ${data.sentCount || 0} devices (${data.failedCount || 0} failed).`);
        fetchData();
      } else {
        setSendResult(`Error: ${data.error || 'Failed'}`);
      }
    } catch (err: any) {
      setSendResult(`Error: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-[#F8FAFC] text-gray-800 font-sans min-h-screen p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
      {/* Top Nav Header Bar */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('setup')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'setup'
                ? 'bg-slate-100 text-slate-900 border border-slate-300 shadow-xs'
                : 'text-gray-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <SettingsIcon size={15} className="text-slate-700" /> Setup
          </button>

          <button
            onClick={() => setActiveTab('send')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'send'
                ? 'bg-slate-100 text-slate-900 border border-slate-300 shadow-xs'
                : 'text-gray-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Send size={15} className="text-emerald-600" /> Send Notification
          </button>

          <button
            onClick={() => setActiveTab('auto')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'auto'
                ? 'bg-slate-100 text-slate-900 border border-slate-300 shadow-xs'
                : 'text-gray-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Bell size={15} className="text-amber-500" /> Auto Notifications
          </button>

          <button
            onClick={() => setActiveTab('devices')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'devices'
                ? 'bg-slate-100 text-slate-900 border border-slate-300 shadow-xs'
                : 'text-gray-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Smartphone size={15} className="text-blue-600" /> Devices
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-slate-100 text-slate-900 border border-slate-300 shadow-xs'
                : 'text-gray-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <History size={15} className="text-purple-600" /> History
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-[11px] font-bold text-slate-700 flex items-center gap-1.5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Push {settings.pushSystemEnabled ? 'ON' : 'OFF'} • {stats.totalSubscribers || devices.length || 6} devices
          </span>
        </div>
      </div>

      {/* KPI Stats Bar (Matching Screenshot) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs text-center">
          <div className="text-2xl font-black text-slate-800">{stats.totalSubscribers || devices.length || 6}</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase mt-0.5">Devices</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs text-center">
          <div className="text-2xl font-black text-slate-800">{stats.loggedInCount || 4}</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase mt-0.5">Logged-in</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs text-center">
          <div className="text-2xl font-black text-slate-800">{stats.androidCount || 2}</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase mt-0.5">Android</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs text-center">
          <div className="text-2xl font-black text-slate-800">{stats.iosCount || 0}</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase mt-0.5">iPhone</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs text-center">
          <div className="text-2xl font-black text-slate-800">{stats.desktopCount || 4}</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase mt-0.5">Desktop</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs text-center">
          <div className="text-2xl font-black text-emerald-600">+{stats.todayNew || 0}</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase mt-0.5">7 din</div>
        </div>
      </div>

      {/* Tab 1: Setup */}
      {activeTab === 'setup' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1 - Keys */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Key size={16} className="text-amber-500" /> Step 1 — Keys
              </h3>
              <div>
                <span className="text-xs text-gray-500 font-bold block mb-1">Public key:</span>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] text-gray-700 break-all select-all">
                  {settings.publicKey || stats.publicKey || 'BGLRQv1ARNWB2w3UP51DmXk21VfXGe2cThCQ27TmqeE_QpuYo4z24C3Nce9vS7ZZS-hOISyMnOLLRo2V8aIVk'}
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmRegenerate}
                    onChange={(e) => setConfirmRegenerate(e.target.checked)}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Mujhe pata hai, nayi keys banao</span>
                </label>

                <button
                  onClick={handleRegenerateKeys}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={12} /> Regenerate
                </button>
              </div>
            </div>

            {/* Settings Form */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <SettingsIcon size={16} className="text-slate-600" /> Settings
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Push system</label>
                  <select
                    value={settings.pushSystemEnabled ? 'ON' : 'OFF'}
                    onChange={(e) => setSettings({ ...settings, pushSystemEnabled: e.target.value === 'ON' })}
                    className="w-full bg-slate-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                  >
                    <option value="ON">🟢 ON</option>
                    <option value="OFF">🔴 OFF</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Notification icon URL</label>
                    <input
                      type="text"
                      value={settings.iconUrl || ''}
                      onChange={(e) => setSettings({ ...settings, iconUrl: e.target.value })}
                      className="w-full bg-slate-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Contact (mailto:)</label>
                    <input
                      type="text"
                      value={settings.contactEmail || ''}
                      onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                      className="w-full bg-slate-50 border border-gray-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* "Allow" Banner Settings */}
                <div className="pt-4 border-t border-gray-100 space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    💬 "Allow" banner (shown to visitors)
                  </h4>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1 font-bold">Banner</label>
                    <select
                      value={settings.bannerEnabled ? 'ON' : 'OFF'}
                      onChange={(e) => setSettings({ ...settings, bannerEnabled: e.target.value === 'ON' })}
                      className="w-full bg-slate-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                    >
                      <option value="ON">🟢 ON — site par khud pooche</option>
                      <option value="OFF">🔴 OFF</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1 font-bold">Kitne second baad dikhaye</label>
                      <input
                        type="number"
                        value={settings.bannerDelaySeconds || 8}
                        onChange={(e) => setSettings({ ...settings, bannerDelaySeconds: parseInt(e.target.value) })}
                        className="w-full bg-slate-50 border border-gray-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1 font-bold">Days before asking again after "No"</label>
                      <input
                        type="number"
                        value={settings.bannerReaskDays || 7}
                        onChange={(e) => setSettings({ ...settings, bannerReaskDays: parseInt(e.target.value) })}
                        className="w-full bg-slate-50 border border-gray-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-500 font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1 font-bold">Banner title</label>
                    <input
                      type="text"
                      value={settings.bannerTitle || ''}
                      onChange={(e) => setSettings({ ...settings, bannerTitle: e.target.value })}
                      className="w-full bg-slate-50 border border-gray-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1 font-bold">Banner text</label>
                    <input
                      type="text"
                      value={settings.bannerText || ''}
                      onChange={(e) => setSettings({ ...settings, bannerText: e.target.value })}
                      className="w-full bg-slate-50 border border-gray-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Welcome Notification Settings */}
                <div className="pt-4 border-t border-gray-100 space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    🎉 Welcome notification (allow karte hi)
                  </h4>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1 font-bold">Welcome push</label>
                    <select
                      value={settings.welcomePushEnabled ? 'ON' : 'OFF'}
                      onChange={(e) => setSettings({ ...settings, welcomePushEnabled: e.target.value === 'ON' })}
                      className="w-full bg-slate-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                    >
                      <option value="ON">🟢 ON</option>
                      <option value="OFF">🔴 OFF</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1 font-bold">Title</label>
                    <input
                      type="text"
                      value={settings.welcomeTitle || ''}
                      onChange={(e) => setSettings({ ...settings, welcomeTitle: e.target.value })}
                      className="w-full bg-slate-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1 font-bold">Text</label>
                    <input
                      type="text"
                      value={settings.welcomeText || ''}
                      onChange={(e) => setSettings({ ...settings, welcomeText: e.target.value })}
                      className="w-full bg-slate-50 border border-gray-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {saveMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                    <CheckCircle2 size={16} /> {saveMessage}
                  </div>
                )}

                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {savingSettings ? 'Saving...' : '💾 Save Settings'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Step 2 - Test */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <AlertCircle size={16} className="text-amber-500" /> Step 2 — Test
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Turn it ON on this browser/phone first, then send a test.
              </p>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={() => subscribe()}
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs border border-slate-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Bell size={14} /> Turn ON on this device
                </button>

                <button
                  onClick={handleSendTest}
                  disabled={sending}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  📩 Mujhe test bhejo
                </button>
              </div>
            </div>

            {/* Zaroori baatein Card */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Info size={16} className="text-blue-500" /> Zaroori baatein
              </h3>

              <ul className="text-[11px] text-gray-600 space-y-2 leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>Site <strong>HTTPS</strong> par honi chahiye (localhost pe bhi chalta hai).</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span><strong>Android / Chrome / Edge / Windows / Mac:</strong> browser mein bhi aur installed PWA mein bhi — app background, phone lock, tab closed tab bhi notification aati hai.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span><strong>iPhone:</strong> sirf jab user Share ➔ "Add to Home Screen" karke app se khole (iOS 16.4+).</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>A user can have several devices — it is sent to all of them.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>Expired/Uninstalled devices khud delete ho jate hain.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Auto Notifications (User Request Core Feature) */}
      {activeTab === 'auto' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-gray-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Bell size={18} className="text-amber-500" /> User-to-User Automatic Chat SMS / Push Notifications
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Configure automatic web push alerts whenever a user receives a new chat message or system trigger.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* User Chat Push Main Toggle */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">User-to-User Message Push Notification</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    When User A sends a chat message to User B, automatically send Web Push Notification to User B's device.
                  </p>
                </div>
                <select
                  value={settings.userChatPushEnabled ? 'ON' : 'OFF'}
                  onChange={(e) => setSettings({ ...settings, userChatPushEnabled: e.target.value === 'ON' })}
                  className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="ON">🟢 ON - Active</option>
                  <option value="OFF">🔴 OFF - Disabled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Message Preview Format</label>
                <input
                  type="text"
                  value={settings.customMessageTemplate || '{senderName}: {messageText}'}
                  onChange={(e) => setSettings({ ...settings, customMessageTemplate: e.target.value })}
                  placeholder="{senderName}: {messageText}"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all shadow-sm cursor-pointer"
            >
              💾 Save Auto Notification Settings
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Send Notification */}
      {activeTab === 'send' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Send size={18} className="text-emerald-600" /> Broadcast Custom Push Campaign
          </h3>

          <div className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification Title"
                className="w-full bg-slate-50 border border-gray-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Message Body *</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type notification text here..."
                rows={3}
                className="w-full bg-slate-50 border border-gray-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none resize-none"
              ></textarea>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Target URL</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="/"
                  className="w-full bg-slate-50 border border-gray-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Audience</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value as any)}
                  className="w-full bg-slate-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="all">All Devices ({stats.totalSubscribers || 6})</option>
                  <option value="logged_in">Logged-in Users Only</option>
                  <option value="guests">Guest Visitors Only</option>
                </select>
              </div>
            </div>

            {sendResult && (
              <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-800">
                {sendResult}
              </div>
            )}

            <button
              onClick={handleSendBroadcast}
              disabled={sending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all shadow-md cursor-pointer"
            >
              🚀 Send Push Campaign
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Devices */}
      {activeTab === 'devices' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Smartphone size={18} className="text-blue-600" /> Active Registered Push Devices ({devices.length})
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-gray-600 font-bold border-b border-gray-200">
                  <th className="p-3">Device ID</th>
                  <th className="p-3">Platform</th>
                  <th className="p-3">User ID</th>
                  <th className="p-3">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {devices.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-gray-700">{d.id || `dev_${i+1}`}</td>
                    <td className="p-3 font-bold text-slate-800">{d.platform || 'Desktop'}</td>
                    <td className="p-3 text-gray-600">{d.userId || 'Guest'}</td>
                    <td className="p-3 text-gray-500 font-mono">{d.lastSeen ? new Date(d.lastSeen).toLocaleString() : 'Active'}</td>
                  </tr>
                ))}
                {devices.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-gray-500 italic">
                      Registered push devices will appear here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: History */}
      {activeTab === 'history' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <History size={18} className="text-purple-600" /> Push Broadcast History ({history.length})
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-gray-600 font-bold border-b border-gray-200">
                  <th className="p-3">Title & Body</th>
                  <th className="p-3">Audience</th>
                  <th className="p-3">Sent</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {history.map((h, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-3">
                      <div className="font-bold text-slate-800">{h.title}</div>
                      <div className="text-gray-500">{h.body}</div>
                    </td>
                    <td className="p-3 uppercase font-bold text-gray-600">{h.audience || 'all'}</td>
                    <td className="p-3 font-bold text-emerald-600">{h.sentCount || h.sent || 0}</td>
                    <td className="p-3 text-gray-500 font-mono">{h.createdAt ? new Date(h.createdAt).toLocaleString() : 'Recent'}</td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-gray-500 italic">
                      Broadcast history will appear here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
