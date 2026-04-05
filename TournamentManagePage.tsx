import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, Users, Play, Trophy, Save, Plus, Trash2, Check, X } from 'lucide-react';
import { getTournament, updateTournament, getTournamentRegistrations, updateRegistrationStatus, getTournamentMatches, createTournamentMatch, updateMatch, submitMatchResult, getMatchResults } from './firestoreService';
import { Tournament, TournamentRegistration, TournamentMatch, MatchResult, User } from './models';
import { toast } from 'sonner';
import { cn } from './widgets';
import { collection, query, where, onSnapshot, orderBy, doc } from 'firebase/firestore';
import { db } from './firebaseConfig';

export const TournamentManagePage = ({ currentUser }: { currentUser: User }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = currentUser;
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'players' | 'matches' | 'results'>('overview');

  // Form states
  const [status, setStatus] = useState<string>('');
  const [isPublished, setIsPublished] = useState(false);
  const [newMatchRound, setNewMatchRound] = useState(1);
  const [newMatchTime, setNewMatchTime] = useState('');

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
        if (user?.role !== 'admin' && user?.uid !== tData.hostId) {
          toast.error("Unauthorized");
          navigate('/tournaments');
          return;
        }
        setTournament(tData);
        setStatus(tData.status);
        setIsPublished(tData.isPublished);
      } catch (error) {
        console.error("Error fetching tournament details:", error);
        toast.error("Failed to load tournament details");
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // Real-time listeners
    const tournamentUnsubscribe = onSnapshot(doc(db, 'tournaments', id), (docSnap) => {
      if (docSnap.exists()) {
        const tData = docSnap.data() as Tournament;
        setTournament(tData);
        setStatus(tData.status);
        setIsPublished(tData.isPublished);
      }
    });

    const registrationsQuery = query(collection(db, 'tournamentRegistrations'), where('tournamentId', '==', id));
    const unsubscribeRegistrations = onSnapshot(registrationsQuery, (snapshot) => {
      setRegistrations(snapshot.docs.map(doc => doc.data() as TournamentRegistration));
    });

    const matchesQuery = query(collection(db, 'tournamentMatches'), where('tournamentId', '==', id), orderBy('round', 'asc'));
    const unsubscribeMatches = onSnapshot(matchesQuery, (snapshot) => {
      setMatches(snapshot.docs.map(doc => doc.data() as TournamentMatch));
    });

    const resultsQuery = query(collection(db, 'matchResults'), where('tournamentId', '==', id));
    const unsubscribeResults = onSnapshot(resultsQuery, (snapshot) => {
      setResults(snapshot.docs.map(doc => doc.data() as MatchResult));
    });

    return () => {
      tournamentUnsubscribe();
      unsubscribeRegistrations();
      unsubscribeMatches();
      unsubscribeResults();
    };
  }, [id, user, navigate]);

  const handleUpdateTournament = async () => {
    if (!tournament) return;
    try {
      await updateTournament(tournament.id, { status: status as any, isPublished });
      toast.success("Tournament updated successfully");
    } catch (error) {
      toast.error("Failed to update tournament");
    }
  };

  const handleApproveRegistration = async (regId: string, newStatus: 'approved' | 'rejected') => {
    try {
      await updateRegistrationStatus(regId, newStatus);
      setRegistrations(registrations.map(r => r.id === regId ? { ...r, status: newStatus } : r));
      toast.success(`Player ${newStatus}`);
    } catch (error) {
      toast.error("Failed to update player status");
    }
  };

  const handleCreateMatch = async () => {
    if (!tournament || !newMatchTime) return;
    try {
      const newMatch = await createTournamentMatch({
        tournamentId: tournament.id,
        round: newMatchRound,
        scheduledAt: new Date(newMatchTime).getTime(),
        status: 'upcoming'
      });
      setMatches([...matches, newMatch]);
      setNewMatchRound(newMatchRound + 1);
      setNewMatchTime('');
      toast.success("Match created");
    } catch (error) {
      toast.error("Failed to create match");
    }
  };

  const handleUpdateMatch = async (matchId: string, updates: Partial<TournamentMatch>) => {
    try {
      await updateMatch(matchId, updates);
      setMatches(matches.map(m => m.id === matchId ? { ...m, ...updates } : m));
      toast.success("Match updated");
    } catch (error) {
      toast.error("Failed to update match");
    }
  };

  const [resultForm, setResultForm] = useState({ matchId: '', userId: '', placement: 1, kills: 0 });

  const handleAddResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournament || !resultForm.matchId || !resultForm.userId) return;
    
    // Calculate points: 10 for win, 8 for 2nd, 6 for 3rd, 4 for 4th, 2 for 5th, +1 per kill
    let points = resultForm.kills;
    if (resultForm.placement === 1) points += 10;
    else if (resultForm.placement === 2) points += 8;
    else if (resultForm.placement === 3) points += 6;
    else if (resultForm.placement === 4) points += 4;
    else if (resultForm.placement === 5) points += 2;

    try {
      const newResult = await submitMatchResult({
        tournamentId: tournament.id,
        matchId: resultForm.matchId,
        userId: resultForm.userId,
        placement: resultForm.placement,
        kills: resultForm.kills,
        points
      });
      setResults([...results, newResult]);
      setResultForm({ matchId: resultForm.matchId, userId: '', placement: 1, kills: 0 });
      toast.success("Result added");
    } catch (error) {
      toast.error("Failed to add result");
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div></div>;
  if (!tournament) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="text-amber-500" /> Manage: {tournament.title}
          </h1>
          <button onClick={() => navigate(`/tournaments/${tournament.id}`)} className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">
            View Public Page
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 overflow-x-auto custom-scrollbar">
          {[
            { id: 'overview', icon: Shield, label: 'Overview' },
            { id: 'players', icon: Users, label: 'Players' },
            { id: 'matches', icon: Play, label: 'Matches' },
            { id: 'results', icon: Trophy, label: 'Results' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-6 py-3 font-medium transition-colors whitespace-nowrap",
                activeTab === tab.id 
                  ? "border-b-2 border-indigo-500 text-indigo-400" 
                  : "text-gray-400 hover:text-gray-200"
              )}
            >
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          
          {activeTab === 'overview' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Tournament Status</label>
                <select 
                  value={status} 
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="draft">Draft</option>
                  <option value="pending">Pending Approval</option>
                  <option value="published">Published (Upcoming)</option>
                  <option value="live">Live</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="isPublished" 
                  checked={isPublished} 
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-700 text-indigo-600 focus:ring-indigo-500 bg-gray-900"
                />
                <label htmlFor="isPublished" className="text-sm font-medium text-gray-300">
                  Visible to Public (Published)
                </label>
              </div>

              <button 
                onClick={handleUpdateTournament}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
              >
                <Save size={18} /> Save Changes
              </button>
            </div>
          )}

          {activeTab === 'players' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Registered Players ({registrations.length}/{tournament.maxPlayers})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-400 text-sm">
                      <th className="py-3 px-4">In-Game Name</th>
                      <th className="py-3 px-4">UID</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.map(reg => (
                      <tr key={reg.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                        <td className="py-3 px-4 font-medium">{reg.inGameName}</td>
                        <td className="py-3 px-4 font-mono text-sm text-gray-400">{reg.inGameUid}</td>
                        <td className="py-3 px-4">
                          <span className={cn(
                            "px-2 py-1 text-xs rounded-md",
                            reg.paymentStatus === 'verified' || reg.paymentStatus === 'free' ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                          )}>
                            {reg.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={cn(
                            "px-2 py-1 text-xs rounded-md",
                            reg.status === 'approved' ? "bg-green-500/20 text-green-400" : 
                            reg.status === 'rejected' ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"
                          )}>
                            {reg.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {reg.status === 'pending' && (
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleApproveRegistration(reg.id, 'approved')} className="p-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded"><Check size={16}/></button>
                              <button onClick={() => handleApproveRegistration(reg.id, 'rejected')} className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded"><X size={16}/></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {registrations.length === 0 && (
                      <tr><td colSpan={5} className="py-8 text-center text-gray-500">No players registered yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'matches' && (
            <div className="space-y-8">
              {/* Create Match */}
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 flex flex-wrap items-end gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Round</label>
                  <input type="number" value={newMatchRound} onChange={e => setNewMatchRound(Number(e.target.value))} className="w-20 bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-white" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Scheduled Time</label>
                  <input type="datetime-local" value={newMatchTime} onChange={e => setNewMatchTime(e.target.value)} className="bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-white" />
                </div>
                <button onClick={handleCreateMatch} className="flex items-center gap-1 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium">
                  <Plus size={16} /> Add Match
                </button>
              </div>

              {/* Match List */}
              <div className="space-y-4">
                {matches.map(match => (
                  <div key={match.id} className="bg-gray-900 p-4 rounded-lg border border-gray-700 space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                      <h4 className="font-bold">Round {match.round}</h4>
                      <select 
                        value={match.status}
                        onChange={(e) => handleUpdateMatch(match.id, { status: e.target.value as any })}
                        className={cn(
                          "bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs font-bold uppercase",
                          match.status === 'live' ? "text-red-400" : match.status === 'completed' ? "text-gray-400" : "text-indigo-400"
                        )}
                      >
                        <option value="upcoming">Upcoming</option>
                        <option value="live">Live</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Room ID</label>
                        <input 
                          type="text" 
                          value={match.roomId || ''} 
                          onChange={(e) => handleUpdateMatch(match.id, { roomId: e.target.value })}
                          placeholder="e.g. 123456"
                          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-white text-sm" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Room Password</label>
                        <input 
                          type="text" 
                          value={match.roomPassword || ''} 
                          onChange={(e) => handleUpdateMatch(match.id, { roomPassword: e.target.value })}
                          placeholder="e.g. pass123"
                          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-white text-sm" 
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {matches.length === 0 && <p className="text-gray-500 text-center py-4">No matches created yet.</p>}
              </div>
            </div>
          )}

          {activeTab === 'results' && (
            <div className="space-y-8">
              {/* Add Result */}
              <form onSubmit={handleAddResult} className="bg-gray-900 p-4 rounded-lg border border-gray-700 grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">Match</label>
                  <select required value={resultForm.matchId} onChange={e => setResultForm({...resultForm, matchId: e.target.value})} className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm">
                    <option value="">Select Match...</option>
                    {matches.map(m => <option key={m.id} value={m.id}>Round {m.round}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">Player</label>
                  <select required value={resultForm.userId} onChange={e => setResultForm({...resultForm, userId: e.target.value})} className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm">
                    <option value="">Select Player...</option>
                    {registrations.filter(r => r.status === 'approved').map(r => <option key={r.userId} value={r.userId}>{r.inGameName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Placement</label>
                  <input type="number" min="1" required value={resultForm.placement} onChange={e => setResultForm({...resultForm, placement: Number(e.target.value)})} className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Kills</label>
                  <input type="number" min="0" required value={resultForm.kills} onChange={e => setResultForm({...resultForm, kills: Number(e.target.value)})} className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm" />
                </div>
                <div className="sm:col-span-5 flex justify-end">
                  <button type="submit" className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium">
                    <Plus size={16} /> Add Result
                  </button>
                </div>
              </form>

              {/* Results List */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-400 text-sm">
                      <th className="py-3 px-4">Match</th>
                      <th className="py-3 px-4">Player</th>
                      <th className="py-3 px-4">Placement</th>
                      <th className="py-3 px-4">Kills</th>
                      <th className="py-3 px-4">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map(res => {
                      const match = matches.find(m => m.id === res.matchId);
                      const reg = registrations.find(r => r.userId === res.userId);
                      return (
                        <tr key={res.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                          <td className="py-3 px-4">Round {match?.round || '?'}</td>
                          <td className="py-3 px-4 font-medium">{reg?.inGameName || 'Unknown'}</td>
                          <td className="py-3 px-4">#{res.placement}</td>
                          <td className="py-3 px-4">{res.kills}</td>
                          <td className="py-3 px-4 font-bold text-indigo-400">{res.points}</td>
                        </tr>
                      );
                    })}
                    {results.length === 0 && (
                      <tr><td colSpan={5} className="py-8 text-center text-gray-500">No results added yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
