import React, { useState, useRef, useEffect } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  X, 
  Bookmark, 
  Trash2, 
  Save, 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  CheckCircle,
  FileText,
  AlertCircle
} from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, query, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../firebaseError';
import { getPDF, storePDF } from '../utils/pdfStorage';

// Helper to dynamically load a script from CDN
const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
};

interface BookmarkType {
  id?: string;
  bookId: string;
  bookTitle: string;
  page: string;
  note?: string;
  url: string;
  createdAt?: any;
}

interface BookReaderProps {
  bookId: string;
  bookTitle: string;
  bookUrl: string;
  onClose: () => void;
  onCached?: (url: string) => void;
}

export default function BookReader({ bookId, bookTitle, bookUrl, onClose, onCached }: BookReaderProps) {
  // Viewer states
  const [isLibLoaded, setIsLibLoaded] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [isRenderLoading, setIsRenderLoading] = useState(false);
  const [libError, setLibError] = useState<string | null>(null);

  // Download & Offline States
  const [isOffline, setIsOffline] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [dlProgress, setDlProgress] = useState<{ percent: number; loadedMB: string; totalMB: string }>({
    percent: 0,
    loadedMB: '0.0',
    totalMB: '0.0'
  });

  // UI States
  const [isImmersive, setIsImmersive] = useState(false);
  const [showBookmarksPanel, setShowBookmarksPanel] = useState(false);
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [bookmarkPage, setBookmarkPage] = useState('');
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [isSavingBookmark, setIsSavingBookmark] = useState(false);

  const { user } = useAuth();
  const readerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // 1. Load PDF.js from CDN
  useEffect(() => {
    const initPdfJs = async () => {
      try {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
        const pdfjsLib = (window as any).pdfjsLib;
        if (pdfjsLib) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          setIsLibLoaded(true);
        } else {
          throw new Error("pdfjsLib not defined on window");
        }
      } catch (err: any) {
        console.error("Failed to load PDF.js from CDN:", err);
        setLibError("پی ڈی ایف ریڈر لوڈ کرنے میں ناکامی۔ براہ کرم انٹرنیٹ کنکشن چیک کریں۔");
      }
    };
    initPdfJs();
  }, []);

  // 2. Load Book (either from IndexedDB or online proxy)
  useEffect(() => {
    if (!isLibLoaded) return;

    let isMounted = true;
    const loadBookDoc = async () => {
      setIsRenderLoading(true);
      try {
        // First check IndexedDB for offline cached PDF
        const cachedBlob = await getPDF(bookUrl);
        let pdfData: any;

        if (cachedBlob) {
          setIsOffline(true);
          const arrayBuffer = await cachedBlob.arrayBuffer();
          pdfData = { data: new Uint8Array(arrayBuffer) };
        } else {
          setIsOffline(false);
          // Load online via proxy to prevent CORS issues
          const proxyUrl = `/api/pdf-proxy?url=${encodeURIComponent(bookUrl)}`;
          pdfData = { url: proxyUrl };
        }

        const pdfjsLib = (window as any).pdfjsLib;
        const loadingTask = pdfjsLib.getDocument(pdfData);
        
        // Track load progress if loading from network
        loadingTask.onProgress = (progressData: { loaded: number; total: number }) => {
          if (!cachedBlob && progressData.total > 0 && isMounted) {
            const pct = Math.round((progressData.loaded / progressData.total) * 100);
            setDlProgress({
              percent: pct,
              loadedMB: (progressData.loaded / (1024 * 1024)).toFixed(1),
              totalMB: (progressData.total / (1024 * 1024)).toFixed(1)
            });
          }
        };

        const doc = await loadingTask.promise;
        if (!isMounted) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setPageNum(1);
      } catch (err: any) {
        console.error("Error loading PDF document:", err);
        if (isMounted) {
          setLibError("کتاب لوڈ کرنے میں دشواری پیش آئی۔ یہ لنک عارضی طور پر دستیاب نہیں ہو سکتا۔");
        }
      } finally {
        if (isMounted) {
          setIsRenderLoading(false);
        }
      }
    };

    loadBookDoc();

    return () => {
      isMounted = false;
    };
  }, [isLibLoaded, bookUrl]);

  // 3. Render Page onto Canvas (High-DPI supported)
  useEffect(() => {
    if (!pdfDoc) return;

    const renderPage = async () => {
      setIsRenderLoading(true);
      
      // Cancel previous render task if any
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;

        if (canvas) {
          const context = canvas.getContext('2d');
          if (context) {
            const pixelRatio = window.devicePixelRatio || 1;
            canvas.width = Math.floor(viewport.width * pixelRatio);
            canvas.height = Math.floor(viewport.height * pixelRatio);
            canvas.style.width = `${viewport.width}px`;
            canvas.style.height = `${viewport.height}px`;

            context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

            const renderContext = {
              canvasContext: context,
              viewport: viewport
            };

            const renderTask = page.render(renderContext);
            renderTaskRef.current = renderTask;

            await renderTask.promise;
          }
        }
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error("Render Page Error:", err);
        }
      } finally {
        setIsRenderLoading(false);
      }
    };

    renderPage();
  }, [pdfDoc, pageNum, scale]);

  // 4. Real Offline Download Implementation
  const handleRealDownload = () => {
    if (isDownloading || isOffline) return;

    setIsDownloading(true);
    setDlProgress({ percent: 0, loadedMB: '0.0', totalMB: '0.0' });

    const proxyUrl = `/api/pdf-proxy?url=${encodeURIComponent(bookUrl)}`;
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.open('GET', proxyUrl, true);
    xhr.responseType = 'blob';

    xhr.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        setDlProgress({
          percent: pct,
          loadedMB: (e.loaded / (1024 * 1024)).toFixed(1),
          totalMB: (e.total / (1024 * 1024)).toFixed(1)
        });
      } else {
        setDlProgress(prev => ({
          ...prev,
          percent: -1,
          loadedMB: (e.loaded / (1024 * 1024)).toFixed(1)
        }));
      }
    };

    xhr.onload = async () => {
      if (xhr.status === 200) {
        try {
          const blob = xhr.response;
          // Store PDF Blob in IndexedDB
          await storePDF(bookUrl, blob);

          // Add to local storage tracking list
          const downloaded = JSON.parse(localStorage.getItem('downloaded_volumes_local') || '[]');
          if (!downloaded.includes(bookUrl)) {
            downloaded.push(bookUrl);
            localStorage.setItem('downloaded_volumes_local', JSON.stringify(downloaded));
          }

          setIsOffline(true);
          setIsDownloading(false);
          if (onCached) onCached(bookUrl);
          
          // Trigger custom event so other components (like Explore) refresh immediately
          window.dispatchEvent(new Event('storage'));
        } catch (err) {
          console.error("Failed to save downloaded PDF:", err);
          alert("ڈاؤنلوڈ محفوظ کرنے میں ناکامی ہوئی۔");
          setIsDownloading(false);
        }
      } else {
        alert("ڈاؤنلوڈ کرنے میں ناکامی پیش آئی۔");
        setIsDownloading(false);
      }
    };

    xhr.onerror = () => {
      alert("نیٹ ورک کا مسئلہ پیش آیا۔ ڈاؤنلوڈ منقطع ہو گیا ہے۔");
      setIsDownloading(false);
    };

    xhr.send();
  };

  const cancelRealDownload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      setIsDownloading(false);
    }
  };

  // 5. Bookmarks sync
  useEffect(() => {
    if (!bookId) return;

    if (user) {
      const bookmarksRef = collection(db, 'users', user.uid, 'bookmarks');
      const q = query(bookmarksRef);
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items: BookmarkType[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.bookId === bookId) {
            items.push({ id: doc.id, ...data } as BookmarkType);
          }
        });
        
        items.sort((a, b) => (parseInt(a.page) || 0) - (parseInt(b.page) || 0));
        setBookmarks(items);
      }, (error) => {
        console.error("Error loading bookmarks:", error);
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}/bookmarks`);
      });

      return () => unsubscribe();
    } else {
      const loadLocal = () => {
        try {
          const saved = localStorage.getItem(`guest_bookmarks_${bookId}`);
          setBookmarks(saved ? JSON.parse(saved) : []);
        } catch (e) {
          console.error(e);
        }
      };
      loadLocal();
    }
  }, [user, bookId]);

  const handleAddBookmark = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetPage = bookmarkPage.trim() || pageNum.toString();

    const newBookmark: Omit<BookmarkType, 'id'> = {
      bookId,
      bookTitle,
      page: targetPage,
      note: bookmarkNote.trim(),
      url: bookUrl,
      createdAt: new Date().toISOString()
    };

    setIsSavingBookmark(true);
    try {
      if (user) {
        const bookmarksRef = collection(db, 'users', user.uid, 'bookmarks');
        await addDoc(bookmarksRef, {
          ...newBookmark,
          createdAt: serverTimestamp()
        });
      } else {
        const saved = localStorage.getItem(`guest_bookmarks_${bookId}`);
        const items: BookmarkType[] = saved ? JSON.parse(saved) : [];
        items.push({ id: 'local_' + Date.now(), ...newBookmark });
        items.sort((a, b) => (parseInt(a.page) || 0) - (parseInt(b.page) || 0));
        localStorage.setItem(`guest_bookmarks_${bookId}`, JSON.stringify(items));
        setBookmarks(items);
      }
      setBookmarkPage('');
      setBookmarkNote('');
    } catch (error) {
      console.error(error);
      if (user) handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/bookmarks`);
    } finally {
      setIsSavingBookmark(false);
    }
  };

  const handleDeleteBookmark = async (id: string) => {
    try {
      if (user) {
        const docRef = doc(db, 'users', user.uid, 'bookmarks', id);
        await deleteDoc(docRef);
      } else {
        const saved = localStorage.getItem(`guest_bookmarks_${bookId}`);
        if (saved) {
          const items: BookmarkType[] = JSON.parse(saved);
          const filtered = items.filter(item => item.id !== id);
          localStorage.setItem(`guest_bookmarks_${bookId}`, JSON.stringify(filtered));
          setBookmarks(filtered);
        }
      }
    } catch (error) {
      console.error(error);
      if (user) handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/bookmarks/${id}`);
    }
  };

  const toggleFullscreen = async () => {
    if (!readerRef.current) return;
    try {
      if (!isImmersive) {
        if (readerRef.current.requestFullscreen) {
          await readerRef.current.requestFullscreen();
        }
        setIsImmersive(true);
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsImmersive(false);
      }
    } catch {
      setIsImmersive(!isImmersive);
    }
  };

  // Handle page navigation
  const goToNextPage = () => {
    if (pageNum < numPages) setPageNum(p => p + 1);
  };

  const goToPrevPage = () => {
    if (pageNum > 1) setPageNum(p => p - 1);
  };

  return (
    <div 
      ref={readerRef}
      className={`fixed inset-0 bg-[#0b0f19] z-50 flex flex-col transition-all duration-300 ${
        isImmersive ? 'p-0' : 'p-2 sm:p-4'
      }`}
    >
      {/* Dynamic Header */}
      <div className="w-full max-w-6xl mx-auto bg-[#131d31] text-white flex flex-col sm:flex-row justify-between items-center p-3 sm:p-4 rounded-t-xl border-b border-slate-800 shadow-md gap-3 shrink-0">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <FileText className="text-[#00a884] shrink-0" size={22} />
          <h3 className="font-bold text-sm sm:text-base truncate max-w-xs sm:max-w-md Urdu">{bookTitle}</h3>
          
          {/* Offline/Online Status Badge */}
          {isOffline ? (
            <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              آف لائن (Offline)
            </span>
          ) : (
            <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              آن لائن (Online)
            </span>
          )}
        </div>

        {/* Top Control Bar Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Real Download Button */}
          {!isOffline && (
            <button
              onClick={handleRealDownload}
              disabled={isDownloading}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                isDownloading 
                  ? 'bg-slate-800 border-slate-700 text-slate-400' 
                  : 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500'
              }`}
            >
              <Download size={14} />
              <span>{isDownloading ? `${dlProgress.percent}%` : 'ڈاؤنلوڈ (Download)'}</span>
            </button>
          )}

          {/* Bookmarks Toggle */}
          <button
            onClick={() => setShowBookmarksPanel(!showBookmarksPanel)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
              showBookmarksPanel 
                ? 'bg-[#00a884] border-[#00c298] text-white' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Bookmark size={14} />
            <span className="hidden xs:inline">بک مارکس ({bookmarks.length})</span>
          </button>

          {/* Full Screen */}
          <button
            onClick={toggleFullscreen}
            className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1.5 text-slate-200"
          >
            {isImmersive ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span className="hidden md:inline">{isImmersive ? 'Exit Full' : 'Full Screen'}</span>
          </button>

          {/* Close Button */}
          <button 
            onClick={() => {
              cancelRealDownload();
              onClose();
            }}
            className="bg-red-500 hover:bg-red-600 active:scale-95 px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
          >
            بند کریں (Close)
          </button>
        </div>
      </div>

      {/* Main Reader Stage */}
      <div className="flex-1 w-full max-w-6xl mx-auto flex overflow-hidden relative bg-[#090d16] border-x border-b border-slate-900 rounded-b-xl">
        {/* Loading Overlay */}
        {isRenderLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-20 backdrop-blur-sm">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#00a884] border-t-transparent mb-3"></div>
            <p className="text-[#00a884] text-xs font-bold Urdu tracking-wider animate-pulse">
              صفحہ رینڈر ہو رہا ہے، براہِ مہربانی انتظار کریں...
            </p>
          </div>
        )}

        {/* Real Download In Progress Modal Card */}
        {isDownloading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-40 p-4 backdrop-blur-md">
            <div className="bg-[#121c2c] border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-[#00a884] mx-auto animate-bounce">
                <Download size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white Urdu">کتاب ڈاؤنلوڈ ہو رہی ہے...</h4>
                <p className="text-xs text-slate-400">
                  Real-time direct storage save is in progress.
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${dlProgress.percent >= 0 ? dlProgress.percent : 100}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono font-bold">
                  <span>{dlProgress.loadedMB} MB / {dlProgress.totalMB !== 'unknown' ? `${dlProgress.totalMB} MB` : 'Downloading'}</span>
                  <span>{dlProgress.percent >= 0 ? `${dlProgress.percent}%` : 'In Progress'}</span>
                </div>
              </div>

              <button
                onClick={cancelRealDownload}
                className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-bold transition-all border border-red-500/20"
              >
                ڈاؤنلوڈ منسوخ کریں (Cancel)
              </button>
            </div>
          </div>
        )}

        {/* Canvas Display Viewport */}
        <div className="flex-1 h-full flex flex-col overflow-y-auto items-center p-4 scrollable-content select-none bg-[#0e1320]">
          {libError ? (
            <div className="my-auto text-center space-y-4 max-w-md p-6 bg-slate-900/60 rounded-3xl border border-slate-800">
              <AlertCircle className="mx-auto text-red-400" size={48} />
              <p className="text-sm text-slate-200 Urdu font-bold leading-relaxed">{libError}</p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors"
              >
                واپس جائیں (Go Back)
              </button>
            </div>
          ) : !pdfDoc ? (
            <div className="my-auto text-center space-y-3">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#00a884] border-t-transparent mx-auto"></div>
              <p className="text-slate-400 text-xs font-bold Urdu">دستاویز لوڈ کی جا رہی ہے...</p>
              {dlProgress.percent > 0 && (
                <p className="text-[10px] text-slate-500 font-mono">
                  Loading: {dlProgress.loadedMB}MB / {dlProgress.totalMB}MB ({dlProgress.percent}%)
                </p>
              )}
            </div>
          ) : (
            <div className="my-auto flex flex-col items-center justify-center space-y-4">
              {/* Actual Canvas */}
              <div className="shadow-2xl border border-slate-900 rounded-lg overflow-hidden bg-white max-w-full">
                <canvas ref={canvasRef} className="max-w-full h-auto block" />
              </div>

              {/* Bottom Pagination & Zoom Bar inside stage */}
              <div className="bg-[#121b2d]/95 backdrop-blur border border-slate-800/80 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-4 max-w-md w-full shadow-lg z-10 shrink-0">
                {/* Scale Zoom Controls */}
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setScale(s => Math.max(0.6, s - 0.2))}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-all active:scale-90"
                    title="Zoom Out"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <span className="text-[10px] font-mono font-bold text-slate-400 min-w-[35px] text-center">
                    {Math.round(scale * 100)}%
                  </span>
                  <button 
                    onClick={() => setScale(s => Math.min(2.5, s + 0.2))}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-all active:scale-90"
                    title="Zoom In"
                  >
                    <ZoomIn size={14} />
                  </button>
                </div>

                {/* Page Navigation */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={goToPrevPage}
                    disabled={pageNum <= 1}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-slate-300 transition-all active:scale-90"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  <div className="flex items-center gap-1 text-xs">
                    <input 
                      type="number"
                      value={pageNum}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val >= 1 && val <= numPages) setPageNum(val);
                      }}
                      className="w-12 bg-slate-900 text-white border border-slate-800 rounded px-1.5 py-0.5 text-center font-bold font-mono outline-none focus:border-[#00a884]"
                      min="1"
                      max={numPages}
                    />
                    <span className="text-slate-400">/</span>
                    <span className="text-slate-300 font-mono font-semibold">{numPages}</span>
                  </div>

                  <button 
                    onClick={goToNextPage}
                    disabled={pageNum >= numPages}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-slate-300 transition-all active:scale-90"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bookmarks Drawer */}
        {showBookmarksPanel && (
          <div className="w-full sm:w-80 bg-[#101726] border-l border-slate-900 h-full flex flex-col z-30 absolute sm:relative right-0 top-0 shadow-2xl shrink-0">
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-[#0a0f1a]">
              <div className="flex items-center gap-2">
                <Bookmark className="text-[#00a884]" size={18} />
                <h4 className="font-bold text-sm text-slate-100 Urdu">بک مارکس (Bookmarks)</h4>
              </div>
              <button 
                onClick={() => setShowBookmarksPanel(false)}
                className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-slate-200">
              {/* Add Bookmark Form */}
              <form onSubmit={handleAddBookmark} className="space-y-3 bg-[#0a0f1a] p-3.5 rounded-2xl border border-slate-800/60 shadow-md">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">نیا بک مارک (Add Bookmark)</p>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 Urdu">صفحہ نمبر (Page Number)</label>
                  <input 
                    type="number"
                    placeholder={`مثال: ${pageNum}`}
                    value={bookmarkPage}
                    onChange={(e) => setBookmarkPage(e.target.value)}
                    className="w-full bg-[#111827] border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:border-[#00a884] outline-none font-mono"
                    min="1"
                    max={numPages || 9999}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 Urdu">تفصیل / باب (Title or Note)</label>
                  <input 
                    type="text"
                    placeholder="مثال: باب اول، اہم بات..."
                    value={bookmarkNote}
                    onChange={(e) => setBookmarkNote(e.target.value)}
                    className="w-full bg-[#111827] border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:border-[#00a884] outline-none Urdu text-right"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isSavingBookmark}
                  className="w-full bg-[#00a884] hover:bg-[#008d6f] disabled:opacity-40 text-white rounded-xl py-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow"
                >
                  <Save size={14} />
                  <span>محفوظ کریں (Save)</span>
                </button>
              </form>

              {/* Bookmarks List */}
              <div className="space-y-3">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">محفوظ بک مارکس ({bookmarks.length})</p>
                
                {bookmarks.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500 italic">
                    کوئی بک مارک محفوظ نہیں ہے۔
                  </div>
                ) : (
                  <div className="space-y-2">
                    {bookmarks.map((b) => (
                      <div 
                        key={b.id}
                        className="bg-[#0a0f1a] border border-slate-800/60 p-2.5 rounded-2xl flex items-start justify-between gap-2 hover:border-slate-700 transition-all group"
                      >
                        <button 
                          onClick={() => setPageNum(parseInt(b.page) || 1)}
                          className="flex-1 text-left text-xs space-y-1 hover:text-[#00a884] transition-all"
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="bg-[#00a884]/15 text-[#00a884] px-1.5 py-0.5 rounded text-[9px] font-mono font-bold">
                              Page {b.page}
                            </span>
                            {b.note && <span className="font-semibold Urdu text-slate-300 break-all">{b.note}</span>}
                          </div>
                        </button>
                        
                        <button 
                          onClick={() => handleDeleteBookmark(b.id!)}
                          className="p-1 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-all shrink-0 cursor-pointer"
                          title="حذف کریں"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
