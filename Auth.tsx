import React, { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth, db, googleProvider } from '../firebase';
import { doc, setDoc, serverTimestamp, query, collection, where, getDocs, onSnapshot, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../firebaseError';
import { getDocWithRetry, getDocsWithRetry } from '../utils/firestoreRetry';
import { LogIn, Mail, Lock, User, ArrowRight, Github, ImageIcon, AtSign, Eye, EyeOff, Key, ShieldCheck, Smartphone, CheckCircle2, Chrome } from 'lucide-react';
import { cn } from '../utils';
import { AppSettings } from '../types';

export default function Auth() {
  // Current main tab: 'google' | 'anonymous' | 'email_password'
  
  // Registration and general states
  const [isRegistering, setIsRegistering] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loadingType, setLoadingType] = useState<'google' | 'email_login' | 'email_register' | 'forgot' | null>(null);
  const loading = loadingType !== null;
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);

  // Email/Password specific states
  const [isEmailPasswordRegistering, setIsEmailPasswordRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

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

    setLoadingType('email_register');
    setError(null);
    setSuccessMessage(null);

    try {
      // Check if username is taken in Firestore
      let querySnapshot;
      try {
        const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase().trim()));
        querySnapshot = await getDocsWithRetry(q);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'users');
      }
      if (querySnapshot && !querySnapshot.empty) {
        setError('This username is already taken. Please choose another username.');
        setLoadingType(null);
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
      try {
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
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'users');
      }

      setVerificationSent(true);
      setSuccessMessage('Verification email sent! Please check your inbox and verify your email before signing in.');
      
      // Sign out the user until they verify their email
      await auth.signOut();

    } catch (err: any) {
      console.error('Email password signup error:', err);
      const errStr = err?.message || String(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email address is already in use. Try signing in instead.');
      } else if (err.code === 'auth/invalid-email') {
        setError('The email address format is invalid.');
      } else if (err.code === 'auth/weak-password') {
        setError('The password is too weak. Please use a stronger password.');
      } else if (errStr.toLowerCase().includes('offline') || errStr.toLowerCase().includes('network') || errStr.toLowerCase().includes('unreachable') || err.code === 'unavailable') {
        setError('Network unstable hai ya offline hai. Apne internet connection check karke dobara koshish karein. (Network connection is unstable or offline. Please check your internet connection and try again.)');
      } else if (err.message && err.message.includes('auth/operation-not-allowed')) {
        setError('Email/Password provider is not enabled in Firebase Console. Please ask the administrator to enable Email/Password Authentication.');
      } else {
        setError(err.message || 'An error occurred during sign up.');
      }
    } finally {
      setLoadingType(null);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address to reset your password.');
      return;
    }
    
    setLoadingType('forgot');
    setError(null);
    setSuccessMessage(null);
    
    try {
      await sendPasswordResetEmail(auth, email.toLowerCase().trim());
      setResetEmailSent(true);
      setSuccessMessage(`Password reset link sent to ${email}`);
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else if (err.code === 'auth/invalid-email') {
        setError('The email address format is invalid.');
      } else {
        setError(err.message || 'An error occurred while sending the reset link.');
      }
    } finally {
      setLoadingType(null);
    }
  };

  // Helper to perform login
  const performLogin = async (emailOrUsernameInput: string, passwordInput: string) => {
    if (!emailOrUsernameInput.trim()) {
      setError('Please enter your email or username.');
      return;
    }
    if (!passwordInput) {
      setError('Please enter your password.');
      return;
    }

    setLoadingType('email_login');
    setError(null);
    setSuccessMessage(null);

    try {
      let targetEmail = emailOrUsernameInput.toLowerCase().trim();

      // Check if the input is a username (doesn't contain '@')
      if (!targetEmail.includes('@')) {
        let querySnapshot;
        try {
          const q = query(collection(db, 'users'), where('username', '==', targetEmail));
          querySnapshot = await getDocsWithRetry(q);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, 'users');
        }
        if (querySnapshot && querySnapshot.empty) {
          setError('No user found with this username. Try using your email instead.');
          setLoadingType(null);
          return;
        }
        const userData = querySnapshot!.docs[0].data();
        if (!userData.email) {
          setError('User found, but no email is associated with this username.');
          setLoadingType(null);
          return;
        }
        targetEmail = userData.email;
      }

      // Perform sign in
      const result = await signInWithEmailAndPassword(auth, targetEmail, passwordInput);
      const user = result.user;

      // Fast-fetch user profile from Firestore with 400ms timeout fallback to prevent login hanging
      const userRef = doc(db, 'users', user.uid);
      let userProfileData: any = null;
      try {
        const fetchPromise = getDoc(userRef);
        const timeoutPromise = new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 400)
        );
        const userDoc = await Promise.race([fetchPromise, timeoutPromise]) as any;
        if (userDoc && userDoc.exists()) {
          userProfileData = userDoc.data();
        }
      } catch (err) {
        console.warn('Fast profile fetch skipped or timed out, using fallback:', err);
      }

      const isAdminEmail = user.email === 'teemabdulrehman.com@gmail.com' || user.email === 'abdulrehmanhabib.com@gmail.com';
      const finalProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: userProfileData?.displayName || user.displayName || user.email?.split('@')[0] || 'User',
        username: userProfileData?.username || (user.email ? user.email.split('@')[0].replace(/[^a-z0-9_]/g, '') : 'user_' + user.uid.substring(0, 5)),
        photoURL: userProfileData?.photoURL || user.photoURL || '',
        phoneNumber: userProfileData?.phoneNumber || user.phoneNumber || '',
        balance: userProfileData?.balance || 0,
        role: isAdminEmail ? 'admin' : (userProfileData?.role || 'user'),
        isOnline: true,
        lastSeen: new Date().toISOString(),
        isVerified: userProfileData?.isVerified || false,
        isBanned: userProfileData?.isBanned || false,
        level: userProfileData?.level || 'Bronze',
        experience: userProfileData?.experience || 0,
      };

      // Set localStorage instantly for immediate transition
      localStorage.setItem('ulfha_user_credential', JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified
      }));
      localStorage.setItem('ulfha_user_profile', JSON.stringify(finalProfile));

    } catch (err: any) {
      console.error('Email password login error:', err);
      const errStr = err?.message || String(err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Incorrect email/username or password. Please try again.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else if (errStr.toLowerCase().includes('offline') || errStr.toLowerCase().includes('network') || errStr.toLowerCase().includes('unreachable') || err.code === 'unavailable') {
        setError('Network unstable hai ya offline hai. Apne internet connection check karke dobara koshish karein. (Network connection is unstable or offline. Please check your internet connection and try again.)');
      } else if (err.message && err.message.includes('auth/operation-not-allowed')) {
        setError('Email/Password provider is not enabled in Firebase Console. Please ask the administrator to enable Email/Password Authentication.');
      } else {
        setError(err.message || 'An error occurred during sign in.');
      }
    } finally {
      setLoadingType(null);
    }
  };

  // Email & Password Login Handler (Supports Email OR Username login!)
  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(emailOrUsername, password);
  };

  const handleGoogleLogin = async () => {
    setLoadingType('google');
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user exists in Firestore with 400ms timeout fallback
      const userRef = doc(db, 'users', user.uid);
      let userDoc: any = null;
      try {
        const fetchPromise = getDoc(userRef);
        const timeoutPromise = new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 400)
        );
        userDoc = await Promise.race([fetchPromise, timeoutPromise]);
      } catch (err) {
        console.warn('Google fast profile fetch skipped or timed out:', err);
      }

      let finalProfileData: any = null;
      if (userDoc && userDoc.exists()) {
        finalProfileData = userDoc.data();
      } else {
        // Generate a random username for Google users if they don't have one
        const baseUsername = (user.displayName || 'user').toLowerCase().replace(/\s+/g, '_');
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const finalUsername = `${baseUsername}${randomSuffix}`;

        finalProfileData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Ulfah User',
          username: finalUsername,
          photoURL: user.photoURL || '',
          phoneNumber: user.phoneNumber || '',
          balance: 0,
          role: 'user',
          isOnline: true,
          lastSeen: new Date().toISOString(),
          isVerified: true, // Google accounts are usually verified
          isBanned: false,
          level: 'Bronze',
          experience: 0,
          createdAt: serverTimestamp()
        };

        try {
          await setDoc(userRef, finalProfileData, { merge: true });
        } catch (err) {
          console.warn('Background setDoc for new Google user failed or skipped:', err);
        }
      }

      const isAdminEmail = user.email === 'teemabdulrehman.com@gmail.com' || user.email === 'abdulrehmanhabib.com@gmail.com';
      const finalProfile = {
        ...finalProfileData,
        role: isAdminEmail ? 'admin' : (finalProfileData.role || 'user'),
      };

      // Set localStorage instantly for immediate transition
      localStorage.setItem('ulfha_user_credential', JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified
      }));
      localStorage.setItem('ulfha_user_profile', JSON.stringify(finalProfile));

    } catch (err: any) {
      console.error('Google login error:', err);
      const errStr = err?.message || String(err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Login cancelled. Please try again.');
      } else if (errStr.toLowerCase().includes('offline') || errStr.toLowerCase().includes('network') || errStr.toLowerCase().includes('unreachable') || err.code === 'unavailable') {
        setError('Network unstable hai ya offline hai. Apne internet connection check karke dobara koshish karein. (Network connection is unstable or offline. Please check your internet connection and try again.)');
      } else {
        setError(err.message || 'Failed to login with Google.');
      }
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-[#F0F2F5] p-4 font-sans relative overflow-hidden">
      {/* Top Left Navigation Link */}
      <a 
        href="/landing" 
        className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 hover:bg-white text-emerald-700 text-xs font-semibold shadow-sm border border-emerald-100 transition-all"
      >
        ← Home & Blog
      </a>

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


        {/* Email & Password Authentication */}
          <div className="w-full">
            {!verificationSent && !isForgotPassword && (
              <div className="mb-6">
                <button
                  id="btn_google_login"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full bg-white hover:bg-gray-50 text-gray-700 font-bold py-3 px-4 rounded-xl border border-gray-200 transition-all shadow-sm flex items-center justify-center gap-3 active:scale-95 mb-4"
                >
                  {loadingType === 'google' ? (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-[#4285F4] rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Continue with Google
                    </>
                  )}
                </button>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-gray-100"></div>
                  <span className="flex-shrink mx-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest">Or continue with</span>
                  <div className="flex-grow border-t border-gray-100"></div>
                </div>
              </div>
            )}

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
            ) : isForgotPassword ? (
              // Forgot Password Form
              <div className="space-y-4">
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <p className="text-sm text-[#667781] text-center mb-4">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      id="forgot_password_email"
                      type="email"
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 focus:border-[#00A884] rounded-xl py-3 pl-10 pr-4 text-gray-900 text-sm outline-none transition-all"
                      required
                    />
                  </div>
                  <button
                    id="btn_forgot_password_submit"
                    type="submit"
                    disabled={loading || resetEmailSent}
                    className="w-full bg-[#00A884] hover:bg-[#008f70] text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : resetEmailSent ? (
                      <>
                        <CheckCircle2 size={18} />
                        Link Sent
                      </>
                    ) : (
                      <>
                        <Mail size={18} />
                        Send Reset Link
                      </>
                    )}
                  </button>
                </form>
                <button
                  id="btn_back_to_login_from_forgot"
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setError(null);
                    setSuccessMessage(null);
                    setResetEmailSent(false);
                  }}
                  className="w-full mt-2 text-[#00A884] hover:underline text-sm font-bold block text-center"
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

                    <div className="flex justify-end">
                      <button 
                        type="button" 
                        onClick={() => {
                          setIsForgotPassword(true);
                          setError(null);
                          setSuccessMessage(null);
                        }}
                        className="text-xs text-[#00A884] hover:underline font-medium"
                      >
                        Forgot Password?
                      </button>
                    </div>

                    <button
                      id="btn_email_pass_login_submit"
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#00A884] hover:bg-[#008f70] text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
                    >
                      {loadingType === 'email_login' ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <LogIn size={18} />
                          Sign In
                        </>
                      )}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => performLogin('demo@gmail.com', 'admin')}
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-all shadow-sm mt-4 flex items-center justify-center gap-2"
                    >
                      Demo Login (Test)
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
