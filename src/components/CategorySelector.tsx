
import { ArrowLeft } from 'lucide-react';
import { CATEGORIES } from './IslamicLibrary';
import { cn } from '../utils';

interface CategorySelectorProps {
  onSelect: (id: string) => void;
  onBack: () => void;
}

export default function CategorySelector({ onSelect, onBack }: CategorySelectorProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111b21] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-gray-600 dark:text-[#858585] hover:text-black dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <h2 className="text-xl font-black text-gray-900 dark:text-white mb-4 Urdu">لائبریری کیٹیگریز (Categories)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className="p-3 bg-white dark:bg-[#202c33] rounded-xl shadow-sm border border-gray-100 dark:border-white/5 hover:shadow-md transition-all active:scale-95 flex flex-col items-center gap-1.5 text-center cursor-pointer"
            >
              <span className="text-[10px] font-bold text-gray-500 dark:text-[#858585] uppercase tracking-tighter">{cat.title}</span>
              <span className="text-sm font-black text-[#111b21] dark:text-[#e9edef] Urdu leading-tight">{cat.urdu}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
