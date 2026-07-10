import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  BookOpen, 
  GraduationCap, 
  Library, 
  ChevronRight,
  Search
} from 'lucide-react';
import { cn } from '../utils';

interface Sarh {
  name: string;
}

interface SarhCategory {
  name: string;
  books: Book[];
}

interface Book {
  name: string;
  sarh: Sarh[];
}

interface MadrasaClass {
  id: number;
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

  const classes: MadrasaClass[] = [
    { id: 1, name: 'دورہ حدیث', books: [] },
    { id: 2, name: 'موقوف علیہ', books: [] },
    { id: 3, name: 'درجہ سادسہ', books: [] },
    { id: 4, name: 'درجہ خامسہ', books: [] },
    { id: 5, name: 'درجہ رابعہ', books: [] },
    { id: 6, name: 'درجہ ثالثہ', books: [] },
    { id: 7, name: 'درجہ ثانیہ', books: [] },
    { id: 8, name: 'درجہ اولی', books: [
      { name: 'علم النحو / نحومیر (فارسی یا عربی)', sarh: [] },
      { name: 'شرح مائۃ عامل (مع الترکیب)', sarh: [] },
      { name: 'میزان الصرف و منشعب', sarh: [] },
      { name: 'ارشاد الصرف (اردو) یا علم الصرف (تین حصص)', sarh: [] },
      { name: 'صفوۃ المصادر', sarh: [] },
      { name: 'تیسیر الابواب', sarh: [] },
      { name: 'المنہاج فی القواعد والاعراب', sarh: [] },
      { name: 'النحو الیسیر', sarh: [] },
      { name: 'تسہیل النحو', sarh: [] },
      { name: 'الطریقۃ العصریہ (جلد اول و دوم)', sarh: [] },
      { name: 'طریقہ العصریہ (مفتی محمد عمر)', sarh: [] },
      { name: 'جوامع الکلم (حضرت مولانا مفتی محمد شفیع عثمانی)', sarh: [] },
      { name: 'جمال القرآن (مع حفظ پارہ عم نصف آخر مع التجوید)', sarh: [] }
    ], sarhCategories: [
        { name: 'نور الایضاح اور اس کی شروحات و حواشی', books: [
            { name: 'نور الایضاح و نجاۃ الارواح', sarh: [] },
            { name: 'حاشیۃ الطحطاوی علی نور الایضاح', sarh: [] },
            { name: 'مراقی الفلاح', sarh: [] },
            { name: 'شفاء الارواح', sarh: [] },
            { name: 'ثمرۃ النجاح', sarh: [] },
            { name: 'امداد الفتاح', sarh: [] },
            { name: 'انوار الایضاح', sarh: [] },
            { name: 'نور الاصباح', sarh: [] },
            { name: 'اشرف الایضاح', sarh: [] },
            { name: 'تکمیل الایضاح', sarh: [] }
        ] },
        { name: 'الفقہ المیسر اور اس کی شروحات', books: [
            { name: 'الفقہ المیسر (اصل عربی متن)', sarh: [] },
            { name: 'الفقہ المیسر اردو (محمد اظہر الاسلام)', sarh: [] },
            { name: 'توضیح المیسر (اردو شرح الفقہ المیسر)', sarh: [] },
            { name: 'تسهیل المیسر (اردو شرح الفقہ المیسر)', sarh: [] },
            { name: 'ریاض الفقه (اردو شرح الفقہ المیسر)', sarh: [] },
            { name: 'التقریر الانور (اردو شرح الفقہ المیسر)', sarh: [] }
        ] },
        { name: 'سیرت اور حدیث کی دیگر شروحات', books: [
            { name: 'ارمغانِ سیرت (اردو شرح سیرت خاتم الانبیاء)', sarh: [] },
            { name: 'طیب السیرت (اردو شرح سیرت خاتم الانبیاء)', sarh: [] },
            { name: 'گلزارِ سیرت (اردو شرح سیرت خاتم الانبیاء)', sarh: [] },
            { name: 'جوامع الکلم (اصل متن)', sarh: [] },
            { name: 'توضيح الجوامع (اردو شرح جوامع الکلم)', sarh: [] },
            { name: 'انوار الجوامع (اردو شرح جوامع الکلم)', sarh: [] },
            { name: 'تسهیل جوامع الکلم (اردو شرح جوامع الکلم)', sarh: [] },
            { name: 'فیوض الکلم (اردو شرح جوامع الکلم)', sarh: [] }
        ] },
        { name: 'صرف، نحو اور قواعد کی کتب و شروحات', books: [
            { name: 'تحفۃ الصرف (علم الصرف پر کتاب)', sarh: [] },
            { name: 'علم الصرف اولین و آخرین (اصل متن)', sarh: [] },
            { name: 'ارشاد الصرف (اصل متن)', sarh: [] },
            { name: 'تسہیل الصرف (جدید انداز میں صرف کی کتاب)', sarh: [] },
            { name: 'میزان الصرف و منشعب (اصل متن)', sarh: [] },
            { name: 'شرح میزان الصرف و منشعب (مختلف شروحات کا مجموعہ)', sarh: [] },
            { name: 'تسہیل المیزان (اردو شرح میزان الصرف)', sarh: [] },
            { name: 'ارشاد المیزان (اردو شرح میزان الصرف)', sarh: [] },
            { name: 'علم النحو (اصل متن)', sarh: [] },
            { name: 'نحو میر (اصل متن)', sarh: [] },
            { name: 'شرح نحو میر (اردو شرح نحو میر)', sarh: [] },
            { name: 'تسهیل النحو (اردو شرح نحو میر / جدید علم النحو)', sarh: [] },
            { name: 'ارشاد النحو (اردو شرح نحو میر)', sarh: [] },
            { name: 'شرح مائۃ عامل (اصل متن)', sarh: [] },
            { name: 'التحفۃ الکاملۃ (اردو شرح شرح مائۃ عامل)', sarh: [] },
            { name: 'التحقیق العوامل (اردو شرح شرح مائۃ عامل)', sarh: [] },
            { name: 'الطریقۃ العصریۃ (جلد اول و دوم)', sarh: [] }
        ] },
        { name: 'عربی ادب، تجوید اور بقیہ کتب', books: [
            { name: 'القراءۃ الواضحۃ (جلد اول، دوم، سوم)', sarh: [] },
            { name: 'توضيح القراءۃ (اردو شرح القراءۃ الواضحۃ)', sarh: [] },
            { name: 'مفتاح العربیہ (جلد اول و دوم)', sarh: [] },
            { name: 'شرح مفتاح العربیہ (اردو شرح و حلِ تبارین)', sarh: [] },
            { name: 'جمال القرآن (اصل متن از مولانا اشرف علی تھانوی)', sarh: [] },
            { name: 'فوائدِ مکیہ (علمِ تجوید پر معروف کتاب)', sarh: [] },
            { name: 'شرح فوائدِ مکیہ (اردو شروحات و حواشی)', sarh: [] },
            { name: 'اصول التجوید (قاری جمشید علی قاسمی)', sarh: [] },
            { name: 'تسهیل التجوید (علمِ تجوید پر آسان کتاب)', sarh: [] },
            { name: 'پنج گنج (صرف کی مشہور کتاب)', sarh: [] },
            { name: 'شرح پنج گنج (اردو شرح پنج گنج)', sarh: [] },
            { name: 'المنہاج فی القواعد والاعراب (عربی گرامر اور تمرین)', sarh: [] },
            { name: 'توضيح المنہاج (اردو شرح المنہاج فی القواعد والاعراب)', sarh: [] },
            { name: 'النحو الیسیر (نحو کی آسان اور بنیادی کتاب)', sarh: [] },
            { name: 'تسهیل النحو الیسیر (اردو شرح و حلِ تمرین النحو الیسیر)', sarh: [] },
            { name: 'خط و املاء (خوشنویسی اور املاء کی درسی کتاب)', sarh: [] },
            { name: 'پارہ عم مع التجوید (آخری پارہ تجوید کے قواعد اور مخارج کی مشق کے لیے)', sarh: [] }
        ] }
    ] },
    { id: 9, name: 'متفرق درس نظامی', books: [] },
    { id: 10, name: 'منطق و فلسفہ', books: [] },
    { id: 11, name: 'تجوید کورس', books: [] },
    { id: 12, name: 'دراسات دینیہ کورس', books: [] },
    { id: 13, name: 'درس نظامی بنات / طالبات', books: [] },
  ];

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
      <div className="bg-[#00a884] dark:bg-[#202c33] p-4 pt-8 pb-4 shadow-md safe-area-top">
        <div className="flex items-center gap-4 text-white">
          <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold Urdu line-clamp-1">
              {getHeaderTitle()}
            </h2>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <GraduationCap size={20} />
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
        <AnimatePresence mode="wait">
          {view === 'classes' ? (
            <motion.div key="classes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 gap-4">
              {classes.filter(c => c.name.includes(searchQuery)).map((cls) => (
                <button key={cls.id} onClick={() => { setSelectedClass(cls); setView('options'); }} className="bg-white dark:bg-[#202c33] p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between group border border-transparent hover:border-[#00a884]/20">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600 font-black">{cls.id}</div>
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
      </div>
    </div>
  );
}
