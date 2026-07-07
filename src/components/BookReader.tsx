import React, { useState } from 'react';

// Function to cache the PDF file for offline access
const cacheBookOffline = async (bookUrl: string) => {
  if ('caches' in window) {
    try {
      const cache = await caches.open('ulfha-books-cache');
      await cache.add(bookUrl);
      console.log("Book cached successfully for offline reading!");
    } catch (error) {
      console.error("Cache failed:", error);
    }
  }
};

interface BookReaderProps {
  bookTitle: string;
  bookUrl: string;
  onClose: () => void;
  onCached?: (url: string) => void;
}

export default function BookReader({ bookTitle, bookUrl, onClose, onCached }: BookReaderProps) {
  const [loading, setLoading] = useState(true);

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
      {/* Header Bar */}
      <div className="w-full max-w-5xl bg-slate-900 text-white flex justify-between items-center p-4 rounded-t-xl border-b border-slate-800">
        <h3 className="font-semibold text-lg truncate pr-4">{bookTitle}</h3>
        <button 
          onClick={onClose}
          className="bg-red-500 hover:bg-red-600 active:scale-95 px-5 py-2 rounded-lg text-sm font-medium transition-all"
        >
          Close Reader
        </button>
      </div>

      {/* PDF Frame Container */}
      <div className="w-full max-w-5xl bg-white h-[82vh] rounded-b-xl overflow-hidden relative shadow-2xl">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent"></div>
            <p className="mt-3 text-slate-500 text-sm font-medium">Kitab load ho rahi hai, baraye meharbani intazar karein...</p>
          </div>
        )}
        
        <iframe
          src={`${bookUrl}#toolbar=0`} 
          className="w-full h-full border-none"
          onLoad={() => {
            setLoading(false);
            cacheBookOffline(bookUrl).then(() => {
              if (onCached) onCached(bookUrl);
            });
          }}
          title={bookTitle}
        />
      </div>
    </div>
  );
}
