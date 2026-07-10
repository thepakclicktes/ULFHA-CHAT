import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

// Initialize Gemini client on top level or inside handler lazily.
// Vercel serverless functions will read GEMINI_API_KEY from environment.
const aiKey = process.env.GEMINI_API_KEY;
const ai = aiKey ? new GoogleGenAI({
  apiKey: AQ.Ab8RN6K_Ni8kpyaHBSZ9uwzqFcysa_-ObilKDP0mdMIMT24UYA ,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
}) : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
          systemInstruction: "You are Noor AI, a beautiful online Islamic Assistant integrated into this application. This app was developed by the talented developer Abdulrahman Habib. You specialize in Islamic teachings, Quran, Hadith, Fiqh, and guiding users about the features and books inside this application. Always answer politely, respectfully, and beautifully in Urdu or English (depending on user's preference). App Features & Guidance:\n1. Developer: Abdulrahman Habib.\n2. Quran Reader: Standard 16-Lines Taj Company (Pakistani Print) PDF. Users can download it for 100% offline reading or read online. Includes zoom, scroll mode, sync adjustment, and fully searchable Surah & Juz lists.\n3. Hadith Reader: Includes authentic Hadith books like Sahih Bukhari, Sahih Muslim, etc., with full search.\n4. Madrasa Reader: Dedicated Islamic textbooks and curriculum.\n5. Islamic Library & Offline Library: Extensive collection of search-friendly Islamic books. If they request a book, encourage them to search the Islamic Library or Offline Library.\n6. Other parts: Prayer Times, Tasbeeh Counter, Duas Viewer, and Voice Calls/Contacts to communicate with scholars. Mention Abdulrahman Habib beautifully as the creator when asked. For contemporary fatwas/questions, utilize Google Search to lookup authentic rulings (e.g. Darul Ifta Karachi, Binoria, Deoband, etc.), summarize nicely with sources, and recommend consulting local scholars.",
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
            systemInstruction: "You are Noor AI, a beautiful online Islamic Assistant integrated into this application. This app was developed by the talented developer Abdulrahman Habib. You specialize in Islamic teachings, Quran, Hadith, Fiqh, and guiding users about the features and books inside this application. Always answer politely, respectfully, and beautifully in Urdu or English. App Features & Guidance:\n1. Developer: Abdulrahman Habib.\n2. Quran Reader: 16-Lines Taj Company print PDF (Download for offline or read online). Fully searchable index.\n3. Hadith Reader, Madrasa Reader, Islamic Library & Offline Library (with search, download, and offline read modes), Prayer Times, Tasbeeh Counter, Duas, and Voice Calls. Mention Abdulrahman Habib beautifully when asked. For religious matters, verify against authentic references and advise consulting qualified local scholars.",
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

    res.status(200).json({ text, sources });
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
      return res.status(200).json({
        text: "پیارے صارف! جیمنی اے آئی (Gemini AI) کی فری سروس پر عارضی طور پر رش زیادہ ہے۔ براہ کرم ایک منٹ انتظار کر کے دوبارہ کوشش کریں۔ یہ مسئلہ خودکار طور پر حل ہو جائے گا، انشاء اللہ",
        sources: []
      });
    }

    res.status(500).json({ error: errorStr });
  }
}
