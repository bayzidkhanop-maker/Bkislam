import React, { useState, useEffect, useRef } from 'react';
import { User } from './models';
import { Card, Button, Input, Loader } from './widgets';
import { 
  BookOpen, Search, Compass, Heart, Calendar, Play, Pause, FastForward,
  Settings, ChevronRight, CheckCircle, Clock, Moon, Sun, Filter, Share2,
  Bookmark, Navigation, Volume2, Globe, HeartPulse, Shield, Smartphone,
  Star, ListTodo, Target, TrendingUp, Info
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { getRamadanTracker, updateRamadanTracker } from './firestoreService';

// Advanced Islamic Hub Component with API connections for real data
export const IslamicHubPage = ({ currentUser }: { currentUser: User }) => {
  const [activeTab, setActiveTab] = useState<'quran' | 'hadith' | 'prayer' | 'tasbih' | 'ramadan'>('quran');

  // --- QURAN STATE ---
  const [surahs, setSurahs] = useState<any[]>([]);
  const [quranLoading, setQuranLoading] = useState(true);
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [surahData, setSurahData] = useState<any | null>(null);
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- PRAYER STATE ---
  const [prayerTimes, setPrayerTimes] = useState<any | null>(null);
  const [locationError, setLocationError] = useState('');
  const [compassHeading, setCompassHeading] = useState(0);
  const [qiblaDirection, setQiblaDirection] = useState(0);
  const [hasCompassPerm, setHasCompassPerm] = useState(false);

  // --- TASBIH STATE ---
  const [tasbihCount, setTasbihCount] = useState(0);
  const [tasbihGoal, setTasbihGoal] = useState(33);
  const [selectedZikr, setSelectedZikr] = useState("Subhanallah");

  // --- PRE-COMPUTED/MOCK DATA FOR RAMADAN AND HADITH ---
  const [ramadanDay, setRamadanDay] = useState(1);
  const [fastingStatus, setFastingStatus] = useState<Record<number, 'completed' | 'missed' | 'pending'>>({});
  const [dailyChecklist, setDailyChecklist] = useState<Record<string, boolean>>({
    fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false, taraweeh: false, quran: false, zikr: false
  });

  const hadithCategories = ['Fasting (Sawm)', 'Charity (Sadaqah)', 'Prayer (Salah)', 'Patience (Sabr)', 'Night prayer (Tahajjud)'];
  const [activeHadithCategory, setActiveHadithCategory] = useState(hadithCategories[0]);
  const [hadithList, setHadithList] = useState<any[]>([]);
  const [hadithLoading, setHadithLoading] = useState(false);

  useEffect(() => {
    fetchSurahList();
    fetchPrayerTimes();
    
    // Initialize fasting status from DB or mock
    const loadRamadanData = async () => {
      if (!currentUser) return;
      try {
        const data = await getRamadanTracker(currentUser.uid);
        if (data) {
          if (data.fastingStatus) setFastingStatus(data.fastingStatus);
          if (data.dailyChecklist) setDailyChecklist(data.dailyChecklist);
          if (data.tasbihCount !== undefined) setTasbihCount(data.tasbihCount);
          if (data.tasbihGoal) setTasbihGoal(data.tasbihGoal);
          if (data.selectedZikr) setSelectedZikr(data.selectedZikr);
        } else {
          // Initialize empty object
          const initialFasts: Record<number, 'pending'> = {};
          for (let i = 1; i <= 30; i++) initialFasts[i] = 'pending';
          setFastingStatus(initialFasts);
        }
      } catch (err) {
        console.error("Failed to load ramadan tracker data", err);
      }
    };
    loadRamadanData();

    return () => {
      // Cleanup audio on unmount
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'hadith') {
      fetchHadiths(activeHadithCategory);
    }
  }, [activeTab, activeHadithCategory]);

  const fetchSurahList = async () => {
    try {
      // Using AlQuran Cloud API (Public, rate limit generous)
      const res = await fetch('https://api.alquran.cloud/v1/surah');
      const data = await res.json();
      setSurahs(data.data);
    } catch (error) {
      toast.error("Failed to load Quran data. Working in offline mode.");
    } finally {
      setQuranLoading(false);
    }
  };

  const fetchSurahDetails = async (number: number) => {
    setQuranLoading(true);
    setSelectedSurah(number);
    try {
      const res = await fetch(`https://api.alquran.cloud/v1/surah/${number}/editions/quran-uthmani,en.asad,ar.alafasy`);
      const data = await res.json();
      
      const combined = data.data[0].ayahs.map((ayah: any, index: number) => ({
        number: ayah.numberInSurah,
        arabic: ayah.text,
        translation: data.data[1].ayahs[index].text,
        audio: data.data[2].ayahs[index].audio,
        juz: ayah.juz
      }));
      
      setSurahData({
        name: data.data[0].name,
        englishName: data.data[0].englishName,
        revelationType: data.data[0].revelationType,
        ayahs: combined
      });
    } catch (error) {
      toast.error("Failed to load Surah details.");
      setSelectedSurah(null);
    } finally {
      setQuranLoading(false);
    }
  };

  const fetchPrayerTimes = async () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=2`);
          const data = await res.json();
          setPrayerTimes(data.data.timings);

          // Calculate Qibla Direction (Mecca coordinates: 21.4225° N, 39.8262° E)
          const phiK = 21.4225 * (Math.PI / 180.0);
          const lambdaK = 39.8262 * (Math.PI / 180.0);
          const phi = lat * (Math.PI / 180.0);
          const lambda = lon * (Math.PI / 180.0);
          const y = Math.sin(lambdaK - lambda);
          const x = Math.cos(phi) * Math.tan(phiK) - Math.sin(phi) * Math.cos(lambdaK - lambda);
          let qibla = Math.atan2(y, x) * (180.0 / Math.PI);
          qibla = (qibla + 360.0) % 360.0;
          setQiblaDirection(qibla);
          
        } catch (e) {
          setLocationError("Could not fetch prayer times for your location.");
        }
      }, () => {
        setLocationError("Location permission denied. Cannot fetch prayer times.");
      });
    } else {
      setLocationError("Geolocation is not supported by this browser.");
    }
  };

  const requestCompassPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          setHasCompassPerm(true);
          window.addEventListener('deviceorientationabsolute', handleOrientation as any, true);
          window.addEventListener('deviceorientation', handleOrientation as any, true);
        } else {
          toast.error("Compass permission denied.");
        }
      } catch (error) {
        console.error(error);
      }
    } else {
      // Non iOS 13+ devices
      setHasCompassPerm(true);
      window.addEventListener('deviceorientationabsolute', handleOrientation as any, true);
      window.addEventListener('deviceorientation', handleOrientation as any, true);
    }
  };

  const handleOrientation = (event: DeviceOrientationEvent) => {
    let compass = event.webkitCompassHeading || Math.abs(event.alpha || 0 - 360);
    if (compass) setCompassHeading(compass);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation as any, true);
      window.removeEventListener('deviceorientation', handleOrientation as any, true);
    };
  }, []);

  const fetchHadiths = async (category: string) => {
    setHadithLoading(true);
    // Mocking hadith fetch since robust comprehensive open API without auth is hard to guarantee 
    // for specific targeted english translated queries instantly.
    setTimeout(() => {
      const mocks: Record<string, any[]> = {
        'Fasting (Sawm)': [
          { text: "Whoever fasts Ramadan out of faith and in the hope of reward, his previous sins will be forgiven.", narrator: "Abu Hurairah", source: "Sahih al-Bukhari 38" },
          { text: "Fasting is a shield with which a servant protects himself from the Fire.", narrator: "Jabir bin Abdullah", source: "Musnad Ahmad" },
          { text: "There is a gate in Paradise called Ar-Raiyan, and those who observe fasts will enter through it on the Day of Resurrection and none except them will enter through it.", narrator: "Sahl", source: "Sahih al-Bukhari 1896" }
        ],
        'Charity (Sadaqah)': [
          { text: "Charity does not decrease wealth.", narrator: "Abu Hurairah", source: "Sahih Muslim 2588" },
          { text: "Protect yourself from hell-fire even by giving a piece of date as charity.", narrator: "Adi bin Hatim", source: "Sahih al-Bukhari 1417" }
        ],
        'Prayer (Salah)': [
          { text: "The difference between an authentic Muslim and a disbeliever is the abandonment of Salah (prayer).", narrator: "Jabir bin Abdullah", source: "Sahih Muslim 82" },
          { text: "The first matter that the slave will be brought to account for on the Day of Judgment is the prayer.", narrator: "Abu Hurairah", source: "Sunan an-Nasa'i 466" }
        ],
        'Patience (Sabr)': [
          { text: "No one can be given a blessing better and greater than patience.", narrator: "Abu Said Al-Khudri", source: "Sahih al-Bukhari 1469" },
          { text: "How wonderful is the case of a believer; there is good for him in everything... If adversity befalls him, he is patient and that is good for him.", narrator: "Suhaib", source: "Sahih Muslim 2999" }
        ],
        'Night prayer (Tahajjud)': [
          { text: "The best prayer after the obligatory prayers is the night prayer.", narrator: "Abu Hurairah", source: "Sahih Muslim 1163" },
          { text: "Our Lord, the Blessed, the Superior, comes every night down on the nearest Heaven to us when the last third of the night remains...", narrator: "Abu Hurairah", source: "Sahih al-Bukhari 1145" }
        ]
      };
      
      setHadithList(mocks[category] || []);
      setHadithLoading(false);
    }, 600);
  };

  const playAudio = (url: string, ayahNumber: number) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    
    audio.onended = () => {
      setPlayingAyah(null);
      // Auto-play next ayah logic could go here
    };

    audio.play();
    setPlayingAyah(ayahNumber);
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingAyah(null);
    }
  };

  const handleTasbihTap = () => {
    if (tasbihCount < tasbihGoal) {
      setTasbihCount(prev => {
        const next = prev + 1;
        updateRamadanTracker(currentUser.uid, { tasbihCount: next, tasbihGoal, selectedZikr });
        return next;
      });
    } else {
      if ("vibrate" in navigator) navigator.vibrate([100, 50, 100]); // Goal reached vibration
      toast.success(`Goal of ${tasbihGoal} completed for ${selectedZikr}!`);
      setTasbihCount(0);
      updateRamadanTracker(currentUser.uid, { tasbihCount: 0 });
    }
  };

  const toggleChecklist = (key: string) => {
    setDailyChecklist(prev => {
      const next = {...prev, [key]: !prev[key]};
      updateRamadanTracker(currentUser.uid, { dailyChecklist: next });
      return next;
    });
  };

  const handleFastingStatus = (day: number, status: 'completed' | 'missed' | 'pending') => {
    setFastingStatus(prev => {
      const next = {...prev, [day]: status};
      updateRamadanTracker(currentUser.uid, { fastingStatus: next });
      return next;
    });
    toast.success(`Day ${day} marked as ${status}`);
  };

  const filteredSurahs = surahs.filter(s => 
    s.englishName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.englishNameTranslation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 px-4 sm:px-6">
      
      {/* Top Navigation Banner */}
      <div className="bg-emerald-900 rounded-3xl p-6 md:p-10 text-white overflow-hidden relative shadow-2xl mt-6 border-b-4 border-emerald-600">
        <div className="absolute top-0 right-0 opacity-10 transform translate-x-10 -translate-y-10 pointer-events-none">
          <Moon size={300} className="text-emerald-100 fill-emerald-100" />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold font-serif mb-2">Islamic Hub</h1>
          <p className="text-emerald-100 mb-8 max-w-xl text-sm md:text-base leading-relaxed">Your comprehensive ecosystem for Quran, Hadith, Salah, and Learning.</p>
          
          {/* Main Tabs */}
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setActiveTab('quran')} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition shadow-sm ${activeTab === 'quran' ? 'bg-white text-emerald-900' : 'bg-emerald-800/80 hover:bg-emerald-700 text-white'}`}><BookOpen size={16}/> Quran</button>
            <button onClick={() => setActiveTab('hadith')} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition shadow-sm ${activeTab === 'hadith' ? 'bg-white text-emerald-900' : 'bg-emerald-800/80 hover:bg-emerald-700 text-white'}`}><FileText size={16}/> Hadith</button>
            <button onClick={() => setActiveTab('prayer')} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition shadow-sm ${activeTab === 'prayer' ? 'bg-white text-emerald-900' : 'bg-emerald-800/80 hover:bg-emerald-700 text-white'}`}><Compass size={16}/> Prayer & Qibla</button>
            <button onClick={() => setActiveTab('tasbih')} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition shadow-sm ${activeTab === 'tasbih' ? 'bg-white text-emerald-900' : 'bg-emerald-800/80 hover:bg-emerald-700 text-white'}`}><HeartPulse size={16}/> Tasbih & Zikr</button>
            <button onClick={() => setActiveTab('ramadan')} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition shadow-sm ${activeTab === 'ramadan' ? 'bg-white text-emerald-900' : 'bg-emerald-800/80 hover:bg-emerald-700 text-white'}`}><Moon size={16} className="fill-current"/> Ramadan Planner</button>
          </div>
        </div>
      </div>

      {/* --- QURAN SYSTEM --- */}
      {activeTab === 'quran' && (
        <div className="space-y-6">
          {selectedSurah ? (
            <div className="space-y-6">
              <Button variant="outline" onClick={() => {setSelectedSurah(null); setSurahData(null); stopAudio();}} className="gap-2">
                <ChevronRight className="rotate-180" size={16}/> Back to Surahs
              </Button>
              
              {quranLoading ? <div className="py-20 text-center"><Loader /></div> : surahData && (
                <>
                  <div className="text-center py-8 border-b dark:border-gray-800">
                    <h2 className="text-4xl md:text-5xl font-bold font-serif text-emerald-800 dark:text-emerald-400 mb-4">{surahData.name}</h2>
                    <p className="text-xl text-gray-600 dark:text-gray-400">{surahData.englishName}</p>
                    <p className="text-sm rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 inline-block px-4 py-1 uppercase tracking-widest mt-4 font-bold">{surahData.revelationType} • {surahData.ayahs.length} Ayahs</p>
                  </div>

                  <div className="space-y-8 mt-8">
                    {/* Bismillah before every Surah except Surah At-Tawbah (9) */}
                    {selectedSurah !== 9 && (
                      <div className="text-center text-3xl md:text-4xl font-serif text-gray-900 dark:text-white py-8 tracking-widest">
                        بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                      </div>
                    )}

                    {surahData.ayahs.map((ayah: any) => (
                      <div key={ayah.number} className={`p-6 md:p-8 rounded-3xl border transition-colors shadow-sm ${playingAyah === ayah.number ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-700 ring-2 ring-emerald-500/20' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
                        <div className="flex justify-between items-start mb-8">
                          <span className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-900 rounded-full font-bold text-emerald-700 dark:text-emerald-400 border border-gray-200 dark:border-gray-700 shadow-sm">{ayah.number}</span>
                          <div className="flex gap-2">
                            {playingAyah === ayah.number ? (
                              <button onClick={stopAudio} className="p-2.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-full transition-colors"><Pause size={20}/></button>
                            ) : (
                              <button onClick={() => playAudio(ayah.audio, ayah.number)} className="p-2.5 bg-emerald-100 text-emerald-600 hover:bg-emerald-200 rounded-full transition-colors"><Play size={20}/></button>
                            )}
                            <button className="p-2.5 bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-emerald-600 dark:bg-gray-700 dark:text-gray-300 rounded-full transition-colors"><Bookmark size={20}/></button>
                            <button className="p-2.5 bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-emerald-600 dark:bg-gray-700 dark:text-gray-300 rounded-full transition-colors"><Share2 size={20}/></button>
                          </div>
                        </div>

                        <div className="text-right text-3xl md:text-4xl leading-[2.2] md:leading-[2.5] font-serif text-gray-900 dark:text-white mb-8" dir="rtl">
                          {ayah.arabic}
                        </div>
                        
                        <div className="text-gray-600 dark:text-gray-300 text-lg md:text-xl border-t dark:border-gray-700 pt-6 leading-relaxed font-sans">
                          {ayah.translation}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-4 mb-6 relative z-10">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <Input 
                    placeholder="Search Surahs (e.g. Al-Baqarah)..." 
                    className="pl-12 py-4 bg-white dark:bg-gray-800 text-lg rounded-2xl shadow-sm border-gray-200 dark:border-gray-700"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button variant="outline" className="rounded-2xl px-6 py-4 h-auto shadow-sm"><Filter size={20} className="mr-2"/> Filter</Button>
              </div>

              {quranLoading ? <div className="py-20 text-center"><Loader /></div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredSurahs.map((surah, i) => (
                    <div 
                      key={surah.number} 
                      onClick={() => fetchSurahDetails(surah.number)}
                      className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-xl transition-all duration-300 cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold group-hover:scale-110 group-hover:bg-emerald-100 transition-all text-lg shadow-sm">
                          {surah.number}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 text-lg mb-0.5">{surah.englishName}</h3>
                          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{surah.revelationType} • {surah.numberOfAyahs} Ayahs</p>
                        </div>
                      </div>
                      <div className="text-2xl font-serif text-emerald-800 dark:text-emerald-300 opacity-80 group-hover:opacity-100 transition-opacity">
                        {surah.name.replace('سُورَةُ ', '')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* --- HADITH SYSTEM --- */}
      {activeTab === 'hadith' && (
        <div className="space-y-6">
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide py-2">
            {hadithCategories.map(cat => (
              <button 
                key={cat}
                onClick={() => setActiveHadithCategory(cat)}
                className={`px-6 py-3 whitespace-nowrap rounded-2xl text-sm font-bold transition-all shadow-sm ${activeHadithCategory === cat ? 'bg-emerald-600 text-white shadow-emerald-500/20 shadow-lg scale-105 ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-gray-900' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 border border-gray-200 dark:border-gray-700 hover:border-emerald-300'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {hadithLoading ? <div className="py-20 text-center"><Loader /></div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {hadithList.map((hadith, index) => (
                <Card key={index} className="p-8 border-transparent shadow-md hover:shadow-xl transition-all duration-300 group hover:-translate-y-1">
                  <div className="flex justify-between items-start mb-6">
                    <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 uppercase tracking-wide">
                      <Star size={12} className="fill-current text-amber-500" /> {hadith.source}
                    </span>
                    <button className="text-gray-400 hover:text-emerald-600 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><Bookmark size={18} /></button>
                  </div>
                  <p className="text-xl font-serif text-gray-900 dark:text-white leading-relaxed mb-6">
                    "{hadith.text}"
                  </p>
                  <p className="text-emerald-700 dark:text-emerald-400 font-medium font-sans flex items-center gap-2 text-sm mt-auto">
                    <div className="w-6 h-[2px] bg-emerald-500 rounded-full"></div> 
                    Narrated by {hadith.narrator}
                  </p>
                </Card>
              ))}
              
              {hadithList.length === 0 && (
                 <div className="col-span-full py-20 text-center text-gray-500 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
                    <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-lg font-medium text-gray-900 dark:text-white">No hadiths found</p>
                    <p className="text-sm">Please try selecting a different category.</p>
                 </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- RAMADAN PLANNER --- */}
      {activeTab === 'ramadan' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Daily Routine / Checklist */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-0 overflow-hidden shadow-lg border-0 bg-gradient-to-br from-emerald-800 to-emerald-900 text-white">
                <div className="p-8 relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div>
                    <h2 className="text-3xl font-bold font-serif mb-2 flex items-center gap-3">
                      <Moon className="text-amber-300 fill-amber-300" size={28}/> 
                      Ramadan Day {ramadanDay}
                    </h2>
                    <p className="text-emerald-100 flex items-center gap-2"><MapPin size={16}/> Timezone: Makkah Region</p>
                  </div>
                  <div className="flex items-center gap-6 bg-black/20 p-4 rounded-2xl backdrop-blur-md border border-white/10">
                    <div className="text-center">
                      <p className="text-emerald-200 text-sm font-medium mb-1 uppercase tracking-wider">Suhoor Ends</p>
                      <p className="text-2xl font-bold text-white">04:32 AM</p>
                    </div>
                    <div className="w-px h-12 bg-white/20"></div>
                    <div className="text-center">
                      <p className="text-amber-200 text-sm font-medium mb-1 uppercase tracking-wider">Iftar Time</p>
                      <p className="text-2xl font-bold text-amber-300">06:45 PM</p>
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar of Ramadan */}
                <div className="bg-emerald-950 px-8 py-5">
                  <div className="flex justify-between text-sm mb-2 font-medium">
                    <span className="text-emerald-200">Ramadan Progress</span>
                    <span className="text-white bg-emerald-700 px-2 py-0.5 rounded-full">{Math.round((ramadanDay/30)*100)}%</span>
                  </div>
                  <div className="w-full bg-emerald-900 rounded-full h-3 blur-[0.5px]">
                    <div className="bg-gradient-to-r from-emerald-400 to-amber-300 h-3 rounded-full transition-all duration-1000" style={{ width: `${(ramadanDay/30)*100}%` }}></div>
                  </div>
                </div>
              </Card>

              <Card className="p-8 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <ListTodo className="text-emerald-600" size={24}/> Daily Ibadah Checklist
                  </h3>
                  <span className="text-sm bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 px-3 py-1 rounded-full font-bold">
                    {Object.values(dailyChecklist).filter(Boolean).length} / 8 Completed
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: 'fajr', label: 'Fajr Prayer', icon: Sun },
                    { id: 'dhuhr', label: 'Dhuhr Prayer', icon: Compass },
                    { id: 'asr', label: 'Asr Prayer', icon: Compass },
                    { id: 'maghrib', label: 'Maghrib Prayer', icon: Moon },
                    { id: 'isha', label: 'Isha Prayer', icon: Clock },
                    { id: 'taraweeh', label: 'Taraweeh Prayer', icon: Star },
                    { id: 'quran', label: 'Read Quran (1 Juz)', icon: BookOpen },
                    { id: 'zikr', label: 'Morning/Evening Zikr', icon: HeartPulse }
                  ].map(task => (
                    <label 
                      key={task.id} 
                      className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${dailyChecklist[task.id] ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-gray-200 dark:border-gray-700'}`}
                    >
                      <div className={`p-2 rounded-xl text-white ${dailyChecklist[task.id] ? 'bg-emerald-500 shadow-md shadow-emerald-500/20' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                        {dailyChecklist[task.id] ? <CheckCircle size={20} /> : <task.icon size={20} />}
                      </div>
                      <span className={`flex-1 font-medium text-base ${dailyChecklist[task.id] ? 'text-emerald-800 dark:text-emerald-300 line-through opacity-70' : 'text-gray-900 dark:text-white'}`}>
                        {task.label}
                      </span>
                      <input 
                        type="checkbox" 
                        checked={dailyChecklist[task.id]} 
                        onChange={() => toggleChecklist(task.id)}
                        className="w-6 h-6 text-emerald-600 rounded-md border-gray-300 focus:ring-emerald-500 accent-emerald-600"
                      />
                    </label>
                  ))}
                </div>
              </Card>
            </div>

            {/* Fasting Tracker Grid */}
            <div className="col-span-1 space-y-6">
              <Card className="p-6 md:p-8 shadow-sm border-t-4 border-t-emerald-500">
                <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="text-emerald-600"/> Fasting Tracker
                </h3>
                
                <div className="grid grid-cols-5 gap-2 sm:gap-3">
                  {Array.from({ length: 30 }).map((_, i) => {
                    const day = i + 1;
                    const status = fastingStatus[day];
                    return (
                      <button
                        key={day}
                        title={`Day ${day}`}
                        onClick={() => {
                          if (status === 'completed') handleFastingStatus(day, 'missed');
                          else if (status === 'missed') handleFastingStatus(day, 'pending');
                          else handleFastingStatus(day, 'completed');
                        }}
                        className={`aspect-square flex items-center justify-center rounded-xl text-sm font-bold transition-all
                          ${status === 'completed' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-105' : 
                            status === 'missed' ? 'bg-red-500 text-white shadow-md shadow-red-500/20 scale-105' : 
                            'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}
                        `}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
                
                <div className="mt-8 space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400 font-medium"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Completed</span>
                    <span className="font-bold text-gray-900 dark:text-white">{Object.values(fastingStatus).filter(s => s === 'completed').length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400 font-medium"><div className="w-3 h-3 rounded-full bg-red-500"></div> Missed (To Makeup)</span>
                    <span className="font-bold text-gray-900 dark:text-white">{Object.values(fastingStatus).filter(s => s === 'missed').length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400 font-medium"><div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600"></div> Pending</span>
                    <span className="font-bold text-gray-900 dark:text-white">{Object.values(fastingStatus).filter(s => s === 'pending').length}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-8 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10 border border-amber-200 dark:border-amber-800/50 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-10">
                  <Target size={120} className="fill-amber-500 text-amber-500" />
                </div>
                <h3 className="text-xl font-bold mb-6 text-amber-900 dark:text-amber-400 flex items-center gap-2 relative z-10">
                  <Star className="text-amber-600 fill-amber-600" size={20}/> Ramadan Goals
                </h3>
                <ul className="space-y-3 text-amber-800 dark:text-amber-300 relative z-10 font-medium text-sm">
                  <li className="flex items-center gap-3 bg-white/60 dark:bg-black/20 p-3.5 rounded-xl border border-amber-200 dark:border-amber-700/50 shadow-sm backdrop-blur-sm">
                    <BookOpen size={16} className="text-amber-600"/> Complete Quran entirely
                  </li>
                  <li className="flex items-center gap-3 bg-white/60 dark:bg-black/20 p-3.5 rounded-xl border border-amber-200 dark:border-amber-700/50 shadow-sm backdrop-blur-sm">
                    <HeartPulse size={16} className="text-amber-600"/> Give daily charity (Sadaqah)
                  </li>
                  <li className="flex items-center gap-3 bg-white/60 dark:bg-black/20 p-3.5 rounded-xl border border-amber-200 dark:border-amber-700/50 shadow-sm backdrop-blur-sm">
                    <Compass size={16} className="text-amber-600"/> Attend Taraweeh nightly
                  </li>
                  <li className="flex items-center gap-3 bg-white/60 dark:bg-black/20 p-3.5 rounded-xl border border-amber-200 dark:border-amber-700/50 shadow-sm backdrop-blur-sm">
                    <TrendingUp size={16} className="text-amber-600"/> Pray Qiyamul Layl (Tahajjud)
                  </li>
                </ul>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* --- PRAYER TIMES SYSTEM --- */}
      {activeTab === 'prayer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-8 bg-gradient-to-br from-emerald-800 to-emerald-950 text-white overflow-hidden relative shadow-xl border-0">
              <div className="absolute right-0 top-0 opacity-10 transform translate-x-12 -translate-y-8 pointer-events-none">
                 <Globe size={300} />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                  <h2 className="text-3xl font-bold font-serif mb-2">Prayer Times</h2>
                  <p className="text-emerald-200 flex items-center gap-2 text-sm uppercase tracking-widest"><MapPin size={16}/> Auto-detected via GPS</p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold break-words">{format(new Date(), 'hh:mm a')}</p>
                  <p className="text-emerald-300 mt-1">{format(new Date(), 'EEEE, MMMM do, yyyy')}</p>
                </div>
              </div>
              
              {prayerTimes ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(prayer => (
                    <div key={prayer} className="bg-white/10 backdrop-blur-md p-5 rounded-2xl text-center border border-white/20 hover:bg-white/20 transition-all cursor-default">
                      <h4 className="text-emerald-100 font-medium mb-2 uppercase tracking-wider text-sm">{prayer}</h4>
                      <p className="text-3xl font-bold font-serif">{prayerTimes[prayer]}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-emerald-200 bg-black/20 rounded-2xl backdrop-blur-sm border border-white/10">
                  {locationError ? <p className="font-medium flex items-center justify-center gap-2"><AlertTriangle className="text-amber-400"/> {locationError}</p> : <Loader />}
                </div>
              )}
            </Card>

            <Card className="p-8 shadow-sm">
               <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-white"><CheckCircle className="text-emerald-600"/> Daily Prayer Tracker</h3>
               <div className="flex flex-col gap-4">
                 {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(prayer => (
                   <label key={prayer} className="flex justify-between items-center p-5 border border-gray-200 dark:border-gray-700 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors shadow-sm bg-white dark:bg-gray-800">
                     <span className="font-bold text-lg text-gray-900 dark:text-white">{prayer}</span>
                     <input type="checkbox" className="w-6 h-6 text-emerald-600 rounded-md border-gray-300 focus:ring-emerald-500 accent-emerald-600" />
                   </label>
                 ))}
               </div>
            </Card>
          </div>
          
          <div className="col-span-1 space-y-6">
               <Card className="p-8 text-center shadow-sm relative overflow-hidden">
                 <h3 className="text-xl font-bold mb-8 text-gray-900 dark:text-white">Qibla Direction</h3>
                 
                 {!hasCompassPerm && (
                   <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center">
                     <Compass size={48} className="text-emerald-500 mb-4" />
                     <p className="text-gray-900 dark:text-white font-bold mb-2">Compass Calibration</p>
                     <p className="text-sm text-gray-500 mb-4">We need access to your device's compass to point you towards the Kaaba.</p>
                     <Button onClick={requestCompassPermission} variant="primary">Enable Compass</Button>
                   </div>
                 )}

                 <div className="w-full aspect-square bg-gray-50 dark:bg-gray-800 rounded-full border-[12px] border-emerald-50 dark:border-emerald-900/20 flex flex-col items-center justify-center relative shadow-inner ring-1 ring-gray-200 dark:ring-gray-700 mx-auto max-w-sm" style={{ transform: `rotate(${-compassHeading}deg)`, transition: 'transform 0.1s ease-out' }}>
                    <div className="absolute inset-0 flex items-center justify-center" style={{ transform: `rotate(${qiblaDirection}deg)` }}>
                      <Navigation size={80} className="text-red-500 -translate-y-12 filter drop-shadow-md" fill="currentColor" />
                    </div>
                    <div className="absolute w-full h-[1px] bg-gray-300 dark:bg-gray-700"></div>
                    <div className="absolute h-full w-[1px] bg-gray-300 dark:bg-gray-700"></div>
                    
                    {/* Compass markings */}
                    <div className="absolute top-4 font-bold text-gray-400">N</div>
                    <div className="absolute bottom-4 font-bold text-gray-400">S</div>
                    <div className="absolute right-4 font-bold text-gray-400">E</div>
                    <div className="absolute left-4 font-bold text-gray-400">W</div>
                 </div>
                 <div className="mt-8">
                   <p className="text-2xl font-bold text-emerald-600 mb-1">{Math.round(qiblaDirection)}°</p>
                   <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">Turn your device until the red arrow points straight up to face the Kaaba.</p>
                 </div>
               </Card>
          </div>
        </div>
      )}

      {/* --- TASBIH & ZIKR --- */}
      {activeTab === 'tasbih' && (
        <div className="max-w-3xl mx-auto text-center space-y-8 pb-10">
          
          <Card className="p-8 md:p-12 shadow-xl border-t-4 border-t-emerald-500">
            <h2 className="text-3xl font-bold font-serif text-gray-900 dark:text-white mb-2">Digital Tasbih Counter</h2>
            <p className="text-gray-500 mb-8">Maintain your daily remembrance of Allah focusing on mindfulness.</p>
            
            <div className="flex justify-center gap-3 mt-6 mb-12 flex-wrap">
              {['Subhanallah', 'Alhamdulillah', 'Allahu Akbar', 'Astaghfirullah', 'La Ilaha Illallah'].map(zikr => (
                <button 
                  key={zikr}
                  onClick={() => {
                    setSelectedZikr(zikr); 
                    setTasbihCount(0);
                    updateRamadanTracker(currentUser.uid, { selectedZikr: zikr, tasbihCount: 0 });
                  }}
                  className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${selectedZikr === zikr ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 border border-transparent hover:border-gray-300'}`}
                >
                  {zikr}
                </button>
              ))}
            </div>

            <div className="mb-12 relative inline-block">
              <div className="absolute inset-0 bg-emerald-100 dark:bg-emerald-900/20 blur-3xl rounded-full opacity-50"></div>
              <div className="relative">
                <span className="text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-[0.3em] text-sm md:text-base">{selectedZikr}</span>
                <div className="text-8xl md:text-[150px] font-black text-gray-900 dark:text-white my-6 tabular-nums tracking-tighter leading-none">
                  {tasbihCount}
                </div>
                <div className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-1.5 rounded-full text-gray-500 font-bold text-sm">
                  <Target size={16}/> Goal: {tasbihGoal}
                </div>
              </div>
            </div>

            <button 
              onClick={handleTasbihTap}
              className="w-56 h-56 mx-auto rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 shadow-[0_20px_60px_-15px_rgba(16,185,129,0.6)] flex items-center justify-center active:scale-95 transition-transform group focus:outline-none focus:ring-8 focus:ring-emerald-500/20"
            >
              <div className="w-48 h-48 rounded-full border-[6px] border-white/20 flex flex-col items-center justify-center group-hover:border-white/40 transition-colors">
                <span className="text-white text-2xl font-black tracking-[0.2em] uppercase">TAP</span>
                <span className="text-emerald-100 text-sm mt-2 opacity-70 font-medium">To Count</span>
              </div>
            </button>
            
            <div className="flex justify-center mt-12 gap-4">
              <Button variant="outline" onClick={() => {
                setTasbihCount(0);
                updateRamadanTracker(currentUser.uid, { tasbihCount: 0 });
              }} className="w-40 rounded-xl h-12 shadow-sm font-bold text-gray-600 hover:text-emerald-600 hover:border-emerald-200"><RefreshCcw size={18} className="mr-2"/> Reset Counter</Button>
              <Button variant="outline" onClick={() => {
                const nextGoal = tasbihGoal === 33 ? 99 : (tasbihGoal === 99 ? 100 : 33);
                setTasbihGoal(nextGoal);
                updateRamadanTracker(currentUser.uid, { tasbihGoal: nextGoal });
              }} className="w-40 rounded-xl h-12 shadow-sm font-bold text-gray-600 hover:text-emerald-600 hover:border-emerald-200"><Settings size={18} className="mr-2"/> Change Goal</Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
};

// Simple MapPin fix for imports locally above
const MapPin = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
);
const RefreshCcw = ({ size, className }: { size: number, className: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>
);
const AlertTriangle = ({ className }: { className: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
);
const FileText = ({ size, className }: { size?: number, className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
);
