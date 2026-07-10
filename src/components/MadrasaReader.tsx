import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  BookOpen, 
  GraduationCap, 
  Library, 
  ChevronRight,
  Search
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '../utils';

interface Sarh {
  name: string;
  downloadUrl?: string;
}

interface SarhCategory {
  id: string;
  name: string;
  books: Book[];
}

interface Book {
  id: string;
  name: string;
  downloadUrl?: string;
  sarh: Sarh[];
}

interface MadrasaClass {
  id: string;
  name: string;
  books: Book[];
  sarhCategories?: SarhCategory[];
}

export default function MadrasaReader({ onBack }: { onBack: () => void }) {
  const [view, setView] = useState<'classes' | 'books' | 'options' | 'sarh_options' | 'sarh_books_in_category' | 'sarh_book'>('classes');
  const [selectedClass, setSelectedClass] = useState<MadrasaClass | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedSarhCategory, setSelectedSarhCategory] = useState<SarhCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [classes, setClasses] = useState<MadrasaClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const classesSnap = await getDocs(collection(db, 'classes'));
        const booksSnap = await getDocs(collection(db, 'books'));
        const categoriesSnap = await getDocs(collection(db, 'book_categories'));
        const sharahsSnap = await getDocs(collection(db, 'sharahs'));

        const classesData = classesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          books: [] as Book[],
          sarhCategories: [] as SarhCategory[]
        })) as MadrasaClass[];

        // Organize books and categories
        const booksData = booksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const categoriesData = categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const sharahsData = sharahsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        classesData.forEach(cls => {
          cls.books = booksData
            .filter((b: any) => b.classId === cls.id && !b.categoryId)
            .map((b: any) => ({
              id: b.id,
              name: b.name,
              downloadUrl: b.downloadUrl,
              sarh: sharahsData
                .filter((s: any) => s.bookId === b.id)
                .map((s: any) => ({ name: s.name, downloadUrl: s.downloadUrl }))
            }));
          
          cls.sarhCategories = categoriesData
            .filter((cat: any) => cat.classId === cls.id)
            .map((cat: any) => ({
              id: cat.id,
              name: cat.name,
              books: booksData
                .filter((b: any) => b.categoryId === cat.id)
                .map((b: any) => ({
                  id: b.id,
                  name: b.name,
                  downloadUrl: b.downloadUrl,
                  sarh: sharahsData
                    .filter((s: any) => s.bookId === b.id)
                    .map((s: any) => ({ name: s.name, downloadUrl: s.downloadUrl }))
                }))
            }));
        });

        setClasses(classesData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleBack = () => {
    if (view === 'sarh_book') setView('sarh_books_in_category');
    else if (view === 'sarh_books_in_category') setView('sarh_options');
    else if (view === 'books' || view === 'sarh_options') setView('options');
    else if (view === 'options') setView('classes');
    else onBack();
  };

  const getHeaderTitle = () => {
    if (view === 'sarh_book') return selectedBook?.name;
    if (view === 'sarh_books_in_category') return selectedSarhCategory?.name;
    if (view === 'books' || view === 'sarh_options' || view === 'options') return selectedClass?.name;
    return 'ای مدرسہ (e-Madrasa)';
  };

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] dark:bg-[#111b21]">
      <div className="bg-[#00a884] dark:bg-[#202c33] px-4 py-3 sm:px-6 sm:py-4 shadow-md safe-area-top shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 text-white">
          <button onClick={handleBack} className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors -ml-1 sm:ml-0">
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <div className="flex-1">
            <h2 className="text-base sm:text-xl font-bold Urdu line-clamp-1 leading-tight">
              {getHeaderTitle()}
            </h2>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {view === 'classes' && (
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" size={18} />
            <input 
              type="text"
              placeholder="تلاش کریں (Search Class...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-white/50 outline-none focus:bg-white/20 transition-all font-medium Urdu text-right"
            />
          </div>
        )}
      </div>

      <div className="scrollable-content p-4">
        {loading ? (
            <p className="text-center text-gray-500">Loading...</p>
        ) : (
        <AnimatePresence mode="wait">
          {view === 'classes' ? (
            <motion.div key="classes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 gap-4">
              {classes.filter(c => c.name.includes(searchQuery)).map((cls) => (
                <button key={cls.id} onClick={() => { setSelectedClass(cls); setView('options'); }} className="bg-white dark:bg-[#202c33] p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between group border border-transparent hover:border-[#00a884]/20">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600 font-black">{cls.id.slice(0, 3)}</div>
                    <div className="text-left"><h4 className="text-lg font-bold Urdu text-[#111b21] dark:text-[#e9edef]">{cls.name}</h4></div>
                  </div>
                  <ChevronRight className="text-[#8696a0] group-hover:translate-x-1 transition-transform" size={20} />
                </button>
              ))}
            </motion.div>
          ) : view === 'options' ? (
            <motion.div key="options" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <button onClick={() => setView('books')} className="bg-white dark:bg-[#202c33] p-6 rounded-xl text-lg font-bold text-[#111b21] dark:text-[#e9edef] border border-gray-100 dark:border-white/5 w-full shadow-sm hover:shadow-md transition-all">کتب (Books)</button>
              <button onClick={() => setView('sarh_options')} className="bg-white dark:bg-[#202c33] p-6 rounded-xl text-lg font-bold text-[#111b21] dark:text-[#e9edef] border border-gray-100 dark:border-white/5 w-full shadow-sm hover:shadow-md transition-all">شروحات (Sarh)</button>
            </motion.div>
          ) : view === 'books' ? (
            <motion.div key="books" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {selectedClass?.books.length === 0 ? (
                    <p className="Urdu text-center text-gray-500">کتب ابھی شامل نہیں کی گئیں۔</p>
                ) : selectedClass?.books.map((book, idx) => (
                  <div key={idx} className="bg-white dark:bg-[#202c33] p-4 rounded-xl flex items-center justify-between gap-4 border border-gray-100 dark:border-white/5 w-full">
                    <span className="Urdu text-right text-lg text-[#111b21] dark:text-[#e9edef]">{book.name}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : view === 'sarh_options' ? (
            <motion.div key="sarh_options" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {selectedClass?.sarhCategories?.map((category, idx) => (
                    <button key={idx} onClick={() => { setSelectedSarhCategory(category); setView('sarh_books_in_category'); }} className="bg-white dark:bg-[#202c33] p-4 rounded-xl flex items-center justify-between gap-4 border border-gray-100 dark:border-white/5 w-full">
                        <span className="Urdu text-right text-lg text-[#111b21] dark:text-[#e9edef]">{category.name}</span>
                        <ChevronRight className="text-[#00a884]" size={20} />
                    </button>
                ))}
              </div>
            </motion.div>
          ) : view === 'sarh_books_in_category' ? (
            <motion.div key="sarh_books_in_category" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {selectedSarhCategory?.books.length === 0 ? (
                    <p className="Urdu text-center text-gray-500">کتب ابھی شامل نہیں کی گئیں۔</p>
                ) : selectedSarhCategory?.books.map((book, idx) => (
                    <button key={idx} onClick={() => { setSelectedBook(book); setView('sarh_book'); }} className="bg-white dark:bg-[#202c33] p-4 rounded-xl flex items-center justify-between gap-4 border border-gray-100 dark:border-white/5 w-full">
                        <span className="Urdu text-right text-lg text-[#111b21] dark:text-[#e9edef]">{book.name}</span>
                        <ChevronRight className="text-[#00a884]" size={20} />
                    </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="sarh_book" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {selectedBook?.sarh.length === 0 ? (
                    <p className="Urdu text-center text-gray-500">شروح ابھی شامل نہیں کی گئیں۔</p>
                ) : selectedBook?.sarh.map((sarh, idx) => (
                    <div key={idx} className="bg-white dark:bg-[#202c33] p-4 rounded-xl flex items-center justify-center gap-4 border border-gray-100 dark:border-white/5 w-full">
                        <span className="Urdu text-lg text-[#111b21] dark:text-[#e9edef]">{sarh.name}</span>
                    </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        )}
      </div>
    </div>
  );
}
