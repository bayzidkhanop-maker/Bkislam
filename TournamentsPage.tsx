import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, Calendar, ChevronRight, Filter, Search, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { getTournaments } from './firestoreService';
import { Tournament, User } from './models';
import { cn } from './widgets';

export const TournamentsPage = ({ currentUser }: { currentUser: User }) => {
  const user = currentUser;
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'live' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const data = await getTournaments();
        // Only show published tournaments to regular users
        const visibleTournaments = user?.role === 'admin' 
          ? data 
          : data.filter(t => t.isPublished || t.hostId === user?.uid);
        setTournaments(visibleTournaments);
      } catch (error) {
        console.error("Error fetching tournaments:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTournaments();
  }, [user]);

  const filteredTournaments = tournaments.filter(t => {
    if (filter !== 'all' && t.status !== filter) return false;
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-red-500 text-white animate-pulse';
      case 'published': return 'bg-green-500 text-white';
      case 'completed': return 'bg-gray-500 text-white';
      case 'pending': return 'bg-yellow-500 text-white';
      default: return 'bg-indigo-500 text-white';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 flex items-center gap-2">
              <Trophy className="text-indigo-400" /> Esports Tournaments
            </h1>
            <p className="text-gray-400 mt-1">Compete with the best and win real prizes.</p>
          </div>

          {(user?.role === 'admin' || user?.role === 'instructor') && (
            <Link 
              to="/tournaments/create" 
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus size={18} /> Create Tournament
            </Link>
          )}
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-800 p-4 rounded-xl border border-gray-700">
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto">
            {['all', 'published', 'live', 'completed'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition-colors",
                  filter === f 
                    ? "bg-indigo-600 text-white" 
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                )}
              >
                {f === 'published' ? 'Upcoming' : f}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search tournaments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Tournament Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-800 rounded-xl h-80 animate-pulse border border-gray-700"></div>
            ))}
          </div>
        ) : filteredTournaments.length === 0 ? (
          <div className="text-center py-20 bg-gray-800 rounded-xl border border-gray-700">
            <Trophy className="mx-auto h-16 w-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-medium text-gray-300">No tournaments found</h3>
            <p className="text-gray-500 mt-2">Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTournaments.map((tournament) => (
              <motion.div
                key={tournament.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-indigo-500 transition-all group flex flex-col"
              >
                {/* Banner */}
                <div className="h-40 bg-gray-700 relative overflow-hidden">
                  {tournament.bannerUrl ? (
                    <img src={tournament.bannerUrl} alt={tournament.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900">
                      <Trophy size={48} className="text-indigo-500/50" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <span className={cn("px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider shadow-lg", getStatusColor(tournament.status))}>
                      {tournament.status === 'published' ? 'Upcoming' : tournament.status}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <span className="px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-md text-xs font-bold text-white uppercase border border-white/10">
                      {tournament.game}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-white mb-2 line-clamp-1 group-hover:text-indigo-400 transition-colors">
                    {tournament.title}
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4 mt-2">
                    <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                      <p className="text-xs text-gray-400 mb-1">Prize Pool</p>
                      <p className="text-lg font-bold text-green-400">৳ {tournament.prizePool}</p>
                    </div>
                    <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                      <p className="text-xs text-gray-400 mb-1">Entry Fee</p>
                      <p className="text-lg font-bold text-white">{tournament.entryFee === 0 ? 'FREE' : `৳ ${tournament.entryFee}`}</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-6 flex-1">
                    <div className="flex items-center text-sm text-gray-300">
                      <Users size={16} className="mr-2 text-gray-500" />
                      <span>{tournament.registeredCount} / {tournament.maxPlayers} Players</span>
                      <span className="mx-2 text-gray-600">•</span>
                      <span className="uppercase text-xs font-bold text-indigo-400">{tournament.type}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-300">
                      <Calendar size={16} className="mr-2 text-gray-500" />
                      <span>{new Date(tournament.scheduledAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <Link 
                    to={`/tournaments/${tournament.id}`}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    View Details <ChevronRight size={18} />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
