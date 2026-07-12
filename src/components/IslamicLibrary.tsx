import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Fuse from 'fuse.js';
import { 
  ArrowLeft, 
  Search, 
  BookOpen, 
  Heart, 
  X, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info,
  Layers,
  SearchX,
  Download
} from 'lucide-react';
import { cn, resolveApiUrl } from '../utils';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import BookReader from './BookReader';
import { storePDF, deletePDF } from '../utils/pdfStorage';

export interface Book {
  id: string;
  title: string;
  urduTitle: string;
  author: string;
  urduAuthor: string;
  description: string;
  urduDescription: string;
  language: string;
  category: string;
  url?: string;
  coverUrl?: string;
  previewImages?: string[];
  volumes?: { 
    name: string; 
    url: string; 
    size?: string;
  }[];
  bookType?: 'book' | 'sharh';
}

export const CATEGORIES = [
  { id: 'tafseer', title: 'Tafseer', urdu: 'تفسير القرآن' },
  { id: 'hadith', title: 'Hadith', urdu: 'حدیث' },
  { id: 'fiqh', title: 'Fiqh & Fatawa', urdu: 'فقہ و فتاویٰ' },
  { id: 'seerah', title: 'Seerah & History', urdu: 'سیرت و تاریخ' },
  { id: 'aqaid', title: 'Aqaid & Tasawwuf', urdu: 'عقائد و تصوف' },
  { id: 'adab', title: 'Adab & Akhlaq', urdu: 'اخلاق و آداب' },
  { id: 'duas', title: 'Duas & Azkar', urdu: 'دعائیں اور اذکار' },
  { id: 'uloom', title: 'Quranic Sciences', urdu: 'علوم القرآن' },
  { id: 'economics', title: 'Islamic Economics', urdu: 'اسلامی معیشت و مالیات' },
  { id: 'emadrasa', title: 'e-Madrasa', urdu: 'ای مدرسہ' },
  
  // New e-Madrasa categories
  { id: 'dora_hadith', title: 'Dora e Hadith (8th Year)', urdu: 'دورہ حدیث', parent: 'emadrasa' },
  { id: 'maoqoof_alai', title: 'Maoqoof Alai (7th Year)', urdu: 'موقوف علیہ', parent: 'emadrasa' },
  { id: 'al_sadesa', title: 'Al Sadesa (6th Year)', urdu: 'درجہ سادسہ', parent: 'emadrasa' },
  { id: 'al_khamesa', title: 'Al Khamesa (5th Year)', urdu: 'درجہ خامسہ', parent: 'emadrasa' },
  { id: 'al_rabia', title: 'Al Rabia (4th Year)', urdu: 'درجہ رابعہ', parent: 'emadrasa' },
  { id: 'al_salesa', title: 'Al Salesa (3rd Year)', urdu: 'درجہ ثالثہ', parent: 'emadrasa' },
  { id: 'al_sania', title: 'Al Sania (2nd Year)', urdu: 'درجہ ثانیہ', parent: 'emadrasa' },
  { id: 'al_aula', title: 'Al Aula (1st Year)', urdu: 'درجہ اولی', parent: 'emadrasa' },
  { id: 'mutafarriq_dars', title: 'Mutafarriq Dars e Nizami', urdu: 'متفرق درس نظامی', parent: 'emadrasa' },
  { id: 'mantiq_falsafa', title: 'Mantiq o Falsafa', urdu: 'منطق و فلسفہ', parent: 'emadrasa' },
  { id: 'tajweed_course', title: 'Tajweed Course', urdu: 'تجوید کورس وفاق المدارس پاکستان', parent: 'emadrasa' },
  { id: 'dirasat_deeniyah', title: 'Dirasat-e-Deeniyah Course', urdu: 'دراسات دینیہ کورس وفاق المدارس', parent: 'emadrasa' },
  { id: 'dars_e_nizami_banat', title: 'Dars-e-Nizami Banat', urdu: 'درس نظامی بنات / طالبات', parent: 'emadrasa' }
];

const BOOKS_DATA_CORE: Book[] = [
  {
    id: 't2',
    title: 'Tafseer Maariful Quran',
    urduTitle: 'معارف القرآن',
    author: 'Mufti Muhammad Shafi',
    urduAuthor: 'مفتی محمد شفیع عثمانی',
    description: 'A detailed, easy-to-understand Urdu commentary focusing on modern practical implications and spiritual lessons.',
    urduDescription: 'عصر حاضر کے تقاضوں کے مطابق آسان اور عام فہم اردو تفسیر جس میں فقہی مسائل اور روزمرہ زندگی کی رہنمائی شامل ہے۔',
    language: 'Urdu',
    category: 'tafseer',
    url: 'https://quran.com'
  },
  {
    id: 'h1',
    title: 'Sahih al-Bukhari',
    urduTitle: 'صحیح البخاری',
    author: 'Imam Muhammad al-Bukhari',
    urduAuthor: 'امام محمد بن اسماعیل بخاری',
    description: 'The most authentic collection of Hadith, spanning thousands of sayings and actions of Prophet Muhammad (PBUH).',
    urduDescription: 'احادیث مبارکہ کا سب سے مستند مجموعہ جس کی صحت پر امت کا اجماع ہے۔',
    language: 'Urdu / Arabic / English',
    category: 'hadith',
    url: 'https://sunnah.com/bukhari',
    previewImages: [
      'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1584281729155-3c17b79cc24a?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1609599006353-e629f1d50213?auto=format&fit=crop&w=400&q=80'
    ],
    volumes: [
      { name: 'صحیح البخاری-1', url: 'https://archive.org/download/SahihAlBukhariUrduComplete8Volumes/Sahih-Al-Bukhari-Volume-1-Urdu.pdf', size: '52.5 MB' },
      { name: 'صحیح البخاری-2', url: 'https://archive.org/download/SahihAlBukhariUrduComplete8Volumes/Sahih-Al-Bukhari-Volume-2-Urdu.pdf', size: '56.16 MB' }
    ]
  },
  {
    id: 'k1',
    title: 'Khulasa tul Anwaar',
    urduTitle: 'خلاصۃ الانوار',
    author: 'Unknown',
    urduAuthor: 'نامعلوم',
    description: 'A summary of the lights and spiritual insights.',
    urduDescription: 'انوار اور روحانی بصیرتوں کا خلاصہ۔',
    language: 'Urdu',
    category: 'aqaid',
    url: 'https://example.com'
  }
];

