# Vercel Deploy — Masail aur Hal (Diagnosis)

Date: 2026-10-23 · Branch: `arena/e2542ed4-ulfha-chat`

---

## 1. Asal masla (build fail) — ✅ HAL HO GAYA

`vite build` fail ho raha tha:

```
Could not resolve "./utils/logoData" from "src/App.tsx"
```

Repo me `src/utils/logoData.ts` naam ki file **kabhi maujood hi nahi thi** (git history check kiya — sirf aaj add hui hai),
magar 5 files usay import karti hain:

- `src/App.tsx`
- `src/components/Auth.tsx`
- `src/components/AdminPanel.tsx`
- `src/components/ChatList.tsx`
- `src/components/Header.tsx`

Vercel par `npm run build` chalta hai → `vite build` → yahi error → **Deployment failed**.
Ab file bana di gayi hai (logo `public/logo.png` se base64 data-URI ke tor par embed hota hai),
aur `npm run build` locally clean pass hota hai.

---

## 2. vercel.json galat tha (SPA fallback ne /api ko nigal liya) — ✅ HAL HO GAYA

Pehle:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }
```

Ye catch-all har request — **`/api/...` bhi** — `index.html` par bhej deta tha.
Nateeja: deploy ho bhi jata to Noor AI aur PDF proxy HTML return karte (JSON ke bajaye) → chat aur books fail.

Ab:

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]
}
```

`/api/*` ab serverless functions tak pohanchta hai, baqi sab routes SPA par.

---

## 3. Sab se bara baqi masla — Vercel par 25 me se sirf 2 API endpoints deploy hote hain ⚠️

App ka pura backend `server.ts` (Express, 1200+ lines) me hai. Vercel usay **nahi chalata**.
Vercel sirf `/api` folder ki files ko function banata hai — wahan sirf 2 files hain:

| Vercel par maujood | Client inhein use karta hai |
|---|---|
| `api/noor-ai.ts` | ✅ NoorAIChat, ChatWindow |
| `api/pdf-proxy.ts` | ✅ QuranReader, BookReader, IslamicLibrary |

Magar client in endpoints ko bhi call karta hai jo Vercel par **maujood hi nahi** (404):

| Endpoint | Kahan use hota hai | Vercel par |
|---|---|---|
| `/api/messages/send` · `/history` · `/stream` · `/react` · `/mark-read` | ChatWindow (real-time chat) | ❌ 404 |
| `/api/push/*` (subscribe, unsubscribe, notify-user) | usePush, App | ❌ 404 |
| `/api/push-public-key` | App.tsx | ❌ 404 |
| `/api/admin/push/*` (settings, devices, stats, history, send, generate-vapid) | admin/PushPage | ❌ 404 |
| `/api/bridge/send` | ReplyBridge (email/WhatsApp bridge) | ❌ 404 |
| `/api/whatsapp/save-contact` · `/receive` | ChatList, webhook | ❌ 404 |
| `/api/send-notification` | utils/notifications.ts | ❌ 404 |
| `/api/health` | monitoring | ❌ 404 |

**Hal ke 3 raste:**

1. **Sab se aasan:** `api/index.ts` banao jo Express app ko ek hi serverless function me mount kare
   (`server.ts` se `startServer()` / app ko export karke, `app.listen` hata kar) — phir vercel.json me
   `/api/(.*)` → `/api/index` rewrite. Sab endpoints ek sath kaam karenge.
2. **Better (long-term):** Vercel chhor kar backend ko Render / Railway / Fly.io par rakho (Express + persistent disk),
   aur `resolveApiUrl()` me wahan ka base URL daal do.
3. **Manual:** har route ko alag `api/*.ts` file me port karo.

> Note: `src/utils.ts` me `resolveApiUrl()` filhal sirf `return apiPath;` hai — yani same-origin.
> Agar backend kisi doosre host par jaye to yahin base URL set karna hoga.

---

## 4. `pdf-proxy` Vercel par bare PDFs par fail hoga ⚠️

Vercel function ka response limit **4.5 MB** hai. Quran/Hadith ki PDFs is se bohat bari hain.
`api/pdf-proxy.ts` stream karta hai magar Vercel usay buffer karta hai → bare books par
`FUNCTION_PAYLOAD_TOO_LARGE` / adhoora file.

Hal: PDF proxy ko bhi alag server (Render/Railway) par le jao, ya client se direct archive.org par redirect karo
(CORS `Access-Control-Expose-Headers` ke sath).

---

## 5. Filesystem par likhna Vercel par kaam nahi karta ⚠️

`server.ts` ye files likhta hai:

- `vapid-keys.json`
- `push-subscriptions.json`
- `push-campaigns.json`
- `push-settings.json`

Vercel ka filesystem **read-only** hai (sirf `/tmp` writable, wo bhi har invocation me temporary).
Yani push notifications ka data save nahi hoga — inhein **Firestore** me shift karna chahiye
(project me Firestore already configured hai).

---

## 6. Environment Variables (Vercel → Settings → Environment Variables) ⚠️

`.env*` gitignored hai, is liye Vercel par manually set karna zaroori hai:

| Variable | Zaroorat | Note |
|---|---|---|
| `GEMINI_API_KEY` | **Zaroori** | warna Noor AI kaam nahi karega |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Push ke liye | ya server generate karega (jo Vercel par persist nahi hoga) |
| `FIREBASE_SERVICE_ACCOUNT` (JSON) | Admin SDK ke liye | abhi `applicationDefault()` use ho raha hai jo Vercel par fail hota hai |

**Security:** `api/noor-ai.ts` me ek **hardcoded Gemini API key** fallback maujood hai (line ~12).
Repo public ho to ye leak hai — ise hata kar sirf `process.env.GEMINI_API_KEY` use karein.

---

## 7. Chhoti magar ahem cheezein

- **Do lockfiles:** `bun.lock` + `package-lock.json`. Vercel Bun detect kar sakta hai aur `bun install` chala sakta hai.
  Agar deploy logs me install error aaye to `bun.lock` delete karein (ya Vercel me package manager npm fix karein).
- **Root ki duplicate files:** `/App.tsx`, `/Auth.tsx`, `/AdminPanel.tsx`, `/LandingPage.tsx` — ye `src/` wali copies se
  **different** (purani) hain aur kaheen import nahi hoti. Build par asar nahi, magar confusion aur repo bloat.
  Delete kar sakte hain.
- **`process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"`** — `server.ts` line 5. Ye SSL verification band karta hai (security risk).
  Better: sirf specific archive.org request ke liye `https.Agent({ rejectUnauthorized: false })`.
- **`maxDuration`** set karne ki zaroorat nahi — Hobby par ab default 300s hai.

---

## Kya fix ho chuka hai (is branch par)

- ✅ `src/utils/logoData.ts` add — build blocker khatam
- ✅ `vercel.json` theek — `/api` shadowing khatam, `framework`/`outputDirectory` explicit
- ✅ `vite.config.ts` me preview host allow (dev ke liye)
- ✅ `npm run build` locally pass (vite + esbuild)

## Aap decide karein (main kar sakta hoon)

1. `api/index.ts` bana kar pura Express backend Vercel par chalana (option 3.1)
2. Hardcoded Gemini key hata kar env-only karna
3. Root ki duplicate `.tsx` files delete karna
4. Push data ko Firestore par shift karna
