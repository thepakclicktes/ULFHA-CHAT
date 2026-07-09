import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Search, 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  CheckCircle,
  FileText,
  AlertCircle,
  Scroll,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  X,
  Compass,
  RefreshCw,
  Settings,
  Layers,
  HelpCircle
} from 'lucide-react';
import { cn, resolveApiUrl } from '../utils';
import { getPDF, storePDF } from '../utils/pdfStorage';
import { downloadBlobWithFileSystemAccess } from '../utils/StorageManager';

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
      id={`quran-page-${pageNum}`}
      className="relative flex flex-col items-center justify-center p-4 bg-[#0e1320] min-w-full"
      style={{ minHeight: `${600 * scale}px` }}
    >
      <div className="absolute top-2 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-full text-[10px] text-slate-300 font-semibold z-10 select-none shadow">
        صفحہ {pageNum}
      </div>
      
      <div className="shadow-2xl border border-slate-900/60 rounded-lg overflow-hidden bg-white max-w-full">
        <canvas ref={canvasRef} className="max-w-full h-auto block" />
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

// Complete 114 Surah Start Pages in Pakistani 16 Lines Taj Company Print (Total 611 pages)
const SURAH_INDEX = [
  { id: 1, name: "Al-Fatihah", arabic: "الفاتحة", urdu: "سورۃ الفاتحہ", page: 2 },
  { id: 2, name: "Al-Baqarah", arabic: "البقرة", urdu: "سورۃ البقرہ", page: 2 },
  { id: 3, name: "Ali 'Imran", arabic: "آل عمران", urdu: "سورۃ آل عمران", page: 50 },
  { id: 4, name: "An-Nisa", arabic: "النساء", urdu: "سورۃ النساء", page: 78 },
  { id: 5, name: "Al-Ma'idah", arabic: "المائدة", urdu: "سورۃ المائدہ", page: 108 },
  { id: 6, name: "Al-An'am", arabic: "الأنعام", urdu: "سورۃ الانعام", page: 134 },
  { id: 7, name: "Al-A'raf", arabic: "الأعراف", urdu: "سورۃ الاعراف", page: 160 },
  { id: 8, name: "Al-Anfal", arabic: "الأنفال", urdu: "سورۃ الانفال", page: 189 },
  { id: 9, name: "At-Tawbah", arabic: "التوبة", urdu: "سورۃ التوبہ", page: 197 },
  { id: 10, name: "Yunus", arabic: "يونس", urdu: "سورۃ یونس", page: 213 },
  { id: 11, name: "Hud", arabic: "هود", urdu: "سورۃ ہود", page: 226 },
  { id: 12, name: "Yusuf", arabic: "يوسف", urdu: "سورۃ یوسف", page: 240 },
  { id: 13, name: "Ar-Ra'd", arabic: "الرعد", urdu: "سورۃ الرعد", page: 254 },
  { id: 14, name: "Ibrahim", arabic: "إبراهيم", urdu: "سورۃ ابراہیم", page: 260 },
  { id: 15, name: "Al-Hijr", arabic: "الحجر", urdu: "سورۃ الحجر", page: 266 },
  { id: 16, name: "An-Nahl", arabic: "النحل", urdu: "سورۃ النحل", page: 272 },
  { id: 17, name: "Al-Isra", arabic: "الإسراء", urdu: "سورۃ الاسراء", page: 286 },
  { id: 18, name: "Al-Kahf", arabic: "الكهف", urdu: "سورۃ الکہف", page: 298 },
  { id: 19, name: "Maryam", arabic: "مريم", urdu: "سورۃ مریم", page: 311 },
  { id: 20, name: "Ta-Ha", arabic: "طه", urdu: "سورۃ طہ", page: 319 },
  { id: 21, name: "Al-Anbiya", arabic: "الأنبياء", urdu: "سورۃ الانبیاء", page: 329 },
  { id: 22, name: "Al-Hajj", arabic: "الحج", urdu: "سورۃ الحج", page: 339 },
  { id: 23, name: "Al-Mu'minun", arabic: "المؤمنون", urdu: "سورۃ المؤمنون", page: 350 },
  { id: 24, name: "An-Nur", arabic: "النور", urdu: "سورۃ النور", page: 359 },
  { id: 25, name: "Al-Furqan", arabic: "الفرقان", urdu: "سورۃ الفرقان", page: 370 },
  { id: 26, name: "Ash-Shu'ara", arabic: "الشعراء", urdu: "سورۃ الشعراء", page: 377 },
  { id: 27, name: "An-Naml", arabic: "النمل", urdu: "سورۃ النمل", page: 388 },
  { id: 28, name: "Al-Qasas", arabic: "القصص", urdu: "سورۃ القصص", page: 398 },
  { id: 29, name: "Al-'Ankabut", arabic: "العنكبوت", urdu: "سورۃ العنکبوت", page: 410 },
  { id: 30, name: "Ar-Rum", arabic: "الروم", urdu: "سورۃ الروم", page: 419 },
  { id: 31, name: "Luqman", arabic: "لقمان", urdu: "سورۃ لقمان", page: 426 },
  { id: 32, name: "As-Sajdah", arabic: "السجدة", urdu: "سورۃ السجدہ", page: 431 },
  { id: 33, name: "Al-Ahzab", arabic: "الأحزاب", urdu: "سورۃ الاحزاب", page: 434 },
  { id: 34, name: "Saba", arabic: "سبأ", urdu: "سورۃ سبا", page: 446 },
  { id: 35, name: "Fatir", arabic: "فاطر", urdu: "سورۃ فاطر", page: 453 },
  { id: 36, name: "Ya-Sin", arabic: "يس", urdu: "سورۃ یٰسین", page: 460 },
  { id: 37, name: "As-Saffat", arabic: "الصافات", urdu: "سورۃ الصافات", page: 467 },
  { id: 38, name: "Sad", arabic: "ص", urdu: "سورۃ ص", page: 475 },
  { id: 39, name: "Az-Zumar", arabic: "الزمر", urdu: "سورۃ الزمر", page: 482 },
  { id: 40, name: "Ghafir", arabic: "غافر", urdu: "سورۃ غافر", page: 492 },
  { id: 41, name: "Fussilat", arabic: "فصلت", urdu: "سورۃ فصلت", page: 501 },
  { id: 42, name: "Ash-Shura", arabic: "الشورى", urdu: "سورۃ الشوریٰ", page: 508 },
  { id: 43, name: "Az-Zukhruf", arabic: "الزخرف", urdu: "سورۃ الزخرف", page: 515 },
  { id: 44, name: "Ad-Dukhan", arabic: "الدخان", urdu: "سورۃ الدخان", page: 522 },
  { id: 45, name: "Al-Jathiyah", arabic: "الجاثية", urdu: "سورۃ الجاثیہ", page: 526 },
  { id: 46, name: "Al-Ahqaf", arabic: "الأحقاف", urdu: "سورۃ الاحقاف", page: 530 },
  { id: 47, name: "Muhammad", arabic: "محمد", urdu: "سورۃ محمد", page: 536 },
  { id: 48, name: "Al-Fath", arabic: "الفتح", urdu: "سورۃ الفتح", page: 541 },
  { id: 49, name: "Al-Hujurat", arabic: "الحجرات", urdu: "سورۃ الحجرات", page: 546 },
  { id: 50, name: "Qaf", arabic: "ق", urdu: "سورۃ ق", page: 549 },
  { id: 51, name: "Adh-Dhariyat", arabic: "الذاريات", urdu: "سورۃ الذاریات", page: 552 },
  { id: 52, name: "At-Tur", arabic: "الطور", urdu: "سورۃ الطور", page: 556 },
  { id: 53, name: "An-Najm", arabic: "النجم", urdu: "سورۃ النجم", page: 558 },
  { id: 54, name: "Al-Qamar", arabic: "القمر", urdu: "سورۃ القمر", page: 561 },
  { id: 55, name: "Ar-Rahman", arabic: "الرحمن", urdu: "سورۃ الرحمن", page: 564 },
  { id: 56, name: "Al-Waqi'ah", arabic: "الواقعة", urdu: "سورۃ الواقعہ", page: 567 },
  { id: 57, name: "Al-Hadid", arabic: "الحديد", urdu: "سورۃ الحدید", page: 570 },
  { id: 58, name: "Al-Mujadilah", arabic: "المجادلة", urdu: "سورۃ المجادلہ", page: 575 },
  { id: 59, name: "Al-Hashr", arabic: "الحشر", urdu: "سورۃ الحشر", page: 578 },
  { id: 60, name: "Al-Mumtahanah", arabic: "الممتحنة", urdu: "سورۃ الممتحنہ", page: 582 },
  { id: 61, name: "As-Saff", arabic: "الصف", urdu: "سورۃ الصف", page: 585 },
  { id: 62, name: "Al-Jumu'ah", arabic: "الجمعة", urdu: "سورۃ الجمعہ", page: 587 },
  { id: 63, name: "Al-Munafiqun", arabic: "المنافقون", urdu: "سورۃ المنافقون", page: 588 },
  { id: 64, name: "At-Taghabun", arabic: "التغابن", urdu: "سورۃ التغابن", page: 590 },
  { id: 65, name: "At-Talaq", arabic: "الطلاق", urdu: "سورۃ الطلاق", page: 592 },
  { id: 66, name: "At-Tahrim", arabic: "التحريم", urdu: "سورۃ التحریم", page: 594 },
  { id: 67, name: "Al-Mulk", arabic: "الملك", urdu: "سورۃ الملک", page: 596 },
  { id: 68, name: "Al-Qalam", arabic: "القلم", urdu: "سورۃ القلم", page: 598 },
  { id: 69, name: "Al-Haqqah", arabic: "الحاقة", urdu: "سورۃ الحاقہ", page: 601 },
  { id: 70, name: "Al-Ma'arij", arabic: "المعارج", urdu: "سورۃ المعارج", page: 603 },
  { id: 71, name: "Nuh", arabic: "نوح", urdu: "سورۃ نوح", page: 605 },
  { id: 72, name: "Al-Jinn", arabic: "الجن", urdu: "سورۃ الجن", page: 607 },
  { id: 73, name: "Al-Muzzammil", arabic: "المزمل", urdu: "سورۃ المزمل", page: 609 },
  { id: 74, name: "Al-Muddaththir", arabic: "المدثر", urdu: "سورۃ المدثر", page: 611 },
  { id: 75, name: "Al-Qiyamah", arabic: "القيامة", urdu: "سورۃ القیامہ", page: 613 },
  { id: 76, name: "Al-Insan", arabic: "الإنسان", urdu: "سورۃ الانسان", page: 615 },
  { id: 77, name: "Al-Mursalat", arabic: "المرسلات", urdu: "سورۃ المرسلات", page: 617 },
  { id: 78, name: "An-Naba", arabic: "النبأ", urdu: "سورۃ النبا", page: 619 },
  { id: 79, name: "An-Nazi'at", arabic: "النازعات", urdu: "سورۃ النازعات", page: 621 },
  { id: 80, name: "'Abasa", arabic: "عبس", urdu: "سورۃ عبس", page: 623 },
  { id: 81, name: "At-Takwir", arabic: "التكوير", urdu: "سورۃ التکویر", page: 625 },
  { id: 82, name: "Al-Infitar", arabic: "الانفطار", urdu: "سورۃ الانفطار", page: 626 },
  { id: 83, name: "Al-Mutaffifin", arabic: "المطففين", urdu: "سورۃ المطففین", page: 627 },
  { id: 84, name: "Al-Inshiqaq", arabic: "الانشقاق", urdu: "سورۃ الانشقاق", page: 629 },
  { id: 85, name: "Al-Buruj", arabic: "البروج", urdu: "سورۃ البروج", page: 630 },
  { id: 86, name: "At-Tariq", arabic: "الطارق", urdu: "سورۃ الطارق", page: 631 },
  { id: 87, name: "Al-A'la", arabic: "الأعلى", urdu: "سورۃ الاعلیٰ", page: 632 },
  { id: 88, name: "Al-Ghashiyah", arabic: "الغاشية", urdu: "سورۃ الغاشیہ", page: 633 },
  { id: 89, name: "Al-Fajr", arabic: "الفجر", urdu: "سورۃ الفجر", page: 634 },
  { id: 90, name: "Al-Balad", arabic: "البلد", urdu: "سورۃ البلد", page: 636 },
  { id: 91, name: "Ash-Shams", arabic: "الشمس", urdu: "سورۃ الشمس", page: 637 },
  { id: 92, name: "Al-Layl", arabic: "الليل", urdu: "سورۃ اللیل", page: 638 },
  { id: 93, name: "Ad-Duha", arabic: "الضحى", urdu: "سورۃ الضحیٰ", page: 639 },
  { id: 94, name: "Ash-Sharh", arabic: "الشرح", urdu: "سورۃ الانشراح", page: 639 },
  { id: 95, name: "At-Tin", arabic: "التين", urdu: "سورۃ التین", page: 640 },
  { id: 96, name: "Al-'Alaq", arabic: "العلق", urdu: "سورۃ العلق", page: 640 },
  { id: 97, name: "Al-Qadr", arabic: "القدر", urdu: "سورۃ القدر", page: 641 },
  { id: 98, name: "Al-Bayyinah", arabic: "البينة", urdu: "سورۃ البینہ", page: 642 },
  { id: 99, name: "Az-Zalzalah", arabic: "الزلزلة", urdu: "سورۃ الزلزلہ", page: 643 },
  { id: 100, name: "Al-'Adiyat", arabic: "العاديات", urdu: "سورۃ العادیات", page: 643 },
  { id: 101, name: "Al-Qari'ah", arabic: "القارعة", urdu: "سورۃ القارعہ", page: 644 },
  { id: 102, name: "At-Takathur", arabic: "التكاثر", urdu: "سورۃ التکاثر", page: 645 },
  { id: 103, name: "Al-'Asr", arabic: "العصر", urdu: "سورۃ العصر", page: 645 },
  { id: 104, name: "Al-Humazah", arabic: "الهمزة", urdu: "سورۃ الہمزہ", page: 645 },
  { id: 105, name: "Al-Fil", arabic: "الفيل", urdu: "سورۃ الفیل", page: 646 },
  { id: 106, name: "Quraysh", arabic: "قريش", urdu: "سورۃ قریش", page: 646 },
  { id: 107, name: "Al-Ma'un", arabic: "الماعون", urdu: "سورۃ الماعون", page: 647 },
  { id: 108, name: "Al-Kawthar", arabic: "الكوثر", urdu: "سورۃ الکوثر", page: 647 },
  { id: 109, name: "Al-Kafirun", arabic: "الكافرون", urdu: "سورۃ الکافرون", page: 648 },
  { id: 110, name: "An-Nasr", arabic: "النصر", urdu: "سورۃ النصر", page: 648 },
  { id: 111, name: "Al-Masad", arabic: "المسد", urdu: "سورۃ لہب", page: 648 },
  { id: 112, name: "Al-Ikhlas", arabic: "الإخلاص", urdu: "سورۃ الاخلاص", page: 649 },
  { id: 113, name: "Al-Falaq", arabic: "الفلق", urdu: "سورۃ الفلق", page: 649 },
  { id: 114, name: "An-Nas", arabic: "الناس", urdu: "سورۃ الناس", page: 649 }
];

