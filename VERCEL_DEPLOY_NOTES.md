# Vercel Deploy Setup — ULFHA CHAT

Status: **ready to deploy** (branch `arena/e2542ed4-ulfha-chat`)

---

## Kya theek kiya gaya

### 1. Build blocker ✅
`vite build` fail ho raha tha kyunke `src/utils/logoData.ts` repo me maujood hi nahi thi
(jabke 5 files usay import karti hain). File add kar di gayi — logo `public/logo.png` se
base64 data-URI ke tor par embed hota hai. `npm run build` ab clean pass hai.

### 2. `vercel.json` theek ✅
Pehle `{"rewrites":[{"source":"/(.*)","destination":"/"}]}` tha, jo `/api/*` ko bhi
`index.html` par bhej deta tha. Ab:

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api/index?__path=:path*" },
    { "source": "/api",       "destination": "/api/index" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

Pehle do rewrites API ko function tak pohanchate hain, teesra sirf SPA routes ke liye hai
(`/api` ko chhor kar).

### 3. Poora Express backend Vercel par ✅
Pehle Vercel par sirf 2 endpoints (`noor-ai`, `pdf-proxy`) deploy hote the — chat, push,
bridge, whatsapp, admin, notifications sab **404** the. Ab:

- `server.ts` ko refactor kiya: `export async function buildApp()` (poora Express app, saare routes),
  aur listener sirf tab chalta hai jab file khud entry point ho (`npm run dev` / `node dist/server.cjs`)
  aur `VERCEL` env set na ho.
- `api/index.ts` — ek hi Vercel Function jo `buildApp()` ko lazily build karke (module-level cache)
  har request Express ko de deta hai. Rewrite ki wajah se path badal jaye to `restoreUrl()`
  original `/api/...` path + query wapas bana deta hai.
- `api/noor-ai.ts` aur `api/pdf-proxy.ts` delete kiye — unki jagah `server.ts` ke wahi routes
  (single source of truth) chalti hain.
- `vite` ab dynamic import hai (aur indirect specifier se) — taake poora Vite bundle
  serverless function me na chala jaye.

Ab Vercel par maujood endpoints: `/api/messages/*`, `/api/push/*`, `/api/push-public-key`,
`/api/admin/push/*`, `/api/bridge/send`, `/api/whatsapp/*`, `/api/noor-ai`, `/api/pdf-proxy`,
`/api/send-notification`, `/api/health`, `/api/download-android-project`, `/api/apk-status`.

### 4. Read-only filesystem crash ✅
`vapid-keys.json` likhne wala `fs.writeFileSync` try/catch me daal diya — Vercel ke read-only
filesystem par function crash nahi hoga (keys sirf memory me rahengi).

### 5. Repo hygiene ✅
`bun.lock` delete kiya (package-lock.json ke sath conflict se Vercel Bun detect karke
`bun install` chala sakta tha). Ab package manager npm hai — deterministic.

---

## Deploy karne ke steps

### A. Vercel project
1. https://vercel.com/new → GitHub repo `thepakclicktes/ULFHA-CHAT` import karein.
2. Framework Preset: **Vite** (auto detect ho jayega).
   Build Command `npm run build`, Output Directory `dist` — `vercel.json` se aa jayenge.
3. **Environment Variables** (Settings → Environment Variables) me add karein:

   | Name | Value | Zaroori? |
   |---|---|---|
   | `GEMINI_API_KEY` | aap ki Gemini API key | **Haan** — warna Noor AI: "Noor AI is not configured" |
   | `VAPID_PUBLIC_KEY` | web-push public key | Push ke liye (nahi diya to har cold start par nayi key banti hai) |
   | `VAPID_PRIVATE_KEY` | web-push private key | 〃 |

4. Deploy.

> Pehle jo key `api/noor-ai.ts` me hardcoded thi wo ab hata di gayi hai (public repo me leak thi).
> Agar wo key abhi bhi valid hai to **rotate** kar lein aur nayi key env var me daalein.

### B. Deploy ke baad check
```bash
curl https://<your-app>.vercel.app/api/health
# {"status":"ok"}

curl https://<your-app>.vercel.app/api/push-public-key
# {"key":"...","publicKey":"..."}
```

Browser me: `/` par app load ho, Noor AI ka jawab aaye, chat list khule.

---

## Ab bhi dhyan rakhne wali cheezein (Vercel ki hadein)

1. **PDF proxy — 4.5 MB response limit.** Vercel function ka response 4.5 MB tak mehdood hai,
   magar Quran/Hadith ki PDFs is se bari hain → bari books par proxy fail hogi.
   `pdf-proxy` ko kisi chhote VPS/Render par shift karna behtar hai, ya client se
   archive.org par direct redirect karna.

2. **Push data persist nahi hoga.** `push-subscriptions.json` / `push-campaigns.json` /
   `push-settings.json` filesystem par likhe jate hain — Vercel read-only + ephemeral hai.
   Inhein **Firestore** me shift karna chahiye (Firestore already configured hai).

3. **Firebase Admin SDK** `applicationDefault()` use karta hai jo Vercel par credentials ke
   baghair fail hota hai (error catch ho jata hai, app chalta rehta hai). Admin features ke liye
   `FIREBASE_SERVICE_ACCOUNT` (JSON) env var + `cert()` use karna hoga.

4. **Background maintenance loop** (`setInterval`, server.ts) sirf standalone server me chalta hai —
   Vercel par nahi. Zaroorat ho to Vercel **Cron Jobs** use karein.

5. **Root ki duplicate files** — `/App.tsx`, `/Auth.tsx`, `/AdminPanel.tsx`, `/LandingPage.tsx`
   `src/` wali copies se purani aur different hain, kahin import nahi hoti. Build par asar nahi,
   delete kar sakte hain.

6. **`process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"`** (server.ts line 5) SSL verification band
   karta hai. Behtar hai sirf archive.org wali request ke liye `https.Agent({rejectUnauthorized:false})`
   use karein.

---

## Local par kya chalta hai

```bash
npm install
npm run dev     # http://localhost:3000 (Express + Vite middleware)
npm run build   # dist/ + dist/server.cjs
npm start       # production server (dist/)
```
