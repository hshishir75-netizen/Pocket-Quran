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
  Home, 
  RefreshCw, 
  Play, 
  Pause, 
  Flame, 
  Trash2,
  Heart,
  Target,
  ChevronRight
} from 'lucide-react';

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
}

interface BookmarkItem extends Ayah {
  bookmarked_at: number;
}

const API_BASE = 'https://api.quran.com/api/v4';
const TRANSLATION_ID = 131; // Clear Quran (English)
const RECITER_ID = 7; // Mishary Rashid Alafasy

export default function App() {
  const [view, setView] = useState<'home' | 'bookmarks'>('home');
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
  }, []);

  // --- 2. API USAGE: FETCH RANDOM AYAH (STRICT 2-STEP APPROACH) ---
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
       * STEP 1: Fetch random ayah and audio info
       * We use the random endpoint to get the verse_key, Arabic text, and audio.
       */
      const randomRes = await fetch(
        `${API_BASE}/verses/random?fields=text_uthmani&audio=${RECITER_ID}`
      );
      
      if (!randomRes.ok) throw new Error('Could not connect to the Quran API.');
      
      const randomData = await randomRes.json();
      console.log('Step 1 (Random Ayah Data):', randomData);
      
      const verse = randomData.verse;
      if (!verse) throw new Error('Ayah data not found.');

      const verseKey = verse.verse_key;
      const [surahNum, ayahNum] = verseKey.split(':').map(Number);

      /**
       * STEP 2: Fetch translation using verse_key
       * We try the dedicated translation endpoint first as requested.
       */
      let translationText = 'Translation not available';
      
      // Try primary API translation endpoint
      const transRes = await fetch(
        `${API_BASE}/quran/translations/${TRANSLATION_ID}?verse_key=${verseKey}`
      );
      
      if (transRes.ok) {
        const transData = await transRes.json();
        console.log('Step 2 (Primary Translation Data):', transData);
        if (transData.translations?.[0]?.text) {
          translationText = transData.translations[0].text.replace(/<[^>]*>?/gm, '');
        }
      }

      /**
       * FALLBACK: If translation is still missing, try the alternative endpoint
       */
      if (translationText === 'Translation not available') {
        console.log('Primary translation failed, trying fallback endpoint...');
        const fallbackRes = await fetch(
          `${API_BASE}/verses/by_key/${verseKey}?translations=${TRANSLATION_ID}`
        );
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          console.log('Fallback Translation Data:', fallbackData);
          if (fallbackData.verse?.translations?.[0]?.text) {
            translationText = fallbackData.verse.translations[0].text.replace(/<[^>]*>?/gm, '');
          }
        }
      }

      // Fetch Surah Name for better UI
      const chapterRes = await fetch(`${API_BASE}/chapters/${surahNum}?language=en`);
      const chapterData = await chapterRes.json();
      const surahName = chapterData.chapter?.name_simple || `Surah ${surahNum}`;
      const surahMeaning = chapterData.chapter?.translated_name?.name;

      /**
       * REQUIREMENT: Fix Audio URL
       * Prepend the CDN base to the relative path.
       */
      let audioUrl = undefined;
      if (verse.audio?.url) {
        audioUrl = `https://audio.qurancdn.com/${verse.audio.url}`;
      }

      setAyah({
        id: verse.id,
        verse_key: verseKey,
        text_uthmani: verse.text_uthmani || 'Arabic text not available',
        translation: translationText,
        surah_number: surahNum,
        ayah_number: ayahNum,
        surah_name: surahName,
        surah_meaning: surahMeaning,
        audio_url: audioUrl
      });
    } catch (err) {
      console.error('Fetch Error:', err);
      setError('Failed to fetch ayah. Please try again.');
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
          <div>
            <h1 className="text-xl font-bold tracking-tight">Quran Habit Builder</h1>
            <p className="text-emerald-100 text-xs">Your daily spiritual companion</p>
          </div>
          <div className="flex items-center bg-emerald-700 px-3 py-1.5 rounded-full border border-emerald-500">
            <Flame className="w-4 h-4 text-amber-400 mr-2 fill-amber-400" />
            <span className="font-bold text-sm">{streak} Day Streak</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 mt-4">
        <AnimatePresence mode="wait">
          {view === 'home' ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
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

                      {/* REQUIREMENT: Arabic Text with Audio-Synced Highlighting */}
                      <div className={`p-4 transition-all duration-500 ${isPlaying && activeAudioKey === ayah.verse_key ? 'highlight-active' : ''}`}>
                        <p className="arabic-text text-4xl md:text-5xl leading-[1.8] text-right text-slate-800">
                          {ayah.text_uthmani}
                        </p>
                      </div>

                      {/* REQUIREMENT: English Translation */}
                      <div className="border-t border-slate-100 pt-6">
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2 block">Translation</span>
                        <p className="text-slate-600 leading-relaxed text-lg italic">
                          "{ayah.translation}"
                        </p>
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

                  <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                    <h3 className="text-emerald-800 font-bold flex items-center mb-2">
                      <BookOpen className="w-5 h-5 mr-2" />
                      Daily Reminder
                    </h3>
                    <p className="text-emerald-700 text-sm leading-relaxed">
                      "The best of you are those who learn the Quran and teach it." — Prophet Muhammad (PBUH). Keep up your streak!
                    </p>
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
                        <p className="text-sm text-slate-600 italic">"{b.translation}"</p>
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
            onClick={() => setView('home')} 
            className={`flex flex-col items-center space-y-1 transition-colors ${view === 'home' ? 'text-emerald-600' : 'text-slate-400'}`}
          >
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Home</span>
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
