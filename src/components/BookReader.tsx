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
  AlertCircle,
  Scroll,
  BookOpen,
  Search,
  Layers,
  ArrowLeft
} from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, query, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../firebaseError';
import { getPDF, storePDF } from '../utils/pdfStorage';
import { downloadBlobWithFileSystemAccess } from '../utils/StorageManager';
import { resolveApiUrl, cn } from '../utils';
import { triggerDownloadWithAd } from './AdsterraAds';

// Helper to dynamically load a script from CDN
const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement;
    if (existingScript) {
      if ((window as any).pdfjsLib) {
        resolve();
        return;
      }
      const handleLoad = () => {
        cleanup();
        resolve();
      };
      const handleError = (err: any) => {
        cleanup();
        reject(err);
      };
      const cleanup = () => {
        existingScript.removeEventListener('load', handleLoad);
        existingScript.removeEventListener('error', handleError);
      };
      existingScript.addEventListener('load', handleLoad);
      existingScript.addEventListener('error', handleError);
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
};

interface PDFPageRendererProps {
  key?: React.Key;
  pdfDoc: any;
  pageNum: number;
  scale: number;
  onVisible: (page: number) => void;
}

function PDFPageRenderer({ pdfDoc, pageNum, scale, onVisible }: PDFPageRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting) {
          onVisible(pageNum);
        }
      },
      {
        root: null,
        rootMargin: '250px 0px 250px 0px',
        threshold: 0.1,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [pageNum, onVisible]);

  useEffect(() => {
    if (!pdfDoc || !isVisible) return;

    let isMounted = true;
    const renderPage = async () => {
      setLoading(true);
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;

        if (canvas && isMounted) {
          const context = canvas.getContext('2d');
          if (context) {
            const pixelRatio = window.devicePixelRatio || 1;
            canvas.width = Math.floor(viewport.width * pixelRatio);
            canvas.height = Math.floor(viewport.height * pixelRatio);
            canvas.style.width = `100%`;
            canvas.style.height = `auto`;

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
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    renderPage();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdfDoc, pageNum, scale, isVisible]);

  return (
    <div 
      ref={containerRef} 
      id={`reader-page-${pageNum}`}
      className="relative flex flex-col items-center justify-center p-0 bg-[#0e1320] w-full"
      style={{ minHeight: `${600 * scale}px` }}
    >
      <div className="absolute top-2 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-full text-[10px] text-slate-300 font-semibold z-10 select-none shadow">
        صفحہ {pageNum}
      </div>
      
      <div className="shadow-2xl bg-white w-full flex justify-center">
        <canvas ref={canvasRef} className="w-full h-auto block" />
      </div>

      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px] z-10 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#00a884] border-t-transparent mb-2"></div>
          <span className="text-[10px] text-slate-300 font-bold font-sans">لوڈ ہو رہا ہے...</span>
        </div>
      )}
    </div>
  );
}

interface PDFPagePlaceholderProps {
  key?: React.Key;
  pageNum: number;
  scale: number;
  onVisible: (page: number) => void;
  id: string;
}

function PDFPagePlaceholder({ pageNum, scale, onVisible, id }: PDFPagePlaceholderProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onVisible(pageNum);
        }
      },
      {
        root: null,
        rootMargin: '350px 0px 350px 0px',
        threshold: 0.05,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [pageNum, onVisible]);

  return (
    <div
      ref={containerRef}
      id={id}
      className="w-full bg-[#0e1320] flex items-center justify-center relative"
      style={{ minHeight: `${600 * scale}px` }}
    >
      <div className="absolute top-2 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-full text-[10px] text-slate-500 font-semibold z-10 select-none shadow">
        صفحہ {pageNum} (لوڈ ہو رہا ہے...)
      </div>
      <div className="animate-pulse flex flex-col items-center gap-2">
        <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-slate-600 animate-spin" />
      </div>
    </div>
  );
}

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
  pageOffset?: number;
}

