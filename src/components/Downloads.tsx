import React, { useEffect, useState } from 'react';
import { ArrowLeft, FileText, Trash2, ExternalLink } from 'lucide-react';
import { getPDF, deletePDF } from '../utils/pdfStorage';

interface DownloadedFile {
  url: string;
  name: string;
}

export default function Downloads({ onBack }: { onBack: () => void }) {
  const [files, setFiles] = useState<DownloadedFile[]>([]);

  useEffect(() => {
    const downloaded = JSON.parse(localStorage.getItem('downloaded_volumes_local') || '[]');
    // Try to get a name from the URL or just use a default one
    const filesWithNames: DownloadedFile[] = downloaded.map((url: string) => ({
        url,
        name: url.split('/').pop() || 'Downloaded File'
    }));
    setFiles(filesWithNames);
  }, []);

  const handleOpen = async (url: string) => {
    const blob = await getPDF(url);
    if (blob) {
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      // URL.revokeObjectURL(blobUrl); // Can't revoke immediately if we want it to work
    }
  };

  const handleDelete = async (url: string) => {
    await deletePDF(url);
    const updated = files.filter(f => f.url !== url);
    setFiles(updated);
    localStorage.setItem('downloaded_volumes_local', JSON.stringify(updated.map(f => f.url)));
  };

  return (
    <div className="w-full h-full bg-white flex flex-col">
      <div className="p-4 border-b flex items-center gap-4 bg-gray-50">
        <button onClick={onBack} className="p-2 hover:bg-gray-200 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-bold text-lg">Downloads</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="p-4 text-gray-500 text-center">No downloaded files.</div>
        ) : (
          files.map((file) => (
            <div key={file.url} className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="text-blue-500" />
                <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleOpen(file.url)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full">
                  <ExternalLink size={18} />
                </button>
                <button onClick={() => handleDelete(file.url)} className="p-2 text-red-600 hover:bg-red-50 rounded-full">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