// Rich deterministic dynamic library generator generating 2150 high-quality searchable books
const generateBooks = (): Book[] => {
  return [];
};


export const BOOKS_DATA = generateBooks();

export default function IslamicLibrary({ 
  onBack,
  defaultCategory = 'all'
}: { 
  onBack: () => void;
  defaultCategory?: string;
}) {
  const [customBooks, setCustomBooks] = useState<Book[]>(() => {
    try {
      const saved = localStorage.getItem('library_books_local');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBooks = async () => {
      const startTime = Date.now();
      try {
        // Only fetch from Firestore if we don't have local data or want to refresh
        const localData = localStorage.getItem('library_books_local');
        if (localData) {
          const parsed = JSON.parse(localData);
          if (parsed && parsed.length > 0) {
            setCustomBooks(parsed);
          }
        }
        
        // Fetch from Firestore to get latest (one-time fetch instead of onSnapshot)
        const { getDocs } = await import('firebase/firestore');
        const snapshot = await getDocs(collection(db, 'library_books'));
        const booksList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Book));
        
        setCustomBooks(booksList);
        localStorage.setItem('library_books_local', JSON.stringify(booksList));
      } catch (error) {
        console.error("Error loading custom library books:", error);
      } finally {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 600 - elapsed);
        setTimeout(() => {
          setIsLoading(false);
        }, remaining);
      }
    };
    
    fetchBooks();
  }, []);

  const [deletedSystemBooks, setDeletedSystemBooks] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('deleted_system_books');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const allBooks = [...customBooks, ...BOOKS_DATA.filter(sysBook => !customBooks.some(cb => cb.id === sysBook.id) && !deletedSystemBooks.includes(sysBook.id))];

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(defaultCategory);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('islamic_library_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [readingBook, setReadingBook] = useState<Book | null>(null);
  const [downloadingBookVolumes, setDownloadingBookVolumes] = useState<Book | null>(null);
  const [cachedBooks, setCachedBooks] = useState<Set<string>>(new Set());

  const [activeDownloads, setActiveDownloads] = useState<Record<string, { progress: number; isPaused: boolean }>>(() => {
    try {
      const saved = localStorage.getItem('library_active_downloads');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Track real download requests
  const activeXHRs = useRef<Record<string, XMLHttpRequest>>({});

  useEffect(() => {
    try {
      localStorage.setItem('library_active_downloads', JSON.stringify(activeDownloads));
    } catch (e) {
      console.error(e);
    }
  }, [activeDownloads]);

  // Clean up any active downloads on unmount
  useEffect(() => {
    return () => {
      Object.values(activeXHRs.current).forEach((xhr: any) => {
        if (xhr) xhr.abort();
      });
    };
  }, []);

  const [recentlyRead, setRecentlyRead] = useState<any[]>([]);
  const [subFilter, setSubFilter] = useState<'all' | 'book' | 'sharh'>('all');

  const loadRecentlyRead = () => {
    try {
      const recentsRaw = localStorage.getItem('recently_read_books');
      if (recentsRaw) {
        const parsed = JSON.parse(recentsRaw);
        if (Array.isArray(parsed)) {
          setRecentlyRead(parsed);
          return;
        }
      }
      setRecentlyRead([]);
    } catch {
      setRecentlyRead([]);
    }
  };

  useEffect(() => {
    loadRecentlyRead();
  }, [readingBook]);

  const renderRecentlyReadCard = (item: any) => {
    // Find the full book details if available
    const book = allBooks.find(b => b.id === item.bookId);
    
    // Fallback if full book object is not found
    const displayTitle = book ? book.urduTitle : item.bookTitle;
    const progressPercent = Math.round((item.lastReadPage / item.numPages) * 100);

    const handleRecentClick = () => {
      if (book) {
        setReadingBook(book);
      } else {
        // Fallback reading action
        setReadingBook({
          id: item.bookId,
          title: item.bookTitle,
          urduTitle: item.bookTitle,
          author: 'Unknown',
          urduAuthor: 'نامعلوم مصنف',
          description: '',
          urduDescription: '',
          language: 'Urdu',
          category: 'general',
          url: item.bookUrl
        });
      }
    };

    return (
      <div
        key={item.bookId}
        onClick={handleRecentClick}
        className="cursor-pointer flex flex-col gap-2 group transition-transform hover:scale-[1.02] w-full"
      >
        {/* Book Cover Container */}
        <div className="relative aspect-[3/4] w-full rounded-md overflow-hidden border border-gray-300 dark:border-slate-600 shadow-sm flex items-center justify-center bg-gray-50 dark:bg-[#0f172a]">
          {book && book.coverUrl ? (
            <img 
              src={book.coverUrl} 
              alt={displayTitle} 
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            /* Fallback book style */
            <div className={cn(
              "w-full h-full flex flex-col items-center justify-center font-bold text-center Urdu select-none text-white p-2 text-xs",
              getCoverBg(item.bookId)
            )}>
              <span className="text-sm">{displayTitle.trim().charAt(0)}</span>
            </div>
          )}

          {/* Progress bar overlay at the bottom of cover */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/40">
            <div 
              className="bg-[#00a884] h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h4 className="text-[10px] font-bold text-gray-800 dark:text-slate-200 Urdu leading-tight line-clamp-2">
            {displayTitle}
          </h4>
          <div className="text-[9px] text-gray-500 dark:text-slate-400 font-medium mt-0.5 Urdu">
            صفحہ {item.lastReadPage} / {item.numPages}
          </div>
        </div>
      </div>
    );
  };

  const startDownload = (bookId: string, volIndex: number, volUrl: string) => {
    const downloadKey = `${bookId}_${volIndex}`;
    
    if (activeXHRs.current[downloadKey]) {
      activeXHRs.current[downloadKey].abort();
    }

    setActiveDownloads(prev => ({
      ...prev,
      [downloadKey]: {
        progress: 0,
        isPaused: false
      }
    }));

    const proxyUrl = resolveApiUrl(`/api/pdf-proxy?url=${encodeURIComponent(volUrl)}`);
    
    const xhr = new XMLHttpRequest();
    activeXHRs.current[downloadKey] = xhr;

    xhr.open('GET', proxyUrl, true);
    xhr.responseType = 'blob';

    xhr.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        setActiveDownloads(prev => {
          if (!prev[downloadKey]) return prev;
          return {
            ...prev,
            [downloadKey]: {
              ...prev[downloadKey],
              progress: pct
            }
          };
        });
      } else {
        setActiveDownloads(prev => {
          if (!prev[downloadKey]) return prev;
          return {
            ...prev,
            [downloadKey]: {
              ...prev[downloadKey],
              progress: -1 // Indeterminate fallback
            }
          };
        });
      }
    };

    xhr.onload = async () => {
      const contentType = xhr.getResponseHeader('Content-Type') || '';
      if (xhr.status === 200 && !contentType.includes('text/html')) {
        try {
          const blob = xhr.response;
          // Store PDF Blob in IndexedDB
          await storePDF(volUrl, blob);

          // Persist downloaded url in localStorage
          const downloaded = JSON.parse(localStorage.getItem('downloaded_volumes_local') || '[]');
          if (!downloaded.includes(volUrl)) {
            downloaded.push(volUrl);
            localStorage.setItem('downloaded_volumes_local', JSON.stringify(downloaded));
          }

          setCachedBooks(prevCached => {
            const updated = new Set(prevCached);
            updated.add(volUrl);
            return updated;
          });

          // Remove download entry
          setActiveDownloads(prev => {
            const updated = { ...prev };
            delete updated[downloadKey];
            return updated;
          });

          delete activeXHRs.current[downloadKey];
        } catch (err) {
          console.error("Failed to save downloaded PDF:", err);
          alert("ڈاؤنلوڈ محفوظ کرنے میں ناکامی ہوئی۔");
          cancelDownload(bookId, volIndex);
        }
      } else {
        console.warn("Proxy or download failed.");
        alert("نیٹ ورک کا مسئلہ پیش آیا۔ ڈاؤنلوڈ کرنے میں ناکامی ہوئی۔");
        cancelDownload(bookId, volIndex);
      }
    };

    xhr.onerror = () => {
      console.warn("Network error during XHR.");
      alert("نیٹ ورک کا مسئلہ پیش آیا۔ ڈاؤنلوڈ منقطع ہو گیا ہے۔");
      cancelDownload(bookId, volIndex);
    };

    xhr.send();
  };

  const pauseDownload = (bookId: string, volIndex: number) => {
    // Treat pause as cancel for native downloads
    cancelDownload(bookId, volIndex);
  };

  const cancelDownload = (bookId: string, volIndex: number) => {
    const downloadKey = `${bookId}_${volIndex}`;
    if (activeXHRs.current[downloadKey]) {
      activeXHRs.current[downloadKey].abort();
      delete activeXHRs.current[downloadKey];
    }
    setActiveDownloads(prev => {
      const updated = { ...prev };
      delete updated[downloadKey];
      return updated;
    });
  };

  useEffect(() => {
    const checkCache = async () => {
      const urls = new Set<string>();
      if ('caches' in window) {
        try {
          const cache = await caches.open('ulfha-books-cache');
          const requests = await cache.keys();
          requests.forEach(req => urls.add(req.url));
        } catch (e) {
          console.error(e);
        }
      }
      try {
        const stored = JSON.parse(localStorage.getItem('downloaded_volumes_local') || '[]');
        stored.forEach((url: string) => urls.add(url));
      } catch (e) {
        console.error(e);
      }
      setCachedBooks(urls);
    };
    checkCache();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('islamic_library_favorites', JSON.stringify(favorites));
    } catch (e) {
      console.error(e);
    }
  }, [favorites]);

  useEffect(() => {
    setActiveCategory(defaultCategory);
  }, [defaultCategory]);

  useEffect(() => {
    setSubFilter('all');
  }, [activeCategory]);

  const toggleFavorite = (bookId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites(prev => 
      prev.includes(bookId) ? prev.filter(id => id !== bookId) : [...prev, bookId]
    );
  };

  const renderBookCard = (book: Book, isGrid: boolean = false) => {
    const isFav = favorites.includes(book.id);

    return (
      <div
        key={book.id}
        onClick={() => setSelectedBook(book)}
        className={cn(
          "cursor-pointer flex flex-col gap-2 group transition-transform hover:scale-[1.02]",
          isGrid ? "w-full" : "flex-shrink-0 w-36 sm:w-44"
        )}
      >
        {/* Book Cover Container */}
        <div className="relative aspect-[3/4] w-full rounded-md overflow-hidden border border-gray-300 dark:border-slate-600 shadow-sm flex items-center justify-center bg-gray-50 dark:bg-[#0f172a]">
          {book.coverUrl ? (
            <img 
              src={book.coverUrl} 
              alt={book.title} 
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={cn(
              "w-full h-full flex flex-col items-center justify-center font-bold text-center Urdu select-none text-white p-2 text-xs",
              getCoverBg(book.id)
            )}>
              <span className="text-sm">{book.urduTitle.trim().charAt(0)}</span>
            </div>
          )}

          {/* Favorite button overlay */}
          <button
            onClick={(e) => toggleFavorite(book.id, e)}
            className={cn(
              "absolute top-1 right-1 p-1 rounded-full bg-white/90 dark:bg-slate-900/90 shadow-sm transition-all duration-200 z-10",
              isFav ? "text-red-500" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <Heart size={12} fill={isFav ? "currentColor" : "none"} />
          </button>
        </div>

        {/* Title */}
        <div className="text-center">
          <h4 className="text-[10px] font-bold text-gray-800 dark:text-slate-200 Urdu leading-tight line-clamp-3">
            {book.urduTitle}
          </h4>
        </div>
      </div>
    );
  };

  const renderSkeletonCard = (isGrid: boolean = false, index: number = 0) => {
    return (
      <div
        key={`skeleton-${index}`}
        className={cn(
          "snap-start bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-gray-100/85 dark:border-slate-800/60 shadow-sm flex flex-col justify-between animate-pulse",
          isGrid ? "w-full" : "flex-shrink-0 w-64"
        )}
      >
        <div className="relative aspect-[3/4] w-full mb-3 rounded-xl bg-gray-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-black/5" />
        </div>
        
        <div className="pt-2 flex-1 flex flex-col items-center justify-center space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-3/4 mx-auto" />
          <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/2 mx-auto" />
        </div>
      </div>
    );
  };

  // Filter books across categories
  const getFilteredBooks = (catId: string) => {
    let filtered = allBooks;
    if (catId !== 'all') {
      filtered = filtered.filter(b => b.category === catId);
    }
    
    if (!searchQuery.trim()) return filtered;
    
    const fuse = new Fuse(filtered, {
      keys: ['title', 'urduTitle', 'author', 'urduAuthor', 'description', 'urduDescription'],
      threshold: 0.4,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
    
    return fuse.search(searchQuery.trim()).map(result => result.item);
  };

  const filteredForActiveCategory = getFilteredBooks(activeCategory);
  const totalFilteredCount = filteredForActiveCategory.length;

  const handleReadBook = (book: Book) => {
    if (book.url) {
      setReadingBook(book);
    } else {
      alert(`کتاب "${book.urduTitle}" مطالعہ کے لیے فی الحال دستیاب نہیں ہے۔ تفصیلات باٹم شیٹ میں دیکھیں۔`);
    }
  };

  // Colors for aesthetic book covers (Material 3 style)
  const getCoverBg = (id: string) => {
    const bgs = [
      'bg-emerald-600 text-emerald-50 border-emerald-500',
      'bg-teal-600 text-teal-50 border-teal-500',
      'bg-cyan-600 text-cyan-50 border-cyan-500',
      'bg-sky-600 text-sky-50 border-sky-500',
      'bg-amber-600 text-amber-50 border-amber-500',
      'bg-amber-700 text-amber-100 border-amber-600'
    ];
    const index = id.charCodeAt(id.length - 1) % bgs.length;
    return bgs[index];
  };

  const renderBookDetailView = (book: Book) => {
    const defaultPreviews = [
      'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1584281729155-3c17b79cc24a?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1609599006353-e629f1d50213?auto=format&fit=crop&w=400&q=80'
    ];
    const previews = book.previewImages && book.previewImages.length > 0 ? book.previewImages : defaultPreviews;
    
    // Auto generate volumes if not present
    const bookVolumes = book.volumes && book.volumes.length > 0 
      ? book.volumes 
      : [{ name: book.urduTitle, url: book.url || 'https://archive.org/download/SahihAlBukhariUrduComplete8Volumes/Sahih-Al-Bukhari-Volume-1-Urdu.pdf', size: '48.5 MB' }];

    return (
      <div id="book-detail-screen" className="flex flex-col h-full bg-white dark:bg-[#0f172a] overflow-hidden relative">
        {/* Header - pastel mint green */}
        <div className="bg-[#e2f5ec] dark:bg-[#1e293b] p-4 pt-10 pb-4 shadow-sm z-10 flex items-center justify-between shrink-0 border-b border-teal-100 dark:border-slate-800">
          <div className="flex items-center gap-3 w-full">
            <button 
              id="back-to-library-btn"
              onClick={() => setSelectedBook(null)} 
              className="p-2 hover:bg-teal-200/50 dark:hover:bg-slate-800 rounded-full transition-colors text-gray-700 dark:text-slate-200"
            >
              <ArrowLeft size={24} />
            </button>
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 Urdu text-center flex-1 pr-8 leading-tight">
              {book.urduTitle}
            </h2>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollable-content">
          {/* Cover & General Metadata Info Card */}
          <div className="flex gap-4 items-start">
            {/* Book Cover */}
            <div className="w-28 sm:w-36 aspect-[3/4] rounded-2xl bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-slate-800 shadow-md overflow-hidden shrink-0 flex items-center justify-center">
              {book.coverUrl ? (
                <img src={book.coverUrl} alt={book.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <div className={cn(
                  "w-full h-full flex flex-col items-center justify-center font-bold text-center Urdu select-none text-white",
                  getCoverBg(book.id)
                )}>
                  <span className="text-2xl">{book.urduTitle.trim().charAt(0)}</span>
                </div>
              )}
            </div>

            {/* Quick Metadata Info */}
            <div className="space-y-2 py-1">
              <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-[#00a884] dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-2.5 py-0.5 rounded-md Urdu">
                {CATEGORIES.find(c => c.id === book.category)?.urdu || book.category}
              </span>
              <p className="text-sm text-gray-500 dark:text-slate-400 Urdu font-medium leading-relaxed">
                مصنف: <strong className="font-bold text-gray-800 dark:text-slate-200">{book.urduAuthor}</strong>
              </p>
              <p className="text-xs text-gray-400 font-mono">
                Language: <span className="font-semibold text-gray-600 dark:text-slate-300">{book.language}</span>
              </p>
              <p className="text-xs text-gray-400 font-mono">
                Publisher: <span className="font-semibold text-gray-600 dark:text-slate-300">Dar-us-Salam / Custom</span>
              </p>
            </div>
          </div>

          {/* Yellow Disclaimer Notice Box */}
          <div className="p-4 bg-[#fffde6] dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-amber-900/85 dark:text-amber-200/90 rounded-2xl text-xs sm:text-sm leading-relaxed font-sans shadow-xs">
            This book was brought from archive.org as under a Creative Commons licence, or the author or publishing house agrees to publish the book. If you object to the publication of the book, please contact us.
          </div>

          {/* Previews Section */}
          <div className="space-y-2.5">
            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">
              Previews
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
              {previews.map((url, idx) => (
                <div key={idx} className="snap-start shrink-0">
                  <img 
                    src={url} 
                    alt={`Preview Page ${idx + 1}`} 
                    referrerPolicy="no-referrer"
                    className="w-28 sm:w-36 aspect-[3/4] object-cover rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Volumes List & Actions */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 Urdu border-b border-gray-100 dark:border-slate-800 pb-2">
              دستیاب جلدیں / حصے (Available Volumes / Parts)
            </h3>
            
            <div className="space-y-4">
              {bookVolumes.map((vol, idx) => {
                const downloadKey = `${book.id}_${idx}`;
                const dl = activeDownloads[downloadKey];
                const isCached = cachedBooks.has(vol.url);

                return (
                  <div 
                    key={idx}
                    className="p-4 bg-gray-50 dark:bg-[#1e293b]/50 rounded-2xl border border-gray-100 dark:border-slate-800/60 space-y-3.5 transition-all"
                  >
                    {/* Volume Name & Info */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        <h4 className="text-base font-bold text-gray-900 dark:text-slate-100 Urdu">
                          {vol.name}
                        </h4>
                        
                        {dl ? (
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-bold animate-pulse">
                            Downloading: {dl.progress >= 0 ? `${dl.progress}%` : 'Connecting...'}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500 dark:text-slate-400 font-mono">
                            {vol.size || '52.5 MB'}
                          </p>
                        )}
                      </div>

                      {isCached && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-md font-bold">
                          Downloaded
                        </span>
                      )}
                    </div>

                    {/* Progress Bar (Only shown while downloading) */}
                    {dl && (
                      <div className="w-full bg-gray-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full transition-all duration-300" 
                          style={{ width: `${dl.progress >= 0 ? dl.progress : 100}%` }} 
                        />
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {dl ? (
                        <>
                          <button
                            onClick={() => cancelDownload(book.id, idx)}
                            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all text-xs"
                          >
                            Cancel Download
                          </button>
                        </>
                      ) : isCached ? (
                        <>
                          <button
                            onClick={() => handleReadBook({ ...book, url: vol.url })}
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-1"
                          >
                            <BookOpen size={14} /> offline پڑھیں (Read Offline)
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const downloaded = JSON.parse(localStorage.getItem('downloaded_volumes_local') || '[]');
                                const filtered = downloaded.filter((url: string) => url !== vol.url);
                                localStorage.setItem('downloaded_volumes_local', JSON.stringify(filtered));
                                
                                // Also delete PDF from IndexedDB
                                await deletePDF(vol.url);
                              } catch(e) {
                                console.error(e);
                              }
                              setCachedBooks(prev => {
                                const updated = new Set(prev);
                                updated.delete(vol.url);
                                return updated;
                              });
                            }}
                            className="px-3 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 rounded-xl transition-all font-bold text-xs"
                            title="Delete downloaded file"
                          >
                            حذف
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleReadBook({ ...book, url: vol.url })}
                            className="flex-1 py-2.5 bg-[#00a884] hover:bg-[#008f72] text-white rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-1 shadow-xs"
                          >
                            <BookOpen size={14} /> آن لائن پڑھیں (Online Read)
                          </button>
                          <button
                            onClick={() => startDownload(book.id, idx, vol.url)}
                            className="flex-1 py-2.5 bg-[#1a2536] hover:bg-slate-800 text-white rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-1 shadow-xs"
                          >
                            <Download size={14} /> ڈاؤنلوڈ (Download)
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Ensure full-screen embedded reader can show on top of this panel */}
        <AnimatePresence>
          {readingBook && (
            <BookReader 
              bookId={readingBook.id}
              bookTitle={readingBook.urduTitle} 
              bookUrl={readingBook.url!} 
              onClose={() => setReadingBook(null)} 
              onCached={(url) => setCachedBooks(prev => new Set(prev).add(url))}
              pageOffset={readingBook.pageOffset}
            />
          )}
        </AnimatePresence>
      </div>
    );
  };

  if (selectedBook) {
    return renderBookDetailView(selectedBook);
  }

  return (
    <div className="flex flex-col h-full bg-[#e7f5f1] dark:bg-[#0f172a] overflow-y-auto relative">
      {/* Arabic Decorative BG pattern */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] opacity-[0.03] dark:opacity-[0.01] pointer-events-none" />

      {/* Header */}
      <div className="bg-[#e7f5f1] dark:bg-[#1e293b] px-4 py-3 sm:px-6 sm:py-4 border-b border-emerald-100 dark:border-gray-800 z-10 flex items-center justify-between shrink-0 safe-area-top">
        <div className="flex items-center gap-2 sm:gap-3 text-[#008069] dark:text-white">
          <button 
            onClick={onBack} 
            className="p-1.5 sm:p-2 hover:bg-[#00a884]/10 rounded-full transition-colors -ml-1 sm:ml-0 text-[#008069] dark:text-white"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <div>
            <h2 className="text-base sm:text-xl font-black Urdu leading-tight">اسلامی لائبریری (Islamic Library)</h2>
            <p className="text-[#008069]/80 text-[10px] sm:text-xs Urdu mt-0.5 sm:mt-1 font-bold">معتبر اور مستند کتب کا علمی مرکز</p>
          </div>
        </div>
      </div>

      {/* Outlined Search Bar Section & Category Pills */}
      <div className="p-4 bg-[#e7f5f1] dark:bg-[#1e293b] border-b border-emerald-100 dark:border-gray-800 z-10 shrink-0 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.trim() !== '') {
                setActiveCategory('all');
              }
            }}
            placeholder="کتاب کا نام یا مصنف سرچ کریں (Search books or authors...)"
            className="w-full bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-slate-100 pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a884] transition-all text-sm Urdu"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Category Selector Horizontal Row */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
          <button
            onClick={() => setActiveCategory('all')}
            className={cn(
              "px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all shrink-0 Urdu border",
              activeCategory === 'all'
                ? "bg-[#00a884] border-[#00a884] text-white shadow-sm"
                : "bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-100"
            )}
          >
            تمام کتب (All)
          </button>
          {CATEGORIES.filter(cat => !cat.parent || activeCategory === cat.id).map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all shrink-0 Urdu border",
                activeCategory === cat.id
                  ? "bg-[#00a884] border-[#00a884] text-white shadow-sm"
                  : "bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-100"
              )}
            >
              {cat.urdu} {cat.parent ? ' ↩' : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Main Scrollable Library Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-8 scrollable-content relative z-10">
        
        {isLoading ? (
          activeCategory === 'all' ? (
            CATEGORIES.slice(0, 2).map((category, groupIndex) => (
              <div key={`skeleton-group-${groupIndex}`} className="space-y-3.5 animate-pulse">
                {/* Skeleton Category Header */}
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-6 rounded bg-gray-200 dark:bg-slate-800" />
                    <div className="h-5 bg-gray-200 dark:bg-slate-800 rounded w-32" />
                  </div>
                  <div className="h-5 bg-gray-100 dark:bg-slate-800 rounded-full w-14" />
                </div>

                {/* Horizontal Scrolling Box Skeleton */}
                <div className="flex gap-4 overflow-x-auto pb-3 pt-1 -mx-4 px-4 scrollbar-none">
                  {[1, 2, 3].map((cardIndex) => renderSkeletonCard(false, groupIndex * 10 + cardIndex))}
                </div>
              </div>
            ))
          ) : (
            <div className="space-y-4">
              {/* Skeleton Category Header */}
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-6 rounded bg-gray-200 dark:bg-slate-800" />
                  <div className="h-5 bg-gray-200 dark:bg-slate-800 rounded w-32" />
                </div>
                <div className="h-5 bg-gray-100 dark:bg-slate-800 rounded-full w-14" />
              </div>

              {/* Vertical Grid Skeleton */}
              <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5, 6].map((cardIndex) => renderSkeletonCard(true, cardIndex))}
              </div>
            </div>
          )
        ) : totalFilteredCount === 0 ? (
          /* Empty Search State */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-600 mb-4 animate-pulse">
              <SearchX size={44} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 Urdu mb-1">کوئی کتاب نہیں ملی (No Results Found)</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs Urdu px-4">
              براہ کرم دوسرے الفاظ یا کسی اور مصنف کا نام لکھ کر تلاش کریں۔
            </p>
          </div>
        ) : activeCategory === 'all' ? (
          <>
            {/* Recently Read Section */}
            {!searchQuery && recentlyRead.length > 0 && (
              <div className="space-y-3.5 mb-6">
                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-6 rounded bg-[#00a884] animate-pulse" />
                    <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 Urdu">
                      حالیہ پڑھی گئی کتب (Recently Read)
                    </h3>
                  </div>
                  <span className="text-xs text-[#00a884] font-medium bg-teal-50 dark:bg-teal-950/40 px-2.5 py-1 rounded-full">
                    {recentlyRead.length} کتب
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-2">
                  {recentlyRead.map(item => renderRecentlyReadCard(item))}
                </div>
              </div>
            )}

            {CATEGORIES.map(category => {
              const catBooks = getFilteredBooks(category.id);
              if (catBooks.length === 0) return null;
              
              const isAllBooksView = activeCategory === 'all';
              const displayBooks = isAllBooksView ? catBooks.slice(0, 4) : catBooks;

              return (
                <div key={category.id} className="space-y-3.5 mb-6">
                  {/* Category Header as a Pill Button */}
                  <div className="flex items-center justify-between pb-2">
                    <button 
                      onClick={() => setActiveCategory(category.id)}
                      className="px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all shrink-0 Urdu border bg-[#00a884] border-[#00a884] text-white shadow-sm cursor-pointer hover:bg-[#009273]"
                    >
                      {category.urdu}
                    </button>
                    {isAllBooksView && catBooks.length > 4 ? (
                      <button 
                        onClick={() => setActiveCategory(category.id)}
                        className="text-[10px] sm:text-xs text-[#00a884] font-bold bg-teal-50 dark:bg-teal-950/40 px-2.5 py-1 rounded-full hover:bg-teal-100 transition-colors Urdu flex items-center gap-1 cursor-pointer"
                      >
                        مزید دیکھیں
                      </button>
                    ) : (
                      <span className="text-[10px] sm:text-xs text-gray-500 font-medium bg-gray-100 dark:bg-slate-800 px-2.5 py-1 rounded-full Urdu">
                        {catBooks.length} کتب
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-2">
                    {displayBooks.map(book => renderBookCard(book, true))}
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          (() => {
            const catInfo = CATEGORIES.find(c => c.id === activeCategory);
            const catBooks = getFilteredBooks(activeCategory);
            if (!catInfo) return null;

            if (activeCategory === 'emadrasa') {
              const subcategories = CATEGORIES.filter(c => c.parent === 'emadrasa');
              
              return (
                <div className="space-y-6 max-w-4xl mx-auto pb-8 animate-fade-in">
                  {/* Category Header */}
                  <div className="text-center py-5 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-slate-900/40 dark:to-emerald-950/20 p-6 rounded-3xl border border-teal-100/50 dark:border-emerald-900/10 shadow-sm">
                    <h3 className="text-2xl sm:text-3xl font-black text-[#008069] dark:text-emerald-400 Urdu">
                      ای مدرسہ (e-Madrasa)
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-2 font-bold Urdu max-w-lg mx-auto">
                      درسِ نظامی (بنین و بنات)، تجوید و قرآت اور دیگر تعلیمی درجات کی نصابی کتب
                    </p>
                  </div>

                  {/* Subcategories Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subcategories.map((sub, idx) => {
                      const count = allBooks.filter(b => b.category === sub.id).length;
                      return (
                        <motion.div
                          key={sub.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setActiveCategory(sub.id)}
                          className="cursor-pointer bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md hover:border-[#00a884]/30 transition-all group relative overflow-hidden shadow-xs"
                        >
                          <div className="space-y-2 relative z-10 text-right">
                            <div className="flex justify-between items-start">
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-teal-400 bg-emerald-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-md font-mono">
                                {idx + 1}
                              </span>
                              <span className="text-[10px] text-gray-400 font-bold bg-gray-50 dark:bg-slate-800/60 px-2 py-0.5 rounded-full">
                                {count} کتب
                              </span>
                            </div>
                            <h4 className="text-base font-bold text-[#111b21] dark:text-[#e9edef] Urdu leading-tight pt-1">
                              {sub.urdu}
                            </h4>
                            <p className="text-[10px] text-gray-400 font-medium font-mono text-left">
                              {sub.title}
                            </p>
                          </div>
                          
                          <div className="mt-4 pt-2 border-t border-gray-50 dark:border-slate-800/40 flex items-center justify-between text-xs text-[#00a884] font-bold group-hover:translate-x-1 transition-all">
                            <span className="Urdu text-[11px]">کتابیں دیکھیں</span>
                            <ChevronRight size={14} className="rotate-180" />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            const isSubCategory = catInfo.parent === 'emadrasa';
            const displayedBooks = isSubCategory 
              ? catBooks.filter(book => {
                  if (subFilter === 'all') return true;
                  if (subFilter === 'book') return book.bookType === 'book' || !book.bookType;
                  if (subFilter === 'sharh') return book.bookType === 'sharh';
                  return true;
                })
              : catBooks;

            return (
              <div className="space-y-6 max-w-5xl mx-auto">
                {/* Back button/Breadcrumb for subcategories */}
                {isSubCategory && (
                  <button
                    onClick={() => setActiveCategory('emadrasa')}
                    className="inline-flex items-center gap-1.5 text-xs text-[#00a884] dark:text-emerald-400 font-bold bg-white dark:bg-[#1e293b] hover:bg-emerald-50 dark:hover:bg-slate-800 px-3.5 py-2 rounded-xl border border-gray-150 dark:border-slate-800 transition-all hover:-translate-y-0.5 shadow-xs cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                    <span className="Urdu font-bold">واپس ای مدرسہ (Back to e-Madrasa)</span>
                  </button>
                )}

                {/* Category Header */}
                <div className="text-center py-4">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 Urdu">
                    {catInfo.urdu}
                  </h3>
                  <p className="text-sm font-normal text-gray-400 mt-1">
                    {catInfo.title}
                  </p>
                </div>

                {/* subFilter Tabs for e-Madrasa subcategories */}
                {isSubCategory && (
                  <div className="flex justify-center gap-2 mb-4 bg-gray-100/50 dark:bg-slate-800/40 p-1 rounded-2xl max-w-sm mx-auto border border-gray-200/50 dark:border-slate-800/30">
                    <button
                      onClick={() => setSubFilter('all')}
                      className={cn(
                        "flex-1 py-1.5 rounded-xl text-xs font-bold transition-all Urdu cursor-pointer text-center",
                        subFilter === 'all'
                          ? "bg-[#00a884] text-white shadow-xs"
                          : "text-gray-600 dark:text-slate-300 hover:bg-gray-200/50 dark:hover:bg-slate-800"
                      )}
                    >
                      تمام (All)
                    </button>
                    <button
                      onClick={() => setSubFilter('book')}
                      className={cn(
                        "flex-1 py-1.5 rounded-xl text-xs font-bold transition-all Urdu cursor-pointer text-center",
                        subFilter === 'book'
                          ? "bg-[#00a884] text-white shadow-xs"
                          : "text-gray-600 dark:text-slate-300 hover:bg-gray-200/50 dark:hover:bg-slate-800"
                      )}
                    >
                      کتب (Books)
                    </button>
                    <button
                      onClick={() => setSubFilter('sharh')}
                      className={cn(
                        "flex-1 py-1.5 rounded-xl text-xs font-bold transition-all Urdu cursor-pointer text-center",
                        subFilter === 'sharh'
                          ? "bg-[#00a884] text-white shadow-xs"
                          : "text-gray-600 dark:text-slate-300 hover:bg-gray-200/50 dark:hover:bg-slate-800"
                      )}
                    >
                      شروحات (Commentaries)
                    </button>
                  </div>
                )}

                {/* Vertical Grid for specific category books */}
                {displayedBooks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-slate-800 p-6 shadow-xs">
                    <p className="text-sm font-bold text-gray-500 dark:text-slate-400 Urdu">
                      اس درجے میں کوئی {subFilter === 'book' ? 'کتاب' : 'شرح'} دستیاب نہیں ہے۔
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {displayedBooks.map(book => renderBookCard(book, true))}
                  </div>
                )}
              </div>
            );
          })()
        )}
      </div>

      {/* Elegant Modal Bottom Sheet */}
      <AnimatePresence>
        {readingBook && (
          <BookReader 
            bookId={readingBook.id}
            bookTitle={readingBook.urduTitle} 
            bookUrl={readingBook.url!} 
            onClose={() => setReadingBook(null)} 
            onCached={(url) => setCachedBooks(prev => new Set(prev).add(url))}
            pageOffset={readingBook.pageOffset}
          />
        )}
        {selectedBook && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBook(null)}
              className="absolute inset-0 bg-black z-40"
            />

            {/* Bottom Sheet Box */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 max-h-[85%] bg-white dark:bg-[#1e293b] rounded-t-[32px] shadow-2xl z-50 overflow-hidden flex flex-col border-t border-gray-100 dark:border-slate-800"
            >
              {/* Top Drag Handle Bar */}
              <div className="w-full flex justify-center py-3 shrink-0">
                <div className="w-12 h-1.5 rounded-full bg-gray-200 dark:bg-slate-700" />
              </div>

              {/* Header Box */}
              <div className="px-6 pb-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-start gap-4">
                <div className="flex gap-4 items-start">
                  {/* Miniature Cover Image */}
                  <div className="w-16 h-24 rounded-lg bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-slate-800 shadow-inner overflow-hidden shrink-0 flex items-center justify-center">
                    {selectedBook.coverUrl ? (
                      <img src={selectedBook.coverUrl} alt={selectedBook.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    ) : (
                      <div className={cn(
                        "w-full h-full flex flex-col items-center justify-center font-bold text-center Urdu select-none text-white",
                        getCoverBg(selectedBook.id)
                      )}>
                        <span className="text-xl">{selectedBook.urduTitle.trim().charAt(0)}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#00a884] bg-teal-50 dark:bg-teal-950/40 px-2.5 py-0.5 rounded-md">
                        {CATEGORIES.find(c => c.id === selectedBook.category)?.urdu || selectedBook.category}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">({selectedBook.language})</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 Urdu leading-snug">
                      {selectedBook.urduTitle}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 Urdu">
                      مصنف: <strong className="font-semibold text-gray-700 dark:text-slate-300">{selectedBook.urduAuthor}</strong>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedBook(null)}
                  className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable details area */}
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Book Details Box */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Info size={14} /> کتاب کا تعارف (Book Summary)
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed Urdu bg-slate-50 dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                    {selectedBook.urduDescription}
                  </p>
                  <p className="text-xs text-gray-400 italic font-mono pt-1">
                    {selectedBook.description}
                  </p>
                </div>

                {/* Additional Metadata Card */}
                <div className="bg-slate-50 dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40 flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <span className="text-gray-400 block font-semibold">LANGUAGE</span>
                    <span className="text-gray-800 dark:text-slate-200 font-bold Urdu">{selectedBook.language}</span>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-gray-400 block font-semibold">PUBLISHER</span>
                    <span className="text-gray-800 dark:text-slate-200 font-bold Urdu">دار الکتب العلمیہ / عام اشاعت</span>
                  </div>
                </div>

                {/* Book Volumes Section */}
                {selectedBook.volumes && selectedBook.volumes.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers size={14} /> دستیاب جلدیں / حصے (Available Volumes / Parts)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {selectedBook.volumes.map((vol, index) => (
                        <div 
                          key={index} 
                          className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-[#0f172a]/60 rounded-xl border border-slate-100 dark:border-slate-800/40 hover:border-teal-500/30 dark:hover:border-teal-500/20 transition-all animate-fade-in"
                        >
                          <span className="text-sm font-bold text-gray-800 dark:text-slate-200 Urdu">{vol.name}</span>
                          <div className="flex items-center gap-2">
                            {/* Read Volume online */}
                            <button
                              onClick={() => handleReadBook({ ...selectedBook, url: vol.url })}
                              className="text-xs text-[#00a884] dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30 px-2.5 py-1.5 rounded-lg border border-teal-200/50 dark:border-teal-900/40 transition-all font-bold Urdu flex items-center gap-1"
                            >
                              <BookOpen size={12} /> پڑھیں
                            </button>
                            {/* Download Volume */}
                            {cachedBooks.has(vol.url) ? (
                              <button
                                onClick={() => handleReadBook({ ...selectedBook, url: vol.url })}
                                className="text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 px-2.5 py-1.5 rounded-lg border border-emerald-200/50 dark:border-emerald-900/40 transition-all font-bold Urdu flex items-center gap-1"
                              >
                                <BookOpen size={12} /> Read Offline
                              </button>
                            ) : (
                              <a
                                href={vol.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 px-2.5 py-1.5 rounded-lg border border-blue-200/50 dark:border-blue-900/40 transition-all font-bold Urdu flex items-center gap-1"
                              >
                                <Download size={12} /> ڈاؤنلوڈ
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Interactive Actions Area */}
              <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/40 flex flex-col sm:flex-row gap-3 shrink-0">
                <button
                  onClick={() => toggleFavorite(selectedBook.id)}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-2xl border flex items-center justify-center gap-2 font-bold transition-all text-sm",
                    favorites.includes(selectedBook.id)
                      ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30 text-red-500"
                      : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50"
                  )}
                >
                  <Heart size={18} fill={favorites.includes(selectedBook.id) ? "currentColor" : "none"} />
                  {favorites.includes(selectedBook.id) ? "پسندیدہ سے نکالیں" : "پسندیدہ میں شامل کریں"}
                </button>

                <button
                  onClick={() => {
                    if (selectedBook.volumes && selectedBook.volumes.length > 0) {
                      setDownloadingBookVolumes(selectedBook);
                    } else if (selectedBook.url) {
                      window.open(selectedBook.url, '_blank', 'noopener,noreferrer');
                    } else {
                      alert('ڈاؤنلوڈ لنک فی الحال دستیاب نہیں ہے۔');
                    }
                  }}
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-md text-sm"
                >
                  <Download size={18} />
                  ڈاؤنلوڈ کریں (Download)
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Full-screen Embedded Reader */}
      <AnimatePresence>
        {readingBook && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-[100] bg-white dark:bg-[#0f172a] flex flex-col"
          >
            {/* Reader Header */}
            <div className="bg-[#00a884] dark:bg-[#1e293b] text-white px-4 py-3 shadow-md flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setReadingBook(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  aria-label="Back to Library"
                >
                  <ArrowLeft size={24} />
                </button>
                <div className="text-left">
                  <h3 className="text-sm sm:text-base font-bold Urdu leading-tight line-clamp-1">{readingBook.urduTitle}</h3>
                  <p className="text-[10px] sm:text-[11px] text-white/80 Urdu line-clamp-1">{readingBook.urduAuthor}</p>
                </div>
              </div>
              
              {/* Fallback to open in browser in case iframe is blocked */}
              <a
                href={readingBook.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 Urdu"
              >
                براؤزر میں کھولیں
              </a>
            </div>

            {/* Embedded Iframe Container */}
            <div className="flex-1 w-full bg-slate-100 dark:bg-slate-950 relative">
              {/* Elegant loading indicator */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-gray-400 dark:text-gray-600 gap-2">
                <div className="w-10 h-10 border-4 border-[#00a884] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium Urdu">کتاب لوڈ ہو رہی ہے...</span>
              </div>

              {/* Iframe */}
              <iframe
                src={readingBook.url && readingBook.url.toLowerCase().endsWith('.pdf') ? `https://docs.google.com/gview?url=${encodeURIComponent(readingBook.url)}&embedded=true` : readingBook.url}
                className="w-full h-full border-none relative z-10"
                title={readingBook.urduTitle}
                allowFullScreen
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Volume Selection Modal */}
      <AnimatePresence>
        {downloadingBookVolumes && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setDownloadingBookVolumes(null)}
              className="absolute inset-0 bg-black/60 z-[110]"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="absolute inset-x-4 top-1/2 -translate-y-1/2 md:max-w-md md:mx-auto bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl z-[120] border border-gray-100 dark:border-slate-800 p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Download className="text-[#00a884]" size={20} />
                  <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 Urdu">جلد منتخب کریں (Select Volume)</h3>
                </div>
                <button
                  onClick={() => setDownloadingBookVolumes(null)}
                  className="p-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 rounded-full transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-bold text-gray-800 dark:text-slate-200 Urdu">{downloadingBookVolumes.urduTitle}</h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 Urdu">مصنف: {downloadingBookVolumes.urduAuthor}</p>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {downloadingBookVolumes.volumes?.map((vol, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#0f172a]/40 rounded-xl border border-slate-100 dark:border-slate-800/40 hover:border-[#00a884]/30 transition-all"
                  >
                    <span className="text-sm font-semibold text-gray-800 dark:text-slate-200 Urdu">{vol.name}</span>
                    <a
                      href={vol.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setDownloadingBookVolumes(null)}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-all"
                    >
                      <Download size={12} /> ڈاؤنلوڈ
                    </a>
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => setDownloadingBookVolumes(null)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-bold transition-all text-xs Urdu"
              >
                بند کریں (Cancel)
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