export default function BookReader({ bookId, bookTitle, bookUrl, onClose, onCached, pageOffset = 0 }: BookReaderProps) {
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
  const [isScrollMode, setIsScrollMode] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const touchStartYRef = useRef<number | null>(null);

  // Auto-hide controls logic
  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 5000); // Hide after 5 seconds
  };

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // Search & Resume States
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [readerSearchQuery, setReaderSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ pageNum: number; text: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [resumeNotice, setResumeNotice] = useState<string | null>(null);

  const { user } = useAuth();
  const readerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const touchStartRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.changedTouches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    resetControlsTimer();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartYRef.current !== null) {
      const deltaY = touchStartYRef.current - e.touches[0].clientY;
      if (deltaY > 50) { // Swipe Up
        setShowControls(true);
        resetControlsTimer();
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchStartYRef.current = null;
    if (isScrollMode) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStartRef.current - touchEnd;
    
    // Swipe sensitivity threshold
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // Swiped Left - Next Page
        goToNextPage();
      } else {
        // Swiped Right - Prev Page
        goToPrevPage();
      }
    }
  };

  // 1. Load PDF.js from CDN
  useEffect(() => {
    const initPdfJs = async () => {
      try {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
        
        // Safety polling to make sure the library is fully compiled and loaded into window space
        let retries = 0;
        while (!(window as any).pdfjsLib && retries < 30) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          retries++;
        }

        const pdfjsLib = (window as any).pdfjsLib;
        if (pdfjsLib) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          setIsLibLoaded(true);
        } else {
          throw new Error("pdfjsLib not defined on window after script load");
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
          const isDirectHost = bookUrl.includes('quran.com') || bookUrl.includes('qurancdn.com');
          const proxyUrl = isDirectHost ? bookUrl : resolveApiUrl(`/api/pdf-proxy?url=${encodeURIComponent(bookUrl)}`);
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
        
        let initialPage = 1;
        try {
          const savedProgress = localStorage.getItem(`book_progress_${bookId}`);
          if (savedProgress) {
            const parsed = JSON.parse(savedProgress);
            if (parsed && typeof parsed.page === 'number' && parsed.page >= 1 && parsed.page <= doc.numPages) {
              initialPage = parsed.page;
              setResumeNotice(`آخری بار پڑھے گئے صفحہ ${initialPage} سے دوبارہ شروع کیا گیا ہے`);
              setTimeout(() => {
                setResumeNotice(null);
              }, 4000);
            }
          }
        } catch (e) {
          console.warn("Failed to retrieve book progress from localstorage", e);
        }
        setPageNum(initialPage);
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

  // Save reading progress & recently read metadata
  useEffect(() => {
    if (!bookId || pageNum < 1 || numPages < 1) return;
    
    const saveProgress = () => {
      try {
        localStorage.setItem(`book_progress_${bookId}`, JSON.stringify({
          page: pageNum,
          updatedAt: Date.now()
        }));

        // Update recently read list
        const recentsRaw = localStorage.getItem('recently_read_books');
        let recents: any[] = [];
        if (recentsRaw) {
          try {
            recents = JSON.parse(recentsRaw);
          } catch {
            recents = [];
          }
        }

        // Remove existing if any
        recents = recents.filter((item: any) => item.bookId !== bookId);

        // Add to the front
        recents.unshift({
          bookId,
          bookTitle,
          bookUrl,
          lastReadPage: pageNum,
          numPages,
          updatedAt: Date.now()
        });

        // Limit to top 10
        recents = recents.slice(0, 10);

        localStorage.setItem('recently_read_books', JSON.stringify(recents));
      } catch (e) {
        console.warn("Error saving recently read books:", e);
      }
    };

    const timer = setTimeout(saveProgress, 500);
    return () => clearTimeout(timer);
  }, [bookId, pageNum, numPages, bookTitle, bookUrl]);

  // PDF Text Search function
  const handlePdfSearch = async (queryStr: string) => {
    if (!queryStr.trim() || !pdfDoc) return;
    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);

    const results: { pageNum: number; text: string }[] = [];
    const limitResults = 50;

    try {
      for (let p = 1; p <= pdfDoc.numPages; p++) {
        const page = await pdfDoc.getPage(p);
        const textContent = await page.getTextContent();
        const textItems = textContent?.items ? textContent.items.map((item: any) => (item?.str || '')).join(' ') : '';
        const lowercaseTextItems = textItems ? textItems.toLowerCase() : '';
        const lowercaseQueryStr = queryStr ? queryStr.toLowerCase() : '';
        
        if (lowercaseTextItems && lowercaseQueryStr && lowercaseTextItems.includes(lowercaseQueryStr)) {
          const index = lowercaseTextItems.indexOf(lowercaseQueryStr);
          const start = Math.max(0, index - 30);
          const end = Math.min(textItems.length, index + queryStr.length + 30);
          let snippet = textItems.substring(start, end).trim();
          if (start > 0) snippet = '...' + snippet;
          if (end < textItems.length) snippet = snippet + '...';

          results.push({
            pageNum: p,
            text: snippet
          });

          if (results.length >= limitResults) {
            break;
          }
        }
      }
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError("کوئی مماثلت نہیں ملی (No matches found)");
      }
    } catch (err) {
      console.error("Error searching PDF:", err);
      setSearchError("سرچ کرنے میں کوئی خرابی پیش آئی ہے۔");
    } finally {
      setIsSearching(false);
    }
  };

  // 3. Render Page onto Canvas (High-DPI supported)
  useEffect(() => {
    if (!pdfDoc || isScrollMode) return;

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

    const proxyUrl = resolveApiUrl(`/api/pdf-proxy?url=${encodeURIComponent(bookUrl)}`);
    
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
      // Check if we got HTML instead of a PDF (e.g. from an auth wall or 302 redirect)
      const contentType = xhr.getResponseHeader('Content-Type') || '';
      if (xhr.status === 200 && !contentType.includes('text/html')) {
        try {
          const blob = xhr.response;
          // Store PDF Blob in IndexedDB
          await storePDF(bookUrl, blob);
          
          // Save to user selected location
          const fileName = bookTitle ? `${bookTitle}.pdf` : 'book.pdf';
          await downloadBlobWithFileSystemAccess(blob, fileName);

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
        console.warn("Proxy or download failed.");
        alert("نیٹ ورک کا مسئلہ پیش آیا۔ ڈاؤنلوڈ کرنے میں ناکامی ہوئی۔");
        setIsDownloading(false);
      }
    };

    xhr.onerror = () => {
      console.warn("Network error during XHR.");
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

  const scrollToPage = (p: number) => {
    const el = document.getElementById(`reader-page-${p}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handle page navigation
  const goToNextPage = () => {
    if (pageNum < numPages) {
      const next = pageNum + 1;
      setPageNum(next);
      if (isScrollMode) {
        scrollToPage(next);
      }
    }
  };

  const goToPrevPage = () => {
    if (pageNum > 1) {
      const prev = pageNum - 1;
      setPageNum(prev);
      if (isScrollMode) {
        scrollToPage(prev);
      }
    }
  };

  return (
    <div 
      ref={readerRef}
      className={`fixed inset-0 bg-[#0b0f19] z-50 flex flex-col transition-all duration-300 ${
        isImmersive ? 'p-0' : 'p-2 sm:p-4'
      }`}
      onClick={resetControlsTimer}
      onMouseMove={resetControlsTimer}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Dynamic Header */}
      <div className={cn(
        "w-full max-w-6xl mx-auto bg-[#131d31] text-white flex flex-row justify-between items-center p-1.5 sm:p-2 rounded-t-xl border-b border-slate-800 shadow-md gap-1.5 shrink-0 transition-all duration-500",
        !showControls && "opacity-0 -translate-y-full pointer-events-none"
      )}>
        <div className="flex items-center gap-1 sm:gap-2">
          <button 
            onClick={() => {
              cancelRealDownload();
              onClose();
            }}
            className="p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div className="overflow-hidden">
            <h3 className="font-bold text-[11px] sm:text-sm truncate Urdu leading-none">{bookTitle}</h3>
            
            <div className="flex items-center gap-1 mt-0.5">
              {pageOffset > 0 && (
                <span className="text-[8px] bg-[#00a884]/25 text-white px-1 py-0.5 rounded font-mono font-bold leading-none">
                  PAGE: {Math.max(1, pageNum - pageOffset)}
                </span>
              )}
              <span className="text-[8px] bg-white/10 text-white/90 px-1 py-0.5 rounded font-mono leading-none">
                PDF: {pageNum}/{numPages || '...'}
              </span>
            </div>
          </div>
        </div>

        {/* Top Control Bar Buttons */}
        <div className="flex flex-row items-center gap-1 sm:gap-1.5 w-auto justify-end shrink-0">
          {/* Index Button (Opens Bookmarks) */}
          <button
            onClick={() => {
              setShowBookmarksPanel(!showBookmarksPanel);
              setShowSearchPanel(false);
            }}
            className={cn(
              "px-1.5 sm:px-2.5 py-1 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer border",
              showBookmarksPanel 
                ? "bg-[#00a884] border-[#00c298] text-white" 
                : "bg-white/10 hover:bg-white/20 border-white/10 text-white"
            )}
          >
            <Layers size={12} className="text-white" />
            <span className="Urdu">فہرست</span>
          </button>

          {/* Search Toggle */}
          <button
            onClick={() => {
              setShowSearchPanel(!showSearchPanel);
              setShowBookmarksPanel(false);
            }}
            className={cn(
              "p-1.5 rounded-lg transition-all border",
              showSearchPanel 
                ? "bg-[#00a884] border-[#00c298] text-white" 
                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
            )}
            title="Search"
          >
            <Search size={14} />
          </button>

          {/* Delete Button (System logic) */}
          <button
            onClick={() => {
              if (window.confirm("کیا آپ اس کتاب کو لائبریری سے ختم (Hide) کرنا چاہتے ہیں؟")) {
                const deleted = JSON.parse(localStorage.getItem('deleted_system_books') || '[]');
                if (!deleted.includes(bookId)) {
                  deleted.push(bookId);
                  localStorage.setItem('deleted_system_books', JSON.stringify(deleted));
                  window.dispatchEvent(new Event('storage'));
                }
                onClose();
              }
            }}
            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 transition-all"
            title="Hide this book"
          >
            <Trash2 size={14} />
          </button>

          {/* Real Download Button */}
          {!isOffline && (
            <button
              onClick={() => triggerDownloadWithAd(bookTitle || "Islamic Book", handleRealDownload)}
              disabled={isDownloading}
              className="p-2 bg-emerald-600 border border-emerald-500 text-white hover:bg-emerald-500 rounded-lg disabled:bg-slate-800 disabled:border-slate-700 disabled:text-slate-400 transition-all"
              title="Download"
            >
              <Download size={16} />
            </button>
          )}

          {/* Full Screen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 hidden sm:block"
            title="Fullscreen"
          >
            {isImmersive ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Main Reader Stage */}
      <div className="flex-1 w-full flex overflow-hidden relative bg-[#090d16] border-b border-slate-900 rounded-b-xl">
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

        {/* Canvas Display Viewport - Edge-to-Edge */}
        <div 
          className="flex-1 h-full flex flex-col overflow-y-auto items-center scrollable-content select-none bg-[#0e1320] relative scrollbar-hide"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={(e) => {
            touchStartRef.current = e.clientX;
          }}
          onMouseUp={(e) => {
            if (isScrollMode) return;
            const diff = touchStartRef.current - e.clientX;
            if (Math.abs(diff) > 50) {
              if (diff > 0) goToNextPage();
              else goToPrevPage();
            }
          }}
          onWheel={(e) => {
            if (isScrollMode) return;
            if (Math.abs(e.deltaY) > 30) {
              if (e.deltaY > 0) goToNextPage();
              else goToPrevPage();
            }
          }}
        >
          {resumeNotice && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#00a884]/95 border border-[#00c298]/30 backdrop-blur text-white px-4 py-2 rounded-2xl shadow-xl z-30 text-xs font-semibold Urdu flex items-center gap-2 animate-bounce">
              <CheckCircle size={14} className="text-white shrink-0" />
              <span>{resumeNotice}</span>
            </div>
          )}
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
            <>
               {isScrollMode ? (
                <div className="w-full flex flex-col items-center gap-2 py-0">
                  {Array.from({ length: numPages }, (_, index) => {
                    const targetPageNum = index + 1;
                    const isNear = Math.abs(targetPageNum - pageNum) <= 5;
                    return isNear ? (
                      <PDFPageRenderer
                        key={targetPageNum}
                        pdfDoc={pdfDoc}
                        pageNum={targetPageNum}
                        scale={scale}
                        onVisible={(p) => setPageNum(p)}
                      />
                    ) : (
                      <PDFPagePlaceholder
                        key={targetPageNum}
                        pageNum={targetPageNum}
                        scale={scale}
                        onVisible={(p) => setPageNum(p)}
                        id={`reader-page-${targetPageNum}`}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="flex-1 w-full min-h-full flex flex-col items-center justify-center p-2 sm:p-4">
                  <div className="shadow-2xl bg-white m-auto rounded-2xl overflow-hidden flex items-center justify-center max-w-full">
                    <canvas ref={canvasRef} className="max-w-full h-auto block" />
                  </div>
                </div>
              )}

              {/* BOTTOM FLOATING CONTROL MODULE - Ultra Compact */}
              <div className={cn(
                "fixed sm:absolute bottom-10 left-1/2 -translate-x-1/2 bg-[#121b2d]/95 backdrop-blur border border-slate-800/80 rounded-2xl px-2.5 py-1.5 flex items-center justify-center gap-2.5 w-max max-w-[95vw] shadow-2xl z-20 select-none transition-all duration-500",
                !showControls && "opacity-0 translate-y-20 pointer-events-none"
              )}>
                {/* Prev/Next Navigation */}
                <div className="flex items-center gap-1">
                  <button 
                    onClick={goToPrevPage}
                    disabled={pageNum <= 1}
                    className="p-1.5 bg-slate-800 hover:bg-slate-750 disabled:opacity-30 rounded-xl text-white transition-all cursor-pointer shadow active:scale-90"
                  >
                    <ChevronRight size={14} />
                  </button>
                  <div className="bg-slate-900/40 border border-white/5 rounded-lg px-2 py-1 flex flex-col items-center min-w-[55px]">
                    <span className="text-[7px] text-slate-500 font-mono font-bold leading-none uppercase">Page</span>
                    <span className="text-[10px] font-black font-mono text-white mt-0.5 leading-none">{pageNum} / {numPages}</span>
                  </div>
                  <button 
                    onClick={goToNextPage}
                    disabled={pageNum >= numPages}
                    className="p-1.5 bg-slate-800 hover:bg-slate-750 disabled:opacity-30 rounded-xl text-white transition-all cursor-pointer shadow active:scale-90"
                  >
                    <ChevronLeft size={14} />
                  </button>
                </div>

                <div className="h-4 w-[1px] bg-slate-800" />

                {/* Zoom Controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setScale(s => Math.max(0.6, s - 0.2))}
                    className="p-1 bg-slate-800 hover:bg-slate-750 rounded-lg text-slate-300 transition-all cursor-pointer"
                  >
                    <ZoomOut size={12} />
                  </button>
                  <span className="text-[8px] text-slate-400 font-mono font-bold text-center min-w-[24px]">
                    {Math.round(scale * 100)}%
                  </span>
                  <button
                    onClick={() => setScale(s => Math.min(2.5, s + 0.2))}
                    className="p-1 bg-slate-800 hover:bg-slate-750 rounded-lg text-slate-300 transition-all cursor-pointer"
                  >
                    <ZoomIn size={12} />
                  </button>
                </div>

                <div className="h-4 w-[1px] bg-slate-800" />

                {/* Scroll Mode Toggle */}
                <button
                  onClick={() => setIsScrollMode(!isScrollMode)}
                  className={cn(
                    "p-1.5 rounded-lg flex items-center gap-1 text-[9px] font-black border transition-all cursor-pointer",
                    isScrollMode 
                      ? 'bg-[#00a884]/20 border-[#00c298]/30 text-[#00c298]' 
                      : 'bg-slate-800 border-slate-700 text-slate-200'
                  )}
                  title={isScrollMode ? "Single Page" : "Continuous Scroll"}
                >
                  <Scroll size={12} />
                  <span className="Urdu hidden xs:inline">سکرول</span>
                </button>
              </div>
            </>
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

        {/* Search Drawer */}
        {showSearchPanel && (
          <div className="w-full sm:w-80 bg-[#101726] border-l border-slate-900 h-full flex flex-col z-30 absolute sm:relative right-0 top-0 shadow-2xl shrink-0">
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-[#0a0f1a]">
              <div className="flex items-center gap-2">
                <Search className="text-[#00a884]" size={18} />
                <h4 className="font-bold text-sm text-slate-100 Urdu">کتاب میں تلاش (Search in Book)</h4>
              </div>
              <button 
                onClick={() => setShowSearchPanel(false)}
                className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-slate-200">
              {/* Search Form */}
              <div className="space-y-3 bg-[#0a0f1a] p-3.5 rounded-2xl border border-slate-800/60 shadow-md">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">الفاظ تلاش کریں (Find Specific Text)</p>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="کوشش کریں: نماز، حدیث، روزه..."
                    value={readerSearchQuery}
                    onChange={(e) => setReaderSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handlePdfSearch(readerSearchQuery);
                      }
                    }}
                    className="flex-1 bg-[#111827] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:border-[#00a884] outline-none Urdu text-right"
                  />
                  <button
                    onClick={() => handlePdfSearch(readerSearchQuery)}
                    disabled={isSearching}
                    className="bg-[#00a884] hover:bg-[#008d6f] disabled:opacity-40 text-white rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center justify-center cursor-pointer shadow"
                  >
                    {isSearching ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                      <Search size={14} />
                    )}
                  </button>
                </div>
              </div>

              {/* Search Results List */}
              <div className="space-y-3">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">تلاش کے نتائج (Results: {searchResults.length})</p>
                
                {isSearching && (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#00a884] border-t-transparent"></div>
                    <span className="text-[10px] Urdu">صفحات میں تلاش جاری ہے...</span>
                  </div>
                )}

                {!isSearching && searchError && (
                  <div className="text-center py-8 text-xs text-amber-500/90 Urdu">
                    {searchError}
                  </div>
                )}

                {!isSearching && searchResults.length === 0 && !searchError && (
                  <div className="text-center py-8 text-xs text-slate-500 italic Urdu">
                    تلاش کرنے کے لیے اوپر الفاظ لکھیں۔
                  </div>
                )}

                {!isSearching && searchResults.length > 0 && (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {searchResults.map((res, idx) => (
                      <button 
                        key={idx}
                        onClick={() => {
                          setPageNum(res.pageNum);
                          if (isScrollMode) {
                            scrollToPage(res.pageNum);
                          }
                        }}
                        className="w-full text-right bg-[#0a0f1a] border border-slate-800/60 p-2.5 rounded-2xl flex flex-col gap-1.5 hover:border-slate-700 transition-all text-xs"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="bg-[#00a884]/15 text-[#00a884] px-1.5 py-0.5 rounded text-[9px] font-mono font-bold">
                            Page {res.pageNum}
                          </span>
                        </div>
                        <p className="text-slate-300 text-right Urdu font-light leading-relaxed text-[11px] break-all w-full select-none">
                          {res.text}
                        </p>
                      </button>
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
