import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Trash2, 
  Search, 
  ArrowLeft, 
  Book as BookIcon,
  CloudLightning,
  Smartphone,
  HardDrive
} from 'lucide-react';
import { cn } from '../utils';
import { BOOKS_DATA } from './IslamicLibrary';
import BookReader from './BookReader';
import { deletePDF } from '../utils/pdfStorage';

interface Book {
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
  volumes?: { 
    name: string; 
    url: string; 
    size?: string;
  }[];
}

interface OfflineLibraryProps {
  onBack: () => void;
}

export default function OfflineLibrary({ onBack }: OfflineLibraryProps) {
  const [downloadedUrls, setDownloadedUrls] = useState<Set<string>>(new Set());
  const [customBooks, setCustomBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [readingBook, setReadingBook] = useState<{ id: string; urduTitle: string; url: string } | null>(null);

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

  // Load cache and local storage to find downloaded volume URLs
  const checkCachedVolumes = async () => {
    const urls = new Set<string>();
    
    // Check Cache Storage API
    if ('caches' in window) {
      try {
        const cache = await caches.open('ulfha-books-cache');
        const requests = await cache.keys();
        requests.forEach(req => urls.add(req.url));
      } catch (e) {
        console.error("Cache check failed:", e);
      }
    }
    
    // Check custom local storage track
    try {
      const stored = JSON.parse(localStorage.getItem('downloaded_volumes_local') || '[]');
      stored.forEach((url: string) => urls.add(url));
    } catch (e) {
      console.error("Local storage download check failed:", e);
    }
    
    setDownloadedUrls(urls);
  };

  useEffect(() => {
    // Load custom books defined in firestore/local storage
    try {
      const localData = localStorage.getItem('library_books_local');
      if (localData) {
        setCustomBooks(JSON.parse(localData));
      }
    } catch (e) {
      console.error("Failed to load local custom books:", e);
    }

    checkCachedVolumes();
  }, []);

  // Merge systemic books and custom books
  const allBooks = [...customBooks, ...BOOKS_DATA.filter(sysBook => !customBooks.some(cb => cb.id === sysBook.id))];

  // Map book to its downloaded volumes
  const getDownloadedVolumesForBook = (book: Book) => {
    const bookVolumes = book.volumes && book.volumes.length > 0 
      ? book.volumes 
      : [{ name: book.urduTitle, url: book.url || '', size: '48.5 MB' }];
    
    return bookVolumes.filter(vol => vol.url && downloadedUrls.has(vol.url));
  };

  // Get books that have at least one downloaded volume
  const downloadedBooks = allBooks.map(book => {
    const downloadedVols = getDownloadedVolumesForBook(book);
    if (downloadedVols.length > 0) {
      return {
        ...book,
        downloadedVolumes: downloadedVols
      };
    }
    return null;
  }).filter((b): b is Book & { downloadedVolumes: { name: string; url: string; size?: string }[] } => b !== null);

  // Search filter
  const filteredBooks = downloadedBooks.filter(book => 
    book.urduTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.urduAuthor.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Delete downloaded volume from cache, IndexedDB & local storage
  const handleDeleteVolume = async (volUrl: string) => {
    // 1. Delete from Cache Storage API
    if ('caches' in window) {
      try {
        const cache = await caches.open('ulfha-books-cache');
        await cache.delete(volUrl);
      } catch (e) {
        console.error("Failed to delete from Cache Storage:", e);
      }
    }

    // 2. Delete from IndexedDB
    try {
      await deletePDF(volUrl);
    } catch (e) {
      console.error("Failed to delete from IndexedDB:", e);
    }

    // 3. Delete from custom local storage list
    try {
      const downloaded = JSON.parse(localStorage.getItem('downloaded_volumes_local') || '[]');
      const filtered = downloaded.filter((url: string) => url !== volUrl);
      localStorage.setItem('downloaded_volumes_local', JSON.stringify(filtered));
    } catch (e) {
      console.error("Failed to update downloaded list in localStorage:", e);
    }

    // Reload list
    checkCachedVolumes();
  };

  return (
    <div className="flex flex-col h-full bg-[#e7f5f1] dark:bg-[#0f172a] overflow-hidden relative">
      {/* Decorative BG element */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="bg-[#e7f5f1] dark:bg-[#1e293b] p-2 sm:p-4 border-b border-emerald-100 dark:border-slate-800 z-10 flex items-center justify-between shrink-0 safe-area-top">
        <div className="flex items-center gap-2 sm:gap-3 w-full">
          <button 
            onClick={onBack} 
            className="p-1.5 sm:p-2 hover:bg-teal-200/50 dark:hover:bg-slate-800 rounded-full transition-colors text-gray-750 dark:text-slate-200"
          >
            <ArrowLeft size={20} className="sm:w-6 sm:h-6" />
          </button>
          <div className="flex flex-col flex-1 pr-8">
            <h2 className="text-sm sm:text-lg font-black text-[#008069] dark:text-slate-100 Urdu text-center leading-tight">
              آف لائن لائبریری (Offline Library)
            </h2>
            <p className="text-[8px] sm:text-[10px] text-teal-700 dark:text-teal-400 font-bold text-center uppercase tracking-wider">
              No Network Connection Required • انٹرنیٹ کے بغیر پڑھیں
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {downloadedBooks.length > 0 && (
        <div className="p-4 bg-[#e7f5f1] dark:bg-[#1e293b] border-b border-emerald-100 dark:border-slate-850/60 z-10">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-2.5 text-gray-400 dark:text-slate-500" size={18} />
            <input
              type="text"
              placeholder="ڈاؤنلوڈ شدہ کتاب یا مصنف تلاش کریں..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-slate-800 focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884] rounded-xl text-xs text-gray-900 dark:text-white outline-none Urdu placeholder-gray-400 transition-all text-right"
            />
          </div>
        </div>
      )}

      {/* Main content list */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollable-content z-10">
        {downloadedBooks.length === 0 ? (
          /* Empty State */
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-5 max-w-md mx-auto">
            <div className="w-20 h-20 rounded-full bg-teal-50 dark:bg-teal-950/20 flex items-center justify-center text-[#00a884] animate-bounce">
              <CloudLightning size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 Urdu">
                کوئی آف لائن کتاب ڈاؤنلوڈ نہیں ہے!
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 Urdu leading-relaxed">
                آپ اسلامی لائبریری میں جا کر اپنی پسندیدہ کتاب کی جلدوں کو ڈاؤنلوڈ کر سکتے ہیں، جس کے بعد وہ یہاں بغیر انٹرنیٹ کے پڑھنے کے لیے دستیاب ہوں گی۔
              </p>
            </div>
            <button
              onClick={onBack}
              className="px-6 py-2.5 bg-[#00a884] hover:bg-[#008f72] text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
            >
              اسلامی لائبریری کھولیں (Open Library)
            </button>
          </div>
        ) : filteredBooks.length === 0 ? (
          /* Search Empty State */
          <div className="py-20 text-center space-y-3">
            <BookIcon className="mx-auto text-gray-350 dark:text-slate-600" size={48} />
            <p className="text-sm text-gray-500 dark:text-slate-400 Urdu">آپ کی تلاش کے مطابق کوئی ڈاؤنلوڈ شدہ کتاب نہیں ملی۔</p>
          </div>
        ) : (
          /* Downloaded Books Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBooks.map((book) => (
              <div 
                key={book.id}
                className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-slate-800/80 p-3 sm:p-4 shadow-sm hover:shadow-md transition-all flex flex-row gap-3 sm:gap-4 relative overflow-hidden"
              >
                {/* Book Cover */}
                <div className="w-16 sm:w-24 aspect-[3/4] rounded-xl overflow-hidden shadow-sm shrink-0 flex items-center justify-center bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-slate-800">
                  {book.coverUrl ? (
                    <img 
                      src={book.coverUrl} 
                      alt={book.title} 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className={cn(
                      "w-full h-full flex flex-col items-center justify-center font-bold text-center Urdu select-none text-white",
                      getCoverBg(book.id)
                    )}>
                      <span className="text-lg sm:text-xl">{book.urduTitle.trim().charAt(0)}</span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between space-y-2 sm:space-y-3 overflow-hidden">
                  <div className="space-y-0.5 sm:space-y-1 text-left rtl:text-right">
                    <h3 className="text-xs sm:text-base font-bold text-gray-900 dark:text-slate-100 Urdu leading-tight truncate">
                      {book.urduTitle}
                    </h3>
                    <p className="text-[9px] sm:text-xs text-gray-500 dark:text-slate-400 Urdu font-medium truncate">
                      مصنف: <span className="font-bold text-gray-800 dark:text-slate-200">{book.urduAuthor}</span>
                    </p>
                    <p className="text-[8px] sm:text-[10px] font-mono text-gray-400">
                      Language: {book.language}
                    </p>
                  </div>

                  {/* Volume buttons */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      <HardDrive className="text-[#00a884] w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      <span>ڈاؤنلوڈ شدہ جلدیں ({book.downloadedVolumes.length})</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {book.downloadedVolumes.map((vol, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center bg-gray-50 dark:bg-[#0f172a] hover:bg-emerald-50 dark:hover:bg-teal-950/20 border border-gray-150 dark:border-slate-800 rounded-lg pl-2 sm:pl-2.5 pr-0.5 sm:pr-1 py-0.5 sm:py-1 transition-all text-[10px] sm:text-xs text-gray-700 dark:text-slate-200"
                        >
                          <button
                            onClick={() => setReadingBook({ id: book.id, urduTitle: vol.name, url: vol.url })}
                            className="font-semibold Urdu hover:text-[#00a884] pr-1.5 sm:pr-2 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <BookOpen className="text-[#00a884] w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            <span>{vol.name}</span>
                          </button>
                          
                          <button
                            onClick={() => handleDeleteVolume(vol.url)}
                            className="p-0.5 sm:p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
                            title="Delete volume from local storage"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Book Reader Modal Overlay */}
      <AnimatePresence>
        {readingBook && (
          <BookReader
            bookId={readingBook.id}
            bookTitle={readingBook.urduTitle}
            bookUrl={readingBook.url}
            onClose={() => setReadingBook(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
