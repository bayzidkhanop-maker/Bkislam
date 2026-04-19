import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, User as UserIcon, PlusSquare, Bell, Search, Settings, LogOut, ShieldAlert, BookOpen, Wallet, Trophy, X, ChevronRight, MessageSquare, Moon } from 'lucide-react';
import { signOut } from './authService';
import { User } from './models';
import { cn } from './widgets';
import { Header } from './Header';
import { motion, AnimatePresence } from 'motion/react';

export const UserPanel = ({ user }: { user: User }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/islamic-hub', icon: Moon, label: 'Islamic Hub' },
    { path: '/courses', icon: BookOpen, label: 'Academy' },
    { path: '/library', icon: BookOpen, label: 'Library' },
    { path: '/tournaments', icon: Trophy, label: 'Tournaments' },
    { path: '/search', icon: Search, label: 'Search' },
    { path: '/inbox', icon: MessageSquare, label: 'Inbox' },
    { path: '/upload', icon: PlusSquare, label: 'Upload' },
    { path: '/wallet', icon: Wallet, label: 'Wallet' },
    { path: '/notifications', icon: Bell, label: 'Notifications' },
    { path: `/profile/${user.uid}`, icon: UserIcon, label: 'Profile' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(p => p);
    if (paths.length === 0) return null;

    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-4">
        <Link to="/" className="hover:text-indigo-600 transition-colors"><Home size={12} /></Link>
        {paths.map((path, index) => {
          const isLast = index === paths.length - 1;
          const routeTo = `/${paths.slice(0, index + 1).join('/')}`;
          const label = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');
          
          return (
            <React.Fragment key={path}>
              <ChevronRight size={12} />
              {isLast ? (
                <span className="font-semibold text-gray-900 dark:text-gray-300">{label}</span>
              ) : (
                <Link to={routeTo} className="hover:text-indigo-600 transition-colors">{label}</Link>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <Header user={user} onMenuClick={() => setIsMobileMenuOpen(true)} />

      {/* Mobile Slide-in Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 z-[60] md:hidden backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-white dark:bg-gray-900 z-[70] md:hidden flex flex-col shadow-2xl border-r border-gray-100 dark:border-gray-800"
            >
              <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                <Link to="/" className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xl leading-none">D</span>
                  </div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Deenstream</h1>
                </Link>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                <img 
                  src={user.avatarURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=random`} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                />
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>

              <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <Link 
                      key={item.path}
                      to={item.path} 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                        isActive 
                          ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-semibold" 
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                      )}
                    >
                      <Icon size={20} className={cn("transition-transform group-hover:scale-110", isActive && "fill-indigo-100 dark:fill-indigo-900/40")} /> 
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  );
                })}

                {user.role === 'admin' && (
                  <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
                    <Link 
                      to="/admin" 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center space-x-3 px-4 py-3 rounded-xl text-amber-700 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all duration-200 group"
                    >
                      <ShieldAlert size={20} className="transition-transform group-hover:scale-110" />
                      <span className="text-sm font-medium">Admin Panel</span>
                    </Link>
                  </div>
                )}
              </nav>

              <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                <button 
                  onClick={handleLogout} 
                  className="flex items-center space-x-3 px-4 py-3 w-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 group"
                >
                  <LogOut size={20} className="transition-transform group-hover:-translate-x-1" /> 
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto relative">
        {getBreadcrumbs()}
        <Outlet />
      </div>
    </div>
  );
};
