import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, Bell, MessageSquare, Wallet, Globe, Moon, Sun, 
  Menu, X, ChevronDown, BookOpen, Trophy, Compass, 
  LogOut, User as UserIcon, Settings, ShieldAlert,
  Clock, MapPin, CheckCircle, WifiOff, Download, Mic
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from './models';
import { signOut } from './authService';
import { cn } from './widgets';

export const Header = ({ user, onMenuClick }: { user: User, onMenuClick: () => void }) => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const [lang, setLang] = useState('EN');
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Apply RTL for Arabic
  useEffect(() => {
    if (lang === 'AR') {
      document.documentElement.dir = 'rtl';
    } else {
      document.documentElement.dir = 'ltr';
    }
  }, [lang]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMegaMenu, setShowMegaMenu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const [showAyahPopup, setShowAyahPopup] = useState(false);

  // Handle PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const [isListening, setIsListening] = useState(false);
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const newSearches = [searchQuery.trim(), ...recentSearches.filter(s => s !== searchQuery.trim())].slice(0, 5);
      setRecentSearches(newSearches);
      localStorage.setItem('recentSearches', JSON.stringify(newSearches));
      setShowRecentSearches(false);
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const startVoiceSearch = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        navigate(`/search?q=${encodeURIComponent(transcript)}`);
      };
      recognition.onend = () => setIsListening(false);
      
      recognition.start();
    } else {
      alert("Voice search is not supported in your browser.");
    }
  };

  // Handle scroll events for sticky header and progress bar
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop;
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scroll = `${totalScroll / windowHeight}`;
      
      setScrollProgress(Number(scroll));
      setIsScrolled(totalScroll > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Theme toggle
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 left-0 right-0 z-50 flex flex-col">
      {/* Scroll Progress Bar */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 z-50 origin-left"
        style={{ transform: `scaleX(${scrollProgress})` }}
      />

      {/* Announcement Bar */}
      <AnimatePresence>
        {showAnnouncement && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-indigo-600 text-white text-xs sm:text-sm py-2 px-4 flex justify-between items-center"
          >
            <div className="flex items-center justify-center flex-1 gap-2">
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">New</span>
              <span>Ramadan Special: Get 50% off on all Islamic Courses! Use code <strong>RAMADAN50</strong></span>
            </div>
            <button onClick={() => setShowAnnouncement(false)} className="text-white/80 hover:text-white">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline Indicator */}
      <AnimatePresence>
        {isOffline && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-500 text-white text-xs py-1.5 px-4 flex justify-center items-center gap-2"
          >
            <WifiOff size={14} />
            <span>You are currently offline. Some features may not be available.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Navbar */}
      <div className={cn(
        "transition-all duration-300 border-b",
        isScrolled 
          ? "bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-gray-200 dark:border-gray-800 shadow-sm py-2" 
          : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 py-3"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            
            {/* Left: Logo & Mobile Menu */}
            <div className="flex items-center gap-4">
              <button 
                onClick={onMenuClick}
                className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <Menu size={24} />
              </button>
              
              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl leading-none">D</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight hidden sm:block">Deenstream</h1>
              </Link>

              {/* Desktop Mega Menu */}
              <nav className="hidden md:flex items-center ml-6 gap-1">
                <div 
                  className="relative group"
                  onMouseEnter={() => setShowMegaMenu('courses')}
                  onMouseLeave={() => setShowMegaMenu(null)}
                >
                  <button className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md transition-colors">
                    Courses <ChevronDown size={14} className="group-hover:rotate-180 transition-transform" />
                  </button>
                  
                  {/* Mega Menu Dropdown */}
                  <AnimatePresence>
                    {showMegaMenu === 'courses' && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full left-0 w-[600px] bg-white dark:bg-gray-800 shadow-xl rounded-xl border border-gray-100 dark:border-gray-700 p-6 grid grid-cols-2 gap-6"
                      >
                        <div>
                          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Categories</h3>
                          <ul className="space-y-2">
                            <li><Link to="/courses?category=islamic" className="text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 flex items-center gap-2"><BookOpen size={14}/> Islamic Studies</Link></li>
                            <li><Link to="/courses?category=tech" className="text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 flex items-center gap-2"><BookOpen size={14}/> Technology</Link></li>
                            <li><Link to="/courses?category=business" className="text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 flex items-center gap-2"><BookOpen size={14}/> Business</Link></li>
                          </ul>
                        </div>
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
                          <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-2">Featured Course</h3>
                          <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-md mb-2"></div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Mastering React 2026</p>
                          <Link to="/courses" className="text-xs text-indigo-600 font-bold mt-2 inline-block">Browse all courses &rarr;</Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Link to="/tournaments" className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md transition-colors flex items-center gap-1">
                  Tournaments <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded animate-pulse">LIVE</span>
                </Link>
              </nav>
            </div>

            {/* Center: Search Bar */}
            <div className="hidden lg:flex flex-1 max-w-md mx-8 relative">
              <form 
                className="relative w-full group"
                onSubmit={handleSearchSubmit}
              >
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="Search courses, tournaments, users..."
                  className="block w-full pl-10 pr-10 py-2 border border-gray-200 dark:border-gray-700 rounded-full leading-5 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all sm:text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowRecentSearches(true)}
                  onBlur={() => setTimeout(() => setShowRecentSearches(false), 200)}
                />
                <button 
                  type="button"
                  onClick={startVoiceSearch}
                  className={cn(
                    "absolute inset-y-0 right-0 pr-3 flex items-center transition-colors",
                    isListening ? "text-red-500 animate-pulse" : "text-gray-400 hover:text-indigo-500"
                  )}
                >
                  <Mic size={16} />
                </button>

                <AnimatePresence>
                  {showRecentSearches && recentSearches.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden z-50"
                    >
                      <div className="p-2 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Recent Searches</span>
                        <button 
                          type="button"
                          onClick={() => { setRecentSearches([]); localStorage.removeItem('recentSearches'); }}
                          className="text-xs text-indigo-600 hover:text-indigo-700"
                        >
                          Clear
                        </button>
                      </div>
                      <ul>
                        {recentSearches.map((search, idx) => (
                          <li key={idx}>
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery(search);
                                navigate(`/search?q=${encodeURIComponent(search)}`);
                                setShowRecentSearches(false);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <Search size={14} className="text-gray-400" />
                              {search}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </div>

            {/* Right: Actions & Profile */}
            <div className="flex items-center gap-2 sm:gap-4">
              
              {/* Islamic Features (Desktop) */}
              <div className="hidden xl:flex items-center gap-3 mr-2 border-r border-gray-200 dark:border-gray-700 pr-4 relative">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Next Prayer</span>
                  <span className="text-sm font-medium text-indigo-600 flex items-center gap-1"><Clock size={12}/> Asr 3:45 PM</span>
                </div>
                <button 
                  onClick={() => setShowAyahPopup(!showAyahPopup)}
                  className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors" 
                  title="Daily Ayah"
                >
                  <BookOpen size={18} />
                </button>
                <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors" title="Qibla Direction">
                  <Compass size={18} />
                </button>

                <AnimatePresence>
                  {showAyahPopup && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden z-50 p-4"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Ayah of the Day</h3>
                        <button onClick={() => setShowAyahPopup(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-white italic mb-2 text-right font-arabic" dir="rtl">
                        "إِنَّ مَعَ الْعُسْرِ يُسْرًا"
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        "Indeed, with hardship [will be] ease."
                      </p>
                      <p className="text-[10px] text-gray-500 mt-2 font-bold">Surah Ash-Sharh (94:6)</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Wallet Shortcut */}
              <Link to="/wallet" className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                <Wallet size={16} className="text-indigo-600" />
                <span className="text-sm font-bold text-gray-900 dark:text-white">৳ {(user.walletBalance || 0).toFixed(0)}</span>
              </Link>

              {/* PWA Install Button */}
              {deferredPrompt && (
                <button 
                  onClick={handleInstallClick}
                  className="hidden md:flex items-center gap-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-full transition-colors text-xs font-bold"
                >
                  <Download size={14} /> Install App
                </button>
              )}

              {/* Language Switcher */}
              <div className="relative hidden sm:block">
                <button 
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className="flex items-center gap-1 p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <Globe size={18} />
                  <span className="text-xs font-bold">{lang}</span>
                </button>

                <AnimatePresence>
                  {showLangMenu && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden z-50"
                    >
                      <div className="py-1">
                        <button onClick={() => { setLang('EN'); setShowLangMenu(false); }} className={cn("w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700", lang === 'EN' && "font-bold text-indigo-600")}>English (EN)</button>
                        <button onClick={() => { setLang('BN'); setShowLangMenu(false); }} className={cn("w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700", lang === 'BN' && "font-bold text-indigo-600")}>বাংলা (BN)</button>
                        <button onClick={() => { setLang('AR'); setShowLangMenu(false); }} className={cn("w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700", lang === 'AR' && "font-bold text-indigo-600")}>العربية (AR)</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Theme Toggle */}
              <button onClick={toggleTheme} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Chat */}
              <button className="relative p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <MessageSquare size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></span>
              </button>

              {/* Notifications */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <Bell size={18} />
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white dark:border-gray-900">3</span>
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden z-50"
                    >
                      <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
                        <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Mark all read</button>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        <div className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex gap-3 cursor-pointer transition-colors">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                            <Trophy size={14} className="text-indigo-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-900 dark:text-white"><span className="font-bold">Tournament Started!</span> Join the weekly coding challenge now.</p>
                            <p className="text-xs text-gray-500 mt-1">2 mins ago</p>
                          </div>
                        </div>
                        <div className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex gap-3 cursor-pointer transition-colors">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                            <Wallet size={14} className="text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-900 dark:text-white"><span className="font-bold">Payment Received</span> ৳ 500 has been added to your wallet.</p>
                            <p className="text-xs text-gray-500 mt-1">1 hour ago</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-2 border-t border-gray-100 dark:border-gray-700 text-center">
                        <Link to="/notifications" className="text-sm text-indigo-600 font-medium hover:underline">View all notifications</Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* User Profile Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <img 
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=random`} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                  />
                  <ChevronDown size={14} className="text-gray-500 hidden sm:block" />
                </button>

                <AnimatePresence>
                  {showProfileMenu && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden z-50"
                    >
                      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                        <p className="font-bold text-gray-900 dark:text-white truncate">{user.displayName}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800">
                          {user.role}
                        </div>
                      </div>
                      <div className="p-2">
                        <Link to={`/profile/${user.uid}`} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors">
                          <UserIcon size={16} /> My Profile
                        </Link>
                        <Link to="/courses" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors">
                          <BookOpen size={16} /> My Courses
                        </Link>
                        <Link to="/wallet" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors">
                          <Wallet size={16} /> Wallet & Payments
                        </Link>
                        <Link to="/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors">
                          <Settings size={16} /> Settings
                        </Link>
                        
                        {user.role === 'admin' && (
                          <Link to="/admin" className="flex items-center gap-2 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-md transition-colors mt-1 border-t border-gray-100 dark:border-gray-700 pt-2">
                            <ShieldAlert size={16} /> Admin Dashboard
                          </Link>
                        )}
                      </div>
                      <div className="p-2 border-t border-gray-100 dark:border-gray-700">
                        <button 
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                        >
                          <LogOut size={16} /> Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
