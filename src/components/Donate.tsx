import React, { useEffect } from 'react';
import { ArrowLeft, Heart } from 'lucide-react';

interface DonateProps {
  onBack: () => void;
}

export default function Donate({ onBack }: DonateProps) {
  useEffect(() => {
    // Inject the ad script only when this component mounts
    const script = document.createElement('script');
    script.src = "https://quge5.com/88/tag.min.js";
    script.dataset.zone = "261926";
    script.async = true;
    script.dataset.cfasync = "false";
    document.body.appendChild(script);

    // Cleanup: Remove the script when the component unmounts
    return () => {
      if (script && document.body.contains(script)) {
        try {
          document.body.removeChild(script);
        } catch {
          // ignore cleanup error if script was moved or removed by third-party tag
        }
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0f171c] text-[#111b21] dark:text-[#e9edef]">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-4 py-4 flex items-center gap-3 shadow-md shrink-0">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg sm:text-xl font-bold">عطیہ دیں (Donate)</h1>
      </div>

      <div className="flex-1 p-6 flex flex-col items-center justify-center space-y-6">
        <Heart className="w-16 h-16 text-rose-500 animate-pulse" />
        <h2 className="text-xl font-bold text-center">آپ کے تعاون کا شکریہ!</h2>
        <p className="text-sm text-center text-gray-600 dark:text-gray-400">
          اشتہارات دیکھ کر آپ اس ایپ کو چلانے میں ہماری مدد کر رہے ہیں۔
        </p>
        
        {/* Ad Container Placeholder */}
        <div className="w-full min-h-[300px] border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl flex items-center justify-center bg-gray-50 dark:bg-[#1f2c34]">
          <p className="text-xs text-gray-500">Ad space for support</p>
        </div>
      </div>
    </div>
  );
}
