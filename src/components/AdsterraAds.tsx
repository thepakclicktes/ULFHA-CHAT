import React, { useState, useEffect, useRef } from 'react';
import { Download, ExternalLink, ShieldCheck, X, Clock, HelpCircle } from 'lucide-react';
import { AppSettings } from '../types';

const globalInjectedScripts = new Set<string>();

// Robust utility to inject raw HTML/Script strings from Adsterra safely
export function injectAdsterraScript(htmlCode: string, targetContainerId?: string) {
  if (!htmlCode) return;
  try {
    const container = targetContainerId 
      ? document.getElementById(targetContainerId) 
      : document.body;
      
    if (!container) return;

    // Remove old elements from this container if it is a specific ad slot
    if (targetContainerId) {
      container.innerHTML = '';
    }

    // 1. First append non-script tags (e.g. divs, inline styles, placeholder container iframes)
    const htmlWithoutScripts = htmlCode.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    if (htmlWithoutScripts.trim()) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlWithoutScripts;
      Array.from(tempDiv.childNodes).forEach((node) => {
        container.appendChild(node.cloneNode(true));
      });
    }

    // 2. Next, dynamically construct and execute any scripts found
    const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = scriptRegex.exec(htmlCode)) !== null) {
      const attrsString = match[1];
      const inlineContent = match[2];

      const srcMatch = /src\s*=\s*["']([^"']+)["']/i.exec(attrsString);
      const src = srcMatch ? srcMatch[1] : null;

      // Deduplicate global scripts appended to body/head
      if (!targetContainerId && src) {
        if (globalInjectedScripts.has(src)) {
          continue;
        }
        globalInjectedScripts.add(src);
      }

      const newScript = document.createElement('script');
      if (src) {
        newScript.src = src;
      }

      // Copy standard attributes
      if (/async/i.test(attrsString)) newScript.async = true;
      if (/defer/i.test(attrsString)) newScript.defer = true;

      // Copy any custom data-* attributes or others
      const attributesRegex = /([a-zA-Z0-9-]+)\s*=\s*["']([^"']+)["']/g;
      let attrMatch;
      while ((attrMatch = attributesRegex.exec(attrsString)) !== null) {
        const name = attrMatch[1].toLowerCase();
        const val = attrMatch[2];
        if (name !== 'src' && name !== 'async' && name !== 'defer') {
          newScript.setAttribute(name, val);
        }
      }

      // Set inline content
      if (inlineContent && inlineContent.trim()) {
        newScript.text = inlineContent;
      }

      // Append script to correct container
      if (!targetContainerId) {
        document.head.appendChild(newScript);
      } else {
        container.appendChild(newScript);
      }
    }
  } catch (err) {
    console.error('[Adsterra] Script injection failed:', err);
  }
}

// Global hook/observer state to trigger ad download modals from anywhere in the app
type ActiveDownloadTask = {
  fileName: string;
  onComplete: () => Promise<void> | void;
};

let globalSetDownloadTask: ((task: ActiveDownloadTask | null) => void) | null = null;

export function triggerDownloadWithAd(fileName: string, onComplete: () => Promise<void> | void) {
  if (globalSetDownloadTask) {
    globalSetDownloadTask({ fileName, onComplete });
  } else {
    // Fallback directly to complete if ad manager is not mounted
    onComplete();
  }
}

interface AdsterraManagerProps {
  appSettings: AppSettings | null;
}

