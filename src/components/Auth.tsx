import React, { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, serverTimestamp, query, collection, where, getDocs, onSnapshot } from 'firebase/firestore';
import { LogIn, Mail, Lock, User, ArrowRight, Github, ImageIcon, AtSign, Eye, EyeOff, Key, ShieldCheck, Smartphone, CheckCircle2 } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address to reset your password.');
      return;
    }
    
    setLoading(true);
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
