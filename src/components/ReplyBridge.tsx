import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { collection, addDoc, getDoc, doc, serverTimestamp, setDoc, query, where, orderBy, onSnapshot, limit, or } from 'firebase/firestore';
import { db } from '../firebase';
import { Send, CheckCircle2, MessageCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

export default function ReplyBridge() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toUid = searchParams.get('to') || '';
  const toName = searchParams.get('name') || 'Ulfah User';

  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const [messages, setMessages] = useState<any[]>([]);
  const [toUser, setToUser] = useState<any>(null);

  useEffect(() => {
    // Autopopulate from localStorage if they used it before
    const savedName = localStorage.getItem('ulfah_guest_name') || '';
    const savedPhone = localStorage.getItem('ulfah_guest_phone') || '';
    if (savedName) setGuestName(savedName);
    if (savedPhone) setGuestPhone(savedPhone);
  }, []);

  // Fetch target user profile
  useEffect(() => {
    if (toUid) {
      getDoc(doc(db, 'users', toUid)).then(snap => {
        if (snap.exists()) {
          setToUser({ uid: snap.id, ...snap.data() });
        }
      });
    }
  }, [toUid]);

  // Load chat history once we have sender info
  useEffect(() => {
    if (!toUid || !guestPhone) return;
    
    const cleanPhone = guestPhone.trim().replace(/[^\d+]/g, '');
    const cleanSenderPhone = cleanPhone || guestName;
    const senderUid = 'wa_' + cleanSenderPhone.replace(/[^\d]/g, '');

    const q = query(
      collection(db, 'messages'),
      or(
        where('senderId', '==', senderUid),
        where('receiverId', '==', senderUid)
      ),
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const msgs = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
    }, (err: any) => {
      console.error("Chat History Error:", err);
    });

    return () => unsubscribe();
  }, [toUid, guestPhone, guestName]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toUid || !guestName.trim() || !messageText.trim()) {
      alert("Please fill all required fields");
      return;
    }

    setIsSending(true);
    try {
      const cleanPhone = guestPhone.trim().replace(/[^\d+]/g, '');
      const cleanName = guestName.trim();
      const cleanText = messageText.trim();

      // Persist contact preferences
      localStorage.setItem('ulfah_guest_name', cleanName);
      localStorage.setItem('ulfah_guest_phone', cleanPhone);

      // Create a virtual user profile for the sender if they provided a number, so they appear in recent list
      const cleanSenderPhone = cleanPhone || cleanName;
      const senderUid = 'wa_' + cleanSenderPhone.replace(/[^\d]/g, '');

      // Create/Update a persistent user profile for the sender
      const senderProfile = {
        displayName: `WhatsApp: ${cleanName}`,
        phoneNumber: cleanPhone,
        photoURL: 'https://cdn-icons-png.flaticon.com/512/124/124034.png',
        email: `${senderUid}@whatsapp.ulfha`,
        bio: '🟢 WhatsApp Contact (Reply Bridge)',
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

      const response = await fetch('/api/bridge/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderUid,
          senderName: `WhatsApp: ${cleanName}`,
          receiverId: toUid,
          text: cleanText,
          isWhatsAppContact: true,
          senderProfile
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message via bridge server');
      }

      // UI updates
      setMessageText('');
      setSentSuccess(true);
      setTimeout(() => setSentSuccess(false), 3000);
    } catch (err: any) {
      console.error("Failed to send message via bridge:", err);
      alert(`Error sending message: ${err.message || 'Please try again.'}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col items-center justify-center p-4">
      {/* Container Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 flex flex-col"
      >
        {/* Top Branding Banner */}
        <div className="bg-[#008069] text-white p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center text-white">
            <MessageCircle size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold font-sans">Ulfah Direct Bridge</h1>
            <p className="text-xs text-white/80 font-medium">Free WhatsApp Two-Way Reply Portal</p>
          </div>
        </div>

        <form onSubmit={handleSend} className="p-6 space-y-5">
          {sentSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#D9FDD3] border border-[#128C7E]/20 text-[#128C7E] p-3 rounded-xl text-center flex items-center justify-center gap-2 font-bold text-sm"
            >
              <CheckCircle2 size={18} />
              <span className="Urdu">پیغام روانہ ہو گیا! (Message Sent)</span>
            </motion.div>
          )}

          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 text-xs text-emerald-900">
            <span className="font-bold block mb-1">Replying to:</span>
            <span className="text-sm font-semibold">{toUser?.displayName || toName}</span>
          </div>

            {/* Guest Name input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block Urdu">آپ کا نام (Your Name) <span className="text-red-500">*</span></label>
              <input 
                type="text"
                required
                placeholder="e.g. Ali Ahmed"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#008069]/20 focus:border-[#008069]"
              />
            </div>

            {/* Guest Phone/WhatsApp number */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block Urdu">واٹس ایپ نمبر (Your WhatsApp #) <span className="text-red-500">*</span></label>
              <input 
                type="tel"
                required
                placeholder="e.g. 923001234567"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#008069]/20 focus:border-[#008069]"
              />
            </div>

            {/* Chat History Section */}
            {messages.length > 0 && (
              <div className="bg-gray-100/50 rounded-2xl p-4 max-h-[300px] overflow-y-auto space-y-3 flex flex-col-reverse border border-gray-200 shadow-inner">
                {[...messages].reverse().map((msg) => {
                  const isMine = msg.senderId.startsWith('wa_');
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${
                        isMine 
                          ? 'bg-[#D9FDD3] text-gray-800 rounded-tr-none' 
                          : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                      }`}>
                        <p className="Urdu">{msg.text}</p>
                        <span className="text-[10px] text-gray-400 block text-right mt-1">
                          {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Message input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block Urdu">پیغام (Your Message) <span className="text-red-500">*</span></label>
              <textarea 
                rows={4}
                required
                placeholder="Type your reply here..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#008069]/20 focus:border-[#008069] resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSending}
                className="w-full bg-[#008069] text-white py-4 px-6 rounded-2xl font-bold hover:bg-[#075E54] transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider shadow-lg active:scale-95 disabled:opacity-50"
              >
                <Send size={16} />
                <span>ارسال کریں (Send Message)</span>
              </button>
            </div>
          </form>
      </motion.div>
    </div>
  );
}
