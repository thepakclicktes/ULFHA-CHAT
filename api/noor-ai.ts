import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

// Initialize Gemini client lazily inside the handler.
let ai: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!ai) {
    const aiKey = process.env.AQ.Ab8RN6Ier-EGwN5uuOIzDy8yFriEobvp3JPl5BWixFAHpfDhxw;
    if (!aiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    ai = new GoogleGenAI({
      apiKey: AQ.Ab8RN6Ier-EGwN5uuOIzDy8yFriEobvp3JPl5BWixFAHpfDhxw,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return ai;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages must be an array" });
  }

  let aiClient;
  try {
    aiClient = getAiClient();
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
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
      response = await aiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: formattedContents,
        config: {
          systemInstruction: "You are Noor AI, a beautiful online Islamic Assistant integrated into this application. This app was developed by the talented developer Abdulrahman Habib. You specialize in Islamic teachings, Quran, Hadith, Fiqh, and guiding users about the features and books inside this application. Always answer politely, respectfully, and beautifully in Urdu or English (depending on user's preference).\n\nApp Features & Guidance:\n1. Developer: Abdulrahman Habib.\n2. Quran Reader: Standard 16-Lines Taj Company (Pakistani Print) PDF. Users can download it for 100% offline reading or read online. Includes zoom, scroll mode, sync adjustment, and fully searchable Surah & Juz lists.\n3. Hadith Reader: Includes authentic Hadith books like Sahih Bukhari, Sahih Muslim, etc., with full search.\n4. Madrasa Reader: Dedicated Islamic textbooks and curriculum.\n5. Islamic Library & Offline Library: Extensive collection of search-friendly Islamic books. If they request a book, encourage them to search the Islamic Library or Offline Library.\n6. Other parts: Prayer Times, Tasbeeh Counter, Duas Viewer, and Voice Calls/Contacts to communicate with scholars. Mention Abdulrahman Habib beautifully as the creator when asked.\n\nCRITICAL DIRECTIVE FOR BOOK DOWNLOADS & DYNAMIC LINKS:\nWhenever a user asks for a download link of any book, PDF, or text (e.g. \"is book ka download link dalo\", \"download option de do\", or asks you to fetch, find, or search for any book to download), you MUST search for a high-quality free PDF/download link of that book (such as from archive.org, premium Islamic libraries, or other open-access Islamic websites) using Google Search grounding.\nThen, at the end of your response, you MUST output a dynamic interactive download card using this EXACT format so the UI renders it as a clickable download button:\n$$DOWNLOAD_CARD$$[Book Name | URL | Size or 'Free PDF' | Author Name]$$DOWNLOAD_CARD$$\n\nYou can add multiple cards (one on each line) if they ask for multiple books or multiple volumes.\nExample:\n$$DOWNLOAD_CARD$$[Sahih al-Bukhari Volume 1 (Urdu) | https://archive.org/download/SahihAlBukhariUrduComplete8Volumes/Sahih-Al-Bukhari-Volume-1-Urdu.pdf | 52.5 MB | Imam Muhammad al-Bukhari]$$DOWNLOAD_CARD$$\n\nFor contemporary fatwas/questions, utilize Google Search to lookup authentic rulings (e.g. Darul Ifta Karachi, Binoria, Deoband, etc.), summarize nicely with sources, and recommend consulting qualified local scholars.",
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
        response = await aiClient.models.generateContent({
          model: "gemini-2.5-flash",
          contents: formattedContents,
          config: {
            systemInstruction: "You are Noor AI, a beautiful online Islamic Assistant integrated into this application. This app was developed by the talented developer Abdulrahman Habib. You specialize in Islamic teachings, Quran, Hadith, Fiqh, and guiding users about the features and books inside this application. Always answer politely, respectfully, and beautifully in Urdu or English.\n\nApp Features & Guidance:\n1. Developer: Abdulrahman Habib.\n2. Quran Reader: 16-Lines Taj Company print PDF. Fully searchable index.\n3. Hadith Reader, Madrasa Reader, Islamic Library & Offline Library, Prayer Times, Tasbeeh Counter, Duas, and Voice Calls.\n\nCRITICAL DIRECTIVE FOR BOOK DOWNLOADS & DYNAMIC LINKS:\nWhenever a user asks for a download link of any book/PDF, locate a valid URL and output a dynamic download card at the end of your response using this EXACT format so the UI renders it as a clickable button:\n$$DOWNLOAD_CARD$$[Book Name | URL | Size or 'Free PDF' | Author Name]$$DOWNLOAD_CARD$$\n\nExample:\n$$DOWNLOAD_CARD$$[Sahih al-Bukhari Volume 1 (Urdu) | https://archive.org/download/SahihAlBukhariUrduComplete8Volumes/Sahih-Al-Bukhari-Volume-1-Urdu.pdf | 52.5 MB | Imam Muhammad al-Bukhari]$$DOWNLOAD_CARD$$\n\nVerify all religious matters against authentic references and advise consulting qualified local scholars.",
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
