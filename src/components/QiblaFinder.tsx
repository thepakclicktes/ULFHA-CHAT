import React, { useEffect, useState } from 'react';
import { ArrowLeft, Compass } from 'lucide-react';
import { motion } from 'framer-motion';

export default function QiblaFinder({ onClose }: { onClose: () => void }) {
  const [lat, setLat] = useState<number>(40.71);
  const [lng, setLng] = useState<number>(-74);

  useEffect(() => {
    // Try to get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      }, (err) => {
        console.warn("Geolocation denied or error:", err);
      });
    }

    const script = document.createElement('script');
    script.src = 'https://ummahapi.com/widget.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // document.body.removeChild(script); // UmmahAPI might leave stuff behind, keep it or remove it
    };
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute inset-0 bg-[#0f172a] z-50 flex flex-col"
    >
      <header className="px-4 py-3 bg-[#1e293b] border-b border-[#334155] flex items-center gap-3">
        <button onClick={onClose} className="p-2 -ml-2 text-white/70 hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h2 className="text-white font-medium flex items-center gap-2">
            <Compass size={18} className="text-amber-500" />
            Qibla Finder
          </h2>
          <p className="text-xs text-white/50 font-urdu">قبلہ رخ</p>
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center relative">
        <div className="w-full max-w-md bg-[#1e293b] p-6 rounded-2xl border border-[#334155] shadow-2xl">
          <div 
            key={`${lat}-${lng}`} // re-render when location changes
            data-ummahapi="qibla" 
            data-lat={lat} 
            data-lng={lng}
            data-api-key="umh_b3cc3206545b480a96ad6e93b0e715e9511a676d"
          ></div>
        </div>
      </div>
    </motion.div>
  );
}
