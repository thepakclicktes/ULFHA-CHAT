import React from 'react';
import { X } from 'lucide-react';

interface Props {
  progress: number; // 0 to 100, or -1 for indeterminate
  onCancel: () => void;
}

export const DownloadProgressBar: React.FC<Props> = ({ progress, onCancel }) => {
  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white p-4 rounded-lg shadow-lg z-50 flex items-center gap-4">
      <div className="flex-1">
        <div className="text-sm font-medium mb-1">
          {progress === -1 ? 'Downloading...' : `Downloading ${progress}%`}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`bg-blue-600 h-2 rounded-full ${progress === -1 ? 'animate-pulse' : ''}`}
            style={{ width: `${progress === -1 ? 100 : progress}%` }}
          />
        </div>
      </div>
      <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full">
        <X size={20} />
      </button>
    </div>
  );
};
