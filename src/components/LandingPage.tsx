// ... existing code ...
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, Sparkles, BookOpen, Users, Phone, ShieldCheck, 
  ArrowRight, CheckCircle2, ChevronRight, Search, Layers, Calendar, 
  Clock, Heart, Feather, LogIn, X, ArrowLeft, Tag, Send
} from 'lucide-react';

export interface BlogPost {
  id?: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  imageUrl?: string;
  author: string;
  authorRole?: string;
  authorAvatar?: string;
  date: string;
  readTime: string;
  tags?: string[];
  status?: 'published' | 'draft';
  createdAt?: any;
}

export const DEFAULT_BLOGS: BlogPost[] = [
  {
    id: 'demo-1',
    title: 'Introducing Ulfah Chat: A Privacy-Focused Modern Messaging & Learning Ecosystem',
    summary: 'Discover how Ulfah Chat combines high-speed end-to-end messaging, comprehensive offline Islamic libraries, and Noor AI into a seamless experience.',
    content: `Welcome to Ulfah Chat — the all-in-one messaging and learning ecosystem designed specifically for modern privacy and community connection.

### Why Ulfah Chat?
In today's fast-paced digital world, communication tools often require sacrificing privacy or lack integrated tools for spiritual and personal growth. Ulfah Chat bridges this gap by combining:

1. **Real-time Messaging**: Instant end-to-end encrypted chats, voice notes, media sharing, and read receipts.
2. **Comprehensive Islamic Library**: Complete Holy Quran with Urdu/English translations, Hadith collections, and offline book downloads.
3. **Noor AI Assistant**: An intelligent assistant providing answers to religious, educational, and general queries in real time.
4. **Global Communities & Broadcasts**: Connect with interest groups, channels, and public announcement feeds worldwide.

We invite you to launch the app, invite your friends, and experience the future of secure communication!`,
    category: 'Product News',
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
    author: 'Ulfah Engineering Team',
    authorRole: 'Core Developers',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    date: 'August 10, 2026',
    readTime: '3 min read',
    tags: ['Announcement', 'Privacy', 'UlfahChat', 'AppLaunch'],
    status: 'published'
  },
  {
    id: 'demo-2',
    title: 'How to Access Islamic Books Offline in Ulfah Chat',
    summary: 'Learn how to download Quran surahs, Hadith books, and Dua collections for offline reading on your phone or browser.',
    content: `One of the most loved features in Ulfah Chat is the **Offline Islamic Library**. Whether you are traveling or have limited internet access, you can keep your favorite spiritual readings always available.

### Steps to Save Books Offline:
1. Open the **Explore** tab inside Ulfah Chat.
2. Select **Islamic Library** or **Quran Reader**.
3. Tap on the **Download** button next to any book volume or surah audio.
4. The content will be safely saved in your browser storage or app device cache.

Enjoy uninterrupted daily dhikr, Quran recitation, and authentic Hadith reading wherever you go!`,
    category: 'Guides',
    imageUrl: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=800&auto=format&fit=crop&q=80',
    author: 'M. Abdul Rehman',
    authorRole: 'Product Lead',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    date: 'August 8, 2026',
    readTime: '4 min read',
    tags: ['Quran', 'IslamicLibrary', 'OfflineMode', 'Tutorial'],
    status: 'published'
  },
  {
    id: 'demo-3',
    title: 'Noor AI: Your Smart Companion for Islamic & Daily Questions',
    summary: 'An inside look at how our AI model is fine-tuned to assist you with daily dua recommendations, prayer timings, and educational research.',
    content: `Artificial intelligence is transforming how we access knowledge. With **Noor AI**, built directly into Ulfah Chat, you can ask questions in Urdu or English and receive structured, authentic responses.

### Key Capabilities of Noor AI:
- **Instant Hadith Reference**: Query authentic references from Sahih Bukhari, Sahih Muslim, and Tirmidhi.
- **Prayer & Qibla Guidance**: Get precise prayer schedules and Qibla direction for any city globally.
- **Dua Generator**: Ask for daily supplications tailored to your feelings or situation.

Try opening the Noor AI chat directly in your messages tab today!`,
    category: 'AI & Tech',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    author: 'AI Research Group',
    authorRole: 'AI & NLP Engineers',
    authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
    date: 'August 5, 2026',
    readTime: '5 min read',
    tags: ['NoorAI', 'ArtificialIntelligence', 'IslamicTech'],
    status: 'published'
  }
];

