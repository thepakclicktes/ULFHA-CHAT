import dotenv from "dotenv";
dotenv.config();

// Prevent Node.js from rejecting self-signed or expired SSL certificates for external book archives
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import webPush from "web-push";
import fs from "fs";
import { Readable } from "stream";
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, addDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import { initializeApp as initAdminApp, getApps as getAdminApps, getApp as getAdminApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

// Read config safely with fallback to prevent crashes if file is missing/deleted
let firebaseConfig: any = {
  apiKey: "AIzaSyBo0Ml2F90R0Sw3zw2XjiE99N78joBXQJM",
  authDomain: "ulfhachat.firebaseapp.com",
  projectId: "ulfhachat",
  storageBucket: "ulfhachat.firebasestorage.app",
  messagingSenderId: "684407740624",
  appId: "1:684407740624:web:3e962db49dfa8a1a9766d5",
  measurementId: "G-W00CNT2XDF"
};

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
if (fs.existsSync(configPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (e) {
    console.error('Error reading firebase-applet-config.json:', e);
  }
}

// Initialize firebase-admin for secure backend tasks
let adminDb: any;
try {
  const apps = getAdminApps();
  const adminApp = apps.length > 0 
    ? getAdminApp() 
    : initAdminApp({
        credential: applicationDefault(),
        projectId: firebaseConfig.projectId
      });
  
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  adminDb = getAdminFirestore(adminApp, databaseId);
  console.log('Firebase Admin initialized with config for project:', firebaseConfig.projectId, 'Database:', databaseId);
  console.log('Firebase Admin DB initialized successfully:', !!adminDb);
} catch (adminInitErr) {
  console.error('Firebase Admin initialization failed:', adminInitErr);
}

async function startServer() {
  console.log("Starting server...");
  const app = express();
  const PORT = 3000;

  // CORS middleware to allow cross-origin requests from Vercel/custom domains
  app.use((req, res, next) => {
    const origin = req.headers.origin || "*";
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json());

  // Client Firestore on Backend (Fallback for when Admin SDK lacks permissions)
  const firebaseApp = initializeApp(firebaseConfig);
  const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || '(default)');
  
  console.log('Client SDK Firestore initialized for database:', firebaseConfig.firestoreDatabaseId || '(default)');

  // Gemini AI Setup with modern SDK guidelines
  const aiKey = process.env.GEMINI_API_KEY;
  const ai = aiKey ? new GoogleGenAI({
    apiKey: aiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  }) : null;

  // Helper to validate and normalize VAPID keys
  const normalizeVapidKey = (key: any) => {
    if (typeof key !== 'string' || !key) return null;
    // Convert standard base64 to URL-safe if needed
    let normalized = key.trim()
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    const base64UrlRegex = /^[A-Za-z0-9\-_]+$/;
    if (base64UrlRegex.test(normalized) && normalized.length > 20) {
      return normalized;
    }
    return null;
  };

  // VAPID keys setup
  const VAPID_KEYS_FILE = path.join(process.cwd(), 'vapid-keys.json');
  let vapidPublic = normalizeVapidKey(process.env.VAPID_PUBLIC_KEY);
  let vapidPrivate = normalizeVapidKey(process.env.VAPID_PRIVATE_KEY);

  if (!vapidPublic || !vapidPrivate) {
    if (fs.existsSync(VAPID_KEYS_FILE)) {
      try {
        const keys = JSON.parse(fs.readFileSync(VAPID_KEYS_FILE, 'utf-8'));
        vapidPublic = keys.publicKey;
        vapidPrivate = keys.privateKey;
      } catch (e) {
        console.error('Error reading VAPID keys file:', e);
      }
    }
  }

  if (!vapidPublic || !vapidPrivate) {
    const keys = webPush.generateVAPIDKeys();
    vapidPublic = keys.publicKey;
    vapidPrivate = keys.privateKey;
    fs.writeFileSync(VAPID_KEYS_FILE, JSON.stringify(keys, null, 2), 'utf-8');
    console.log('Generated and stored new VAPID keys in', VAPID_KEYS_FILE);
  }

  webPush.setVapidDetails(
    'mailto:support@ulfahchat.example.com',
    vapidPublic,
    vapidPrivate
  );

  // API endpoints
  app.get("/api/push-public-key", (req, res) => {
    res.json({ publicKey: vapidPublic });
  });

  app.post("/api/bridge/send", async (req, res) => {
    const { senderUid, senderName, receiverId, text, isWhatsAppContact, senderProfile } = req.body;
    
    if (!senderUid || !receiverId || !text) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // 1. Create/Update the sender profile if provided
      if (senderProfile) {
        try {
          await adminDb.collection('users').doc(senderUid).set({
            ...senderProfile,
            uid: senderUid,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (adminErr) {
          console.warn('Admin DB failed for sender profile, trying client SDK fallback:', adminErr);
          // Fallback using client SDK (requires relaxed rules)
          await setDoc(doc(db, 'users', senderUid), {
            ...senderProfile,
            uid: senderUid,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      }

      // 2. Add the message
      const msgData = {
        senderId: senderUid,
        senderName: senderName || `WhatsApp: ${senderUid}`,
        receiverId: receiverId,
        text: text,
        timestamp: new Date(),
        status: 'sent',
        type: 'text',
        isWhatsAppContact: !!isWhatsAppContact,
        read: false
      };

      let docId = '';
      try {
        const docRef = await adminDb.collection('messages').add(msgData);
        docId = docRef.id;
      } catch (adminErr) {
        console.warn('Admin DB failed for message add, trying client SDK fallback:', adminErr);
        const docRef = await addDoc(collection(db, 'messages'), {
          ...msgData,
          timestamp: new Date() // Server SDK uses Date, Client SDK needs its own timestamp or Date
        });
        docId = docRef.id;
      }

      // 3. Trigger notification
      try {
        let recipientData: any = null;
        try {
          if (adminDb) {
            const recipientDoc = await adminDb.collection('users').doc(receiverId).get();
            if (recipientDoc.exists) {
              recipientData = recipientDoc.data();
            }
          } else {
            throw new Error("Admin DB unavailable");
          }
        } catch (adminErr) {
          console.warn('Admin DB failed for recipient fetch, trying client SDK fallback:', adminErr);
          const snap = await getDoc(doc(db, 'users', receiverId));
          if (snap.exists()) {
            recipientData = snap.data();
          }
        }

        if (recipientData) {
          const subscriptions: string[] = recipientData?.webPushSubscriptions || [];
          for (const subStr of subscriptions) {
            try {
              const subscriptionObj = JSON.parse(subStr);
              const payload = JSON.stringify({
                notification: {
                  title: senderName || (senderProfile && senderProfile.displayName) || `Message from ${senderUid}`,
                  body: text,
                  icon: senderProfile?.photoURL || 'https://cdn-icons-png.flaticon.com/512/124/124034.png',
                  tag: 'chat',
                  data: { type: 'chat', senderId: senderUid }
                }
              });
              await webPush.sendNotification(subscriptionObj, payload);
            } catch (pErr) {}
          }
        }
      } catch (nErr) {}

      res.json({ success: true, messageId: docId });
    } catch (err: any) {
      console.error("Bridge send failed:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/whatsapp/save-contact", async (req, res) => {
    const { waUid, waProfile, userId, contactData, systemMessageText } = req.body;
    
    if (!waUid || !waProfile) {
      return res.status(400).json({ error: "Missing waUid or waProfile" });
    }

    try {
      // Ensure uid is in the profile
      const fullProfile = { 
        ...waProfile, 
        uid: waUid,
        updatedAt: new Date().toISOString()
      };

      // 1. Save/Update global user profile
      try {
        if (adminDb) {
          await adminDb.collection('users').doc(waUid).set(fullProfile, { merge: true });
          console.log('Global profile saved via Admin SDK:', waUid);
        } else {
          throw new Error('Admin DB not available');
        }
      } catch (adminErr) {
        console.warn('Admin DB failed for global profile save, trying client SDK fallback:', adminErr);
        await setDoc(doc(db, 'users', waUid), fullProfile, { merge: true });
      }

      // 2. If userId and contactData are provided, save to user's contacts subcollection
      if (userId && contactData) {
        const fullContactData = {
          ...contactData,
          savedAt: new Date()
        };
        try {
          if (adminDb) {
            await adminDb.collection('users').doc(userId).collection('contacts').doc(waUid).set(fullContactData, { merge: true });
            console.log('Contact subcollection saved via Admin SDK:', waUid);
          } else {
            throw new Error('Admin DB not available');
          }
        } catch (adminErr) {
          console.warn('Admin DB failed for user contact subcollection, trying client SDK fallback:', adminErr);
          await setDoc(doc(db, 'users', userId, 'contacts', waUid), fullContactData, { merge: true });
        }
      }

      // 3. Create system message if text is provided
      if (systemMessageText && userId) {
        const msgData = {
          senderId: userId,
          receiverId: waUid,
          text: systemMessageText,
          timestamp: new Date(),
          type: 'system' as const,
          status: 'sent' as const,
          read: true
        };
        try {
          if (adminDb) {
            await adminDb.collection('messages').add(msgData);
          } else {
            throw new Error('Admin DB not available');
          }
        } catch (adminErr) {
          console.warn('Admin DB failed for system message add, trying client SDK fallback:', adminErr);
          await addDoc(collection(db, 'messages'), msgData);
        }
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("WhatsApp save contact failed:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // In-memory real-time message backup/fallback when Firestore is exhausted
  const inMemoryMessages: any[] = [];
  let sseClients: any[] = [];

  app.post("/api/messages/send", (req, res) => {
    const { senderId, senderName, receiverId, text, type, replyTo, isGroupMode, isChannelMode } = req.body;
    
    const newMsg = {
      id: "mem_" + Date.now() + "_" + Math.random().toString(36).substring(2, 11),
      senderId,
      senderName: senderName || 'User',
      receiverId,
      text,
      timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
      status: 'sent',
      type: type || 'text',
      replyTo: replyTo || null,
      isGroupMode: !!isGroupMode,
      isChannelMode: !!isChannelMode,
      isInMemory: true
    };

    inMemoryMessages.push(newMsg);
    
    // Keep last 2000 messages
    if (inMemoryMessages.length > 2000) {
      inMemoryMessages.shift();
    }

    // Broadcast via SSE to all active web clients
    const data = `data: ${JSON.stringify(newMsg)}\n\n`;
    sseClients.forEach(client => {
      try {
        client.write(data);
      } catch (err) {
        // Handled below
      }
    });

    res.json({ success: true, message: newMsg });
  });

  app.get("/api/messages/stream", (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sseClients.push(res);

    req.on('close', () => {
      sseClients = sseClients.filter(client => client !== res);
    });
  });

  app.get("/api/messages/history", (req, res) => {
    const { chatUid, userUid } = req.query;
    if (!chatUid || !userUid) {
      return res.status(400).json({ error: "Missing parameters" });
    }
    
    const filtered = inMemoryMessages.filter(msg => {
      const isForThisChat = msg.receiverId === chatUid || msg.senderId === chatUid;
      const isUserInvolved = msg.senderId === userUid || msg.receiverId === userUid;
      return isForThisChat && (msg.isGroupMode || msg.isChannelMode || isUserInvolved);
    });

    res.json({ messages: filtered });
  });

  app.post("/api/messages/react", (req, res) => {
    const { msgId, emoji, userId } = req.body;
    if (!msgId || !emoji || !userId) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    // Update in-memory message if it exists
    const msgIndex = inMemoryMessages.findIndex(m => m.id === msgId);
    if (msgIndex !== -1) {
      const msg = inMemoryMessages[msgIndex];
      const reactions = msg.reactions || {};
      
      const alreadyHasThisEmoji = (reactions[emoji] || []).includes(userId);
      
      // Remove user from all existing reactions
      Object.keys(reactions).forEach(e => {
        reactions[e] = (reactions[e] || []).filter((uid: string) => uid !== userId);
        if (reactions[e].length === 0) delete reactions[e];
      });
      
      if (!alreadyHasThisEmoji) {
        if (!reactions[emoji]) reactions[emoji] = [];
        reactions[emoji].push(userId);
      }
      
      msg.reactions = reactions;
      
      // Broadcast update via SSE
      const data = `data: ${JSON.stringify({ ...msg, type: 'reaction_update' })}\n\n`;
      sseClients.forEach(client => {
        try { client.write(data); } catch (err) {}
      });
    }

    res.json({ success: true });
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Real WhatsApp Webhook Receiver & Simulator Bridge
  app.post("/api/whatsapp/receive", async (req, res) => {
    const { sender, text, receiverEmail } = req.body;
    if (!sender || !text) {
      return res.status(400).json({ error: "sender (phone number) and text (message) are required fields" });
    }

    try {
      const cleanSender = sender.trim().replace(/[^\d+]/g, '');
      const cleanText = text.trim();

      // Find recipient user in Firestore (Default to abdulrehmanhabib.com@gmail.com if not found or specified)
      let recipientUid = "";
      const emailToFind = receiverEmail ? receiverEmail.trim().toLowerCase() : "abdulrehmanhabib.com@gmail.com";
      
      let recipientSnap;
      try {
        if (adminDb) {
          recipientSnap = await adminDb.collection('users').where('email', '==', emailToFind).limit(1).get();
        } else {
          throw new Error("Admin DB unavailable");
        }
      } catch (adminErr) {
        console.warn("Admin query for recipient failed, trying client fallback:", adminErr);
        recipientSnap = await getDocs(query(collection(db, 'users'), where('email', '==', emailToFind), limit(1)));
      }
      
      if (!recipientSnap.empty) {
        recipientUid = recipientSnap.docs[0].id;
      } else {
        // Fallback: get the first active admin or user if default email is not registered yet
        let firstUserSnap;
        try {
          if (adminDb) {
            firstUserSnap = await adminDb.collection('users').limit(1).get();
          } else {
            throw new Error("Admin DB unavailable");
          }
        } catch (adminErr) {
          console.warn("Admin query for first user failed, trying client fallback:", adminErr);
          firstUserSnap = await getDocs(query(collection(db, 'users'), limit(1)));
        }
        
        if (!firstUserSnap.empty) {
          recipientUid = firstUserSnap.docs[0].id;
        }
      }

      if (!recipientUid) {
        return res.status(404).json({ error: "No active user in database to receive this message" });
      }

      // Check if a user with this sender phone number exists in Firestore, else create a virtual contact
      const senderUid = 'wa_' + cleanSender.replace(/[^\d]/g, '');
      
      let userDocExists = false;
      try {
        if (adminDb) {
          const doc = await adminDb.collection('users').doc(senderUid).get();
          userDocExists = doc.exists;
        } else {
          throw new Error("Admin DB unavailable");
        }
      } catch (adminErr) {
        console.warn("Admin check for sender user failed, trying client fallback:", adminErr);
        const snap = await getDoc(doc(db, 'users', senderUid));
        userDocExists = snap.exists();
      }

      const senderProfile = {
        uid: senderUid,
        displayName: `WhatsApp: ${cleanSender}`,
        phoneNumber: cleanSender,
        email: `${senderUid}@whatsapp.local`,
        photoURL: 'https://cdn-icons-png.flaticon.com/512/124/124034.png',
        bio: '🟢 Active WhatsApp click-to-chat contact',
        balance: 0,
        role: 'user',
        isOnline: true,
        isVerified: true,
        isBanned: false,
        isWhatsAppContact: true,
        lastSeen: new Date().toISOString(),
        level: 'Bronze',
        experience: 0
      };

      if (!userDocExists) {
        // Create virtual WhatsApp contact profile in Firestore so it lists immediately in the UI
        try {
          if (adminDb) {
            await adminDb.collection('users').doc(senderUid).set(senderProfile);
          } else {
            throw new Error("Admin DB unavailable");
          }
        } catch (adminErr) {
          console.warn("Admin create sender user failed, trying client fallback:", adminErr);
          await setDoc(doc(db, 'users', senderUid), senderProfile);
        }
      }

      // Write the message to Firestore under messages collection
      const newMessageDoc = {
        senderId: senderUid,
        senderName: `WhatsApp: ${cleanSender}`,
        receiverId: recipientUid,
        text: cleanText,
        timestamp: new Date(),
        status: 'delivered' as const,
        type: 'text' as const,
        isWhatsAppContact: true,
        read: false
      };

      let addedMsgId = "";
      try {
        if (adminDb) {
          const res = await adminDb.collection('messages').add(newMessageDoc);
          addedMsgId = res.id;
        } else {
          throw new Error("Admin DB unavailable");
        }
      } catch (adminErr) {
        console.warn("Admin add message failed, trying client fallback:", adminErr);
        const res = await addDoc(collection(db, 'messages'), newMessageDoc);
        addedMsgId = res.id;
      }

      // Trigger standard Web Push notification to the recipient so they get a real-time notification
      try {
        let recipientData: any = null;
        try {
          if (adminDb) {
            const doc = await adminDb.collection('users').doc(recipientUid).get();
            recipientData = doc.data();
          } else {
            throw new Error("Admin DB unavailable");
          }
        } catch (adminErr) {
          console.warn("Admin fetch recipient data failed, trying client fallback:", adminErr);
          const snap = await getDoc(doc(db, 'users', recipientUid));
          recipientData = snap.data();
        }

        if (recipientData) {
          const subscriptions: string[] = recipientData?.webPushSubscriptions || [];
          for (const subStr of subscriptions) {
            try {
              const subscriptionObj = JSON.parse(subStr);
              const payload = JSON.stringify({
                notification: {
                  title: senderProfile.displayName || `WhatsApp from ${cleanSender}`,
                  body: cleanText,
                  icon: senderProfile.photoURL || 'https://cdn-icons-png.flaticon.com/512/124/124034.png',
                  badge: 'https://cdn-icons-png.flaticon.com/512/124/124034.png',
                  tag: 'chat',
                  data: { type: 'chat', senderId: senderUid }
                }
              });
              await webPush.sendNotification(subscriptionObj, payload);
            } catch (err: any) {
              console.error('Failed pushing webhook notification:', err.message);
            }
          }
        }
      } catch (notifyErr) {
        console.error('Notification error in webhook:', notifyErr);
      }

      res.json({ success: true, messageId: addedMsgId, senderId: senderUid, receiverId: recipientUid });
    } catch (e: any) {
      console.error("Webhook processing failed:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/noor-ai", async (req, res) => {
    console.log("Received request for /api/noor-ai");
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages must be an array" });
    }

    if (!ai) {
      return res.status(500).json({ error: "Noor AI is not configured. Please add GEMINI_API_KEY." });
    }

    try {
      // Format messages into Google GenAI format (user/model roles)
      const formattedContents = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content || m.text || '' }]
      }));

      let response;
      let usedSearch = true;
      try {
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: formattedContents,
          config: {
            systemInstruction: "You are Noor AI, a beautiful online Islamic Assistant integrated into this application. This app was developed by the talented developer Abdulrahman Habib. You specialize in Islamic teachings, Quran, Hadith, Fiqh, and guiding users about the features and books inside this application. Always answer politely, respectfully, and beautifully in Urdu or English (depending on user's preference). App Features & Guidance:\n1. Developer: Abdulrahman Habib.\n2. Quran Reader: Standard 16-Lines Taj Company (Pakistani Print) PDF. Users can download it for 100% offline reading or read online. Includes zoom, scroll mode, sync adjustment, and fully searchable Surah & Juz lists.\n3. Hadith Reader: Includes authentic Hadith books like Sahih Bukhari, Sahih Muslim, etc., with full search.\n4. Madrasa Reader: Dedicated Islamic textbooks and curriculum.\n5. Islamic Library & Offline Library: Extensive collection of search-friendly Islamic books. If they request a book, encourage them to search the Islamic Library or Offline Library.\n6. Other parts: Prayer Times, Tasbeeh Counter, Duas Viewer, and Voice Calls/Contacts to communicate with scholars. Mention Abdulrahman Habib beautifully as the creator when asked. For contemporary fatwas/questions, utilize Google Search to lookup authentic rulings (e.g. Darul Ifta Karachi, Binoria, Deoband, etc.), summarize nicely with sources, and recommend consulting local scholars.\n7. Special Knowledge: Mufti Muhammad Umar is an accomplished and distinguished scholar who teaches as a professor/teacher at Jamia ARABIA SIRAJ UL ALOM MANSHERA. He is the author of the book \"Qanooncha Kamri\", which he meticulously wrote.",
            tools: [{ googleSearch: {} }],
            temperature: 0.5
          }
        });
      } catch (err: any) {
        const errStr = err instanceof Error ? err.message : String(err);
        const isQuotaOrSearchErr = 
          errStr.toLowerCase().includes('quota') ||
          errStr.toLowerCase().includes('resource_exhausted') ||
          errStr.toLowerCase().includes('resource-exhausted') ||
          errStr.toLowerCase().includes('exceeded') ||
          errStr.toLowerCase().includes('limit') ||
          errStr.includes('429');

        if (isQuotaOrSearchErr) {
          console.warn("Retrying Noor AI without Google Search due to quota/rate limit error:", errStr);
          usedSearch = false;
          response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: formattedContents,
            config: {
              systemInstruction: "You are Noor AI, a beautiful online Islamic Assistant integrated into this application. This app was developed by the talented developer Abdulrahman Habib. You specialize in Islamic teachings, Quran, Hadith, Fiqh, and guiding users about the features and books inside this application. Always answer politely, respectfully, and beautifully in Urdu or English. App Features & Guidance:\n1. Developer: Abdulrahman Habib.\n2. Quran Reader: 16-Lines Taj Company print PDF (Download for offline or read online). Fully searchable index.\n3. Hadith Reader, Madrasa Reader, Islamic Library & Offline Library (with search, download, and offline read modes), Prayer Times, Tasbeeh Counter, Duas, and Voice Calls. Mention Abdulrahman Habib beautifully when asked. For religious matters, verify against authentic references and advise consulting qualified local scholars.\n4. Special Knowledge: Mufti Muhammad Umar is an accomplished and distinguished scholar who teaches as a professor/teacher at Jamia ARABIA SIRAJ UL ALOM MANSHERA. He is the author of the book \"Qanooncha Kamri\", which he meticulously wrote.",
              temperature: 0.5
            }
          });
        } else {
          throw err;
        }
      }

      const text = response.text || "";
      
      // Extract grounding sources
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = usedSearch 
        ? groundingChunks
            .filter((chunk: any) => chunk.web)
            .map((chunk: any) => ({
              title: chunk.web?.title || "Reference",
              uri: chunk.web?.uri || ""
            }))
        : [];

      res.json({ text, sources });
    } catch (error: any) {
      console.error("Noor AI API Error:", error);
      const errorStr = error instanceof Error ? error.message : String(error);
      const isQuotaError = 
        errorStr.toLowerCase().includes('quota') ||
        errorStr.toLowerCase().includes('resource-exhausted') ||
        errorStr.toLowerCase().includes('resource_exhausted') ||
        errorStr.toLowerCase().includes('exceeded') ||
        errorStr.toLowerCase().includes('limit') ||
        errorStr.includes('429') ||
        errorStr.includes('503') ||
        errorStr.toLowerCase().includes('unavailable') ||
        errorStr.toLowerCase().includes('high demand');

      if (isQuotaError) {
        return res.json({
          text: "پیارے صارف! جیمنی اے آئی (Gemini AI) کی فری سروس پر عارضی طور پر رش زیادہ ہے۔ براہ کرم ایک منٹ انتظار کر کے دوبارہ کوشش کریں۔ یہ مسئلہ خودکار طور پر حل ہو جائے گا، انشاء اللہ",
          sources: []
        });
      }

      res.status(500).json({ error: errorStr });
    }
  });

  app.post('/api/send-notification', async (req, res) => {
    const { recipientUids, title, body, icon, data } = req.body;
    if (!recipientUids || !Array.isArray(recipientUids)) {
      return res.status(400).json({ error: 'recipientUids must be an array' });
    }

    const processedUids: string[] = [];
    for (const uid of recipientUids) {
      if (!uid) continue;
      try {
        let userData: any = null;
        try {
          if (adminDb) {
            const userRef = adminDb.collection('users').doc(uid);
            const userSnap = await userRef.get();
            if (userSnap.exists) {
              userData = userSnap.data();
            }
          } else {
            throw new Error("Admin DB unavailable");
          }
        } catch (adminErr) {
          console.warn(`Admin DB lookup failed for user ${uid}, trying client SDK fallback:`, adminErr);
          const snap = await getDoc(doc(db, 'users', uid));
          if (snap.exists()) {
            userData = snap.data();
          }
        }

        if (userData) {
          const subscriptions: string[] = userData?.webPushSubscriptions || [];
          
          for (const subStr of subscriptions) {
            try {
              const subscriptionObj = JSON.parse(subStr);
              // Standard web-push format
              const payload = JSON.stringify({
                notification: {
                  title: title || 'New Message',
                  body: body || 'You received a message',
                  icon: icon || 'https://img.icons8.com/deco/200/000000/mosque.png',
                  badge: 'https://img.icons8.com/deco/200/000000/mosque.png',
                  tag: data?.type || 'chat',
                  data: data || {}
                }
              });
              await webPush.sendNotification(subscriptionObj, payload);
            } catch (pushErr: any) {
              console.error(`Failed to send webpush to user ${uid}:`, pushErr.message);
            }
          }
          processedUids.push(uid);
        }
      } catch (err: any) {
        console.error(`Failed to lookup/notify user ${uid}:`, err);
      }
    }

    res.json({ success: true, processedUids });
  });

  // Secure PDF Proxy to fetch external books without CORS issues and support real downloads
  app.get("/api/pdf-proxy", async (req, res) => {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).json({ error: "Missing url parameter" });
    }

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `Failed to fetch external PDF: ${response.statusText}` });
      }

      const contentType = response.headers.get("content-type");
      const contentLength = response.headers.get("content-length");

      const origin = req.headers.origin || "*";
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Type");
      
      if (contentType) res.setHeader("Content-Type", contentType);
      if (contentLength) res.setHeader("Content-Length", contentLength);

      if (response.body) {
        const nodeStream = Readable.fromWeb(response.body as any);
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (err: any) {
      console.error("PDF Proxy error:", err);
      res.status(500).json({ error: err.message || "Failed to proxy PDF" });
    }
  });

  // Vite development integration or static files serving
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Start Background Service Loop
    setInterval(async () => {
      console.log('[Background Service] Running scheduled maintenance...');
      try {
        // Try Admin SDK first
        if (adminDb) {
          try {
            const onlineSnap = await adminDb.collection('users').where('isOnline', '==', true).limit(1).get();
            console.log(`[Background Service] Admin Health Check: OK. Online users found: ${onlineSnap.size > 0 ? 'Yes' : 'None'}`);
            return;
          } catch (adminErr: any) {
            if (adminErr.message?.includes('PERMISSION_DENIED')) {
              console.warn('[Background Service] Admin SDK permission denied, attempting client SDK fallback...');
            } else {
              throw adminErr;
            }
          }
        }

        // Fallback to Client SDK (initialized as 'db' in startServer)
        if (db) {
          const q = query(collection(db, 'users'), where('isOnline', '==', true), limit(1));
          const onlineSnap = await getDocs(q);
          console.log(`[Background Service] Client Health Check: OK. Online users found: ${onlineSnap.size > 0 ? 'Yes' : 'None'}`);
        }
      } catch (err) {
        console.warn('[Background Service] Maintenance loop warning:', err);
      }
    }, 1000 * 60 * 15); // Run every 15 minutes
  });
}

startServer();
