import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, initializeFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBo0Ml2F90R0Sw3zw2XjiE99N78joBXQJM",
  authDomain: "ulfhachat.firebaseapp.com",
  projectId: "ulfhachat",
  storageBucket: "ulfhachat.firebasestorage.app",
  messagingSenderId: "684407740624",
  appId: "1:684407740624:web:3e962db49dfa8a1a9766d5",
  measurementId: "G-W00CNT2XDF"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export const messaging = getMessaging(app);
export const googleProvider = new GoogleAuthProvider();