interface LandingPageProps {
  onOpenApp: () => void;
}

export default function LandingPage({ onOpenApp }: LandingPageProps) {
  const [blogs, setBlogs] = useState<BlogPost[]>(DEFAULT_BLOGS);
  const [selectedBlog, setSelectedBlog] = useState<BlogPost | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'home' | 'noor-ai' | 'features' | 'library' | 'blog'>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Enable smooth touch scrolling support across touch devices
    document.body.style.overflowX = 'hidden';
    document.body.style.webkitOverflowScrolling = 'touch';
    return () => {
      document.body.style.overflowX = 'unset';
    };
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const sections: Array<{ id: string; tab: 'home' | 'noor-ai' | 'features' | 'library' | 'blog' }> = [
      { id: 'hero-section', tab: 'home' },
      { id: 'noor-ai-section', tab: 'noor-ai' },
      { id: 'features-section', tab: 'features' },
      { id: 'library-section', tab: 'library' },
      { id: 'blogs-section', tab: 'blog' },
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const matched = sections.find(s => s.id === entry.target.id);
            if (matched) {
              setActiveTab(matched.tab);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: '-20% 0px -40% 0px',
        threshold: 0.1,
      }
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const [noorChat, setNoorChat] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: 'Assalamu Alaikum! I am **Noor AI**, your companion for Quran, Hadith, daily supplications & Islamic guidance. Ask me anything here!'
    },
    {
      role: 'user',
      content: "Show me today's Hadith of the day and prayer schedule."
    },
    {
      role: 'assistant',
      content: '📖 **Sahih Bukhari**: "Actions are judged by intentions." (إنما الأعمال بالنيات)\n\n⏱ **Prayer Schedule**:\n• Fajr: 5:10 AM | Dhuhr: 12:20 PM | Asr: 3:50 PM | Maghrib: 7:02 PM | Isha: 8:25 PM.'
    }
  ]);
  const [noorInput, setNoorInput] = useState('');
  const [isNoorLoading, setIsNoorLoading] = useState(false);

  const handleSendNoor = async (customPrompt?: string) => {
    const queryText = (customPrompt || noorInput).trim();
    if (!queryText || isNoorLoading) return;

    if (!customPrompt) setNoorInput('');

    const newHistory = [...noorChat, { role: 'user' as const, content: queryText }];
    setNoorChat(newHistory);
    setIsNoorLoading(true);

    let fallbackReply = "JazakAllah Khair for your message! **Noor AI** is live. For complete voice calls, offline libraries & full chat, click 'Launch Now' below.";
    const lower = queryText.toLowerCase();
    if (lower.includes('prayer') || lower.includes('namaz') || lower.includes('time') || lower.includes('schedule')) {
      fallbackReply = "⏱ **Today's Prayer Timings**:\n• Fajr: 5:10 AM\n• Dhuhr: 12:20 PM\n• Asr: 3:50 PM\n• Maghrib: 7:02 PM\n• Isha: 8:25 PM\n\n*Pro tip: Recite Ayat al-Kursi after every obligatory prayer.*";
    } else if (lower.includes('surah') || lower.includes('quran') || lower.includes('ayat') || lower.includes('verse')) {
      fallbackReply = "✨ **Surah Ash-Sharh (94:5-6)**:\n\"So truly where there is hardship, there is ease. Truly where there is hardship, there is ease.\"\n\n(فَإِنَّ مَعَ الْعُسْرِ يُسْرًا)";
    } else if (lower.includes('dua') || lower.includes('azkar') || lower.includes('supplication')) {
      fallbackReply = "🤲 **Daily Protection Dua**:\n\"بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ\"\n*(In the name of Allah with Whose name nothing can cause harm in the earth nor in the heavens, and He is the All-Hearing, All-Knowing.)*";
    }

    setTimeout(() => {
      setNoorChat([...newHistory, { role: 'assistant', content: fallbackReply }]);
      setIsNoorLoading(false);
    }, 600);
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ulfah_blogs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBlogs(parsed);
        }
      }
    } catch {
      // Use defaults
    }
  }, []);

  const categories = ['All', 'Product News', 'Guides', 'AI & Tech', 'Community', 'Islamic Updates'];

  const filteredBlogs = blogs.filter(b => {
    const matchesCat = selectedCategory === 'All' || b.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      b.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.tags && b.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesCat && matchesSearch;
  });

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full bg-[#FAFAFC] text-slate-900 font-sans antialiased selection:bg-emerald-500 selection:text-white overflow-x-hidden box-border touch-pan-y">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all shadow-xs w-full max-w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-20 flex items-center justify-between box-border">
          <div className="flex items-center gap-2 cursor-pointer shrink-0 min-w-0" onClick={() => scrollToSection('hero-section')}>
            <div className="w-8 h-8 sm:w-11 sm:h-11 bg-emerald-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-md shadow-emerald-600/20 shrink-0">
              <MessageCircle size={18} className="fill-white/20 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-sm sm:text-xl font-extrabold tracking-tight text-slate-900 font-display block leading-none truncate">Ulfah Chat</span>
              <span className="text-[8px] sm:text-[10px] font-medium text-emerald-600 tracking-wider uppercase block mt-0.5 truncate">Ecosystem</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600">
            <button 
              onClick={() => { setActiveTab('home'); scrollToSection('hero-section'); }} 
              className={`hover:text-emerald-600 transition-colors cursor-pointer ${activeTab === 'home' ? 'text-emerald-600 font-bold border-b-2 border-emerald-600 pb-0.5' : ''}`}
            >
              Home
            </button>
            <button 
              onClick={() => { setActiveTab('noor-ai'); scrollToSection('noor-ai-section'); }} 
              className={`hover:text-emerald-600 transition-colors flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-full text-xs font-bold transition-all border ${
                activeTab === 'noor-ai'
                  ? 'text-emerald-800 bg-emerald-200 border-emerald-400 shadow-xs'
                  : 'text-emerald-700 bg-emerald-50 border-emerald-200/80 hover:bg-emerald-100'
              }`}
            >
              <Sparkles size={13} className="text-emerald-600" />
              <span>Noor AI</span>
            </button>
            <button 
              onClick={() => { setActiveTab('features'); scrollToSection('features-section'); }} 
              className={`hover:text-emerald-600 transition-colors cursor-pointer ${activeTab === 'features' ? 'text-emerald-600 font-bold border-b-2 border-emerald-600 pb-0.5' : ''}`}
            >
              Features
            </button>
            <button 
              onClick={() => { setActiveTab('library'); scrollToSection('library-section'); }} 
              className={`hover:text-emerald-600 transition-colors cursor-pointer ${activeTab === 'library' ? 'text-emerald-600 font-bold border-b-2 border-emerald-600 pb-0.5' : ''}`}
            >
              Islamic Library
            </button>
            <button 
              onClick={() => { setActiveTab('blog'); scrollToSection('blogs-section'); }} 
              className={`hover:text-emerald-600 transition-colors flex items-center gap-1.5 cursor-pointer ${activeTab === 'blog' ? 'text-emerald-600 font-bold border-b-2 border-emerald-600 pb-0.5' : ''}`}
            >
              <span>Blog & News</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </button>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <LogIn size={14} className="sm:w-[18px] sm:h-[18px]" />
              <span className="hidden xs:inline">Sign In / Launch</span>
              <span className="xs:hidden">Launch</span>
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors shrink-0"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Layers size={18} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-b border-slate-200 px-4 py-4 space-y-3 shadow-lg max-h-[80vh] overflow-y-auto w-full box-border"
            >
              <button 
                onClick={() => scrollToSection('hero-section')} 
                className="w-full text-left px-4 py-2.5 rounded-xl font-bold text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 flex items-center justify-between"
              >
                <span>Home</span>
                <ChevronRight size={16} />
              </button>
              <button 
                onClick={() => scrollToSection('noor-ai-section')} 
                className="w-full text-left px-4 py-2.5 rounded-xl font-bold text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 flex items-center justify-between"
              >
                <span className="flex items-center gap-2"><Sparkles size={16} className="text-emerald-600" /> Noor AI Assistant</span>
                <ChevronRight size={16} />
              </button>
              <button 
                onClick={() => scrollToSection('features-section')} 
                className="w-full text-left px-4 py-2.5 rounded-xl font-bold text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 flex items-center justify-between"
              >
                <span>Features</span>
                <ChevronRight size={16} />
              </button>
              <button 
                onClick={() => scrollToSection('library-section')} 
                className="w-full text-left px-4 py-2.5 rounded-xl font-bold text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 flex items-center justify-between"
              >
                <span>Islamic Library</span>
                <ChevronRight size={16} />
              </button>
              <button 
                onClick={() => scrollToSection('blogs-section')} 
                className="w-full text-left px-4 py-2.5 rounded-xl font-bold text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 flex items-center justify-between"
              >
                <span>Blog Posts</span>
                <ChevronRight size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section id="hero-section" className="relative overflow-hidden pt-6 pb-10 sm:py-20 lg:py-28 bg-gradient-to-b from-white via-slate-50/50 to-[#FAFAFC] w-full max-w-full box-border">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] sm:w-[600px] h-[250px] sm:h-[600px] bg-emerald-100/40 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full box-border">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-8 items-center">
            <div className="lg:col-span-7 space-y-4 sm:space-y-8 text-center lg:text-left w-full max-w-full box-border">
              <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 px-3 py-1 sm:px-4 sm:py-2 rounded-full text-[11px] sm:text-xs font-bold text-emerald-800 shadow-xs max-w-full">
                <Sparkles size={13} className="text-emerald-600 animate-spin shrink-0" />
                <span className="truncate">Ulfah Chat 2.0 • Unified Web & Mobile</span>
              </div>

              <h1 className="text-2xl xs:text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.2] sm:leading-[1.12] break-words">
                Connect Privately. <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800 bg-clip-text text-transparent">
                  Learn & Share Seamlessly.
                </span>
              </h1>

              <p className="text-xs sm:text-lg text-slate-600 max-w-2xl leading-relaxed mx-auto lg:mx-0 break-words">
                Experience ultra-fast real-time messaging, end-to-end privacy, an extensive offline Islamic library, AI assistance with Noor AI, and global community broadcasts — all in one clean platform.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-1 w-full">
                <button
                  onClick={onOpenApp}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-2xl font-bold text-xs sm:text-base shadow-xl shadow-emerald-600/30 transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2.5 cursor-pointer box-border"
                >
                  <span>Open Ulfah Chat App</span>
                  <ArrowRight size={18} />
                </button>

                <button
                  onClick={() => scrollToSection('blogs-section')}
                  className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 px-5 py-3 sm:px-7 sm:py-4 rounded-2xl font-bold text-xs sm:text-base shadow-sm transition-all hover:border-slate-300 flex items-center justify-center gap-2 cursor-pointer box-border"
                >
                  <BookOpen size={16} className="text-slate-500 shrink-0" />
                  <span>Read Blog Articles</span>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-2 justify-center lg:justify-start">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <span>100% Free & No Ads</span>
                </div>
                <div className="flex items-center gap-2 justify-center lg:justify-start">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <span>Offline Quran & Books</span>
                </div>
                <div className="flex items-center gap-2 justify-center lg:justify-start">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <span>End-to-End Encrypted</span>
                </div>
              </div>
            </div>

            <div id="noor-ai-section" className="lg:col-span-5 flex justify-center scroll-mt-24 w-full max-w-full box-border">
              <div className="relative w-full max-w-sm sm:max-w-md box-border scale-95 sm:scale-100 transition-transform">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-3xl blur-2xl opacity-25 animate-pulse pointer-events-none" />
                
                <div className="relative bg-white rounded-3xl p-3 sm:p-4 shadow-2xl border border-slate-200/90 text-slate-800 overflow-hidden ring-1 ring-slate-100 box-border">
                  <div className="bg-slate-50/90 rounded-2xl p-2.5 sm:p-3 mb-2.5 flex items-center justify-between border border-slate-200/80 shadow-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-md shadow-emerald-600/20 ring-2 ring-emerald-100 shrink-0">
                        <MessageCircle size={16} className="fill-white/20 sm:w-5 sm:h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5 truncate">
                          <span className="truncate">Noor AI Assistant</span>
                          <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded-full uppercase shrink-0">Live</span>
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                          <span>Interactive</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={onOpenApp} 
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                    >
                      Open
                    </button>
                  </div>

                  <div className="space-y-2.5 p-2.5 sm:p-3 bg-slate-50/70 rounded-2xl border border-slate-200/70 h-[220px] sm:h-[280px] overflow-y-auto shadow-inner scrollbar-thin text-xs box-border touch-pan-y">
                    {noorChat.map((msg, idx) => (
                      <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        {msg.role === 'assistant' ? (
                          <div className="bg-white text-slate-800 p-2.5 sm:p-3 rounded-2xl rounded-tl-xs max-w-[92%] leading-relaxed shadow-xs border border-slate-200/80 box-border break-words">
                            <div className="text-[10px] font-extrabold text-emerald-700 mb-1 flex items-center gap-1">
                              <Sparkles size={11} className="text-emerald-500 shrink-0" />
                              <span>Noor AI Assistant</span>
                            </div>
                            <div className="whitespace-pre-line text-slate-700">{msg.content}</div>
                          </div>
                        ) : (
                          <div className="bg-emerald-600 text-white p-2.5 sm:p-3 rounded-2xl rounded-tr-xs max-w-[85%] leading-relaxed shadow-sm font-medium box-border break-words">
                            {msg.content}
                          </div>
                        )}
                      </div>
                    ))}

                    {isNoorLoading && (
                      <div className="flex items-start">
                        <div className="bg-white text-slate-800 p-2.5 rounded-2xl rounded-tl-xs shadow-xs border border-slate-200/80 flex items-center gap-2">
                          <Sparkles size={12} className="text-emerald-600 animate-spin shrink-0" />
                          <span className="text-slate-500 font-medium text-[11px]">Noor AI is thinking...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[10px] touch-pan-x">
                    <button 
                      onClick={() => handleSendNoor("What is today's Hadith?")}
                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-lg whitespace-nowrap font-semibold transition-all cursor-pointer shrink-0"
                    >
                      📖 Hadith
                    </button>
                    <button 
                      onClick={() => handleSendNoor("Show prayer schedule")}
                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-lg whitespace-nowrap font-semibold transition-all cursor-pointer shrink-0"
                    >
                      ⏱ Prayer Times
                    </button>
                    <button 
                      onClick={() => handleSendNoor("Recite a Quran Ayat")}
                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-lg whitespace-nowrap font-semibold transition-all cursor-pointer shrink-0"
                    >
                      ✨ Quran Verse
                    </button>
                    <button 
                      onClick={() => handleSendNoor("Give me a morning dua")}
                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-lg whitespace-nowrap font-semibold transition-all cursor-pointer shrink-0"
                    >
                      🤲 Daily Dua
                    </button>
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendNoor();
                    }}
                    className="mt-2 flex items-center gap-2"
                  >
                    <input 
                      type="text"
                      value={noorInput}
                      onChange={(e) => setNoorInput(e.target.value)}
                      placeholder="Ask Noor AI anything..."
                      className="flex-1 bg-slate-50 border border-slate-200/90 focus:bg-white focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all min-w-0"
                    />
                    <button 
                      type="submit"
                      disabled={!noorInput.trim() || isNoorLoading}
                      className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                      title="Send message"
                    >
                      <Send size={14} />
                    </button>
                  </form>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                    <span className="font-medium text-slate-500 truncate mr-2">Full voice & chat inside app</span>
                    <button onClick={onOpenApp} className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1 rounded-lg font-bold transition-all shadow-xs cursor-pointer shrink-0">
                      Launch Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features-section" className="py-12 sm:py-20 bg-white border-y border-slate-200/80 scroll-mt-20 w-full max-w-full box-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full box-border">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
            <h2 className="text-xs font-extrabold text-emerald-600 tracking-wider uppercase mb-2">Designed For Excellence</h2>
            <p className="text-xl sm:text-4xl font-extrabold text-slate-900 tracking-tight px-2">
              Everything You Need in One Unified App
            </p>
            <p className="mt-2.5 sm:mt-4 text-slate-600 text-xs sm:text-base px-2">
              Built using standard high-speed cloud infrastructure to ensure zero lag, instant notifications, and complete security.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 w-full">
            <div className="bg-[#FAFAFC] p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200/80 hover:border-emerald-300 transition-all group box-border">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 text-emerald-700 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <MessageCircle size={22} className="sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-base sm:text-xl font-bold text-slate-900 mb-1.5 sm:mb-2">Real-Time Messaging</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Enjoy lightning-fast direct chats with text formatting, voice notes, reaction emojis, read receipts, and media attachments.
              </p>
            </div>

            <div className="bg-[#FAFAFC] p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200/80 hover:border-emerald-300 transition-all group box-border">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 text-emerald-700 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <BookOpen size={22} className="sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-base sm:text-xl font-bold text-slate-900 mb-1.5 sm:mb-2">Islamic Library & Reader</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Complete Quran surahs with translation, Hadith archives, and Islamic book reader with offline bookmarking and download tools.
              </p>
            </div>

            <div className="bg-[#FAFAFC] p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200/80 hover:border-emerald-300 transition-all group box-border">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 text-emerald-700 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <Sparkles size={22} className="sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-base sm:text-xl font-bold text-slate-900 mb-1.5 sm:mb-2">Noor AI Assistant</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Get instant answers to educational, Islamic, and productivity queries using our built-in intelligent Noor AI companion.
              </p>
            </div>

            <div className="bg-[#FAFAFC] p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200/80 hover:border-emerald-300 transition-all group box-border">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 text-emerald-700 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <Users size={22} className="sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-base sm:text-xl font-bold text-slate-900 mb-1.5 sm:mb-2">Channels & Communities</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Create public channels, broadcast news, organize groups, and connect with thousands of active community members.
              </p>
            </div>

            <div className="bg-[#FAFAFC] p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200/80 hover:border-emerald-300 transition-all group box-border">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 text-emerald-700 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <Phone size={22} className="sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-base sm:text-xl font-bold text-slate-900 mb-1.5 sm:mb-2">HD Voice & Video Calls</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                High quality WebRTC voice and video calls with real-time invitation ringers and mute/camera controls.
              </p>
            </div>

            <div className="bg-[#FAFAFC] p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200/80 hover:border-emerald-300 transition-all group box-border">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 text-emerald-700 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck size={22} className="sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-base sm:text-xl font-bold text-slate-900 mb-1.5 sm:mb-2">App Lock & Data Privacy</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Protect your personal chats with custom app PIN locks, blocked user preferences, and secure cloud storage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Library Section */}
      <section id="library-section" className="py-12 sm:py-16 bg-emerald-900 text-white relative overflow-hidden scroll-mt-20 w-full max-w-full box-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full box-border">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <span className="bg-emerald-800 text-emerald-200 text-[11px] sm:text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Spiritual Growth & Knowledge
              </span>
              <h2 className="text-xl sm:text-4xl font-extrabold tracking-tight mt-3 mb-3 sm:mb-6 leading-snug">
                Islamic Resources Always at Your Fingertips
              </h2>
              <p className="text-emerald-100 text-xs sm:text-base leading-relaxed mb-5 sm:mb-8">
                Read Holy Quran with translation, recite daily Duas, calculate Qibla direction, listen to Tasbeeh counters, and download complete Islamic books for offline study.
              </p>
              <button
                onClick={onOpenApp}
                className="bg-white text-emerald-950 font-black px-5 py-3 sm:px-7 rounded-xl shadow-lg hover:bg-emerald-50 transition-all flex items-center gap-2 cursor-pointer text-xs sm:text-sm"
              >
                <span>Explore Library inside App</span>
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-emerald-800/80 p-4 sm:p-5 rounded-2xl border border-emerald-700/50 box-border">
                <BookOpen className="text-emerald-300 mb-2.5 sm:mb-3" size={24} />
                <h4 className="font-bold text-sm sm:text-base mb-1">Quran Reader</h4>
                <p className="text-[11px] sm:text-xs text-emerald-200">Surah recitation, verse-by-verse translation & audio.</p>
              </div>
              <div className="bg-emerald-800/80 p-4 sm:p-5 rounded-2xl border border-emerald-700/50 box-border">
                <Feather className="text-emerald-300 mb-2.5 sm:mb-3" size={24} />
                <h4 className="font-bold text-sm sm:text-base mb-1">Authentic Hadiths</h4>
                <p className="text-[11px] sm:text-xs text-emerald-200">Bukhari, Muslim, and major compilations with search.</p>
              </div>
              <div className="bg-emerald-800/80 p-4 sm:p-5 rounded-2xl border border-emerald-700/50 box-border">
                <Clock className="text-emerald-300 mb-2.5 sm:mb-3" size={24} />
                <h4 className="font-bold text-sm sm:text-base mb-1">Prayer & Qibla</h4>
                <p className="text-[11px] sm:text-xs text-emerald-200">Accurate prayer times & compass direction locator.</p>
              </div>
              <div className="bg-emerald-800/80 p-4 sm:p-5 rounded-2xl border border-emerald-700/50 box-border">
                <Heart className="text-emerald-300 mb-2.5 sm:mb-3" size={24} />
                <h4 className="font-bold text-sm sm:text-base mb-1">Tasbeeh & Duas</h4>
                <p className="text-[11px] sm:text-xs text-emerald-200">Interactive dhikr counter with daily supplications.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Blogs & Articles Section */}
      <section id="blogs-section" className="py-12 sm:py-20 bg-[#FAFAFC] scroll-mt-20 w-full max-w-full box-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full box-border">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 sm:mb-12">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">
                <Layers size={13} />
                <span>Ulfah Blog & Articles</span>
              </div>
              <h2 className="text-xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Latest News & Feature Updates
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm mt-1.5">
                Stay updated with app features, Islamic guides, and tech announcements.
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles & topics..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-xs transition-all box-border"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 sm:mb-8 no-scrollbar touch-pan-x w-full">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {filteredBlogs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/80">
              <BookOpen className="mx-auto text-slate-300 mb-3" size={40} />
              <h3 className="text-base font-bold text-slate-700">No blog posts found</h3>
              <p className="text-xs text-slate-500 mt-1">Try clearing your search query or selecting a different category.</p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                className="mt-3 px-3.5 py-2 bg-emerald-50 text-emerald-600 font-bold text-xs rounded-xl hover:bg-emerald-100 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8 w-full">
              {filteredBlogs.map((blog) => (
                <div
                  key={blog.id}
                  onClick={() => setSelectedBlog(blog)}
                  className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all duration-300 flex flex-col cursor-pointer group box-border"
                >
                  <div className="relative h-44 sm:h-48 bg-slate-100 overflow-hidden">
                    <img
                      src={blog.imageUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80'}
                      alt={blog.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-emerald-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-md">
                      {blog.category}
                    </div>
                  </div>

                  <div className="p-4 sm:p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2.5 text-[10px] sm:text-[11px] text-slate-400 font-medium mb-2.5">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} /> {blog.date}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> {blog.readTime || '3 min read'}
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-2 leading-snug mb-1.5 sm:mb-2">
                        {blog.title}
                      </h3>

                      <p className="text-slate-600 text-xs sm:text-sm line-clamp-3 leading-relaxed mb-3">
                        {blog.summary}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-2 min-w-0">
                        {blog.authorAvatar ? (
                          <img src={blog.authorAvatar} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover shrink-0" alt="" />
                        ) : (
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {blog.author[0]}
                          </div>
                        )}
                        <span className="text-[11px] sm:text-xs font-semibold text-slate-700 truncate max-w-[120px]">{blog.author}</span>
                      </div>

                      <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform shrink-0">
                        Read More <ChevronRight size={13} />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-slate-900 text-white w-full max-w-full box-border">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-4 sm:space-y-6">
          <h2 className="text-xl sm:text-4xl font-extrabold tracking-tight">
            Ready to experience Ulfah Chat?
          </h2>
          <p className="text-slate-400 text-xs sm:text-base max-w-xl mx-auto">
            Join thousands of users connecting, reading Quran, and messaging with complete privacy today.
          </p>
          <div className="pt-1">
            <button
              onClick={onOpenApp}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-7 py-3 sm:px-9 sm:py-4 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 text-sm sm:text-base cursor-pointer inline-flex items-center gap-2.5"
            >
              <span>Get Started Now</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      <footer className="bg-slate-950 text-slate-400 text-xs py-8 sm:py-10 border-t border-slate-800 w-full max-w-full box-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="w-6 h-6 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0">
              U
            </div>
            <span className="font-bold text-white text-sm">Ulfah Chat</span>
            <span className="text-slate-400 font-medium text-[11px] sm:text-xs">© 2026 abdulrehmanhabibkpk & team the pak hackers. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={onOpenApp} className="hover:text-white transition-colors">Sign In</button>
            <button onClick={() => scrollToSection('features-section')} className="hover:text-white transition-colors">Features</button>
            <button onClick={() => scrollToSection('blogs-section')} className="hover:text-white transition-colors">Blog</button>
          </div>
        </div>
      </footer>

      {/* Blog Details Modal */}
      <AnimatePresence>
        {selectedBlog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm box-border">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden relative box-border"
            >
              <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                  <Tag size={14} />
                  <span>{selectedBlog.category}</span>
                </div>

                <button
                  onClick={() => setSelectedBlog(null)}
                  className="p-2 hover:bg-slate-200/80 rounded-full text-slate-500 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 sm:p-8 overflow-y-auto space-y-6 text-slate-800 box-border touch-pan-y">
                {selectedBlog.imageUrl && (
                  <div className="rounded-2xl overflow-hidden max-h-60 sm:max-h-72 w-full">
                    <img src={selectedBlog.imageUrl} alt={selectedBlog.title} className="w-full h-full object-cover" />
                  </div>
                )}

                <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                  {selectedBlog.title}
                </h1>

                <div className="flex items-center gap-3 pb-4 border-b border-slate-100 text-xs text-slate-500">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                    {selectedBlog.author ? selectedBlog.author[0] : 'U'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-sm truncate">{selectedBlog.author}</div>
                    <div className="truncate">{selectedBlog.authorRole || 'Contributor'} • {selectedBlog.date}</div>
                  </div>
                </div>

                <div className="prose prose-emerald max-w-none text-slate-700 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                  {selectedBlog.content}
                </div>

                {selectedBlog.tags && selectedBlog.tags.length > 0 && (
                  <div className="pt-6 border-t border-slate-100 flex flex-wrap gap-2">
                    {selectedBlog.tags.map((tag, idx) => (
                      <span key={idx} className="bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-1 rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <button
                  onClick={() => setSelectedBlog(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={16} /> Close
                </button>

                <button
                  onClick={() => { setSelectedBlog(null); onOpenApp(); }}
                  className="bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs hover:bg-emerald-700 shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <span>Launch App</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
