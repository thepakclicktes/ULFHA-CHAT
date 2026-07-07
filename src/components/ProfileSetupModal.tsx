import React, { useState } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { UserProfile } from '../types';
import { User, AtSign, Mail, Check } from 'lucide-react';

interface ProfileSetupModalProps {
  profile: UserProfile;
  onComplete: () => void;
}

export default function ProfileSetupModal({ profile, onComplete }: ProfileSetupModalProps) {
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [username, setUsername] = useState(profile.username && !profile.username.startsWith('user_') ? profile.username : '');
  const [email, setEmail] = useState(profile.email || '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Please enter your Full Name.');
      return;
    }
    if (!username.trim()) {
      setError('Please enter a Username.');
      return;
    }
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username.trim())) {
      setError('Username can only contain letters, numbers, and underscores.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid Email Address.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cleanUsername = username.toLowerCase().trim();
      const cleanEmail = email.toLowerCase().trim();
      
      if (cleanUsername !== profile.username) {
        const q = query(collection(db, 'users'), where('username', '==', cleanUsername));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setError('This username is already taken. Please choose another username.');
          setLoading(false);
          return;
        }
      }

      // Check if email is already taken by another user
      if (cleanEmail !== profile.email) {
        const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setError('This email address is already registered with another account.');
          setLoading(false);
          return;
        }
      }

      // Update Firestore document
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
        username: cleanUsername,
        email: cleanEmail,
        isProfileSetupComplete: true
      });

      // Update localStorage to trigger immediate change
      const savedProfile = localStorage.getItem('ulfha_user_profile');
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          parsed.displayName = displayName.trim();
          parsed.username = cleanUsername;
          parsed.email = cleanEmail;
          parsed.isProfileSetupComplete = true;
          localStorage.setItem('ulfha_user_profile', JSON.stringify(parsed));
        } catch (e) {
          console.error(e);
        }
      }

      onComplete();
    } catch (err: any) {
      console.error('Profile setup error:', err);
      setError(err.message || 'An error occurred while updating your profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-100 transform transition-all animate-in scale-in duration-200">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-[#00A884]/10 rounded-full flex items-center justify-center text-[#00A884] mb-3">
            <User size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Profile Setup</h2>
          <p className="text-sm text-gray-500 text-center mt-1">
            Apka account ban gaya hai! Apni profile mukammal karne ke liye details add karein.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-xs mb-4 text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 pl-1">Full Name</label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="E.g. Abdul Rehman"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 focus:border-[#00A884] rounded-xl py-3 pl-10 pr-4 text-gray-900 text-sm outline-none transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 pl-1">Username</label>
            <div className="relative">
              <AtSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="E.g. abdul_rehman"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 focus:border-[#00A884] rounded-xl py-3 pl-10 pr-4 text-gray-900 text-sm outline-none transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 pl-1">Email Address</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                placeholder="E.g. email@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 focus:border-[#00A884] rounded-xl py-3 pl-10 pr-4 text-gray-900 text-sm outline-none transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00A884] hover:bg-[#008f70] text-white font-bold py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 mt-6"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Check size={18} />
                Save Profile
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