export const AdsterraManager: React.FC<AdsterraManagerProps> = ({ appSettings }) => {
  const [downloadTask, setDownloadTask] = useState<ActiveDownloadTask | null>(null);
  const [countdown, setCountdown] = useState<number>(5);
  const [downloadReady, setDownloadReady] = useState(false);
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Register the global trigger
  useEffect(() => {
    globalSetDownloadTask = setDownloadTask;
    return () => {
      globalSetDownloadTask = null;
    };
  }, []);

  // 1. Inject Global Scripts (Popunder and Social Bar) - DISABLED by user request to keep only download ads
  useEffect(() => {
    // Global script injection is disabled to keep the UI clean and prevent intrusive popups/floating ads.
    // The only ads remaining are those within the secure download interstitial modal.
  }, [appSettings]);

  // 1b. Dynamically optimize floating Adsterra Social Bar size to be much smaller, especially on mobile
  useEffect(() => {
    if (!appSettings?.adsterraSocialBarEnabled) return;

    const adjustFloatingAds = () => {
      const elements = Array.from(document.body.children);
      elements.forEach((el) => {
        if (!(el instanceof HTMLElement)) return;

        // Skip our app elements and safe containers
        if (
          el.id === 'root' || 
          el.id === 'vite-ui-client-coauthor' || 
          el.id === 'profile-setup-modal' ||
          el.tagName === 'SCRIPT' || 
          el.tagName === 'STYLE'
        ) {
          return;
        }

        // Check if the element is fixed/absolute and has high z-index
        const style = window.getComputedStyle(el);
        const isFixed = style.position === 'fixed' || style.position === 'absolute';
        const zIndex = parseInt(style.zIndex, 10);

        // Adsterra elements typically have extremely high z-index (e.g. 2147483647) or are floating overlays
        if (isFixed && (!isNaN(zIndex) && zIndex > 9999 || el.id.startsWith('asb-') || el.className.includes('asb-'))) {
          // Double-check it's not our download interstitial modal (which is under z-index 9999 but has class containing Urdu/Adsterra)
          const isOurElement = el.querySelector('.Urdu') !== null || el.classList.contains('z-[9999]');
          if (isOurElement) return;

          // Apply small scale on mobile & desktop to keep user experience great!
          const isMobile = window.innerWidth < 768;
          if (isMobile) {
            // Mobile styling: make it ultra-compact (55% or 60% size)
            el.style.setProperty('transform', 'scale(0.6)', 'important');
            // Check if it's anchored to the top or bottom
            const topVal = style.top;
            
            // Set the correct transform origin so it nests neatly
            if (topVal !== 'auto' && parseFloat(topVal) < window.innerHeight / 2) {
              el.style.setProperty('transform-origin', 'top center', 'important');
              el.style.setProperty('top', '4px', 'important');
            } else {
              el.style.setProperty('transform-origin', 'bottom center', 'important');
              el.style.setProperty('bottom', '4px', 'important');
            }
            
            // Prevent width issues by constraining max-width
            el.style.setProperty('max-width', '92vw', 'important');
          } else {
            // Desktop styling: make it slightly smaller (75% size) and move to top-right
            el.style.setProperty('transform', 'scale(0.75)', 'important');
            el.style.setProperty('transform-origin', 'top right', 'important');
          }
        }
      });
    };

    // Run immediately and periodically to capture newly loaded/injected elements
    adjustFloatingAds();
    const interval = setInterval(adjustFloatingAds, 350);

    // Also run on window resize
    window.addEventListener('resize', adjustFloatingAds);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', adjustFloatingAds);
    };
  }, [appSettings]);

  // 2. Manage Download Interstitial Countdown
  useEffect(() => {
    if (downloadTask) {
      const timerDuration = appSettings?.adsterraDownloadTimerSeconds ?? 10;
      setCountdown(timerDuration);
      setDownloadReady(false);
      
      // Auto trigger popunder or direct link has been disabled per user request to prevent automatic redirection on download click.
      // Only the modal countdown and sponsor ad slot inside the modal remain.

      // Start Countdown
      countdownInterval.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval.current!);
            setDownloadReady(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Dynamically load any native banner inside the modal slot
      setTimeout(() => {
        if (appSettings?.adsterraNativeBannerEnabled && appSettings?.adsterraNativeBannerCode) {
          injectAdsterraScript(appSettings.adsterraNativeBannerCode, 'adsterra-modal-banner-slot');
        }
      }, 100);
    }

    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
    };
  }, [downloadTask, appSettings]);

  if (!downloadTask) return null;

  const handleStartDownload = () => {
    downloadTask.onComplete();
    setDownloadTask(null);
  };

  const handleSupportClick = () => {
    if (appSettings?.adsterraDirectLinkUrl) {
      window.open(appSettings.adsterraDirectLinkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#090d16]/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#111827] border border-emerald-500/30 rounded-3xl w-full max-w-lg overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.15)] relative flex flex-col transform transition-all duration-300">
        
        {/* Header section with emerald glow */}
        <div className="bg-gradient-to-r from-emerald-950/40 to-slate-900/40 p-6 border-b border-slate-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 shadow-sm">
              <Download size={22} className="animate-bounce" />
            </div>
            <div>
              <h3 className="text-white font-extrabold text-base Urdu text-left tracking-wide">فائل ڈاؤنلوڈ ہو رہی ہے...</h3>
              <p className="text-xs text-slate-400 text-left truncate max-w-[240px] font-mono mt-0.5">
                {downloadTask.fileName}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setDownloadTask(null)}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all border border-transparent hover:border-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Ad Container & Countdown Panel */}
        <div className="p-6 flex flex-col items-center gap-6">
          
          {/* Animated Countdown Ring */}
          {!downloadReady ? (
            <div className="relative w-28 h-28 flex items-center justify-center">
              {/* Pulsing Backlight */}
              <div className="absolute inset-2 bg-emerald-500/5 rounded-full blur-md animate-pulse"></div>
              
              <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-slate-800"
                  strokeWidth="5"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-emerald-500 transition-all duration-1000"
                  strokeWidth="5"
                  fill="transparent"
                  strokeDasharray={264}
                  strokeDashoffset={264 - (264 * countdown) / (appSettings?.adsterraDownloadTimerSeconds ?? 10)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="flex flex-col items-center justify-center z-10">
                <span className="text-3xl font-black text-white tracking-tighter">{countdown}</span>
                <span className="text-[9px] text-emerald-400 uppercase tracking-widest font-extrabold mt-0.5">Secs</span>
              </div>
            </div>
          ) : (
            <div className="w-28 h-28 bg-emerald-500/10 rounded-full flex flex-col items-center justify-center border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)] animate-pulse">
              <ShieldCheck size={40} className="text-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-extrabold mt-1.5 uppercase tracking-widest">Ready</span>
            </div>
          )}

          {/* Prompt in English & Urdu with elegant typography */}
          <div className="text-center space-y-2.5">
            <p className="text-base font-bold text-emerald-100 Urdu leading-relaxed">
              براہ کرم چند سیکنڈ انتظار کریں۔ آپ کا تعاون ہمارے کام کو جاری رکھنے میں مدد دیتا ہے۔
            </p>
            <p className="text-xs text-slate-400 leading-relaxed px-2">
              Your download link is preparing. Thank you for supporting our free Islamic library!
            </p>
          </div>

          {/* Live Ad Banner Slot with clean modern card style */}
          <div className="w-full bg-[#0a0f1d] rounded-2xl border border-slate-800 p-4 flex flex-col items-center justify-center min-h-[175px] relative overflow-hidden group shadow-inner">
            <span className="absolute top-2 left-3 text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-md font-mono font-bold uppercase tracking-wider">
              Sponsored Ad
            </span>
            
            <div id="adsterra-modal-banner-slot" className="w-full flex justify-center items-center overflow-visible transition-all duration-300 mt-2">
              {/* Dynamic Adsterra Native Banner script is injected here */}
              {!appSettings?.adsterraNativeBannerEnabled && (
                <div className="text-center text-xs text-slate-500 italic p-4">
                  Loading premium partner sponsor ad...
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons styled with pure class */}
          <div className="w-full flex flex-col gap-3 pt-1">
            {downloadReady ? (
              <button
                onClick={handleStartDownload}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 py-3.5 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(16,185,129,0.2)] hover:scale-[1.02] active:scale-[0.98] Urdu cursor-pointer"
              >
                <Download size={18} strokeWidth={2.5} />
                ابھی ڈاؤنلوڈ کریں (Start Download)
              </button>
            ) : (
              <div className="w-full flex flex-col gap-2.5">
                <button
                  disabled
                  className="w-full bg-slate-800/80 text-slate-500 py-3.5 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all cursor-not-allowed text-xs uppercase tracking-wider border border-slate-700/50"
                >
                  <Clock size={16} className="animate-spin text-emerald-500" />
                  Generating secure link...
                </button>
                
                {appSettings?.adsterraDirectLinkUrl && (
                  <button
                    onClick={handleSupportClick}
                    className="w-full bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-500/10 text-emerald-300 hover:text-emerald-200 py-2.5 px-4 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:border-emerald-500/30 cursor-pointer"
                  >
                    <ExternalLink size={14} />
                    Support us by opening premium ad (نیا ایڈ کھولیں)
                  </button>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Footer / Transparency pledge */}
        <div className="bg-[#111113] px-6 py-3 border-t border-[#27272a] flex items-center justify-center gap-1.5 text-[10px] text-gray-500">
          <HelpCircle size={12} />
          <span>Verified Secure Download &bull; Powered by Adsterra Premium Network</span>
        </div>

      </div>
    </div>
  );
};

// Reusable component to render Native Banners anywhere in the layout (sidebars, detail screens, footer banners)
interface AdsterraNativeBannerProps {
  appSettings: AppSettings | null;
  slotId: string;
}

export const AdsterraNativeBanner: React.FC<AdsterraNativeBannerProps> = ({ appSettings, slotId }) => {
  const containerId = `adsterra-banner-${slotId}`;

  useEffect(() => {
    if (appSettings?.adsterraNativeBannerEnabled && appSettings?.adsterraNativeBannerCode) {
      setTimeout(() => {
        injectAdsterraScript(appSettings.adsterraNativeBannerCode, containerId);
      }, 300);
    }
  }, [appSettings, slotId]);

  if (!appSettings?.adsterraNativeBannerEnabled || !appSettings?.adsterraNativeBannerCode) {
    return null;
  }

  return (
    <div className="w-full flex flex-col items-center justify-center py-4 px-2 my-2 bg-[#18181b]/50 border border-[#27272a] rounded-xl overflow-hidden min-h-[100px] relative">
      <span className="absolute top-1 right-2 text-[8px] text-gray-600 font-mono tracking-wider">ADVERTISING</span>
      <div id={containerId} className="w-full flex justify-center items-center overflow-hidden" />
    </div>
  );
};
