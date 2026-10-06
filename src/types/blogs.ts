export interface BlogPost {
  id?: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  imageUrl?: string;
  author: string;
  authorRole?: string;
  authorAvatar?: string;
  date: string;
  readTime: string;
  tags?: string[];
  status?: 'published' | 'draft';
  createdAt?: any;
}

export const DEFAULT_BLOGS: BlogPost[] = [
  {
    id: 'demo-1',
    title: 'Introducing Ulfah Chat: A Privacy-Focused Modern Messaging & Learning Ecosystem',
    summary: 'Discover how Ulfah Chat combines high-speed end-to-end messaging, comprehensive offline Islamic libraries, and Noor AI into a seamless experience.',
    content: `Welcome to Ulfah Chat — the all-in-one messaging and learning ecosystem designed specifically for modern privacy and community connection.

### Why Ulfah Chat?
In today's fast-paced digital world, communication tools often require sacrificing privacy or lack integrated tools for spiritual and personal growth. Ulfah Chat bridges this gap by combining:

1. **Real-time Messaging**: Instant end-to-end encrypted chats, voice notes, media sharing, and read receipts.
2. **Comprehensive Islamic Library**: Complete Holy Quran with Urdu/English translations, Hadith collections, and offline book downloads.
3. **Noor AI Assistant**: An intelligent assistant providing answers to religious, educational, and general queries in real time.
4. **Global Communities & Broadcasts**: Connect with interest groups, channels, and public announcement feeds worldwide.

We invite you to launch the app, invite your friends, and experience the future of secure communication!`,
    category: 'Product News',
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
    author: 'Ulfah Engineering Team',
    authorRole: 'Core Developers',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    date: 'August 10, 2026',
    readTime: '3 min read',
    tags: ['Announcement', 'Privacy', 'UlfahChat', 'AppLaunch'],
    status: 'published'
  },
  {
    id: 'demo-2',
    title: 'How to Access Islamic Books Offline in Ulfah Chat',
    summary: 'Learn how to download Quran surahs, Hadith books, and Dua collections for offline reading on your phone or browser.',
    content: `One of the most loved features in Ulfah Chat is the **Offline Islamic Library**. Whether you are traveling or have limited internet access, you can keep your favorite spiritual readings always available.

### Steps to Save Books Offline:
1. Open the **Explore** tab inside Ulfah Chat.
2. Select **Islamic Library** or **Quran Reader**.
3. Tap on the **Download** button next to any book volume or surah audio.
4. The content will be safely saved in your browser storage or app device cache.

Enjoy uninterrupted daily dhikr, Quran recitation, and authentic Hadith reading wherever you go!`,
    category: 'Guides',
    imageUrl: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=800&auto=format&fit=crop&q=80',
    author: 'M. Abdul Rehman',
    authorRole: 'Product Lead',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    date: 'August 8, 2026',
    readTime: '4 min read',
    tags: ['Quran', 'IslamicLibrary', 'OfflineMode', 'Tutorial'],
    status: 'published'
  },
  {
    id: 'demo-3',
    title: 'Noor AI: Your Smart Companion for Islamic & Daily Questions',
    summary: 'An inside look at how our AI model is fine-tuned to assist you with daily dua recommendations, prayer timings, and educational research.',
    content: `Artificial intelligence is transforming how we access knowledge. With **Noor AI**, built directly into Ulfah Chat, you can ask questions in Urdu or English and receive structured, authentic responses.

### Key Capabilities of Noor AI:
- **Instant Hadith Reference**: Query authentic references from Sahih Bukhari, Sahih Muslim, and Tirmidhi.
- **Prayer & Qibla Guidance**: Get precise prayer schedules and Qibla direction for any city globally.
- **Dua Generator**: Ask for daily supplications tailored to your feelings or situation.

Try opening the Noor AI chat directly in your messages tab today!`,
    category: 'AI & Tech',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    author: 'AI Research Group',
    authorRole: 'AI & NLP Engineers',
    authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
    date: 'August 5, 2026',
    readTime: '5 min read',
    tags: ['NoorAI', 'ArtificialIntelligence', 'IslamicTech'],
    status: 'published'
  }
];
