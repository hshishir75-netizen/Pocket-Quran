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
  BookOpenText,
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
  Loader2
} from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";
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

interface SurahContent {
  surah_number: number;
  surah_name: string;
  surah_meaning: string;
  is_partial?: boolean;
  verses: {
    text: string;
    translation: string;
    verse_number: number;
    audio_url?: string;
  }[];
  full_audio_url?: string;
}

interface BookmarkItem extends Ayah {
  bookmarked_at: number;
}

interface Hadith {
  text: string;
  source: string;
  reference: string;
}

interface Dua {
  title: string;
  arabic: string;
  transliteration: string;
  translation: string;
  benefit?: string;
}

interface DuaCategory {
  category: string;
  duas: Dua[];
}

const DUA_DATA: DuaCategory[] = [
  {
    category: "After Salah",
    duas: [
      {
        title: "Tasbeeh: SubhanAllah (33x)",
        arabic: "سُبْحَانَ اللَّهِ",
        transliteration: "SubhanAllah",
        translation: "Glory be to Allah",
        benefit: "Removes sins even if they are as much as the foam of the sea."
      },
      {
        title: "Tasbeeh: Alhamdulillah (33x)",
        arabic: "الْحَمْدُ لِلَّهِ",
        transliteration: "Alhamdulillah",
        translation: "Praise be to Allah",
        benefit: "Increases gratitude and blessings."
      },
      {
        title: "Tasbeeh: Allahu Akbar (33x)",
        arabic: "اللَّهُ أَكْبَرُ",
        transliteration: "Allahu Akbar",
        translation: "Allah is the Greatest",
        benefit: "Strengthens faith and reliance on Allah."
      },
      {
        title: "Ayatul Kursi",
        arabic: "اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ وَلَا يَئُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ",
        transliteration: "Allahu la ilaha illa Huwal-Hayyul-Qayyum...",
        translation: "Allah! There is no god but He, the Living, the Self-Subsisting, Eternal...",
        benefit: "Reciting after every prayer ensures entrance to Paradise (Jannah)."
      },
      {
        title: "Seeking Peace",
        arabic: "اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ",
        transliteration: "Allahumma Antas-Salamu wa minkas-salamu, tabarakta ya Dhal-Jalali wal-Ikram",
        translation: "O Allah, You are Peace and from You comes peace. Blessed are You, O Owner of Majesty and Honor.",
        benefit: "Sunnah to recite immediately after Taslim."
      }
    ]
  },
  {
    category: "Daily Life",
    duas: [
      {
        title: "Morning Protection",
        arabic: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
        transliteration: "Bismillahilladhi la yadurru ma'asmihi shay'un fil-ardi wa la fis-sama'i wa Huwas-Sami'ul-'Alim",
        translation: "In the name of Allah, with Whose name nothing can cause harm in the earth or in the heavens...",
        benefit: "Protection from all harm (Recite 3x)."
      },
      {
        title: "Evening Protection",
        arabic: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",
        transliteration: "A'udhu bi-kalimatillahit-tammati min sharri ma khalaq",
        translation: "I seek refuge in the perfect words of Allah from the evil of what He has created.",
        benefit: "Protection from harm during the night."
      },
      {
        title: "Before Sleeping",
        arabic: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا",
        transliteration: "Bismika Allahumma amutu wa ahya",
        translation: "In Your name, O Allah, I die and I live.",
        benefit: "Sunnah of the Prophet (PBUH)."
      },
      {
        title: "Before Eating",
        arabic: "بِسْمِ اللَّهِ",
        transliteration: "Bismillah",
        translation: "In the name of Allah",
        benefit: "Brings barakah to the food."
      },
      {
        title: "Before Wudu",
        arabic: "بِسْمِ اللَّهِ",
        transliteration: "Bismillah",
        translation: "In the name of Allah",
        benefit: "Essential for the validity of Wudu."
      },
      {
        title: "After Wudu",
        arabic: "أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ",
        transliteration: "Ash-hadu alla ilaha illallahu wahdahu la sharika lahu wa ash-hadu anna Muhammadan 'abduhu wa Rasuluhu",
        translation: "I bear witness that there is no god but Allah alone... and that Muhammad is His servant and Messenger.",
        benefit: "The eight gates of Jannah are opened for the one who recites this."
      }
    ]
  },
  {
    category: "Personal",
    duas: [
      {
        title: "Anxiety & Distress",
        arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ وَالْعَجْزِ وَالْكَسَلِ وَالْبُخْلِ وَالْجُبْنِ وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ",
        transliteration: "Allahumma inni a'udhu bika minal-hammi wal-hazani...",
        translation: "O Allah, I seek refuge in You from anxiety and sorrow, weakness and laziness...",
        benefit: "Relief from heavy burdens and mental stress."
      },
      {
        title: "Anger Control",
        arabic: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ",
        transliteration: "A'udhu billahi minash-shaytanir-rajim",
        translation: "I seek refuge in Allah from the accursed devil.",
        benefit: "Calms the heart during moments of anger."
      },
      {
        title: "During Sickness",
        arabic: "أَسْأَلُ اللَّهَ الْعَظِيمَ رَبَّ الْعَرْشِ الْعَظِيمِ أَنْ يَشْفِيَكَ",
        transliteration: "As'alullahal-'Adhima Rabbal-'Arshil-'Adhimi an yashfiyaka",
        translation: "I ask Allah the Almighty, Lord of the Magnificent Throne, to heal you.",
        benefit: "Recite 7 times for the sick person."
      }
    ]
  },
  {
    category: "Knowledge & Work",
    duas: [
      {
        title: "Seeking Knowledge",
        arabic: "رَبِّ زِدْنِي عِلْمًا",
        transliteration: "Rabbi zidni 'ilma",
        translation: "My Lord, increase me in knowledge.",
        benefit: "For students and seekers of truth."
      },
      {
        title: "Ease in Tasks (Exams)",
        arabic: "رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي وَاحْلُلْ عُقْدَةً مِنْ لِسَانِي يَفْقَهُوا قَوْلِي",
        transliteration: "Rabbish-rah li sadri wa yassir li amri...",
        translation: "My Lord, expand for me my breast and ease for me my task...",
        benefit: "Dua of Prophet Musa (AS) for clarity and success."
      },
      {
        title: "Halal Rizq (Provision)",
        arabic: "اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ",
        transliteration: "Allahumak-fini bi-halalika 'an haramika...",
        translation: "O Allah, suffice me with Your lawful against Your prohibited...",
        benefit: "For financial stability and barakah in business."
      }
    ]
  },
  {
    category: "Family",
    duas: [
      {
        title: "For Parents",
        arabic: "رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا",
        transliteration: "Rabbi-rhamhuma kama rabbayani saghira",
        translation: "My Lord, have mercy upon them as they brought me up when I was small.",
        benefit: "Essential duty towards parents."
      },
      {
        title: "For Children",
        arabic: "رَبِّ هَبْ لِي مِنَ الصَّالِحِينَ",
        transliteration: "Rabbi hab li minas-salihin",
        translation: "My Lord, grant me [a child] from among the righteous.",
        benefit: "Dua of Prophet Ibrahim (AS)."
      },
      {
        title: "For Marriage",
        arabic: "بَارَكَ اللَّهُ لَكَ وَبَارَكَ عَلَيْكَ وَجَمَعَ بَيْنَكُمَا فِي خَيْرٍ",
        transliteration: "Barakallahu laka wa baraka 'alaika...",
        translation: "May Allah bless you and shower His blessings upon you...",
        benefit: "Sunnah blessing for a newly married couple."
      }
    ]
  },
  {
    category: "Special",
    duas: [
      {
        title: "Ramadan: Breaking Fast",
        arabic: "ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ",
        transliteration: "Dhahaba-dhama'u wabtallatil-'uruqu...",
        translation: "The thirst is gone, the veins are moistened, and the reward is confirmed...",
        benefit: "Recited at Iftar."
      },
      {
        title: "Laylatul Qadr",
        arabic: "اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي",
        transliteration: "Allahumma innaka 'afuwwun tuhibbul-'afwa fa'fu 'anni",
        translation: "O Allah, You are Forgiving and You love forgiveness, so forgive me.",
        benefit: "The best Dua for the last 10 nights of Ramadan."
      },
      {
        title: "Hajj (Talbiyah)",
        arabic: "لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ لَا شَرِيكَ لَكَ",
        transliteration: "Labbayk Allahumma labbayk...",
        translation: "Here I am, O Allah, here I am...",
        benefit: "The call of the pilgrim."
      }
    ]
  },
  {
    category: "Rabbana Dua's",
    duas: [
      {
        title: "Rabbana 1: Success in Both Worlds",
        arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
        transliteration: "Rabbana atina fid-dunya hasanatan...",
        translation: "Our Lord, give us in this world that which is good and in the Hereafter...",
        benefit: "The most comprehensive Dua for all needs."
      },
      {
        title: "Rabbana 2: Steadfastness",
        arabic: "رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِنْ لَدُنْكَ رَحْمَةً إِنَّكَ أَنْتَ الْوَهَّابُ",
        transliteration: "Rabbana la tuzigh qulubana ba'da idh hadaitana...",
        translation: "Our Lord, let not our hearts deviate after You have guided us...",
        benefit: "Protection of Iman (faith)."
      },
      {
        title: "Rabbana 3: Forgiveness",
        arabic: "رَبَّنَا اغْفِرْ لَنَا ذُنُوبَنَا وَإِسْرَافَنَا فِي أَمْرِنَا وَثَبِّتْ أَقْدَامَنَا وَانْصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ",
        transliteration: "Rabbana-ghfir lana dhunubana...",
        translation: "Our Lord, forgive us our sins and the excess in our affairs...",
        benefit: "Seeking strength and victory."
      },
      {
        title: "Rabbana 4: Acceptance",
        arabic: "رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنْتَ السَّمِيعُ الْعَلِيمُ",
        transliteration: "Rabbana taqabbal minna...",
        translation: "Our Lord, accept [this] from us. Indeed You are the All-Hearing, the All-Knowing.",
        benefit: "Recited after completing any good deed."
      },
      {
        title: "Rabbana 5: Family Peace",
        arabic: "رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا",
        transliteration: "Rabbana hab lana min azwajina...",
        translation: "Our Lord, grant us from among our wives and offspring comfort to our eyes...",
        benefit: "For a happy and righteous family."
      },
      {
        title: "Rabbana 6: Mercy",
        arabic: "رَبَّنَا آتِنَا مِنْ لَدُنْكَ رَحْمَةً وَهَيِّئْ لَنَا مِنْ أَمْرِنَا رَشَدًا",
        transliteration: "Rabbana atina min ladunka rahmatan...",
        translation: "Our Lord, grant us from Yourself mercy and prepare for us from our affair right guidance.",
        benefit: "Dua of the People of the Cave (Ashabul Kahf)."
      },
      {
        title: "Rabbana 7: Patience",
        arabic: "رَبَّنَا أَفْرِغْ عَلَيْنَا صَبْرًا وَثَبِّتْ أَقْدَامَنَا وَانْصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ",
        transliteration: "Rabbana afrigh 'alaina sabran...",
        translation: "Our Lord, pour upon us patience and plant firmly our feet...",
        benefit: "Seeking endurance during trials."
      },
      {
        title: "Rabbana 8: Protection from Hell",
        arabic: "رَبَّنَا اصْرِفْ عَنَّا عَذَابَ جَهَنَّمَ إِنَّ عَذَابَهَا كَانَ غَرَامًا",
        transliteration: "Rabbana-srif 'anna 'adhaba Jahannama...",
        translation: "Our Lord, avert from us the punishment of Hell. Indeed, its punishment is ever adhering.",
        benefit: "Seeking refuge from the Fire."
      },
      {
        title: "Rabbana 9: Gratitude",
        arabic: "رَبَّنَا أَتْمِمْ لَنَا نُورَنَا وَاغْفِرْ لَنَا إِنَّكَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
        transliteration: "Rabbana atmim lana nurana...",
        translation: "Our Lord, perfect for us our light and forgive us. Indeed, You are over all things competent.",
        benefit: "Seeking light on the Day of Judgment."
      },
      {
        title: "Rabbana 10: Justice",
        arabic: "رَبَّنَا افْتَحْ بَيْنَنَا وَبَيْنَ قَوْمِنَا بِالْحَقِّ وَأَنْتَ خَيْرُ الْفَاتِحِينَ",
        transliteration: "Rabbana-ftah bainana wa baina qawmina...",
        translation: "Our Lord, decide between us and our people in truth, and You are the best of those who give decision.",
        benefit: "Seeking truth and justice."
      },
      {
        title: "Rabbana 11: Repentance",
        arabic: "رَبَّنَا ظَلَمْنَا أَنْفُسَنَا وَإِنْ لَمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ",
        transliteration: "Rabbana dhalamna anfusana...",
        translation: "Our Lord, we have wronged ourselves, and if You do not forgive us and have mercy upon us...",
        benefit: "Dua of Adam (AS) and Hawwa (AS)."
      },
      {
        title: "Rabbana 12: Protection from Wrongdoers",
        arabic: "رَبَّنَا لَا تَجْعَلْنَا مَعَ الْقَوْمِ الظَّالِمِينَ",
        transliteration: "Rabbana la taj'alna ma'al-qawmidh-dhalimin",
        translation: "Our Lord, do not place us with the wrongdoing people.",
        benefit: "Seeking safety from oppression."
      },
      {
        title: "Rabbana 13: Trust in Allah",
        arabic: "رَبَّنَا عَلَيْكَ تَوَكَّلْنَا وَإِلَيْكَ أَنَبْنَا وَإِلَيْكَ الْمَصِيرُ",
        transliteration: "Rabbana 'alaika tawakkalna...",
        translation: "Our Lord, upon You we have relied, and to You we have returned, and to You is the destination.",
        benefit: "Strengthening reliance on Allah."
      },
      {
        title: "Rabbana 14: Safety from Fitna",
        arabic: "رَبَّنَا لَا تَجْعَلْنَا فِتْنَةً لِلَّذِينَ كَفَرُوا وَاغْفِرْ لَنَا رَبَّنَا إِنَّكَ أَنْتَ الْعَزِيزُ الْحَكِيمُ",
        transliteration: "Rabbana la taj'alna fitnatal-lilladhina kafaru...",
        translation: "Our Lord, make us not [objects of] trial for the disbelievers and forgive us...",
        benefit: "Seeking protection from trials."
      },
      {
        title: "Rabbana 15: Completion of Light",
        arabic: "رَبَّنَا أَتْمِمْ لَنَا نُورَنَا وَاغْفِرْ لَنَا إِنَّكَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
        transliteration: "Rabbana atmim lana nurana...",
        translation: "Our Lord, perfect for us our light and forgive us...",
        benefit: "Seeking perfection in faith."
      },
      {
        title: "Rabbana 16: Forgiveness for Believers",
        arabic: "رَبَّنَا اغْفِرْ لَنَا وَلِإِخْوَانِنَا الَّذِينَ سَبَقُونَا بِالْإِيمَانِ وَلَا تَجْعَلْ فِي قُلُوبِنَا غِلًّا لِلَّذِينَ آمَنُوا رَبَّنَا إِنَّكَ رَءُوفٌ رَحِيمٌ",
        transliteration: "Rabbana-ghfir lana wa li-ikhwaninal-ladhina sabaquna...",
        translation: "Our Lord, forgive us and our brothers who preceded us in faith...",
        benefit: "Dua for the Ummah."
      },
      {
        title: "Rabbana 17: Burden Relief",
        arabic: "رَبَّنَا لَا تُؤَاخِذْنَا إِنْ نَسِينَا أَوْ أَخْطَأْنَا رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَا إِصْرًا كَمَا حَمَلْتَهُ عَلَى الَّذِينَ مِنْ قَبْلِنَا رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِ وَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا أَنْتَ مَوْلَانَا فَانْصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ",
        transliteration: "Rabbana la tu'akhidhna in nasina...",
        translation: "Our Lord, do not impose blame upon us if we have forgotten or erred...",
        benefit: "The last verse of Surah Al-Baqarah."
      },
      {
        title: "Rabbana 18: Witnessing Truth",
        arabic: "رَبَّنَا آمَنَّا فَاكْتُبْنَا مَعَ الشَّاهِدِينَ",
        transliteration: "Rabbana amanna faktubna ma'ash-shahidin",
        translation: "Our Lord, we have believed, so register us among the witnesses.",
        benefit: "Affirming faith."
      },
      {
        title: "Rabbana 19: Seeking Goodness",
        arabic: "رَبَّنَا آمَنَّا فَاغْفِرْ لَنَا وَارْحَمْنَا وَأَنْتَ خَيْرُ الرَّاحِمِينَ",
        transliteration: "Rabbana amanna faghfir lana warhamna...",
        translation: "Our Lord, we have believed, so forgive us and have mercy upon us...",
        benefit: "Seeking Allah's supreme mercy."
      },
      {
        title: "Rabbana 20: Perfect Guidance",
        arabic: "رَبَّنَا آتِنَا مِنْ لَدُنْكَ رَحْمَةً وَهَيِّئْ لَنَا مِنْ أَمْرِنَا رَشَدًا",
        transliteration: "Rabbana atina min ladunka rahmatan...",
        translation: "Our Lord, grant us from Yourself mercy and prepare for us from our affair right guidance.",
        benefit: "For clarity in difficult decisions."
      }
    ]
  }
];

