import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Book, 
  Heart, 
  Moon, 
  Compass, 
  Music, 
  PlayCircle, 
  Calendar, 
  MapPin, 
  Award,
  BookOpen,
  Cloud,
  Search,
  LayoutGrid,
  GraduationCap,
  Sparkles,
  Smartphone,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  List
} from 'lucide-react';
import { cn } from '../utils';
import QuranReader from './QuranReader';
import HadithReader from './HadithReader';
import NoorAIChat from './NoorAIChat';
import IslamicLibrary, { CATEGORIES } from './IslamicLibrary';
import TasbeehCounter from './TasbeehCounter';
import DuasViewer from './DuasViewer';
import PrayerTimesViewer from './PrayerTimesViewer';
import OfflineLibrary from './OfflineLibrary';
import CategorySelector from './CategorySelector';
import QiblaFinder from './QiblaFinder';
import IslamicCalendarViewer from './IslamicCalendarViewer';
import Donate from './Donate';

interface ExploreItem {
  id: string;
  title: string;
  urduTitle: string;
  icon: React.ReactNode;
  color: string;
}

export default function Explore() {
  const [showQuran, setShowQuran] = useState(false);
  const [showHadith, setShowHadith] = useState(false);
  const [showNoorAI, setShowNoorAI] = useState(false);
  const [showIslamicLibrary, setShowIslamicLibrary] = useState(false);
  const [showOfflineLibrary, setShowOfflineLibrary] = useState(false);
  const [showTasbeeh, setShowTasbeeh] = useState(false);
  const [showDuas, setShowDuas] = useState(false);
  const [showPrayer, setShowPrayer] = useState(false);
  const [showQibla, setShowQibla] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [showDonate, setShowDonate] = useState(false);
  const [libraryCategory, setLibraryCategory] = useState('all');

  // Embedded viewer states
  const [showEmbedded, setShowEmbedded] = useState(false);
  const [embeddedUrl, setEmbeddedUrl] = useState('');
  const [embeddedTitle, setEmbeddedTitle] = useState('');
  const [embeddedUrduTitle, setEmbeddedUrduTitle] = useState('');
  const [iframeLoading, setIframeLoading] = useState(true);

  // Reset loading whenever URL or visibility changes
  useEffect(() => {
    if (showEmbedded) {
      setIframeLoading(true);
    }
  }, [showEmbedded, embeddedUrl]);

  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [downloadedCount, setDownloadedCount] = useState(0);

  useEffect(() => {
    const checkDownloads = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('downloaded_volumes_local') || '[]');
        setHasDownloaded(stored.length > 0);
        setDownloadedCount(stored.length);
      } catch (e) {
        console.error("Failed to check downloaded count on Explore:", e);
      }
    };
    checkDownloads();
    
    window.addEventListener('storage', checkDownloads);
    return () => window.removeEventListener('storage', checkDownloads);
  }, []);

  const categories: ExploreItem[] = [
    {
      id: 'noorai',
      title: 'Noor AI',
      urduTitle: 'نور اے آئی اسسٹنٹ',
      icon: <Sparkles size={32} />,
      color: 'bg-teal-600',
    },
    {
      id: 'islamiclibrary',
      title: 'Islamic Library',
      urduTitle: 'اسلامی لائبریری',
      icon: <BookOpen size={32} />,
      color: 'bg-emerald-700',
    },
    {
      id: 'librarycategories',
      title: 'Library Categories',
      urduTitle: 'لائبریری زمرے',
      icon: <List size={32} />,
      color: 'bg-teal-700',
    },
    {
      id: 'offlinelibrary',
      title: 'Offline Library',
      urduTitle: 'آف لائن لائبریری',
      icon: <Smartphone size={32} />,
      color: 'bg-teal-700 shadow-sm border border-emerald-500/10',
    },
    {
      id: 'quran',
      title: 'Holy Quran',
      urduTitle: 'قرآن پاک',
      icon: <Book size={32} />,
      color: 'bg-emerald-500',
    },
    {
      id: 'hadith',
      title: 'Hadith',
      urduTitle: 'حدیث مبارکہ',
      icon: <BookOpen size={32} />,
      color: 'bg-blue-500',
    },
    {
      id: 'prayer',
      title: 'Prayer Times',
      urduTitle: 'نماز کے اوقات',
      icon: <Moon size={32} />,
      color: 'bg-purple-500',
    },
    {
      id: 'qibla',
      title: 'Qibla Finder',
      urduTitle: 'قبلہ رخ',
      icon: <Compass size={32} />,
      color: 'bg-amber-500',
    },
    {
      id: 'duas',
      title: 'Duas',
      urduTitle: 'دعائیں',
      icon: <Heart size={32} />,
      color: 'bg-rose-500',
    },
    {
      id: 'nasheeds',
      title: 'Nasheeds',
      urduTitle: 'نعتیں',
      icon: <Music size={32} />,
      color: 'bg-indigo-500',
    },
    {
      id: 'bayanat',
      title: 'Bayanat',
      urduTitle: 'بیانات',
      icon: <PlayCircle size={32} />,
      color: 'bg-cyan-500',
    },
    {
      id: 'calendar',
      title: 'Islamic Calendar',
      urduTitle: 'اسلامی کیلنڈر',
      icon: <Calendar size={32} />,
      color: 'bg-teal-500',
    },
    {
      id: 'mosques',
      title: 'Nearby Mosques',
      urduTitle: 'قریبی مساجد',
      icon: <MapPin size={32} />,
      color: 'bg-orange-500',
    },
    {
      id: 'tasbeeh',
      title: 'Tasbeeh Counter',
      urduTitle: 'تسبیح کاؤنٹر',
      icon: <Award size={32} />,
      color: 'bg-lime-500',
    },
    {
      id: 'donate',
      title: 'Donate',
      urduTitle: 'عطیہ دیں',
      icon: <Heart size={32} />,
      color: 'bg-rose-500',
    }
  ];

  const handleItemClick = (id: string) => {
    switch (id) {
      case 'noorai':
        setShowNoorAI(true);
        break;
      case 'islamiclibrary':
        setLibraryCategory('all');
        setShowIslamicLibrary(true);
        break;
      case 'librarycategories':
        setShowCategorySelector(true);
        break;
      case 'offlinelibrary':
        setShowOfflineLibrary(true);
        break;
      case 'quran':
        setShowQuran(true);
        break;
      case 'hadith':
        setShowHadith(true);
        break;
      case 'tasbeeh':
        setShowTasbeeh(true);
        break;
      case 'donate':
        setShowDonate(true);
        break;
      case 'duas':
        setShowDuas(true);
        break;
      case 'prayer':
        setShowPrayer(true);
        break;
      case 'qibla':
        setShowQibla(true);
        break;
      case 'calendar':
        setShowCalendar(true);
        break;
      case 'mosques':
        setEmbeddedUrl('https://www.google.com/maps/search/mosques+near+me');
        setEmbeddedTitle('Nearby Mosques');
        setEmbeddedUrduTitle('قریبی مساجد (Nearby Mosques)');
        setShowEmbedded(true);
        break;
      default:
        alert(`${id.charAt(0).toUpperCase() + id.slice(1)} feature coming soon!`);
    }
  };

  if (showNoorAI) {
    return <NoorAIChat onBack={() => setShowNoorAI(false)} />;
  }

  if (showIslamicLibrary) {
    return <IslamicLibrary onBack={() => setShowIslamicLibrary(false)} defaultCategory={libraryCategory} />;
  }

  if (showCategorySelector) {
    return <CategorySelector onSelect={(id) => {
      setLibraryCategory(id);
      setShowIslamicLibrary(true);
      setShowCategorySelector(false);
    }} onBack={() => setShowCategorySelector(false)} />;
  }

  if (showOfflineLibrary) {
    return <OfflineLibrary onBack={() => setShowOfflineLibrary(false)} />;
  }

  if (showQuran) {
    return <QuranReader onBack={() => setShowQuran(false)} />;
  }

  if (showHadith) {
    return <HadithReader onBack={() => setShowHadith(false)} />;
  }

  if (showTasbeeh) {
    return <TasbeehCounter onBack={() => setShowTasbeeh(false)} />;
  }

  if (showDuas) {
    return <DuasViewer onBack={() => setShowDuas(false)} />;
  }

  if (showPrayer) {
    return <PrayerTimesViewer onBack={() => setShowPrayer(false)} />;
  }

  if (showQibla) {
    return <QiblaFinder onClose={() => setShowQibla(false)} />;
  }

  if (showCalendar) {
    return <IslamicCalendarViewer onClose={() => setShowCalendar(false)} />;
  }

  if (showDonate) {
    return <Donate onBack={() => setShowDonate(false)} />;
  }

  if (showEmbedded) {
    return (
      <div className="flex flex-col h-full bg-[#f0f2f5] dark:bg-[#111b21] overflow-hidden">
        {/* Header */}
        <div className="bg-[#00a884] dark:bg-[#202c33] p-4 flex items-center justify-between shadow-md z-10 safe-area-top">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowEmbedded(false)}
              className="p-2 hover:bg-white/10 text-white rounded-full transition-all duration-200 cursor-pointer"
            >
              <ArrowLeft size={22} className="rotate-180" />
            </button>
            <div>
              <h2 className="text-xs sm:text-sm md:text-base font-bold text-white Urdu leading-snug">{embeddedUrduTitle}</h2>
              <p className="text-[9px] text-white/85 font-mono font-bold uppercase tracking-wider">{embeddedTitle}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            {/* Refresh Button */}
            <button
              onClick={() => {
                setIframeLoading(true);
                const iframe = document.getElementById('embedded-iframe') as HTMLIFrameElement;
                if (iframe) iframe.src = embeddedUrl;
              }}
              className="p-2 hover:bg-white/10 text-white rounded-full transition-all cursor-pointer"
              title="Refresh"
            >
              <RefreshCw size={16} className={cn(iframeLoading && "animate-spin")} />
            </button>
            {/* Fallback external link */}
            <a
              href={embeddedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 bg-white/20 hover:bg-white/30 text-white text-[10px] sm:text-xs font-bold rounded-xl transition-all flex items-center gap-1 Urdu"
            >
              <ExternalLink size={12} />
              <span className="hidden xs:inline">براؤزر (Browser)</span>
            </a>
          </div>
        </div>

        {/* Embedded Viewport with Loading State */}
        <div className="flex-1 w-full h-full bg-[#0e1320] relative flex flex-col">
          {iframeLoading && (
            <div className="absolute inset-0 bg-[#0e1320] flex flex-col items-center justify-center z-20 space-y-4">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#00a884] border-t-transparent"></div>
              <p className="text-slate-400 text-xs font-semibold Urdu">برائے مہربانی انتظار کریں، لوڈ ہو رہا ہے...</p>
            </div>
          )}
          <iframe
            id="embedded-iframe"
            src={embeddedUrl}
            className="w-full flex-1 border-none bg-white"
            allow="geolocation; camera; microphone; magnetometer; gyro; accelerometer"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-top-navigation-by-user-activation"
            onLoad={() => setIframeLoading(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#e7f5f1] dark:bg-[#111b21] overflow-hidden">
      {/* Header */}
      <div className="bg-[#e7f5f1] dark:bg-[#202c33] px-4 py-3 sm:px-6 sm:py-5 border-b border-emerald-100 dark:border-white/5 z-10 safe-area-top">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl sm:text-3xl font-black text-[#008069] dark:text-white Urdu leading-tight">ایکسپلور (Explore)</h1>
            <p className="text-[#008069]/80 Urdu text-[10px] sm:text-sm mt-0.5 sm:mt-1">اسلامی معلومات اور خدمات تک رسائی</p>
          </div>
          <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-[#00a884]/10 flex items-center justify-center text-[#00a884] shrink-0 ml-2">
            <LayoutGrid className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 bg-[#e7f5f1] dark:bg-[#111b21] custom-scrollbar">

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6">
          {categories.map((item, index) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleItemClick(item.id)}
              className="group relative flex flex-col items-center justify-center p-3 sm:p-6 bg-white dark:bg-[#202c33] rounded-[16px] sm:rounded-[32px] shadow-sm hover:shadow-xl transition-all active:scale-95 border border-gray-100 dark:border-white/5"
            >
              <div className={cn(
                "w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center text-white mb-1.5 sm:mb-4 shadow-lg group-hover:scale-110 transition-transform",
                item.color
              )}>
                {React.cloneElement(item.icon as React.ReactElement, { className: "w-5 h-5 sm:w-8 sm:h-8" })}
              </div>
              <span className="text-[#111b21] dark:text-[#e9edef] font-bold text-[11px] sm:text-sm text-center Urdu block mb-0.5 sm:mb-1 leading-tight">
                {item.urduTitle}
              </span>
              <span className="text-[#667781] dark:text-[#8696a0] text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-center leading-tight mt-0.5">
                {item.title}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Offline Library Active Banner */}
        {hasDownloaded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-6 bg-gradient-to-r from-emerald-500 to-teal-600 dark:from-emerald-700 dark:to-teal-800 rounded-[32px] text-white shadow-md relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-6 pointer-events-none">
              <Smartphone size={100} />
            </div>
            <div className="relative z-10 space-y-1">
              <h3 className="text-xl font-bold Urdu">آف لائن لائبریری (Offline Library)</h3>
              <p className="text-sm opacity-90 Urdu">
                آپ کے پاس <span className="font-bold underline decoration-2">{downloadedCount}</span> کتابیں/جلدیں آف لائن دستیاب ہیں جنہیں آپ بغیر انٹرنیٹ کے کہیں بھی پڑھ سکتے ہیں۔
              </p>
            </div>
            <button
              onClick={() => setShowOfflineLibrary(true)}
              className="relative z-10 px-5 py-2.5 bg-white dark:bg-[#111b21] hover:bg-emerald-50 dark:hover:bg-[#202c33] text-emerald-700 dark:text-emerald-400 rounded-2xl text-xs font-bold transition-all shadow-sm active:scale-95 self-start md:self-auto shrink-0"
            >
              کتابیں کھولیں (Open Library)
            </button>
          </motion.div>
        )}

        {/* Card of the Day */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 bg-gradient-to-br from-[#00a884] to-[#128c7e] rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Moon size={120} />
          </div>
          <div className="relative z-10">
            <h3 className="text-2xl font-black Urdu mb-4 italic">آج کی آیت (Verse of the Day)</h3>
            <p className="text-xl Urdu leading-relaxed mb-6 italic opacity-90">
              "بے شک اللہ صبر کرنے والوں کے ساتھ ہے۔"
            </p>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold uppercase tracking-widest opacity-70">Al-Baqarah 2:153</span>
              <button className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition-colors">
                <Heart size={20} />
              </button>
            </div>
          </div>
        </motion.div>

        <div className="p-10 text-center text-[11px] text-[#8696a0] Urdu opacity-40 uppercase tracking-[0.3em] font-medium">
          Digital Islamic Companion • {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