const QURAN_URL = "https://dn721508.ca.archive.org/0/items/AlQuranAlKareem16LinesTajCompany/AlQuranAlKareem16Lines-TajCompany.pdf";

export default function QuranReader({ onBack }: { onBack: () => void }) {
  // Library loaded states
  const [isLibLoaded, setIsLibLoaded] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [libError, setLibError] = useState<string | null>(null);

  // App reading states
  const [view, setView] = useState<'intro' | 'reading'>('intro');
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [isRenderLoading, setIsRenderLoading] = useState(false);
  const [isScrollMode, setIsScrollMode] = useState(false);
  const [pageOffset, setPageOffset] = useState(2); // PDF cover page offset

  // Download states
  const [isOffline, setIsOffline] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [dlProgress, setDlProgress] = useState<{ percent: number; loadedMB: string; totalMB: string }>({
    percent: 0,
    loadedMB: '0.0',
    totalMB: '0.0'
  });

  // UI Drawer / Selection Panel states
  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'surah' | 'juz'>('surah');
  const [searchQuery, setSearchQuery] = useState('');
  const [isImmersive, setIsImmersive] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // 1. Initial Cached state check
  useEffect(() => {
    const checkOffline = async () => {
      const cachedBlob = await getPDF(QURAN_URL);
      if (cachedBlob) {
        setIsOffline(true);
      } else {
        setIsOffline(false);
      }
    };
    checkOffline();
  }, []);

  // 2. Load PDFJS library
  useEffect(() => {
    const initPdfJs = async () => {
      try {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
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
          throw new Error("pdfjsLib not defined on window");
        }
      } catch (err) {
        console.error(err);
        setLibError("قرآن ریڈر لوڈ کرنے میں ناکامی۔ براہ کرم انٹرنیٹ کنکشن چیک کریں۔");
      }
    };
    initPdfJs();
  }, []);

  // 3. Load PDF Document (Online Proxy or Offline Storage)
  const loadPdfDoc = async (readMode: 'online' | 'offline') => {
    if (!isLibLoaded) return;
    setIsRenderLoading(true);
    setView('reading');

    try {
      const cachedBlob = await getPDF(QURAN_URL);
      let pdfData: any;

      if (cachedBlob && readMode === 'offline') {
        const arrayBuffer = await cachedBlob.arrayBuffer();
        pdfData = { data: new Uint8Array(arrayBuffer) };
        setIsOffline(true);
      } else {
        // Bypass backend proxy on static deployments without a backend
        const isStaticDeploy = window.location.hostname.includes('vercel.app') || 
                               window.location.hostname.includes('web.app') || 
                               window.location.hostname.includes('firebaseapp.com') ||
                               window.location.hostname.includes('github.io');
        const proxyUrl = isStaticDeploy ? QURAN_URL : resolveApiUrl(`/api/pdf-proxy?url=${encodeURIComponent(QURAN_URL)}`);
        pdfData = { url: proxyUrl };
        if (!cachedBlob) setIsOffline(false);
      }

      const pdfjsLib = (window as any).pdfjsLib;
      const loadingTask = pdfjsLib.getDocument(pdfData);

      loadingTask.onProgress = (p: { loaded: number; total: number }) => {
        if (!cachedBlob && p.total > 0) {
          const pct = Math.round((p.loaded / p.total) * 100);
          setDlProgress({
            percent: pct,
            loadedMB: (p.loaded / (1024 * 1024)).toFixed(1),
            totalMB: (p.total / (1024 * 1024)).toFixed(1)
          });
        }
      };

      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      setNumPages(doc.numPages);
      setPageNum(1 + pageOffset); // Start at Surah Fatiha / Baqarah (PDF Page 3 or 4)
    } catch (err) {
      console.error(err);
      setLibError("قرآن پاک لوڈ کرنے میں دشواری پیش آئی۔ یہ لنک عارضی طور پر ڈاؤن لوڈ نہیں ہو رہا۔");
    } finally {
      setIsRenderLoading(false);
    }
  };

  // 3b. Auto open offline Quran if already downloaded
  useEffect(() => {
    if (isLibLoaded && isOffline && view === 'intro' && !isDownloading) {
      loadPdfDoc('offline');
    }
  }, [isLibLoaded, isOffline, view, isDownloading]);

  // 4. Download Quran Offline
  const startQuranDownload = () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setDlProgress({ percent: 0, loadedMB: '0.0', totalMB: '0.0' });

    // Bypass backend proxy on static deployments without a backend
    const isStaticDeploy = window.location.hostname.includes('vercel.app') || 
                           window.location.hostname.includes('web.app') || 
                           window.location.hostname.includes('firebaseapp.com') ||
                           window.location.hostname.includes('github.io');
                           
    const proxyUrl = isStaticDeploy ? QURAN_URL : resolveApiUrl(`/api/pdf-proxy?url=${encodeURIComponent(QURAN_URL)}`);
    
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
      const contentType = xhr.getResponseHeader('Content-Type') || '';
      if (xhr.status === 200 && !contentType.includes('text/html')) {
        try {
          const blob = xhr.response;
          await storePDF(QURAN_URL, blob);
          
          // Also save to file system
          await downloadBlobWithFileSystemAccess(blob, 'Quran.pdf');
          
          setIsOffline(true);
          setIsDownloading(false);
          // Auto load once downloaded
          loadPdfDoc('offline');
        } catch (err) {
          console.error(err);
          alert("ڈاؤنلوڈ محفوظ کرنے میں ناکامی ہوئی۔");
          setIsDownloading(false);
        }
      } else {
        console.warn("Proxy or download failed, falling back to direct browser download.");
        window.open(QURAN_URL, '_blank');
        setIsDownloading(false);
      }
    };

    xhr.onerror = () => {
      console.warn("Network error during XHR, falling back to direct browser download.");
      window.open(QURAN_URL, '_blank');
      setIsDownloading(false);
    };

    xhr.send();
  };

  const cancelDownload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      setIsDownloading(false);
    }
  };

  // 5. Single-Page Canvas Rendering
  useEffect(() => {
    if (!pdfDoc || isScrollMode) return;

    const renderPage = async () => {
      setIsRenderLoading(true);
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
  }, [pdfDoc, pageNum, scale, isScrollMode]);

  // Jump helpers
  const jumpToPrintPage = (printPage: number) => {
    const target = printPage + pageOffset;
    if (target >= 1 && target <= numPages) {
      setPageNum(target);
      setShowDrawer(false);
      if (isScrollMode) {
        setTimeout(() => {
          const el = document.getElementById(`quran-page-${target}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      }
    }
  };

  const jumpToJuz = (juzNum: number) => {
    const startPage = (juzNum - 1) * 20 + 2;
    jumpToPrintPage(startPage);
  };

  const goToNextPage = () => {
    if (pageNum < numPages) {
      const next = pageNum + 1;
      setPageNum(next);
      if (isScrollMode) {
        const el = document.getElementById(`quran-page-${next}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const goToPrevPage = () => {
    if (pageNum > 1) {
      const prev = pageNum - 1;
      setPageNum(prev);
      if (isScrollMode) {
        const el = document.getElementById(`quran-page-${prev}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!isImmersive) {
      if (el.requestFullscreen) el.requestFullscreen();
      setIsImmersive(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      setIsImmersive(false);
    }
  };

  // Filter surahs based on query
  const filteredSurahs = SURAH_INDEX.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.urdu.includes(searchQuery)
  );

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-[#f0f2f5] dark:bg-[#111b21] overflow-hidden select-none">
      
      {/* ------------------ VIEW 1: INTRO / DOWNLOAD CONTROL ------------------ */}
      {view === 'intro' && (
        <div className="flex-1 overflow-y-auto flex flex-col justify-between p-6">
          {/* Top Bar */}
          <div className="flex items-center gap-4 safe-area-top">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors cursor-pointer"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-lg font-extrabold Urdu">قرآن الکریم (تاج کمپنی)</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Taj Company 16-Lines Quran</p>
            </div>
          </div>

          {/* Book Presentation Card */}
          <div className="my-auto max-w-sm mx-auto w-full space-y-8 py-8">
            <div className="relative group mx-auto w-48 h-64 rounded-2xl shadow-2xl overflow-hidden border-2 border-[#d4af37]/40 bg-[#00a884] flex flex-col justify-between p-6 transform transition-transform group-hover:scale-105 duration-300">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-black/30" />
              
              {/* Islamic design accents */}
              <div className="border border-white/20 rounded-xl flex-1 flex flex-col justify-between p-4 relative">
                <div className="text-center text-white/95 space-y-1">
                  <span className="text-[9px] font-bold tracking-widest font-mono uppercase text-[#d4af37]">Taj Company</span>
                  <div className="h-[1px] w-8 bg-[#d4af37]/60 mx-auto my-1" />
                  <p className="text-xs font-semibold font-sans">16 Lines Standard</p>
                </div>

                <div className="my-auto text-center py-4 space-y-1">
                  <BookOpen size={40} className="mx-auto text-[#d4af37] animate-pulse" />
                  <h2 className="text-2xl font-black Urdu text-white drop-shadow">القرآن الکریم</h2>
                </div>

                <div className="text-center text-[8px] text-white/70 font-mono tracking-widest uppercase">
                  Tajweedi Format
                </div>
              </div>
            </div>

            {/* Downloader Widget */}
            <div className="bg-white dark:bg-[#202c33] p-6 rounded-3xl shadow-lg text-center space-y-5 border border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <h3 className="text-base font-bold Urdu text-[#111b21] dark:text-[#e9edef]">آف لائن یا آن لائن پڑھیں</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  بہترین تلاوت اور بغیر انٹرنیٹ چلانے کے لیے قرآن پاک کو ایک بار ڈاؤنلوڈ کر لیں۔
                </p>
              </div>

              {isDownloading ? (
                <div className="space-y-3 bg-[#f0f2f5] dark:bg-[#111b21] p-4 rounded-2xl border border-slate-200/40">
                  <div className="flex justify-between text-xs font-bold font-mono text-slate-600 dark:text-slate-300">
                    <span className="Urdu text-[10px]">ڈاؤنلوڈ جاری ہے...</span>
                    <span>{dlProgress.percent >= 0 ? `${dlProgress.percent}%` : 'In Progress'}</span>
                  </div>
                  <div className="w-full bg-slate-300 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#00a884] h-full transition-all duration-300 rounded-full" 
                      style={{ width: `${dlProgress.percent >= 0 ? dlProgress.percent : 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono font-bold">
                    <span>{dlProgress.loadedMB} MB / {dlProgress.totalMB} MB</span>
                    <button 
                      onClick={cancelDownload}
                      className="text-red-500 hover:underline cursor-pointer"
                    >
                      منسوخ کریں (Cancel)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {/* Download option */}
                  <button
                    onClick={startQuranDownload}
                    className="w-full py-3.5 bg-[#00a884] hover:bg-[#008d6f] active:scale-98 text-white rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <Download size={18} />
                    <span className="Urdu">قرآن پاک ڈاؤنلوڈ کریں (Download)</span>
                  </button>

                  {/* Read Online direct option */}
                  <button
                    onClick={() => loadPdfDoc('online')}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-[#2a3942] dark:hover:bg-[#31424e] text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Compass size={14} />
                    <span className="Urdu">آن لائن پڑھیں (Read Online)</span>
                  </button>
                </div>
              )}

              {/* Status Indicator */}
              {isOffline && (
                <div className="inline-flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-950/20 border border-emerald-300/30 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest mx-auto">
                  <CheckCircle size={12} />
                  <span>پہلے سے ڈاؤنلوڈ شدہ (Already Downloaded)</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Info */}
          <p className="text-center text-[10px] text-slate-400 font-medium">
            Standard Pakistani Taj Company Edition (16 Lines per page) • Size ~90MB
          </p>
        </div>
      )}

      {/* ------------------ VIEW 2: PDF READING VIEWPORT ------------------ */}
      {view === 'reading' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          
          {/* Reading Header */}
          <div className="bg-[#00a884] dark:bg-[#202c33] p-3 text-white flex justify-between items-center shadow-md safe-area-top z-30 shrink-0">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  if (isOffline) {
                    onBack();
                  } else {
                    setView('intro');
                  }
                }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                title="Back to menu"
              >
                <ArrowLeft size={22} />
              </button>
              <div>
                <h2 className="text-sm sm:text-base font-extrabold Urdu leading-tight">القرآن الکریم (Taj Company)</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] bg-white/25 text-white px-1.5 py-0.5 rounded font-mono font-bold">
                    PRINT PAGE: {Math.max(1, pageNum - pageOffset)}
                  </span>
                  <span className="text-[9px] bg-white/15 text-white/90 px-1.5 py-0.5 rounded font-mono">
                    PDF: {pageNum}/{numPages || '...'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Surah/Para Menu Drawer Button */}
              <button
                onClick={() => setShowDrawer(true)}
                className="px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-inner border border-white/10"
              >
                <Layers size={14} className="text-white" />
                <span className="Urdu">فہرست (Index)</span>
              </button>

              {/* Fullscreen Button */}
              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-white/10 rounded-full transition-colors hidden sm:block"
                title="Fullscreen Toggle"
              >
                {isImmersive ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            </div>
          </div>

          {/* Reading Body Stage */}
          <div className="flex-1 w-full max-w-5xl mx-auto flex overflow-hidden bg-[#090d16] relative border-x border-slate-900 shadow-2xl">
            
            {/* Loading Cover */}
            {isRenderLoading && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#00a884] border-t-transparent mb-3"></div>
                <p className="text-slate-200 text-xs font-black Urdu animate-pulse">برائے مہربانی انتظار کریں، لوڈ ہو رہا ہے...</p>
              </div>
            )}

            {/* Error state */}
            {libError ? (
              <div className="m-auto text-center p-6 max-w-sm bg-slate-900/80 border border-slate-800 rounded-3xl space-y-4">
                <AlertCircle className="mx-auto text-red-500 animate-bounce" size={44} />
                <p className="text-xs text-slate-200 leading-relaxed font-bold Urdu">{libError}</p>
                <button
                  onClick={() => loadPdfDoc('online')}
                  className="px-5 py-2.5 bg-[#00a884] hover:bg-[#008d6f] text-white text-xs font-black rounded-xl transition-all cursor-pointer"
                >
                  آن لائن دوبارہ کوشش کریں (Retry Online)
                </button>
              </div>
            ) : !pdfDoc ? (
              <div className="m-auto text-center space-y-3">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#00a884] border-t-transparent mx-auto"></div>
                <p className="text-slate-400 text-xs font-semibold Urdu">قرآنِ پاک کی دستاویز کھولی جا رہی ہے...</p>
              </div>
            ) : (
              <>
                {/* PDF Page Container Viewport */}
                <div className="flex-1 h-full overflow-y-auto flex flex-col items-center p-4 pb-28 select-none bg-[#0e1320] relative scroll-smooth scrollable-content">
                  {isScrollMode ? (
                    <div className="w-full flex flex-col items-center gap-6 py-4">
                      {Array.from({ length: numPages }, (_, index) => (
                        <PDFPageRenderer
                          key={index + 1}
                          pdfDoc={pdfDoc}
                          pageNum={index + 1}
                          scale={scale}
                          onVisible={(p) => setPageNum(p)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="my-auto flex flex-col items-center justify-center py-4">
                      <div className="shadow-2xl border border-slate-900 rounded-xl overflow-hidden bg-white max-w-full">
                        <canvas ref={canvasRef} className="max-w-full h-auto block" />
                      </div>
                    </div>
                  )}
                </div>

                {/* BOTTOM FLOATING CONTROL MODULE */}
                <div className="fixed sm:absolute bottom-6 left-6 bg-[#121b2d]/95 backdrop-blur border border-slate-800/80 rounded-2xl px-4 py-2.5 flex items-center justify-start gap-4 max-w-lg w-[calc(100%-3rem)] sm:w-auto shadow-2xl z-20 select-none">
                  {/* Prev/Next Navigation */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={goToPrevPage}
                      disabled={pageNum <= 1}
                      className="p-2 bg-slate-800 hover:bg-slate-750 disabled:opacity-35 rounded-xl text-slate-300 transition-all cursor-pointer active:scale-90"
                      title="Previous Page"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {/* Direct Page Input */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold">
                      <input 
                        type="number"
                        value={pageNum}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (val >= 1 && val <= numPages) {
                            setPageNum(val);
                            if (isScrollMode) {
                              const el = document.getElementById(`quran-page-${val}`);
                              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                          }
                        }}
                        className="w-12 bg-slate-900 border border-slate-800 rounded-lg py-1 px-1.5 text-center font-bold text-white outline-none focus:border-[#00a884]"
                        min="1"
                        max={numPages}
                      />
                      <span className="text-slate-500">/</span>
                      <span className="font-mono">{numPages}</span>
                    </div>

                    <button
                      onClick={goToNextPage}
                      disabled={pageNum >= numPages}
                      className="p-2 bg-slate-800 hover:bg-slate-750 disabled:opacity-35 rounded-xl text-slate-300 transition-all cursor-pointer active:scale-90"
                      title="Next Page"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  <div className="h-5 w-[1px] bg-slate-800" />

                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setScale(s => Math.max(0.6, s - 0.2))}
                      className="p-1.5 bg-slate-800 hover:bg-slate-750 rounded-lg text-slate-300 transition-all cursor-pointer"
                    >
                      <ZoomOut size={14} />
                    </button>
                    <span className="text-[10px] text-slate-400 font-mono font-bold text-center min-w-[32px]">
                      {Math.round(scale * 100)}%
                    </span>
                    <button
                      onClick={() => setScale(s => Math.min(2.5, s + 0.2))}
                      className="p-1.5 bg-slate-800 hover:bg-slate-750 rounded-lg text-slate-300 transition-all cursor-pointer"
                    >
                      <ZoomIn size={14} />
                    </button>
                  </div>

                  <div className="h-5 w-[1px] bg-slate-800" />

                  {/* Scroll Mode Toggle */}
                  <button
                    onClick={() => setIsScrollMode(!isScrollMode)}
                    className={cn(
                      "p-1.5 rounded-lg flex items-center gap-1 text-[11px] font-black border transition-all cursor-pointer",
                      isScrollMode 
                        ? 'bg-[#00a884]/20 border-[#00c298]/30 text-[#00c298] hover:bg-[#00a884]/30' 
                        : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                    )}
                    title={isScrollMode ? "صفحہ بہ صفحہ پڑھیں" : "مسلسل اسکرول موڈ"}
                  >
                    {isScrollMode ? <BookOpen size={13} /> : <Scroll size={13} />}
                    <span className="hidden xs:inline Urdu">
                      {isScrollMode ? 'صفحہ' : 'اسکرول'}
                    </span>
                  </button>

                  <div className="h-5 w-[1px] bg-slate-800" />

                  {/* Offset Adjuster Widget */}
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                    <button 
                      onClick={() => setPageOffset(prev => Math.max(0, prev - 1))}
                      className="px-1.5 py-0.5 bg-slate-800 text-slate-300 text-[10px] rounded hover:bg-slate-700 transition-all cursor-pointer"
                      title="Sync: Page offset minus"
                    >
                      -
                    </button>
                    <span className="text-[9px] font-mono px-1 font-bold text-[#d4af37]" title="Current Page Offset (Printed to PDF alignment)">
                      Sync:{pageOffset}
                    </span>
                    <button 
                      onClick={() => setPageOffset(prev => prev + 1)}
                      className="px-1.5 py-0.5 bg-slate-800 text-slate-300 text-[10px] rounded hover:bg-slate-700 transition-all cursor-pointer"
                      title="Sync: Page offset plus"
                    >
                      +
                    </button>
                  </div>

                </div>
              </>
            )}
          </div>

          {/* INDEX SELECTION SIDE PANEL / DRAWER */}
          <AnimatePresence>
            {showDrawer && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 flex justify-end">
                {/* Backdrop closer */}
                <div className="absolute inset-0" onClick={() => setShowDrawer(false)} />
                
                {/* Slide Drawer content */}
                <motion.div 
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "tween", duration: 0.25 }}
                  className="relative w-full max-w-sm bg-white dark:bg-[#101726] border-l border-slate-200 dark:border-slate-800 h-full flex flex-col shadow-2xl z-50 overflow-hidden"
                >
                  {/* Drawer Header */}
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-[#0a0f1a] flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                      <Layers className="text-[#00a884]" size={18} />
                      <h4 className="font-bold text-sm Urdu">فہرستِ تلاوت (Quran Index)</h4>
                    </div>
                    <button 
                      onClick={() => setShowDrawer(false)}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Tabs Category Selector */}
                  <div className="p-3 bg-slate-50 dark:bg-[#0a0f1a] border-b border-slate-100 dark:border-slate-800/60 flex gap-2">
                    <button 
                      onClick={() => setDrawerTab('surah')}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs font-black transition-all Urdu cursor-pointer shadow-sm text-center border",
                        drawerTab === 'surah' 
                          ? "bg-[#00a884] text-white border-[#00a884]" 
                          : "bg-white dark:bg-[#1e2a3b] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-850"
                      )}
                    >
                      سورتیں (Surah List)
                    </button>
                    <button 
                      onClick={() => setDrawerTab('juz')}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs font-black transition-all Urdu cursor-pointer shadow-sm text-center border",
                        drawerTab === 'juz' 
                          ? "bg-[#00a884] text-white border-[#00a884]" 
                          : "bg-white dark:bg-[#1e2a3b] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-850"
                      )}
                    >
                      پارے (Juz / Paras)
                    </button>
                  </div>

                  {/* Surah Search Filter */}
                  {drawerTab === 'surah' && (
                    <div className="p-3 border-b border-slate-100 dark:border-slate-800/60 relative">
                      <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text"
                        placeholder="سورت تلاش کریں (Search Surah...)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs dark:text-white placeholder-slate-400 outline-none focus:border-[#00a884] transition-all font-medium Urdu text-right"
                      />
                    </div>
                  )}

                  {/* Items Scrollable Content List */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar bg-slate-50 dark:bg-[#0a0f1a]">
                    {drawerTab === 'surah' ? (
                      filteredSurahs.map((surah) => (
                        <button
                          key={surah.id}
                          onClick={() => jumpToPrintPage(surah.page)}
                          className="w-full flex items-center justify-between bg-white dark:bg-[#16222f] p-3 rounded-2xl shadow-xs border border-transparent hover:border-[#00a884]/40 hover:shadow-md transition-all text-left cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-[#00a884] group-hover:bg-[#00a884] group-hover:text-white transition-all transform rotate-45">
                              <span className="transform -rotate-45">{surah.id}</span>
                            </div>
                            <div>
                              <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">{surah.name}</h5>
                              <p className="text-[9px] text-slate-400 font-mono">Page: {surah.page}</p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <h5 className="font-bold text-sm text-[#00a884] Urdu">{surah.urdu}</h5>
                            <span className="text-[8px] text-slate-400 font-bold font-mono tracking-widest">{surah.arabic}</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => (
                          <button
                            key={juz}
                            onClick={() => jumpToJuz(juz)}
                            className="flex flex-col items-center justify-center bg-white dark:bg-[#16222f] p-4 rounded-2xl shadow-xs border border-transparent hover:border-[#00a884]/40 hover:shadow-md transition-all cursor-pointer text-center group"
                          >
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-[#00a884] mb-1.5 group-hover:scale-105 transition-transform">
                              <BookOpen size={18} />
                            </div>
                            <span className="text-sm font-black Urdu text-slate-800 dark:text-slate-100">پارہ {juz}</span>
                            <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider">Juz {juz}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </div>
      )}

    </div>
  );
}
