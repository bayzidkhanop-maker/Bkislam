import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { User } from './models';
import { Card, Input } from './widgets';
import { Search, User as UserIcon, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDebounce } from './hooks/useDebounce';

export const SearchPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Custom hook for debouncing (we'll implement this inline for simplicity if it doesn't exist)
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearchTerm.trim()) {
        setResults([]);
        setHasSearched(false);
        return;
      }
      
      setLoading(true);
      setHasSearched(true);
      
      try {
        // Firestore prefix search
        const q = query(
          collection(db, 'users'), 
          where('name', '>=', debouncedSearchTerm), 
          where('name', '<=', debouncedSearchTerm + '\uf8ff'),
          limit(20)
        );
        const snapshot = await getDocs(q);
        setResults(snapshot.docs.map(doc => doc.data() as User));
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedSearchTerm]);

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-24 min-h-screen flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Explore</h1>
        <p className="text-gray-500">Find people and discover new content</p>
      </div>

      <div className="relative mb-8 z-10">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search users by name..."
          className="block w-full pl-11 pr-10 py-4 bg-white border-0 ring-1 ring-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-600 shadow-sm transition-all text-lg"
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="flex-1">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white p-4 rounded-2xl ring-1 ring-gray-100 shadow-sm flex items-center gap-4 animate-pulse">
                <div className="w-14 h-14 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {results.length > 0 ? (
              <motion.div className="space-y-3">
                {results.map((user, index) => (
                  <motion.div
                    key={user.uid}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link to={`/profile/${user.uid}`} className="block">
                      <Card className="p-4 hover:shadow-md transition-all duration-200 border-0 ring-1 ring-gray-100 group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gradient-to-tr from-indigo-100 to-purple-100 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-white shadow-sm">
                              {user.avatarURL ? (
                                <img src={user.avatarURL} alt="avatar" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-indigo-600 font-bold text-xl">{user.name[0]?.toUpperCase()}</span>
                              )}
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors text-lg">{user.name}</h3>
                              <p className="text-sm text-gray-500 font-medium">{user.email}</p>
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                            <ArrowRight size={20} />
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            ) : hasSearched && searchTerm ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No results found</h3>
                <p className="text-gray-500 max-w-sm mx-auto">We couldn't find any users matching "{searchTerm}". Try checking for typos or using different keywords.</p>
              </motion.div>
            ) : !hasSearched && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserIcon className="h-8 w-8 text-indigo-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Find your friends</h3>
                <p className="text-gray-500 max-w-sm mx-auto">Search for people by their name to see their profiles and posts.</p>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
