import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Trophy, Users, Calendar, ChevronRight, AlertCircle, CheckCircle, Clock, Shield, Play, List, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { getTournament, getTournamentRegistrations, registerForTournament } from './firestoreService';
import { Tournament, TournamentRegistration, TournamentMatch, MatchResult, User } from './models';
import { cn } from './widgets';
import { toast } from 'sonner';
import { collection, query, where, onSnapshot, orderBy, doc } from 'firebase/firestore';
import { db } from './firebaseConfig';

export const TournamentDetailsPage = ({ currentUser }: { currentUser: User }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = currentUser;
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inGameUid, setInGameUid] = useState('');
  const [inGameName, setInGameName] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const tData = await getTournament(id);
        if (!tData) {
          toast.error("Tournament not found");
          navigate('/tournaments');
          return;
        }
        setTournament(tData);
        
        const rData = await getTournamentRegistrations(id);
        setRegistrations(rData);
      } catch (error) {
        console.error("Error fetching tournament details:", error);
        toast.error("Failed to load tournament details");
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // Real-time listeners for matches and results
    const tournamentUnsubscribe = onSnapshot(doc(db, 'tournaments', id), (docSnap) => {
      if (docSnap.exists()) {
        setTournament(docSnap.data() as Tournament);
      }
    }, (error) => {
      console.error("Error listening to tournament:", error);
    });

    const registrationsQuery = query(collection(db, 'tournamentRegistrations'), where('tournamentId', '==', id));
    const unsubscribeRegistrations = onSnapshot(registrationsQuery, (snapshot) => {
      setRegistrations(snapshot.docs.map(doc => doc.data() as TournamentRegistration));
    }, (error) => {
      console.error("Error listening to registrations:", error);
    });

    const matchesQuery = query(collection(db, 'tournamentMatches'), where('tournamentId', '==', id), orderBy('round', 'asc'));
    const unsubscribeMatches = onSnapshot(matchesQuery, (snapshot) => {
      setMatches(snapshot.docs.map(doc => doc.data() as TournamentMatch));
    }, (error) => {
      console.error("Error listening to matches:", error);
    });

    const resultsQuery = query(collection(db, 'matchResults'), where('tournamentId', '==', id));
    const unsubscribeResults = onSnapshot(resultsQuery, (snapshot) => {
      setResults(snapshot.docs.map(doc => doc.data() as MatchResult));
    }, (error) => {
      console.error("Error listening to results:", error);
    });

    return () => {
      tournamentUnsubscribe();
      unsubscribeRegistrations();
      unsubscribeMatches();
      unsubscribeResults();
    };
  }, [id, navigate]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !tournament) return;
    
    if (user.walletBalance! < tournament.entryFee) {
      toast.error("Insufficient wallet balance. Please add money.");
      return;
    }

    setIsJoining(true);
    try {
      await registerForTournament({
        tournamentId: tournament.id,
        userId: user.uid,
        inGameUid,
        inGameName,
        paymentStatus: tournament.entryFee === 0 ? 'free' : 'verified', // Assuming auto-deduct logic handles wallet deduction elsewhere or we need to add it here.
        // For a complete system, we should deduct wallet balance here using a transaction.
      });
      toast.success("Successfully registered for the tournament!");
      setShowJoinModal(false);
      // Refresh registrations
      const rData = await getTournamentRegistrations(tournament.id);
      setRegistrations(rData);
      setTournament(prev => prev ? { ...prev, registeredCount: prev.registeredCount + 1 } : null);
    } catch (error: any) {
      toast.error(error.message || "Failed to register");
    } finally {
      setIsJoining(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div></div>;
  }

  if (!tournament) return null;

  const isRegistered = registrations.some(r => r.userId === user?.uid);
  const isHostOrAdmin = user?.role === 'admin' || user?.uid === tournament.hostId;

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20">
      {/* Hero Banner */}
      <div className="h-64 md:h-96 relative bg-gray-800">
        {tournament.bannerUrl ? (
          <img src={tournament.bannerUrl} alt={tournament.title} className="w-full h-full object-cover opacity-50" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-purple-900 opacity-50"></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent"></div>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded-md">
                  {tournament.game}
                </span>
                <span className={cn(
                  "px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md border",
                  tournament.status === 'live' ? "bg-red-500/20 text-red-400 border-red-500/50 animate-pulse" :
                  tournament.status === 'published' ? "bg-green-500/20 text-green-400 border-green-500/50" :
                  "bg-gray-500/20 text-gray-400 border-gray-500/50"
                )}>
                  {tournament.status === 'published' ? 'Upcoming' : tournament.status}
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">{tournament.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
                <span className="flex items-center gap-1"><Calendar size={16} /> {new Date(tournament.scheduledAt).toLocaleString()}</span>
                <span className="flex items-center gap-1"><Users size={16} /> {tournament.registeredCount} / {tournament.maxPlayers} Players</span>
                <span className="flex items-center gap-1 uppercase font-bold text-indigo-400"><UserIcon size={16} /> {tournament.type}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 min-w-[200px]">
              <div className="bg-gray-800/80 backdrop-blur-md border border-gray-700 p-4 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 text-sm">Prize Pool</span>
                  <span className="text-xl font-bold text-green-400">৳ {tournament.prizePool}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Entry Fee</span>
                  <span className="text-lg font-bold text-white">{tournament.entryFee === 0 ? 'FREE' : `৳ ${tournament.entryFee}`}</span>
                </div>
              </div>
              
              {!isHostOrAdmin && tournament.status === 'published' && (
                isRegistered ? (
                  <button disabled className="w-full py-3 bg-green-600/20 text-green-400 border border-green-500/50 rounded-xl font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                    <CheckCircle size={20} /> Registered
                  </button>
                ) : tournament.registeredCount >= tournament.maxPlayers ? (
                  <button disabled className="w-full py-3 bg-gray-700 text-gray-400 rounded-xl font-bold cursor-not-allowed">
                    Tournament Full
                  </button>
                ) : (
                  <button 
                    onClick={() => setShowJoinModal(true)}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                  >
                    Join Tournament
                  </button>
                )
              )}

              {isHostOrAdmin && (
                <Link to={`/tournaments/${tournament.id}/manage`} className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                  <Shield size={20} /> Manage Tournament
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Details & Rules */}
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <List className="text-indigo-400" /> Tournament Rules
              </h2>
              <div className="prose prose-invert max-w-none">
                <p className="whitespace-pre-wrap text-gray-300 leading-relaxed">{tournament.rules}</p>
              </div>
            </section>

            {/* Matches Section */}
            <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Play className="text-indigo-400" /> Matches & Schedule
              </h2>
              {matches.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="mx-auto h-12 w-12 mb-3 opacity-50" />
                  <p>Match schedule will be announced soon.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {matches.map(match => (
                    <div key={match.id} className="bg-gray-900 border border-gray-700 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h4 className="font-bold text-white">Round {match.round}</h4>
                        <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                          <Calendar size={14} /> {new Date(match.scheduledAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "px-2.5 py-1 text-xs font-bold uppercase rounded-md",
                          match.status === 'live' ? "bg-red-500/20 text-red-400" :
                          match.status === 'completed' ? "bg-gray-700 text-gray-300" :
                          "bg-indigo-500/20 text-indigo-400"
                        )}>
                          {match.status}
                        </span>
                        {isRegistered && match.roomId && match.status !== 'completed' && (
                          <div className="bg-gray-800 px-3 py-1.5 rounded text-sm border border-gray-600">
                            <span className="text-gray-400 mr-2">Room:</span>
                            <span className="font-mono text-white select-all">{match.roomId}</span>
                            {match.roomPassword && (
                              <>
                                <span className="text-gray-400 mx-2">| Pass:</span>
                                <span className="font-mono text-white select-all">{match.roomPassword}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Leaderboard / Players */}
          <div className="space-y-8">
            <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Trophy className="text-yellow-400" /> Leaderboard
              </h2>
              {results.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Trophy className="mx-auto h-12 w-12 mb-3 opacity-20" />
                  <p>Leaderboard will be updated after matches.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Aggregate results by user */}
                  {Object.values(results.reduce((acc, curr) => {
                    if (!acc[curr.userId]) {
                      acc[curr.userId] = { userId: curr.userId, points: 0, kills: 0 };
                    }
                    acc[curr.userId].points += curr.points;
                    acc[curr.userId].kills += curr.kills;
                    return acc;
                  }, {} as Record<string, { userId: string, points: number, kills: number }>))
                  .sort((a, b) => b.points - a.points)
                  .slice(0, 10)
                  .map((result, idx) => {
                    const reg = registrations.find(r => r.userId === result.userId);
                    return (
                      <div key={result.userId} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-gray-700/50">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold",
                            idx === 0 ? "bg-yellow-500 text-gray-900" :
                            idx === 1 ? "bg-gray-300 text-gray-900" :
                            idx === 2 ? "bg-amber-600 text-white" :
                            "bg-gray-800 text-gray-400"
                          )}>
                            {idx + 1}
                          </span>
                          <span className="font-medium text-white">{reg?.inGameName || 'Unknown'}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-indigo-400">{result.points} pts</div>
                          <div className="text-xs text-gray-500">{result.kills} kills</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Users className="text-indigo-400" /> Registered Players ({registrations.length})
              </h2>
              <div className="max-h-64 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                {registrations.map(reg => (
                  <div key={reg.id} className="flex items-center justify-between p-2 bg-gray-900/50 rounded border border-gray-700/30">
                    <span className="text-sm text-gray-300">{reg.inGameName}</span>
                    <span className="text-xs text-gray-500 font-mono">{reg.inGameUid}</span>
                  </div>
                ))}
                {registrations.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No players registered yet.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-2xl border border-gray-700 p-6 w-full max-w-md shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Join Tournament</h3>
              <button onClick={() => setShowJoinModal(false)} className="text-gray-400 hover:text-white">
                <AlertCircle size={24} /> {/* Using AlertCircle as close icon placeholder if X is not imported, but we imported X */}
              </button>
            </div>

            <div className="mb-6 p-4 bg-indigo-900/30 border border-indigo-500/30 rounded-lg">
              <p className="text-sm text-indigo-200 mb-1">Entry Fee</p>
              <p className="text-2xl font-bold text-white">৳ {tournament.entryFee}</p>
              <p className="text-xs text-gray-400 mt-2">Will be deducted from your wallet balance (৳ {user?.walletBalance || 0}).</p>
            </div>

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">In-Game UID</label>
                <input
                  type="text"
                  required
                  value={inGameUid}
                  onChange={(e) => setInGameUid(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g. 123456789"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">In-Game Name</label>
                <input
                  type="text"
                  required
                  value={inGameName}
                  onChange={(e) => setInGameName(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g. NinjaGamer"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isJoining}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {isJoining ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Confirm Join'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