const DAILY_SURAHS = [
  // Small Surahs (1-20 ayahs) - FULL
  { id: 1, name: "Al-Fatiha", type: "full" },
  { id: 93, name: "Ad-Duha", type: "full" },
  { id: 94, name: "Ash-Sharh", type: "full" },
  { id: 97, name: "Al-Qadr", type: "full" },
  { id: 103, name: "Al-Asr", type: "full" },
  { id: 105, name: "Al-Fil", type: "full" },
  { id: 106, name: "Quraysh", type: "full" },
  { id: 107, name: "Al-Ma'un", type: "full" },
  { id: 108, name: "Al-Kawsar", type: "full" },
  { id: 109, name: "Al-Kafirun", type: "full" },
  { id: 110, name: "An-Nasr", type: "full" },
  { id: 111, name: "Al-Masad", type: "full" },
  { id: 112, name: "Al-Ikhlas", type: "full" },
  { id: 113, name: "Al-Falaq", type: "full" },
  { id: 114, name: "An-Nas", type: "full" },

  // Medium Surahs (21-50 ayahs) - FULL
  { id: 67, name: "Al-Mulk", type: "full" },
  { id: 75, name: "Al-Qiyamah", type: "full" },
  { id: 78, name: "An-Naba", type: "full" },
  { id: 81, name: "At-Takwir", type: "full" },
  { id: 82, name: "Al-Infitar", type: "full" },
  { id: 84, name: "Al-Inshiqaq", type: "full" },
  { id: 85, name: "Al-Buruj", type: "full" },
  { id: 88, name: "Al-Ghashiyah", type: "full" },
  { id: 89, name: "Al-Fajr", type: "full" },
  { id: 91, name: "Ash-Shams", type: "full" },
  { id: 92, name: "Al-Layl", type: "full" },

  // Large Surahs (51+ ayahs) - PARTIAL (Highlighted Portions)
  { id: 2, name: "Al-Baqarah", type: "partial", verses: "255,284-286" }, // Ayat Al-Kursi + Last 3
  { id: 3, name: "Al-Imran", type: "partial", verses: "190-200" }, // Last 10
  { id: 18, name: "Al-Kahf", type: "partial", verses: "1-10,101-110" }, // First & Last 10
  { id: 36, name: "Ya-Sin", type: "partial", verses: "1-12,77-83" }, // Opening & Closing
  { id: 55, name: "Ar-Rahman", type: "partial", verses: "1-25" },
  { id: 56, name: "Al-Waqi'ah", type: "partial", verses: "1-26" },
  { id: 24, name: "An-Nur", type: "partial", verses: "35" }, // Ayat An-Nur
  { id: 25, name: "Al-Furqan", type: "partial", verses: "63-77" }, // Ibadur Rahman
  { id: 17, name: "Al-Isra", type: "partial", verses: "23-39" }, // Commandments
  { id: 31, name: "Luqman", type: "partial", verses: "12-19" }, // Luqman's Advice
  { id: 48, name: "Al-Fath", type: "partial", verses: "27-29" }, // End of Victory
  { id: 59, name: "Al-Hashr", type: "partial", verses: "21-24" }, // Names of Allah
];

