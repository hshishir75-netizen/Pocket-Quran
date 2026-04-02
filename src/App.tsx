/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Bookmark, 
  Sparkles, 
  RefreshCw, 
  Play, 
  Pause, 
  Flame, 
  Trash2,
  Heart,
  Target,
  Home,
  ChevronRight,
  ExternalLink,
  Calendar,
  Clock,
  Sunrise,
  Sun,
  SunDim,
  Sunset,
  Moon,
  MessageSquare,
  Send,
  User,
  Bot,
  Loader2,
  MoonStar
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';

// Types
interface Ayah {
  id: number;
  verse_key: string;
  text_uthmani: string;
  translation: string;
  surah_number: number;
  ayah_number: number;
  surah_name?: string;
  surah_meaning?: string;
  audio_url?: string;
  external_link?: string;
  surah_link?: string;
}

interface BookmarkItem extends Ayah {
  bookmarked_at: number;
}

const API_BASE = 'https://api.quran.com/api/v4';
const TRANSLATION_ID = 131; // Clear Quran (English)
const RECITER_ID = 7; // Mishary Rashid Alafasy

export default function App() {
  const [view, setView] = useState<'dashboard' | 'daily-ayah' | 'bookmarks' | 'chat'>('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [prayerTimes, setPrayerTimes] = useState<Record<string, string> | null>(null);
  const [prayerStatus, setPrayerStatus] = useState<{ current: string; next: string; remaining: string } | null>(null);
  const [prayerLoading, setPrayerLoading] = useState(false);
  const [prayerError, setPrayerError] = useState<string | null>(null);
  const [ayah, setAyah] = useState<Ayah | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeAudioKey, setActiveAudioKey] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [streak, setStreak] = useState(0);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);

  // Chat State
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; content: string }[]>([
    { role: 'bot', content: "Assalamu Alaikum! I am your Pocket Quran assistant. How can I help you explore the Holy Quran today?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- 1. INITIALIZATION (Streak & Bookmarks) ---
  useEffect(() => {
    // Streak Logic
    const lastVisit = localStorage.getItem('quran_last_visit');
    const currentStreak = parseInt(localStorage.getItem('quran_streak') || '0');
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (lastVisit === today) {
      setStreak(currentStreak);
    } else if (lastVisit === yesterday) {
      const newStreak = currentStreak + 1;
      setStreak(newStreak);
      localStorage.setItem('quran_streak', newStreak.toString());
    } else {
      setStreak(1);
      localStorage.setItem('quran_streak', '1');
    }
    localStorage.setItem('quran_last_visit', today);

    // Bookmarks Logic
    const savedBookmarks = JSON.parse(localStorage.getItem('quran_bookmarks') || '[]');
    setBookmarks(savedBookmarks);

    // Clock Logic
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Update prayer status if times are available
      if (prayerTimes) {
        updatePrayerStatus(now, prayerTimes);
      }
    }, 1000);

    // Prayer Times Logic
    if ("geolocation" in navigator) {
      loadPrayerTimes();
    }

    return () => clearInterval(timer);
  }, [prayerTimes]);

  const loadPrayerTimes = () => {
    setPrayerLoading(true);
    setPrayerError(null);
    
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      
      const fetchPrayerTimes = async () => {
        // Attempt 1: Aladhan (Standard)
        try {
          const response = await fetch(`https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=2`);
          if (response.ok) {
            const data = await response.json();
            if (data.code === 200) {
              setPrayerTimes(data.data.timings);
              updatePrayerStatus(new Date(), data.data.timings);
              setPrayerLoading(false);
              return true;
            }
          }
        } catch (e) { console.warn("Aladhan failed", e); }

        // Attempt 2: Aladhan (Alternative Endpoint)
        try {
          const response = await fetch(`https://api.aladhan.com/v1/timingsByAddress?address=${latitude},${longitude}&method=2`);
          if (response.ok) {
            const data = await response.json();
            if (data.code === 200) {
              setPrayerTimes(data.data.timings);
              updatePrayerStatus(new Date(), data.data.timings);
              setPrayerLoading(false);
              return true;
            }
          }
        } catch (e) { console.warn("Aladhan Alt failed", e); }

        // Attempt 3: Pray.zone
        try {
          const response = await fetch(`https://api.pray.zone/v2/times/today.json?latitude=${latitude}&longitude=${longitude}`);
          if (response.ok) {
            const data = await response.json();
            if (data.status === "OK") {
              const timings = {
                Fajr: data.results.datetime[0].times.Fajr,
                Dhuhr: data.results.datetime[0].times.Dhuhr,
                Asr: data.results.datetime[0].times.Asr,
                Maghrib: data.results.datetime[0].times.Maghrib,
                Isha: data.results.datetime[0].times.Isha
              };
              setPrayerTimes(timings);
              updatePrayerStatus(new Date(), timings);
              setPrayerLoading(false);
              return true;
            }
          }
        } catch (e) { console.warn("Pray.zone failed", e); }

        // All failed
        setPrayerError("Network error: Could not connect to prayer time servers. Please check your internet or ad-blocker.");
        setPrayerLoading(false);
        // Fallback to default
        const meccaTimings = { Fajr: "05:00", Dhuhr: "12:20", Asr: "15:45", Maghrib: "18:35", Isha: "20:05" };
        setPrayerTimes(meccaTimings);
        updatePrayerStatus(new Date(), meccaTimings);
        return false;
      };

      fetchPrayerTimes();
    }, (geoErr) => {
      console.error("Geolocation error:", geoErr);
      setPrayerError("Location access denied. Using default prayer times (Mecca).");
      setPrayerLoading(false);
      const meccaTimings = { Fajr: "05:00", Dhuhr: "12:20", Asr: "15:45", Maghrib: "18:35", Isha: "20:05" };
      setPrayerTimes(meccaTimings);
      updatePrayerStatus(new Date(), meccaTimings);
    });
  };

  const updatePrayerStatus = (now: Date, timings: Record<string, string>) => {
    const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const prayerDates = prayers.map(name => {
      const [hours, minutes] = timings[name].split(':').map(Number);
      const d = new Date(now);
      d.setHours(hours, minutes, 0, 0);
      return { name, date: d };
    });

    let current = '';
    let nextIdx = -1;

    // Find the next prayer
    for (let i = 0; i < prayerDates.length; i++) {
      if (prayerDates[i].date > now) {
        nextIdx = i;
        break;
      }
    }

    let nextPrayerDate: Date;
    let nextName: string;

    if (nextIdx === -1) {
      // All prayers for today have passed, next is Fajr tomorrow
      current = 'Isha';
      nextName = 'Fajr';
      nextPrayerDate = new Date(prayerDates[0].date);
      nextPrayerDate.setDate(nextPrayerDate.getDate() + 1);
    } else {
      nextName = prayerDates[nextIdx].name;
      nextPrayerDate = prayerDates[nextIdx].date;
      current = nextIdx === 0 ? 'Isha' : prayers[nextIdx - 1];
    }

    const diff = nextPrayerDate.getTime() - now.getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    setPrayerStatus({
      current,
      next: nextName,
      remaining: `${h}h ${m}m ${s}s`
    });
  };

  // --- CHAT LOGIC ---
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (view === 'chat') {
      scrollToBottom();
    }
  }, [messages, view]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = "gemini-3.1-pro-preview";
      
      const systemInstruction = `You are a knowledgeable and respectful Islamic AI assistant embedded in a Quran application called Pocket Quran.
Your primary role is to help users engage deeply with the Holy Quran — reciting verses, explaining meanings, providing context, and answering questions about Islam with accuracy and care.

CORE CAPABILITIES:
1. VERSE RECITATION — When a user asks for a verse, always provide:
   - The Arabic text (e.g., بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ)
   - The transliteration (romanized pronunciation)
   - The English translation
   - Surah name, number, and ayah number

2. VERSE SEARCH — If a user describes a topic or feeling (e.g., "a verse about patience" or "ayah about forgiveness"), suggest 2–3 relevant verses with full details as above.

3. EXPLANATION & TAFSIR — Provide simple, clear explanations of verses when asked. Draw from classical tafsir understanding (Ibn Kathir, Al-Jalalayn) but present it in plain, modern language.

4. ISLAMIC Q&A — Answer general questions about Islam, the Prophet (ﷺ), Islamic history, pillars of Islam, and daily practices respectfully and accurately.

5. DU'A & SUPPLICATION — Share relevant du'as (supplications) with Arabic, transliteration, and meaning when asked.

BEHAVIOR RULES:
- Always be respectful, humble, and spiritually uplifting in tone
- Say "Peace be upon him" (ﷺ) after mentioning the Prophet Muhammad
- If you are unsure about a ruling or hadith, say so clearly and suggest consulting a scholar
- Never invent or fabricate verses — if unsure of an exact reference, say so
- Support both English and Arabic responses; if the user writes in Arabic, respond in Arabic
- Keep responses concise unless the user asks for more detail

RESPONSE FORMAT for verses:
📖 Surah [Name] ([Number]:[Ayah])
Arabic: [Arabic text]
Transliteration: [Roman text]
Translation: "[English meaning]"

Always start with a warm Islamic greeting if it's the beginning of a conversation.`;

      const chat = ai.chats.create({
        model,
        config: {
          systemInstruction,
        },
        history: messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        }))
      });

      const result = await chat.sendMessage({ message: userMessage });
      const botResponse = result.text || "I apologize, I am unable to process that request right now.";
      
      setMessages(prev => [...prev, { role: 'bot', content: botResponse }]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, { role: 'bot', content: "I'm sorry, I encountered an error. Please try again later." }]);
    } finally {
      setIsTyping(false);
    }
  };

  // --- 2. API USAGE: FETCH RANDOM AYAH (DETECTION-BASED 2-STEP APPROACH) ---
  const fetchRandomAyah = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsPlaying(false);
    setAudioLoading(false);
    setAudioError(null);
    
    // Stop and cleanup any current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.load();
      audioRef.current = null;
    }

    try {
      /**
       * STEP 1: Fetch a random verse to "detect" which ayah to show.
       * We get the Arabic text and the unique verse_key (e.g., "2:255").
       */
      const randomRes = await fetch(
        `${API_BASE}/verses/random?fields=text_uthmani&audio=${RECITER_ID}`
      );
      
      if (!randomRes.ok) throw new Error('Could not connect to the Quran API.');
      
      const randomData = await randomRes.json();
      const verse = randomData.verse;
      if (!verse) throw new Error('Ayah data not found.');

      const verseKey = verse.verse_key;
      console.log(`Detected Ayah: ${verseKey}`);

      /**
       * STEP 2: "Detect" and fetch the translation for this specific verse_key.
       * We use the dedicated 'verses/by_key' endpoint which is the most reliable
       * for matching a translation to a specific verse.
       */
      const detailRes = await fetch(
        `${API_BASE}/verses/by_key/${verseKey}?translations=${TRANSLATION_ID}&fields=text_uthmani`
      );
      
      if (!detailRes.ok) throw new Error('Could not fetch translation for the detected ayah.');
      
      const detailData = await detailRes.json();
      const fullVerse = detailData.verse;
      
      if (!fullVerse) throw new Error('Detailed ayah data not found.');

      const [surahNum, ayahNum] = verseKey.split(':').map(Number);

      // Fetch Surah Name and Meaning for context
      const chapterRes = await fetch(`${API_BASE}/chapters/${surahNum}?language=en`);
      const chapterData = await chapterRes.json();
      const surahName = chapterData.chapter?.name_simple || `Surah ${surahNum}`;
      const surahMeaning = chapterData.chapter?.translated_name?.name;

      // Clean up translation text (remove HTML tags)
      const translationText = fullVerse.translations?.[0]?.text 
        ? fullVerse.translations[0].text.replace(/<[^>]*>?/gm, '') 
        : 'Translation not available';

      /**
       * REQUIREMENT: Fix Audio URL
       * Prepend the CDN base to the relative path from Step 1.
       */
      let audioUrl = undefined;
      if (verse.audio?.url) {
        audioUrl = `https://audio.qurancdn.com/${verse.audio.url}`;
      }

      setAyah({
        id: fullVerse.id,
        verse_key: verseKey,
        text_uthmani: fullVerse.text_uthmani || verse.text_uthmani || 'Arabic text not available',
        translation: translationText,
        surah_number: surahNum,
        ayah_number: ayahNum,
        surah_name: surahName,
        surah_meaning: surahMeaning,
        audio_url: audioUrl,
        external_link: `https://quran.com/${surahNum}/${ayahNum}`,
        surah_link: `https://quran.com/${surahNum}`
      });
    } catch (err) {
      console.error('Detection/Fetch Error:', err);
      setError('Failed to detect or fetch ayah. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch first ayah on load
  useEffect(() => {
    fetchRandomAyah();
  }, [fetchRandomAyah]);

  // --- 3. AUDIO PLAYBACK (REFACTORED FOR MULTIPLE SOURCES) ---
  const toggleAudio = (url?: string, key?: string) => {
    const targetUrl = url || ayah?.audio_url;
    const targetKey = key || ayah?.verse_key;

    if (!targetUrl || !targetKey) {
      setAudioError('Audio not available');
      return;
    }

    // If clicking a different ayah while one is already playing/loading
    if (audioRef.current && activeAudioKey !== targetKey) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
      setActiveAudioKey(null);
    }

    if (!audioRef.current) {
      setAudioLoading(true);
      setAudioError(null);
      setActiveAudioKey(targetKey);
      
      const audio = new Audio();
      audio.src = targetUrl;
      audio.load();
      
      audioRef.current = audio;

      audio.oncanplay = () => {
        setAudioLoading(false);
        audio.play().catch((err) => {
          console.error('Playback error:', err);
          setAudioError('Playback failed. Tap again.');
          setIsPlaying(false);
          setActiveAudioKey(null);
        });
        setIsPlaying(true);
      };

      audio.onplay = () => setIsPlaying(true);
      audio.onpause = () => setIsPlaying(false);
      audio.onended = () => {
        setIsPlaying(false);
        setActiveAudioKey(null);
        audioRef.current = null;
      };
      
      audio.onerror = () => {
        setAudioLoading(false);
        setAudioError('Audio file could not be loaded');
        setIsPlaying(false);
        setActiveAudioKey(null);
        audioRef.current = null;
      };
    } else {
      // Toggle play/pause for the same ayah
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => {
          setAudioError('Playback failed');
          setIsPlaying(false);
        });
      }
    }
  };

  // --- 4. BOOKMARK SYSTEM ---
  const toggleBookmark = (item: Ayah) => {
    const isBookmarked = bookmarks.some(b => b.verse_key === item.verse_key);
    let newBookmarks;
    if (isBookmarked) {
      newBookmarks = bookmarks.filter(b => b.verse_key !== item.verse_key);
    } else {
      newBookmarks = [...bookmarks, { ...item, bookmarked_at: Date.now() }];
    }
    setBookmarks(newBookmarks);
    localStorage.setItem('quran_bookmarks', JSON.stringify(newBookmarks));
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-24 font-sans">
      {/* Header */}
      <header className="bg-emerald-600 text-white p-6 shadow-md sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-700/50 rounded-xl border border-emerald-500/30 shadow-inner">
              <MoonStar className="w-6 h-6 text-amber-300 fill-amber-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                {view === 'chat' ? 'Quran Assistant' : 'Pocket Quran'}
              </h1>
              <p className="text-emerald-100 text-xs">
                {view === 'chat' ? 'Ask me anything about the Quran' : 'Your daily spiritual companion'}
              </p>
            </div>
          </div>
          <div className="flex items-center bg-emerald-700 px-3 py-1.5 rounded-full border border-emerald-500">
            <Flame className="w-4 h-4 text-amber-400 mr-2 fill-amber-400" />
            <span className="font-bold text-sm">{streak} Day Streak</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 mt-4">
        <AnimatePresence mode="wait">
          {view === 'dashboard' ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Clock and Calendar Card */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="bg-emerald-50 p-3 rounded-full">
                    <Clock className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                      {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest mt-2">Current Time</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 w-full pt-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                      <Calendar className="w-5 h-5 text-emerald-600 mb-2" />
                      <span className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mb-1">Gregorian</span>
                      <span className="text-slate-800 font-bold text-xs sm:text-sm">
                        {currentTime.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex flex-col items-center text-center">
                      <Sparkles className="w-5 h-5 text-emerald-600 mb-2" />
                      <span className="text-emerald-700 text-[9px] font-bold uppercase tracking-widest mb-1">Hijri</span>
                      <span className="text-emerald-900 font-bold text-xs sm:text-sm">
                        {(() => {
                          try {
                            // Use a more robust way to get Hijri date parts
                            const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-uma', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            });
                            const parts = formatter.formatToParts(currentTime);
                            const weekday = parts.find(p => p.type === 'weekday')?.value;
                            const day = parts.find(p => p.type === 'day')?.value;
                            const month = parts.find(p => p.type === 'month')?.value;
                            const year = parts.find(p => p.type === 'year')?.value;
                            
                            // If for some reason it falls back to Gregorian (e.g. month is 'April'), 
                            // we try 'islamic-civil' as a fallback
                            if (month === 'April' || month === 'Apr') {
                              const altFormatter = new Intl.DateTimeFormat('en-u-ca-islamic-civil', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              });
                              const altParts = altFormatter.formatToParts(currentTime);
                              const w = altParts.find(p => p.type === 'weekday')?.value;
                              const d = altParts.find(p => p.type === 'day')?.value;
                              const m = altParts.find(p => p.type === 'month')?.value;
                              const y = altParts.find(p => p.type === 'year')?.value;
                              return `${w}, ${d} ${m}, ${y}`;
                            }
                            
                            return `${weekday}, ${day} ${month}, ${year}`;
                          } catch (e) {
                            return "Date Error";
                          }
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Prayer Times Card */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Prayer Times</h3>
                    {prayerLoading && <Loader2 className="w-3 h-3 text-emerald-600 animate-spin" />}
                  </div>
                  {prayerStatus && (
                    <div className="bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                        Next: {prayerStatus.next} in {prayerStatus.remaining}
                      </span>
                    </div>
                  )}
                </div>

                {prayerError && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-between">
                    <p className="text-[10px] text-amber-800 font-medium leading-tight max-w-[70%]">{prayerError}</p>
                    <button 
                      onClick={loadPrayerTimes}
                      className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 underline"
                    >
                      Retry
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-5 gap-2">
                  {[
                    { name: 'Fajr', key: 'Fajr', icon: Sunrise, color: 'text-amber-500' },
                    { name: 'Dhuhr', key: 'Dhuhr', icon: Sun, color: 'text-orange-500' },
                    { name: 'Asr', key: 'Asr', icon: SunDim, color: 'text-amber-600' },
                    { name: 'Maghrib', key: 'Maghrib', icon: Sunset, color: 'text-rose-500' },
                    { name: 'Isha', key: 'Isha', icon: Moon, color: 'text-indigo-600' },
                  ].map((prayer) => {
                    const isActive = prayerStatus?.current === prayer.name;
                    return (
                      <div key={prayer.name} className={`flex flex-col items-center space-y-2 p-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-emerald-50 ring-1 ring-emerald-200 scale-105' : ''}`}>
                        <span className={`text-[9px] font-bold uppercase tracking-tighter ${isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                          {prayer.name}
                        </span>
                        <div className={`p-2 rounded-xl ${isActive ? 'bg-white shadow-sm' : 'bg-slate-50'} ${prayer.color}`}>
                          <prayer.icon className="w-5 h-5" />
                        </div>
                        <span className={`text-[10px] font-bold ${isActive ? 'text-emerald-900' : 'text-slate-800'}`}>
                          {prayerTimes ? prayerTimes[prayer.key] : '--:--'}
                        </span>
                        {isActive && (
                          <span className="text-[8px] font-bold text-emerald-600 uppercase animate-pulse">Now</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Upcoming Events */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center px-2">
                  <Target className="w-5 h-5 mr-2 text-emerald-600" />
                  Upcoming Islamic Events
                </h3>
                <div className="grid gap-3">
                  {[
                    { name: 'Eid al-Adha', date: 'May 27, 2026', hijri: '10 Dhul-Hijjah 1447' },
                    { name: 'Islamic New Year', date: 'July 16, 2026', hijri: '1 Muharram 1448' },
                    { name: 'Day of Ashura', date: 'July 25, 2026', hijri: '10 Muharram 1448' },
                    { name: 'Mawlid an-Nabi', date: 'Sept 24, 2026', hijri: '12 Rabi al-Awwal 1448' },
                  ].map((event, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center group hover:border-emerald-200 transition-colors">
                      <div>
                        <h4 className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">{event.name}</h4>
                        <p className="text-slate-400 text-xs font-medium">{event.hijri}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-600 font-bold text-sm block">{event.date}</span>
                        <span className="text-slate-300 text-[10px] font-bold uppercase tracking-widest">Confirmed</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : view === 'chat' ? (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col h-[calc(100vh-200px)]"
            >
              <div className="flex-1 overflow-y-auto space-y-4 pb-4 px-2 scrollbar-hide">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-emerald-100' : 'bg-emerald-600'}`}>
                        {m.role === 'user' ? <User className="w-4 h-4 text-emerald-600" /> : <Bot className="w-4 h-4 text-white" />}
                      </div>
                      <div className={`p-4 rounded-2xl shadow-sm ${m.role === 'user' ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-white border border-slate-100 rounded-bl-none'}`}>
                        <div className={`markdown-body text-sm leading-relaxed ${m.role === 'user' ? 'text-white' : 'text-slate-800'}`}>
                          <Markdown>{m.content}</Markdown>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 bg-white border border-slate-100 p-4 rounded-2xl rounded-bl-none shadow-sm">
                      <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                      <span className="text-xs text-slate-400 font-medium">Assistant is thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="mt-4 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about a verse, hadith, or Islam..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-6 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-inner"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="absolute right-2 top-2 w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-600/20"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </motion.div>
          ) : view === 'daily-ayah' ? (
            <motion.div
              key="daily-ayah"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                <h3 className="text-emerald-800 font-bold flex items-center mb-2">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Daily Reminder
                </h3>
                <p className="text-emerald-700 text-sm leading-relaxed">
                  "The best of you are those who learn the Quran and teach it." — Prophet Muhammad (PBUH). Keep up your streak!
                </p>
              </div>

              {/* REQUIREMENT: Loading State */}
              {loading ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                  <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                  <p className="text-slate-400 font-medium">Loading Ayah...</p>
                </div>
              ) : error ? (
                /* REQUIREMENT: Error Handling */
                <div className="bg-red-50 p-8 rounded-2xl border border-red-100 text-center">
                  <p className="text-red-600 mb-4 font-medium">{error}</p>
                  <button 
                    onClick={fetchRandomAyah}
                    className="bg-emerald-600 text-white px-6 py-2 rounded-full font-bold hover:bg-emerald-700 transition-all"
                  >
                    Try Again
                  </button>
                </div>
              ) : ayah && (
                <div className="space-y-6">
                  {/* Ayah Display Card */}
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-8 space-y-8">
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-700 font-bold text-lg">{ayah.surah_name}</span>
                            {ayah.surah_meaning && (
                              <span className="text-slate-400 text-sm font-medium">({ayah.surah_meaning})</span>
                            )}
                          </div>
                          <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                            Surah {ayah.surah_number} : Ayah {ayah.ayah_number}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => toggleBookmark(ayah)}
                            className={`p-2.5 rounded-full transition-all ${
                              bookmarks.some(b => b.verse_key === ayah.verse_key)
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-slate-50 text-slate-300 hover:text-emerald-600'
                            }`}
                          >
                            <Heart className={`w-6 h-6 ${bookmarks.some(b => b.verse_key === ayah.verse_key) ? 'fill-emerald-600' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {/* REQUIREMENT: Arabic Text with Audio-Synced Highlighting */}
                      <div className={`p-4 transition-all duration-500 ${isPlaying && activeAudioKey === ayah.verse_key ? 'highlight-active' : ''}`}>
                        <p className="arabic-text text-4xl md:text-5xl leading-[1.8] text-right text-slate-800">
                          {ayah.text_uthmani}
                        </p>
                      </div>

                      {/* REQUIREMENT: Reference & External Link */}
                      <div className="border-t border-slate-100 pt-6">
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2 block">Reference</span>
                        <div className="flex flex-col gap-2">
                          <p className="text-slate-700 font-medium">
                            {ayah.surah_name} ({ayah.surah_meaning}) — {ayah.surah_number}:{ayah.ayah_number}
                          </p>
                          <div className="flex flex-col gap-2">
                            <a 
                              href={ayah.external_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-bold text-sm transition-colors group w-fit"
                            >
                              <ChevronRight className="w-4 h-4 mr-1 group-hover:translate-x-0.5 transition-transform" />
                              View full meaning on Quran.com
                            </a>
                            <a 
                              href={ayah.surah_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-slate-500 hover:text-emerald-600 font-medium text-sm transition-colors group w-fit"
                            >
                              <BookOpen className="w-4 h-4 mr-2 group-hover:translate-x-0.5 transition-transform" />
                              Read Full Surah
                            </a>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 pt-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleAudio()}
                            disabled={loading || (audioLoading && activeAudioKey === ayah.verse_key)}
                            className={`flex-1 flex items-center justify-center py-4 rounded-2xl font-bold transition-all ${
                              !ayah.audio_url 
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-md'
                            }`}
                          >
                            {audioLoading && activeAudioKey === ayah.verse_key ? (
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            ) : isPlaying && activeAudioKey === ayah.verse_key ? (
                              <Pause className="w-5 h-5 mr-2 fill-white" />
                            ) : (
                              <Play className="w-5 h-5 mr-2 fill-white" />
                            )}
                            {audioLoading && activeAudioKey === ayah.verse_key ? 'Loading...' : isPlaying && activeAudioKey === ayah.verse_key ? 'Pause' : 'Listen Ayah'}
                          </button>

                          <button
                            onClick={fetchRandomAyah}
                            disabled={loading}
                            className="p-4 bg-slate-50 text-slate-600 rounded-2xl hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-slate-200 disabled:opacity-50"
                            title="Next Ayah"
                          >
                            <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                        
                        {/* Audio Status Messages */}
                        {!ayah.audio_url && (
                          <p className="text-amber-600 text-xs text-center font-medium">Audio not available for this ayah</p>
                        )}
                        {audioError && (
                          <p className="text-red-500 text-xs text-center font-medium">{audioError}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="bookmarks"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Saved Ayahs</h2>
              {bookmarks.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
                  <Bookmark className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-400 font-medium">No bookmarks yet.</p>
                </div>
              ) : (
                  <div className="grid gap-4">
                    {bookmarks.map((b) => (
                      <div key={b.verse_key} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group">
                        <div className="flex justify-between items-start mb-4">
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                            {b.surah_name} {b.surah_meaning && `(${b.surah_meaning})`} : {b.ayah_number}
                          </span>
                          <div className="flex items-center gap-2">
                            {b.audio_url && (
                              <button
                                onClick={() => toggleAudio(b.audio_url, b.verse_key)}
                                className={`p-2 rounded-full transition-all ${
                                  activeAudioKey === b.verse_key 
                                    ? 'bg-emerald-600 text-white' 
                                    : 'bg-slate-50 text-slate-400 hover:text-emerald-600'
                                }`}
                              >
                                {audioLoading && activeAudioKey === b.verse_key ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : isPlaying && activeAudioKey === b.verse_key ? (
                                  <Pause className="w-4 h-4 fill-current" />
                                ) : (
                                  <Play className="w-4 h-4 fill-current" />
                                )}
                              </button>
                            )}
                            <button 
                              onClick={() => toggleBookmark(b)}
                              className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        <div className={`transition-all duration-500 rounded-xl ${isPlaying && activeAudioKey === b.verse_key ? 'highlight-active p-2' : ''}`}>
                          <p className="arabic-text text-2xl text-right mb-4 text-slate-800 leading-relaxed">{b.text_uthmani}</p>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-slate-50">
                          <span className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mb-1 block">Reference</span>
                          <div className="flex flex-col gap-1">
                            <p className="text-slate-600 text-xs font-medium">
                              {b.surah_name} — {b.surah_number}:{b.ayah_number}
                            </p>
                            <div className="flex flex-col gap-1.5">
                              <a 
                                href={b.external_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-bold text-[10px] transition-colors group w-fit"
                              >
                                <ChevronRight className="w-3 h-3 mr-0.5 group-hover:translate-x-0.5 transition-transform" />
                                View on Quran.com
                              </a>
                              <a 
                                href={b.surah_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-slate-400 hover:text-emerald-600 font-medium text-[10px] transition-colors group w-fit"
                              >
                                <BookOpen className="w-3 h-3 mr-1 group-hover:translate-x-0.5 transition-transform" />
                                Read Full Surah
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-4 pb-10 z-40">
        <div className="max-w-md mx-auto flex justify-around items-center">
          <button 
            onClick={() => setView('dashboard')} 
            className={`flex flex-col items-center space-y-1 transition-colors ${view === 'dashboard' ? 'text-emerald-600' : 'text-slate-400'}`}
          >
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Home</span>
          </button>
          <button 
            onClick={() => setView('chat')} 
            className={`flex flex-col items-center space-y-1 transition-colors ${view === 'chat' ? 'text-emerald-600' : 'text-slate-400'}`}
          >
            <MessageSquare className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Chat</span>
          </button>
          <button 
            onClick={() => setView('daily-ayah')} 
            className={`flex flex-col items-center space-y-1 transition-colors ${view === 'daily-ayah' ? 'text-emerald-600' : 'text-slate-400'}`}
          >
            <Sparkles className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Daily Ayah</span>
          </button>
          <button 
            onClick={() => setView('bookmarks')} 
            className={`flex flex-col items-center space-y-1 transition-colors ${view === 'bookmarks' ? 'text-emerald-600' : 'text-slate-400'}`}
          >
            <Bookmark className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Saved</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
