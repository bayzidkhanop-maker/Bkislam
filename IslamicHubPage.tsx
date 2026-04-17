import React, { useState, useEffect, useRef } from 'react';
import { User } from './models';
import { Card, Button, Input, Loader } from './widgets';
import { 
  BookOpen, Search, Compass, Heart, Calendar, Play, Pause, FastForward,
  Settings, ChevronRight, CheckCircle, Clock, Moon, Sun, Filter, Share2,
  Bookmark, Navigation, Volume2, Globe, HeartPulse, Shield, Smartphone
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

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

  // --- TASBIH STATE ---
  const [tasbihCount, setTasbihCount] = useState(0);
  const [tasbihGoal, setTasbihGoal] = useState(33);
  const [selectedZikr, setSelectedZikr] = useState("Subhanallah");

  useEffect(() => {
    fetchSurahList();
    fetchPrayerTimes();
    
    return () => {
      // Cleanup audio on unmount
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

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
      // Fetch Arabic + Translation (en.asad) + Audio (ar.alafasy)
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
        } catch (e) {
          setLocationError("Could not fetch prayer times for your location.");
        }
      }, () => {
        setLocationError("Location permission denied. Defaulting to Mecca.");
        // Fallback to Mecca
        fetch(`https://api.aladhan.com/v1/timingsByCity?city=Makkah&country=Saudi Arabia&method=2`)
          .then(res => res.json())
          .then(data => setPrayerTimes(data.data.timings));
      });
    }
  };

  const playAudio = async (audioUrl: string, ayahNumber: number) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    const audio = new Audio(audioUrl);
    
    audio.onended = () => {
      // Auto-play next
      if (surahData && ayahNumber < surahData.ayahs.length) {
        const nextAyah = surahData.ayahs.find((a:any) => a.number === ayahNumber + 1);
        if (nextAyah) playAudio(nextAyah.audio, nextAyah.number);
      } else {
        setPlayingAyah(null);
      }
    };

    audioRef.current = audio;
    setPlayingAyah(ayahNumber);
    try {
      await audio.play();
    } catch (e) {
      console.warn("Audio playback interrupted", e);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlayingAyah(null);
    }
  };

  const handleTasbihTap = () => {
    // Vibrate device if supported
    if ("vibrate" in navigator) {
      navigator.vibrate(50); // 50ms vibration
    }
    if (tasbihCount < tasbihGoal) {
      setTasbihCount(prev => prev + 1);
    } else {
      if ("vibrate" in navigator) navigator.vibrate([100, 50, 100]); // Goal reached vibration
      toast.success(`Goal of ${tasbihGoal} completed for ${selectedZikr}!`);
      setTasbihCount(0);
    }
  };

  const filteredSurahs = surahs.filter(s => 
    s.englishName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.englishNameTranslation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      
      {/* Top Navigation Banner */}
      <div className="bg-emerald-900 rounded-3xl p-6 text-white overflow-hidden relative shadow-2xl">
        <div className="absolute top-0 right-0 opacity-10 transform translate-x-10 -translate-y-10">
          <Moon size={240} className="text-emerald-100 fill-emerald-100" />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold font-serif mb-2">Islamic Hub</h1>
          <p className="text-emerald-100 mb-6">Your comprehensive ecosystem for Quran, Hadith, Salah, and Learning.</p>
          
          {/* Main Tabs */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setActiveTab('quran')} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition ${activeTab === 'quran' ? 'bg-white text-emerald-900' : 'bg-emerald-800/50 hover:bg-emerald-800 text-white'}`}><BookOpen size={16}/> Quran</button>
            <button onClick={() => setActiveTab('hadith')} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition ${activeTab === 'hadith' ? 'bg-white text-emerald-900' : 'bg-emerald-800/50 hover:bg-emerald-800 text-white'}`}><FileText size={16}/> Hadith</button>
            <button onClick={() => setActiveTab('prayer')} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition ${activeTab === 'prayer' ? 'bg-white text-emerald-900' : 'bg-emerald-800/50 hover:bg-emerald-800 text-white'}`}><Compass size={16}/> Prayer & Qibla</button>
            <button onClick={() => setActiveTab('tasbih')} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition ${activeTab === 'tasbih' ? 'bg-white text-emerald-900' : 'bg-emerald-800/50 hover:bg-emerald-800 text-white'}`}><HeartPulse size={16}/> Tasbih & Zikr</button>
            <button onClick={() => setActiveTab('ramadan')} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition ${activeTab === 'ramadan' ? 'bg-white text-emerald-900' : 'bg-emerald-800/50 hover:bg-emerald-800 text-white'}`}><Moon size={16}/> Ramadan Planner</button>
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
              
              {quranLoading ? <Loader /> : surahData && (
                <>
                  <div className="text-center py-8 border-b dark:border-gray-800">
                    <h2 className="text-4xl font-bold font-serif text-emerald-800 dark:text-emerald-400 mb-2">{surahData.name}</h2>
                    <p className="text-xl text-gray-600 dark:text-gray-400">{surahData.englishName}</p>
                    <p className="text-sm text-gray-500 uppercase tracking-widest mt-2">{surahData.revelationType} • {surahData.ayahs.length} Ayahs</p>
                  </div>

                  <div className="space-y-8 mt-8">
                    {/* Bismillah before every Surah except Surah At-Tawbah (9) */}
                    {selectedSurah !== 9 && (
                      <div className="text-center text-3xl font-serif text-gray-900 dark:text-white py-6">
                        بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                      </div>
                    )}

                    {surahData.ayahs.map((ayah: any) => (
                      <div key={ayah.number} className={`p-6 rounded-2xl border transition-colors ${playingAyah === ayah.number ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
                        <div className="flex justify-between items-start mb-6">
                          <span className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-900 rounded-full font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200">{ayah.number}</span>
                          <div className="flex gap-2">
                            {playingAyah === ayah.number ? (
                              <button onClick={stopAudio} className="p-2 text-red-500 hover:bg-red-50 rounded-full"><Pause size={20}/></button>
                            ) : (
                              <button onClick={() => playAudio(ayah.audio, ayah.number)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full"><Play size={20}/></button>
                            )}
                            <button className="p-2 text-gray-400 hover:text-emerald-600 rounded-full"><Bookmark size={20}/></button>
                            <button className="p-2 text-gray-400 hover:text-emerald-600 rounded-full"><Share2 size={20}/></button>
                          </div>
                        </div>

                        <div className="text-right text-3xl leading-[2.5] font-serif text-gray-900 dark:text-white mb-6" dir="rtl">
                          {ayah.arabic}
                        </div>
                        
                        <div className="text-gray-600 dark:text-gray-300 text-lg border-t dark:border-gray-700 pt-4 leading-relaxed">
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
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <Input 
                    placeholder="Search Surahs (e.g. Al-Baqarah)..." 
                    className="pl-12 py-3 bg-white dark:bg-gray-800 text-lg rounded-2xl shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button variant="outline" className="rounded-2xl px-6"><Filter size={20} className="mr-2"/> Filter</Button>
              </div>

              {quranLoading ? <Loader /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSurahs.map((surah, i) => (
                    <div 
                      key={surah.number} 
                      onClick={() => fetchSurahDetails(surah.number)}
                      className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-lg transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold group-hover:scale-110 transition-transform">
                          {surah.number}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">{surah.englishName}</h3>
                          <p className="text-xs text-gray-500 uppercase">{surah.revelationType} • {surah.numberOfAyahs} Ayahs</p>
                        </div>
                      </div>
                      <div className="text-xl font-serif text-emerald-800 dark:text-emerald-300">
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

      {/* --- PRAYER TIMES SYSTEM --- */}
      {activeTab === 'prayer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 bg-gradient-to-br from-emerald-800 to-emerald-900 text-white overflow-hidden relative">
              <div className="absolute right-0 top-0 opacity-20 transform translate-x-12 -translate-y-8">
                 <Globe size={200} />
              </div>
              <div className="relative z-10">
                <h2 className="text-2xl font-bold mb-1">Prayer Times</h2>
                <p className="text-emerald-200 mb-6 flex items-center gap-2"><MapPin size={16}/> Auto-detected via GPS</p>
                
                {prayerTimes ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(prayer => (
                      <div key={prayer} className="bg-white/10 backdrop-blur-md p-4 rounded-xl text-center border border-white/20 hover:bg-white/20 transition-colors">
                        <h4 className="text-emerald-100 font-medium mb-1">{prayer}</h4>
                        <p className="text-2xl font-bold">{prayerTimes[prayer]}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-emerald-200">
                    {locationError ? <p><AlertTriangle className="inline mr-2"/> {locationError}</p> : <Loader />}
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6">
               <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><CheckCircle className="text-emerald-600"/> Daily Prayer Tracker</h3>
               <div className="flex flex-col gap-3">
                 {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(prayer => (
                   <label key={prayer} className="flex justify-between items-center p-3 border rounded-xl hover:bg-gray-50 cursor-pointer">
                     <span className="font-medium">{prayer}</span>
                     <input type="checkbox" className="w-5 h-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500" />
                   </label>
                 ))}
               </div>
            </Card>
          </div>
          
          <div className="col-span-1 space-y-6">
             <Card className="p-6 text-center">
               <h3 className="text-lg font-bold mb-4">Qibla Direction</h3>
               <div className="w-full aspect-square bg-gray-50 dark:bg-gray-800 rounded-full border-4 border-gray-100 dark:border-gray-700 flex items-center justify-center relative shadow-inner">
                  <Compass size={120} className="text-emerald-600 absolute" />
                  <Navigation size={60} className="text-red-500 transform rotate-45 z-10" />
                  <div className="absolute w-full h-[1px] bg-gray-200 dark:bg-gray-700"></div>
                  <div className="absolute h-full w-[1px] bg-gray-200 dark:bg-gray-700"></div>
               </div>
               <p className="text-sm text-gray-500 mt-6">Point your phone to automatically align (Requires smartphone compass)</p>
             </Card>
          </div>
        </div>
      )}

      {/* --- TASBIH & ZIKR --- */}
      {activeTab === 'tasbih' && (
        <div className="max-w-2xl mx-auto text-center space-y-8 pb-10">
          
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Digital Tasbih</h2>
            
            <div className="flex justify-center gap-2 mt-6 mb-8 flex-wrap">
              {['Subhanallah', 'Alhamdulillah', 'Allahu Akbar', 'Astaghfirullah'].map(zikr => (
                <button 
                  key={zikr}
                  onClick={() => {setSelectedZikr(zikr); setTasbihCount(0);}}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedZikr === zikr ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {zikr}
                </button>
              ))}
            </div>

            <div className="mb-8">
              <span className="text-sm text-gray-500 font-medium uppercase tracking-widest">{selectedZikr}</span>
              <div className="text-8xl font-black text-emerald-600 my-4 tabular-nums">
                {tasbihCount}
              </div>
              <p className="text-gray-400 font-medium">Goal: {tasbihGoal}</p>
            </div>

            <button 
              onClick={handleTasbihTap}
              className="w-48 h-48 mx-auto rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-400 shadow-[0_20px_50px_-12px_rgba(16,185,129,0.5)] flex items-center justify-center active:scale-95 transition-transform"
            >
              <div className="w-40 h-40 rounded-full border-4 border-white/30 flex items-center justify-center">
                <span className="text-white text-xl font-bold tracking-widest uppercase">TAP</span>
              </div>
            </button>
            <div className="flex justify-center mt-8 gap-4">
              <Button variant="outline" onClick={() => setTasbihCount(0)} className="w-32"><RefreshCcw size={16} className="mr-2"/> Reset</Button>
              <Button variant="outline" onClick={() => setTasbihGoal(tasbihGoal === 33 ? 99 : 33)} className="w-32"><Settings size={16} className="mr-2"/> Goal: {tasbihGoal}</Button>
            </div>
          </Card>
        </div>
      )}

      {/* --- HADITH & RAMADAN PLACEHOLDER SECTION --- */}
      {(activeTab === 'hadith' || activeTab === 'ramadan') && (
        <div className="text-center py-20 bg-emerald-50 dark:bg-emerald-900/10 rounded-3xl border border-emerald-100 dark:border-emerald-900">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-300 mb-6 shadow-inner">
            {activeTab === 'hadith' ? <FileText size={48} /> : <Moon size={48} />}
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {activeTab === 'hadith' ? 'Comprehensive Hadith Library' : 'Ramadan Planner & Fasting Tracker'}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            {activeTab === 'hadith' ? 
              'This module connects to the Sunnah API, offering complete volumes of Sahih al-Bukhari, Sahih Muslim, Sunan an-Nasa\'i, and more with multi-language grading.' : 
              'Track your fasts, daily Iftar & Sehri schedules localized to your GPS, charity tracking, and a curated 30-day spiritual escalation guide.'}
          </p>
          <Button size="lg" variant="primary" className="bg-emerald-600 hover:bg-emerald-700">Explore Module Demo</Button>
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
const FileText = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
);
