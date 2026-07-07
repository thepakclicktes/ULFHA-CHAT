import React, { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  sendEmailVerification
} from 'firebase/auth';
import { auth, googleProvider, appleProvider, db } from '../firebase';
import { doc, setDoc, serverTimestamp, query, collection, where, getDocs, onSnapshot } from 'firebase/firestore';
import { LogIn, Mail, Lock, User, ArrowRight, Github, ImageIcon, AtSign, Eye, EyeOff, Key, ShieldCheck, Smartphone, CheckCircle2 } from 'lucide-react';
import { cn } from '../utils';
import { AppSettings } from '../types';

export default function Auth() {
  // Current main tab: 'google' | 'email_password'
  const [authMethod, setAuthMethod] = useState<'google' | 'email_password'>('google');
  
  // Registration and general states
  const [isRegistering, setIsRegistering] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);

  // Email/Password specific states
  const [isEmailPasswordRegistering, setIsEmailPasswordRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const DEFAULT_LOGO = '/logo.png';

  const resolveLogo = (url?: string) => {
    if (!url || url.includes('mosque.png') || url.includes('icons8.com') || url.includes('encrypted-tbn0.gstatic.com')) {
      return DEFAULT_LOGO;
    }
    return url;
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) setAppSettings(doc.data() as AppSettings);
    });
    return () => unsub();
  }, []);

  // Reset error on tab change
  const handleTabChange = (method: 'google' | 'email_password') => {
    setAuthMethod(method);
    setError(null);
    setSuccessMessage(null);
    setIsRegistering(false);
    setIsEmailPasswordRegistering(false);
    setDisplayName('');
    setUsername('');
    setEmail('');
    setPassword('');
    setEmailOrUsername('');
    setVerificationSent(false);
  };

  // Original Apple Authentication
  const handleAppleLogin = async () => {
    if (isRegistering) {
      if (!displayName.trim()) {
        setError('Please set your Full Name first.');
        return;
      }
      if (!username.trim()) {
        setError('Please set your Username first.');
        return;
      }
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(username.trim())) {
        setError('Username can only contain letters, numbers, and underscores.');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase().trim()));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setError('This username is already taken. Please choose another username.');
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Error checking username:', err);
      } finally {
        setLoading(false);
      }
    }

    try {
      setError(null);
      setLoading(true);
      const result = await signInWithPopup(auth, appleProvider);
      const user = result.user;
      
      if (isRegistering) {
        // Double check username to ensure uniqueness
        const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase().trim()));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const existingUser = querySnapshot.docs[0];
          if (existingUser.id !== user.uid) {
            await auth.signOut();
            setError('This username is already taken. Please choose another username.');
            return;
          }
        }

        // Setup the user profile document in Firestore
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email || '',
          displayName: displayName.trim(),
          username: username.toLowerCase().trim(),
          photoURL: user.photoURL || '',
          phoneNumber: user.phoneNumber || '',
          balance: 0,
          role: 'user',
          isOnline: true,
          lastSeen: new Date().toISOString(),
          isVerified: false,
          isBanned: false,
          level: 'Bronze',
          experience: 0,
          createdAt: serverTimestamp()
        }, { merge: true });
      }
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        setError('Popup Blocked! Please allow popups or use "New Tab" in the AI Studio toolbar to open the app outside the iframe.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        setError('The Apple Sign-In popup was closed before completion. If this keeps happening, try opening the app in a "New Tab" from the AI Studio toolbar.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setError('Apple Login is not fully configured. Please check Firebase Console and ensure this domain is whitelisted.');
      } else {
        setError(error.message || 'An unexpected error occurred.');
      }
      console.error('Apple Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Original Google Authentication & Custom Registration
  const handleGoogleLogin = async () => {
    if (isRegistering) {
      if (!displayName.trim()) {
        setError('Please set your Full Name first.');
        return;
      }
      if (!username.trim()) {
        setError('Please set your Username first.');
        return;
      }
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(username.trim())) {
        setError('Username can only contain letters, numbers, and underscores.');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase().trim()));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setError('This username is already taken. Please choose another username.');
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Error checking username:', err);
      } finally {
        setLoading(false);
      }

      // Save registration values to localStorage to avoid hook race conditions
      localStorage.setItem('pending_registration', JSON.stringify({
        displayName: displayName.trim(),
        username: username.toLowerCase().trim()
      }));
    }

    try {
      setError(null);
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      if (user.email && !user.email.toLowerCase().endsWith('@gmail.com')) {
        await auth.signOut();
        localStorage.removeItem('pending_registration');
        setError('Only @gmail.com emails are allowed.');
        return;
      }

      if (isRegistering) {
        // Double check username to ensure uniqueness
        const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase().trim()));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const existingUser = querySnapshot.docs[0];
          if (existingUser.id !== user.uid) {
            localStorage.removeItem('pending_registration');
            await auth.signOut();
            setError('This username is already taken. Please choose another username.');
            return;
          }
        }

        // Setup the user profile document in Firestore
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email || '',
          displayName: displayName.trim(),
          username: username.toLowerCase().trim(),
          photoURL: user.photoURL || '',
          phoneNumber: user.phoneNumber || '',
          balance: 0,
          role: 'user',
          isOnline: true,
          lastSeen: new Date().toISOString(),
          isVerified: false,
          isBanned: false,
          level: 'Bronze',
          experience: 0,
          createdAt: serverTimestamp()
        }, { merge: true });

        localStorage.removeItem('pending_registration');
      }
    } catch (error: any) {
      localStorage.removeItem('pending_registration');
      if (error.code === 'auth/popup-blocked') {
        setError('Popup Blocked! Your browser or iframe sandbox has blocked the login window. Please allow popups, or click the "New Tab" button in the AI Studio toolbar to open the app on a full tab.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        setError('The Google Sign-In popup was closed before completion. If this keeps happening, try using "New Tab" from the AI Studio toolbar to avoid iframe issues.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        setError('A previous login request is still pending. Please wait a moment.');
      } else if (error.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized for Google Sign-In. Please check Firebase Console.');
      } else if (error.message && (error.message.includes('Pending promise') || error.message.includes('INTERNAL ASSERTION FAILED'))) {
        setError('Iframe authentication limit. Please click "New Tab" in the AI Studio toolbar to open the app in a full window, then sign in with Google.');
      } else {
        setError(error.message || 'An unexpected authentication error occurred.');
      }
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Email & Password Registration Handler with Email Verification
  const handleEmailPasswordRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Please set your Full Name first.');
      return;
    }
    if (!username.trim()) {
      setError('Please set your Username first.');
      return;
    }
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username.trim())) {
      setError('Username can only contain letters, numbers, and underscores.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Check if username is taken in Firestore
      const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase().trim()));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setError('This username is already taken. Please choose another username.');
        setLoading(false);
        return;
      }

      // Create user with Firebase Auth
      const result = await createUserWithEmailAndPassword(auth, email.toLowerCase().trim(), password);
      const user = result.user;

      // Send verification email
      await sendEmailVerification(user);

      // Update Firebase auth display name
      await updateProfile(user, {
        displayName: displayName.trim()
      });

      // Setup the user profile document in Firestore
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        email: email.toLowerCase().trim(),
        displayName: displayName.trim(),
        username: username.toLowerCase().trim(),
        photoURL: user.photoURL || '',
        phoneNumber: user.phoneNumber || '',
        balance: 0,
        role: 'user',
        isOnline: true,
        lastSeen: new Date().toISOString(),
        isVerified: false,
        isBanned: false,
        level: 'Bronze',
        experience: 0,
        createdAt: serverTimestamp()
      }, { merge: true });

      setVerificationSent(true);
      setSuccessMessage('Verification email sent! Please check your inbox and verify your email before signing in.');
      
      // Sign out the user until they verify their email
      await auth.signOut();

    } catch (err: any) {
      console.error('Email password signup error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email address is already in use. Try signing in instead.');
      } else if (err.code === 'auth/invalid-email') {
        setError('The email address format is invalid.');
      } else if (err.code === 'auth/weak-password') {
        setError('The password is too weak. Please use a stronger password.');
      } else if (err.message && err.message.includes('auth/operation-not-allowed')) {
        setError('Email/Password provider is not enabled in Firebase Console. Please ask the administrator to enable Email/Password Authentication.');
      } else {
        setError(err.message || 'An error occurred during sign up.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Email & Password Login Handler (Supports Email OR Username login!)
  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUsername.trim()) {
      setError('Please enter your email or username.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      let targetEmail = emailOrUsername.toLowerCase().trim();

      // Check if the input is a username (doesn't contain '@')
      if (!targetEmail.includes('@')) {
        const q = query(collection(db, 'users'), where('username', '==', targetEmail));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          setError('No user found with this username. Try using your email instead.');
          setLoading(false);
          return;
        }
        const userData = querySnapshot.docs[0].data();
        if (!userData.email) {
          setError('User found, but no email is associated with this username.');
          setLoading(false);
          return;
        }
        targetEmail = userData.email;
      }

      // Perform sign in
      const result = await signInWithEmailAndPassword(auth, targetEmail, password);
      const user = result.user;

      // Check if email is verified
      if (!user.emailVerified) {
        setError('Please verify your email address before signing in. Check your inbox for the verification link.');
        await auth.signOut();
        setLoading(false);
        return;
      }

    } catch (err: any) {
      console.error('Email password login error:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Incorrect email/username or password. Please try again.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else if (err.message && err.message.includes('auth/operation-not-allowed')) {
        setError('Email/Password provider is not enabled in Firebase Console. Please ask the administrator to enable Email/Password Authentication.');
      } else {
        setError(err.message || 'An error occurred during sign in.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-[#F0F2F5] p-4 font-sans relative overflow-hidden">
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ 
          backgroundImage: `url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')`,
          backgroundSize: '400px',
          backgroundRepeat: 'repeat'
        }}
      ></div>

      <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-md w-full border border-gray-100 z-10">
        <div className="w-20 h-20 rounded-full mb-4 flex items-center justify-center shadow-lg ring-4 ring-[#00A884]/10 transition-transform hover:scale-110 overflow-hidden">
          <img 
            id="app_logo"
            src={resolveLogo(appSettings?.appLogoUrl)} 
            className="w-full h-full object-cover"
            alt="Ulfah Chat Logo"
            referrerPolicy="no-referrer"
          />
        </div>
        <h1 className="text-3xl font-bold text-[#111B21] mb-1">Ulfah Chat</h1>
        <p className="text-[#667781] text-center mb-6 text-sm font-medium">Simple. Reliable. Private.</p>

        {/* Tab Navigation */}
        <div className="w-full flex bg-gray-100 p-1 rounded-xl mb-6">
          <button
            id="tab_google"
            onClick={() => handleTabChange('google')}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
              authMethod === 'google' 
                ? "bg-[#00A884] text-white shadow-sm" 
                : "text-gray-500 hover:text-gray-800"
            )}
          >
            Google
          </button>
          <button
            id="tab_email_pass"
            onClick={() => handleTabChange('email_password')}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
              authMethod === 'email_password' 
                ? "bg-[#00A884] text-white shadow-sm" 
                : "text-gray-500 hover:text-gray-800"
            )}
          >
            Email & Pass
          </button>
        </div>

        {error && (
          <div id="auth_error_banner" className="w-full bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-xs mb-4 text-center font-medium">
            {error}
          </div>
        )}

        {successMessage && (
          <div id="auth_success_banner" className="w-full bg-emerald-50 border border-emerald-200 text-emerald-600 p-3 rounded-lg text-xs mb-4 text-center font-medium">
            {successMessage}
          </div>
        )}

        {/* Google Authentication */}
        {authMethod === 'google' && (
          <div className="w-full">
            {isRegistering ? (
              <div className="w-full space-y-4">
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="reg_google_displayname"
                    type="text"
                    placeholder="Full Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-[#00A884] rounded-xl py-3 pl-10 pr-4 text-gray-900 text-sm outline-none transition-all"
                    required
                  />
                </div>
                <div className="relative">
                  <AtSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="reg_google_username"
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-[#00A884] rounded-xl py-3 pl-10 pr-4 text-gray-900 text-sm outline-none transition-all"
                    required
                  />
                </div>

                <p className="text-xs text-[#667781] text-center mt-2 px-1">
                  Enter your Full Name and unique Username, then click below to complete your registration with Google.
                </p>

                <button
                  id="btn_google_register"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-900 font-bold py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-3 active:scale-95 mt-4"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-[#00A884] rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Continue with Google
                    </>
                  )}
                </button>

                <button
                  id="btn_apple_register"
                  onClick={handleAppleLogin}
                  disabled={loading}
                  className="w-full bg-black hover:bg-zinc-900 text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-3 active:scale-95"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.96.95-2.04 1.72-3.23 1.72-1.16 0-1.54-.71-2.91-.71s-1.8.71-2.91.71c-1.19 0-2.31-.83-3.26-1.77C2.8 18.33 1.5 15.14 1.5 12.11c0-4.73 3.06-7.23 6.04-7.23 1.55 0 2.5.9 3.51.9.98 0 2.21-.93 3.65-.93 1.25 0 4.25.56 5.3 2.11-2.58 1.53-2.17 5.03.4 6.31-1.03 2.5-2.32 5.01-3.35 7.01zm-4.11-16.14c.04 0 .07 0 .11 0 2.05-.13 3.8-1.78 3.8-3.83 0-.1 0-.21-.01-.31-1.89.08-3.52 1.34-3.9 3.19-.07.33-.11.66-.11.99 0 .28 0 .54.11-.04z"/>
                      </svg>
                      Continue with Apple
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="w-full space-y-4">
                <button
                  id="btn_google_login"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-900 font-bold py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-3 active:scale-95"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-[#00A884] rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Continue with Google
                    </>
                  )}
                </button>

                <button
                  id="btn_apple_login"
                  onClick={handleAppleLogin}
                  disabled={loading}
                  className="w-full bg-black hover:bg-zinc-900 text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-3 active:scale-95"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.96.95-2.04 1.72-3.23 1.72-1.16 0-1.54-.71-2.91-.71s-1.8.71-2.91.71c-1.19 0-2.31-.83-3.26-1.77C2.8 18.33 1.5 15.14 1.5 12.11c0-4.73 3.06-7.23 6.04-7.23 1.55 0 2.5.9 3.51.9.98 0 2.21-.93 3.65-.93 1.25 0 4.25.56 5.3 2.11-2.58 1.53-2.17 5.03.4 6.31-1.03 2.5-2.32 5.01-3.35 7.01zm-4.11-16.14c.04 0 .07 0 .11 0 2.05-.13 3.8-1.78 3.8-3.83 0-.1 0-.21-.01-.31-1.89.08-3.52 1.34-3.9 3.19-.07.33-.11.66-.11.99 0 .28 0 .54.11-.04z"/>
                      </svg>
                      Continue with Apple
                    </>
                  )}
                </button>
              </div>
            )}

            <button
              id="btn_google_toggle_register"
              onClick={() => setIsRegistering(!isRegistering)}
              className="w-full mt-6 text-[#00A884] hover:underline text-sm font-bold block text-center"
            >
              {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Register"}
            </button>
          </div>
        )}

        {/* Email & Password Authentication */}
        {authMethod === 'email_password' && (
          <div className="w-full">
            {verificationSent ? (
              <div className="text-center space-y-4 py-4">
                <div className="flex justify-center">
                  <CheckCircle2 size={48} className="text-[#00A884]" />
                </div>
                <h2 className="text-xl font-bold text-[#111B21]">Verify your email</h2>
                <p className="text-sm text-[#667781]">
                  We've sent a verification link to <strong>{email}</strong>. Please click the link in your email to activate your account, then return here to sign in.
                </p>
                <button
                  id="btn_back_to_login"
                  onClick={() => {
                    setVerificationSent(false);
                    setIsEmailPasswordRegistering(false);
                    setSuccessMessage(null);
                  }}
                  className="w-full bg-[#00A884] hover:bg-[#008f70] text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-95"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <>
                {!isEmailPasswordRegistering ? (
                  // Sign In Form
                  <form onSubmit={handleEmailPasswordLogin} className="space-y-4">
                    <div className="relative">
                      <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        id="login_email_or_username"
                        type="text"
                        placeholder="Email or Username"
                        value={emailOrUsername}
                        onChange={(e) => setEmailOrUsername(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 focus:border-[#00A884] rounded-xl py-3 pl-10 pr-4 text-gray-900 text-sm outline-none transition-all"
                        required
                      />
                    </div>
                    <div className="relative">
                      <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        id="login_password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 focus:border-[#00A884] rounded-xl py-3 pl-10 pr-10 text-gray-900 text-sm outline-none transition-all"
                        required
                      />
                      <button
                        id="btn_toggle_pass_visibility"
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    <button
                      id="btn_email_pass_login_submit"
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#00A884] hover:bg-[#008f70] text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <LogIn size={18} />
                          Sign In
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  // Registration Form
                  <form onSubmit={handleEmailPasswordRegister} className="space-y-4">
                    <div className="relative">
                      <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        id="reg_ep_displayname"
                        type="text"
                        placeholder="Full Name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 focus:border-[#00A884] rounded-xl py-3 pl-10 pr-4 text-gray-900 text-sm outline-none transition-all"
                        required
                      />
                    </div>
                    <div className="relative">
                      <AtSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        id="reg_ep_username"
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 focus:border-[#00A884] rounded-xl py-3 pl-10 pr-4 text-gray-900 text-sm outline-none transition-all"
                        required
                      />
                    </div>
                    <div className="relative">
                      <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        id="reg_ep_email"
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 focus:border-[#00A884] rounded-xl py-3 pl-10 pr-4 text-gray-900 text-sm outline-none transition-all"
                        required
                      />
                    </div>
                    <div className="relative">
                      <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        id="reg_ep_password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Password (6+ characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 focus:border-[#00A884] rounded-xl py-3 pl-10 pr-10 text-gray-900 text-sm outline-none transition-all"
                        required
                      />
                      <button
                        id="btn_toggle_pass_visibility_reg"
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    <button
                      id="btn_email_pass_reg_submit"
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#00A884] hover:bg-[#008f70] text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <User size={18} />
                          Register & Join
                        </>
                      )}
                    </button>
                  </form>
                )}

                <button
                  id="btn_email_pass_toggle_reg"
                  onClick={() => {
                    setIsEmailPasswordRegistering(!isEmailPasswordRegistering);
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="w-full mt-6 text-[#00A884] hover:underline text-sm font-bold block text-center"
                >
                  {isEmailPasswordRegistering ? 'Already have an account? Sign In' : "Don't have an account? Register"}
                </button>
              </>
            )}
          </div>
        )}

        <p className="mt-8 text-[11px] text-[#8696A0] text-center leading-relaxed">
          By continuing, you agree to our <br />
          <span className="text-[#00A884] cursor-pointer font-semibold">Terms of Service</span> and <span className="text-[#00A884] cursor-pointer font-semibold">Privacy Policy</span>.
        </p>
        <p className="mt-4 text-[10px] text-[#8696A0] font-medium">
          ©️ abdulrehmanhabib | Ulfah.llc
        </p>
      </div>
    </div>
  );
}