const API_BASE = 'https://api.quran.com/api/v4';
const TRANSLATION_ID = 131; // Clear Quran (English)
const RECITER_ID = 7; // Mishary Rashid Alafasy

export default function App() {
  const [view, setView] = useState<'dashboard' | 'daily-amal' | 'bookmarks' | 'chat'>('dashboard');
  const [amalTab, setAmalTab] = useState<'surah' | 'hadith' | 'dua'>('surah');
  const [selectedDuaCategory, setSelectedDuaCategory] = useState<string>(DUA_DATA[0].category);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [prayerTimes, setPrayerTimes] = useState<Record<string, string> | null>(null);
  const [prayerStatus, setPrayerStatus] = useState<{ current: string; next: string; remaining: string } | null>(null);
  const [prayerLoading, setPrayerLoading] = useState(false);
  const [prayerError, setPrayerError] = useState<string | null>(null);
  const [ayah, setAyah] = useState<Ayah | null>(null);
  const [surahContent, setSurahContent] = useState<SurahContent | null>(null);
  const [hadith, setHadith] = useState<Hadith | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeAudioKey, setActiveAudioKey] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isSequential, setIsSequential] = useState(false);
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

  // --- 2. API USAGE: FETCH DAILY SURAH ---
  const fetchDailySurah = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsPlaying(false);
    setAudioLoading(false);
    setAudioError(null);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.load();
      audioRef.current = null;
    }

    try {
      const randomSurah = DAILY_SURAHS[Math.floor(Math.random() * DAILY_SURAHS.length)];
      const surahId = randomSurah.id;
      
      const infoRes = await fetch(`${API_BASE}/chapters/${surahId}`);
      if (!infoRes.ok) throw new Error('Could not fetch Surah info.');
      const infoData = await infoRes.json();
      const chapter = infoData.chapter;

      const versesRes = await fetch(
        `${API_BASE}/verses/by_chapter/${surahId}?translations=${TRANSLATION_ID}&fields=text_uthmani&audio=${RECITER_ID}`
      );
      if (!versesRes.ok) throw new Error('Could not fetch Surah verses.');
      const versesData = await versesRes.json();
      let verses = versesData.verses;

      if (randomSurah.type === 'partial' && randomSurah.verses) {
        const ranges = randomSurah.verses.split(',');
        let selectedVerses: any[] = [];
        ranges.forEach(range => {
          if (range.includes('-')) {
            const [start, end] = range.split('-').map(Number);
            selectedVerses = [...selectedVerses, ...verses.slice(start - 1, end)];
          } else {
            const verseNum = Number(range);
            if (verses[verseNum - 1]) {
              selectedVerses.push(verses[verseNum - 1]);
            }
          }
        });
        verses = selectedVerses;
      }

      let fullAudioUrl: string | undefined;
      if (randomSurah.type === 'full') {
        try {
          const audioRes = await fetch(`${API_BASE}/chapter_recitations/${RECITER_ID}/${surahId}`);
          if (audioRes.ok) {
            const audioData = await audioRes.json();
            fullAudioUrl = audioData.audio_file.audio_url;
          }
        } catch (e) {
          console.warn("Could not fetch full surah audio:", e);
        }
      }

      setSurahContent({
        surah_number: chapter.id,
        surah_name: chapter.name_simple,
        surah_meaning: chapter.translated_name.name,
        is_partial: randomSurah.type === 'partial',
        full_audio_url: fullAudioUrl,
        verses: verses.map((v: any) => ({
          text: v.text_uthmani,
          translation: (v.translations && v.translations.length > 0) 
            ? v.translations[0].text.replace(/<[^>]*>?/gm, '') 
            : 'Translation not available',
          verse_number: v.verse_number,
          audio_url: v.audio?.url ? (v.audio.url.startsWith('http') ? v.audio.url : `https://audio.qurancdn.com/${v.audio.url}`) : undefined
        }))
      });
    } catch (err) {
      console.error("Surah fetch error:", err);
      setError('Failed to fetch Surah content. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRandomHadith = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Using a curated list for reliable high-quality daily hadiths
      const hadiths: Hadith[] = [
        {
          text: "The best among you are those who have the best manners and character.",
          source: "Sahih Bukhari",
          reference: "Book 78, Hadith 6035"
        },
        {
          text: "None of you truly believes until he loves for his brother what he loves for himself.",
          source: "Sahih Bukhari & Muslim",
          reference: "Hadith 13, 40 Hadith Nawawi"
        },
        {
          text: "The strong man is not the one who can overpower others (in wrestling); rather, the strong man is the one who controls himself when he gets angry.",
          source: "Sahih Bukhari",
          reference: "Book 78, Hadith 6114"
        },
        {
          text: "A good word is charity.",
          source: "Sahih Bukhari",
          reference: "Book 56, Hadith 2989"
        },
        {
          text: "Allah does not look at your figures, nor at your attire but He looks at your hearts and your accomplishments.",
          source: "Sahih Muslim",
          reference: "Book 45, Hadith 2564"
        },
        {
          text: "He who believes in Allah and the Last Day must either speak good or remain silent.",
          source: "Sahih Bukhari",
          reference: "Book 78, Hadith 6018"
        },
        {
          text: "The most beloved of deeds to Allah are those that are most consistent, even if they are small.",
          source: "Sahih Bukhari",
          reference: "Book 81, Hadith 6464"
        }
      ];
      const randomHadith = hadiths[Math.floor(Math.random() * hadiths.length)];
      setHadith(randomHadith);
    } catch (err) {
      setError('Failed to fetch hadith.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch initial data
  useEffect(() => {
    if (amalTab === 'surah') {
      fetchDailySurah();
    } else {
      fetchRandomHadith();
    }
  }, [amalTab, fetchDailySurah, fetchRandomHadith]);

  // --- 3. AUDIO PLAYBACK (REFACTORED FOR MULTIPLE SOURCES) ---
  const toggleAudio = (url?: string, key?: string, onEnded?: () => void) => {
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
        if (onEnded) onEnded();
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

  const playFullSurah = () => {
    if (!surahContent) return;
    
    if (isSequential && isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      return;
    } else if (isSequential && !isPlaying && audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    setIsSequential(true);

    // Case 1: Full Surah Audio Available
    if (surahContent.full_audio_url) {
      toggleAudio(surahContent.full_audio_url, `full-surah-${surahContent.surah_number}`, () => {
        setIsSequential(false);
      });
      return;
    }

    // Case 2: Verse-by-verse (Seamless)
    const playFromIndex = (index: number) => {
      if (!surahContent || index >= surahContent.verses.length) {
        setIsPlaying(false);
        setActiveAudioKey(null);
        setIsSequential(false);
        return;
      }

      const verse = surahContent.verses[index];
      if (!verse.audio_url) {
        playFromIndex(index + 1);
        return;
      }

      // Pre-load next verse if possible
      if (index + 1 < surahContent.verses.length) {
        const nextVerse = surahContent.verses[index + 1];
        if (nextVerse.audio_url) {
          const preloader = new Audio();
          preloader.src = nextVerse.audio_url;
          preloader.load();
        }
      }

      toggleAudio(verse.audio_url, `${surahContent.surah_number}:${verse.verse_number}`, () => {
        // No delay for seamless playback
        playFromIndex(index + 1);
      });
    };

    playFromIndex(0);
  };

  const playDuaTTS = async (dua: Dua) => {
    if (isPlaying && activeAudioKey === dua.title) {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
        setActiveAudioKey(null);
      }
      return;
    }

    setAudioLoading(true);
    setAudioError(null);
    setActiveAudioKey(dua.title);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say clearly and slowly: ${dua.arabic}. Then say the translation: ${dua.translation}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
        audioRef.current = audio;
        audio.onplay = () => setIsPlaying(true);
        audio.onpause = () => setIsPlaying(false);
        audio.onended = () => {
          setIsPlaying(false);
          setActiveAudioKey(null);
          audioRef.current = null;
        };
        audio.play();
      } else {
        throw new Error('No audio data received');
      }
    } catch (err) {
      console.error('TTS error:', err);
      setAudioError('Failed to generate audio');
      setIsPlaying(false);
      setActiveAudioKey(null);
    } finally {
      setAudioLoading(false);
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
              <BookOpenText className="w-6 h-6 text-amber-300 fill-amber-300/10" />
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
          ) : view === 'daily-amal' ? (
            <motion.div
              key="daily-amal"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Tab Switcher */}
              <div className="flex p-1 bg-slate-100 rounded-2xl">
                <button
                  onClick={() => setAmalTab('surah')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    amalTab === 'surah' 
                      ? 'bg-white text-emerald-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Surah
                </button>
                <button
                  onClick={() => setAmalTab('hadith')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    amalTab === 'hadith' 
                      ? 'bg-white text-emerald-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Hadith
                </button>
                <button
                  onClick={() => setAmalTab('dua')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    amalTab === 'dua' 
                      ? 'bg-white text-emerald-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Dua
                </button>
              </div>

              <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                <h3 className="text-emerald-800 font-bold flex items-center mb-2">
                  <BookOpenText className="w-5 h-5 mr-2" />
                  Daily Reminder
                </h3>
                <p className="text-emerald-700 text-sm leading-relaxed">
                  {amalTab === 'surah' 
                    ? '"The best of you are those who learn the Quran and teach it." — Prophet Muhammad (PBUH).'
                    : amalTab === 'hadith'
                    ? '"I have left among you two things; you will never go astray as long as you hold fast to them: the Book of Allah and my Sunnah." — Prophet Muhammad ﷺ (Al-Muwatta, Imam Malik)'
                    : '"Dua is the essence of worship." — Prophet Muhammad ﷺ (Tirmidhi). Make your heart speak to its Creator.'}
                </p>
              </div>

              {/* REQUIREMENT: Loading State */}
              {loading ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                  <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                  <p className="text-slate-400 font-medium">Loading {amalTab === 'surah' ? 'Surah' : 'Hadith'}...</p>
                </div>
              ) : error ? (
                /* REQUIREMENT: Error Handling */
                <div className="bg-red-50 p-8 rounded-2xl border border-red-100 text-center">
                  <p className="text-red-600 mb-4 font-medium">{error}</p>
                  <button 
                    onClick={amalTab === 'surah' ? fetchDailySurah : fetchRandomHadith}
                    className="bg-emerald-600 text-white px-6 py-2 rounded-full font-bold hover:bg-emerald-700 transition-all"
                  >
                    Try Again
                  </button>
                </div>
              ) : amalTab === 'surah' && surahContent ? (
                <div className="space-y-6">
                  {/* Surah Display Card */}
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-8 space-y-8">
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-700 font-bold text-lg">
                              {surahContent.is_partial ? `Featured Verses from Surah ${surahContent.surah_name}` : surahContent.surah_name}
                            </span>
                            <span className="text-slate-400 text-sm font-medium">({surahContent.surah_meaning})</span>
                          </div>
                          <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                            Surah {surahContent.surah_number} • {surahContent.verses.length} Verses
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={playFullSurah}
                            className={`p-3 rounded-2xl transition-all flex items-center gap-2 border ${
                              isSequential && isPlaying 
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200' 
                                : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                            }`}
                          >
                            {isSequential && isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                            <span className="text-xs font-bold uppercase tracking-wider">
                              {isSequential && isPlaying ? 'Playing' : 'Listen Surah'}
                            </span>
                          </button>
                          <button
                            onClick={fetchDailySurah}
                            className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-slate-200"
                            title="Next Surah"
                          >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-12">
                        {surahContent.verses.map((v, idx) => (
                          <div key={idx} className="space-y-6 group">
                            <div className="flex justify-between items-start gap-4">
                              <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold flex items-center justify-center shrink-0 border border-emerald-100">
                                {v.verse_number}
                              </span>
                              <p className="arabic-text text-3xl md:text-4xl leading-[2] text-right text-slate-800 w-full">
                                {v.text}
                              </p>
                            </div>
                            <div className="pl-12 space-y-2">
                              <p className="text-sm text-slate-600 leading-relaxed italic">
                                {v.translation}
                              </p>
                              <div className="flex items-center gap-4">
                                <button
                                  onClick={() => toggleBookmark({
                                    id: 0, // Not strictly needed for bookmark identification
                                    verse_key: `${surahContent.surah_number}:${v.verse_number}`,
                                    text_uthmani: v.text,
                                    translation: v.translation,
                                    surah_number: surahContent.surah_number,
                                    ayah_number: v.verse_number,
                                    surah_name: surahContent.surah_name,
                                    surah_meaning: surahContent.surah_meaning,
                                    audio_url: v.audio_url,
                                    external_link: `https://quran.com/${surahContent.surah_number}/${v.verse_number}`,
                                    surah_link: `https://quran.com/${surahContent.surah_number}`
                                  })}
                                  className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                    bookmarks.some(b => b.verse_key === `${surahContent.surah_number}:${v.verse_number}`)
                                      ? 'text-emerald-600'
                                      : 'text-slate-400 hover:text-emerald-600'
                                  }`}
                                >
                                  <Heart className={`w-3 h-3 ${bookmarks.some(b => b.verse_key === `${surahContent.surah_number}:${v.verse_number}`) ? 'fill-emerald-600' : ''}`} />
                                  {bookmarks.some(b => b.verse_key === `${surahContent.surah_number}:${v.verse_number}`) ? 'Bookmarked' : 'Bookmark'}
                                </button>
                              </div>
                            </div>
                            {idx < surahContent.verses.length - 1 && (
                              <div className="border-b border-slate-50 pt-4" />
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                        <p className="text-[10px] text-slate-400 font-medium">
                          You have completed reading/listening to this selection. 
                          <button onClick={fetchDailySurah} className="text-emerald-600 font-bold ml-1 hover:underline">Load another Surah</button>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : amalTab === 'hadith' && hadith ? (
                <div className="space-y-6">
                  {/* Hadith Display Card */}
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-8 space-y-8">
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-emerald-700 font-bold text-lg">Daily Hadith</span>
                          <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                            {hadith.source}
                          </span>
                        </div>
                      </div>

                      <div className="p-4">
                        <p className="text-xl md:text-2xl leading-relaxed text-slate-800 font-medium italic">
                          "{hadith.text}"
                        </p>
                      </div>

                      <div className="border-t border-slate-100 pt-6">
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2 block">Reference</span>
                        <div className="flex flex-col gap-2">
                          <p className="text-slate-700 font-medium">
                            {hadith.source} — {hadith.reference}
                          </p>
                          <a 
                            href={`https://sunnah.com/search?q=${encodeURIComponent(hadith.text.split(' ').slice(0, 5).join(' '))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-bold text-sm transition-colors group w-fit"
                          >
                            <ChevronRight className="w-4 h-4 mr-1 group-hover:translate-x-0.5 transition-transform" />
                            Verify on Sunnah.com
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-4">
                        <button
                          onClick={fetchRandomHadith}
                          disabled={loading}
                          className="flex-1 flex items-center justify-center py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 active:scale-95 shadow-md transition-all disabled:opacity-50"
                        >
                          <RefreshCw className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                          Next Hadith
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : amalTab === 'dua' ? (
                <div className="space-y-8">
                  {/* Category Selector (Grid) */}
                  <div className="grid grid-cols-2 gap-3 px-1">
                    {DUA_DATA.map((cat) => (
                      <button
                        key={cat.category}
                        onClick={() => setSelectedDuaCategory(cat.category)}
                        className={`flex items-center px-4 py-3.5 rounded-2xl text-xs font-bold transition-all border ${
                          selectedDuaCategory === cat.category
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20 scale-[1.02]'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-200 hover:text-emerald-600 hover:bg-emerald-50/30'
                        }`}
                      >
                        <div className={`w-1 h-3 rounded-full mr-2.5 transition-colors shrink-0 ${
                          selectedDuaCategory === cat.category ? 'bg-white' : 'bg-emerald-500'
                        }`} />
                        <span className="truncate">{cat.category}</span>
                      </button>
                    ))}
                  </div>

                  {DUA_DATA.filter(cat => cat.category === selectedDuaCategory).map((category, idx) => (
                    <div key={idx} className="space-y-4">
                      <div className="grid gap-4">
                        {category.duas.map((dua, dIdx) => (
                          <div key={dIdx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 hover:border-emerald-200 transition-all">
                            <div className="flex justify-between items-start">
                              <h4 className="font-bold text-emerald-700">{dua.title}</h4>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => playDuaTTS(dua)}
                                  className={`p-2 rounded-xl transition-all ${
                                    activeAudioKey === dua.title && isPlaying
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                  }`}
                                >
                                  {activeAudioKey === dua.title && isPlaying ? (
                                    <Pause className="w-4 h-4" />
                                  ) : (
                                    <Play className="w-4 h-4" />
                                  )}
                                </button>
                                {dua.benefit && (
                                  <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider">
                                    Benefit
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <p className="arabic-text text-2xl text-right text-slate-800 leading-relaxed">
                              {dua.arabic}
                            </p>
                            
                            <div className="space-y-2">
                              <p className="text-xs text-slate-400 italic font-medium">
                                {dua.transliteration}
                              </p>
                              <p className="text-sm text-slate-700 leading-relaxed">
                                {dua.translation}
                              </p>
                            </div>
                            
                            {dua.benefit && (
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <p className="text-[10px] text-slate-500 leading-relaxed">
                                  <span className="font-bold text-emerald-600 mr-1">Note:</span>
                                  {dua.benefit}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
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
                                <BookOpenText className="w-3 h-3 mr-1 group-hover:translate-x-0.5 transition-transform" />
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
            onClick={() => setView('daily-amal')} 
            className={`flex flex-col items-center space-y-1 transition-colors ${view === 'daily-amal' ? 'text-emerald-600' : 'text-slate-400'}`}
          >
            <Sparkles className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Daily Amal</span>
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
