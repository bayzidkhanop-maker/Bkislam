import React, { useState, useEffect, useMemo } from 'react';
import { User, Tournament, TournamentRegistration, TournamentMatch } from './models';
import { Card, Button, Input, Loader } from './widgets';
import { 
  Trophy, Search, Filter, Plus, Users, Calendar, Settings, 
  Trash2, Eye, Shield, MapPin, Edit3, XCircle, CheckCircle, Clock 
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { 
  getTournaments, updateTournament, deleteTournament, getTournamentRegistrations,
  updateRegistrationStatus, getTournamentMatches, updateMatch, getUser
} from './firestoreService';
import { uploadMedia } from './storageService';

export const AdminTournamentManagement = ({ currentUser }: { currentUser: User }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'matches'>('overview');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters -> Overview
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [modalTab, setModalTab] = useState<'details' | 'players' | 'rooms'>('details');
  const [modalLoading, setModalLoading] = useState(false);
  
  // Edit Form
  const [editData, setEditData] = useState<Partial<Tournament>>({});
  const [saving, setSaving] = useState(false);

  // Rooms Edit
  const [editingMatch, setEditingMatch] = useState<TournamentMatch | null>(null);
  const [roomId, setRoomId] = useState('');
  const [roomPassword, setRoomPassword] = useState('');

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    setLoading(true);
    try {
      const data = await getTournaments();
      setTournaments(data);
    } catch (e) {
      toast.error('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const filteredTournaments = useMemo(() => {
    return tournaments.filter(t => {
      const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                          t.hostId.toLowerCase().includes(search.toLowerCase()) ||
                          t.id.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [tournaments, search, statusFilter]);

  const openTournamentModal = async (t: Tournament) => {
    setSelectedTournament(t);
    setEditData(t);
    setModalTab('details');
    setModalLoading(true);
    try {
      const [regs, mtchs] = await Promise.all([
        getTournamentRegistrations(t.id),
        getTournamentMatches(t.id)
      ]);
      setRegistrations(regs);
      setMatches(mtchs);
    } catch (e) {
      toast.error('Failed to load tournament details');
    } finally {
      setModalLoading(false);
    }
  };

  const saveTournamentChanges = async () => {
    if (!selectedTournament) return;
    setSaving(true);
    try {
      await updateTournament(selectedTournament.id, editData);
      toast.success('Tournament updated');
      setTournaments(tournaments.map(t => t.id === selectedTournament.id ? { ...t, ...editData } as Tournament : t));
    } catch (e) {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this tournament?")) {
      try {
        await deleteTournament(id);
        toast.success("Tournament deleted");
        setTournaments(tournaments.filter(t => t.id !== id));
      } catch (e) {
        toast.error("Failed to delete tournament");
      }
    }
  };

  const handleRegAction = async (regId: string, status: 'approved' | 'rejected') => {
    if (!selectedTournament) return;
    try {
      await updateRegistrationStatus(regId, status, '', selectedTournament.id); // userId not strictly needed for this local update mock
      toast.success(`Player ${status}`);
      setRegistrations(registrations.map(r => r.id === regId ? { ...r, status } : r));
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  const saveRoomDetails = async () => {
    if (!editingMatch) return;
    try {
      await updateMatch(editingMatch.id, { roomId, roomPassword });
      toast.success('Room details updated and sent to players');
      setMatches(matches.map(m => m.id === editingMatch.id ? { ...m, roomId, roomPassword } : m));
      setEditingMatch(null);
    } catch (e) {
      toast.error("Failed to save room details");
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'live': return 'bg-red-100 text-red-800 border-red-200';
      case 'upcoming': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-max">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'overview' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Trophy size={16}/> Tournament Overview
        </button>
      </div>

      {loading ? <Loader /> : (
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search tournament name, ID, host..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl"
              />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-2 text-sm">
              <option value="all">All Statuses</option>
              <option value="upcoming">Upcoming</option>
              <option value="live">Live Now</option>
              <option value="completed">Completed</option>
              <option value="draft">Drafts</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <Button variant="primary" className="gap-2"><Plus size={16}/> Create Tournament</Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 text-gray-500 text-xs uppercase">
                  <th className="p-3">Tournament</th>
                  <th className="p-3">Game</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Entry/Prize</th>
                  <th className="p-3">Players</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                {filteredTournaments.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-3">
                      <p className="font-bold text-gray-900 dark:text-white">{t.title}</p>
                      <p className="text-xs text-gray-500 font-mono">ID: {t.id.substring(0,8)}</p>
                    </td>
                    <td className="p-3"><span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-bold">{t.game}</span></td>
                    <td className="p-3">
                      <span className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold border ${getStatusColor(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <p className="text-gray-900 dark:text-white">{t.entryFee === 0 ? 'Free' : `$${t.entryFee}`}</p>
                      <p className="text-xs text-green-600 font-bold">Prize: ${t.prizePool}</p>
                    </td>
                    <td className="p-3 font-medium">
                      {t.registeredCount} / {t.maxPlayers}
                    </td>
                    <td className="p-3 text-gray-500">{format(t.scheduledAt, 'MMM dd, HH:mm')}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openTournamentModal(t)} className="p-1.5 text-gray-500 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 rounded-lg transition-colors"><Edit3 size={16}/></button>
                        <button onClick={() => handleDelete(t.id)} className="p-1.5 text-gray-500 hover:text-red-600 bg-gray-100 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTournaments.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Trophy className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p>No tournaments found.</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* TOURNAMENT MANAGEMENT MODAL */}
      {selectedTournament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Trophy className="text-indigo-600"/> {selectedTournament.title}
                </h3>
                <p className="text-sm text-gray-500 font-mono mt-1">Host ID: {selectedTournament.hostId}</p>
              </div>
              <button onClick={() => setSelectedTournament(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><XCircle size={24} className="text-gray-500"/></button>
            </div>
            
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${modalTab === 'details' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`} onClick={() => setModalTab('details')}>Details & Settings</button>
              <button className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${modalTab === 'players' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`} onClick={() => setModalTab('players')}>Participants ({registrations.length})</button>
              <button className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${modalTab === 'rooms' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`} onClick={() => setModalTab('rooms')}>Rooms & Matches</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {modalLoading ? <Loader /> : (
                <>
                  {/* DETAILS TAB */}
                  {modalTab === 'details' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tournament Title</label>
                          <Input value={editData.title || ''} onChange={e => setEditData({...editData, title: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Game</label>
                          <Input value={editData.game || ''} onChange={e => setEditData({...editData, game: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                          <select value={editData.status} onChange={e => setEditData({...editData, status: e.target.value as any})} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 dark:bg-gray-800 dark:border-gray-600">
                            <option value="draft">Draft (Hidden)</option>
                            <option value="upcoming">Upcoming (Visible)</option>
                            <option value="live">Live Now</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                        <div className="flex gap-4">
                           <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entry Fee ($)</label>
                            <Input type="number" value={editData.entryFee || 0} onChange={e => setEditData({...editData, entryFee: Number(e.target.value)})} />
                           </div>
                           <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prize Pool ($)</label>
                            <Input type="number" value={editData.prizePool || 0} onChange={e => setEditData({...editData, prizePool: Number(e.target.value)})} />
                           </div>
                        </div>
                        <div className="col-span-1 md:col-span-2">
                           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Visibility & Features</label>
                           <div className="flex gap-6 mt-2">
                             <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                               <input type="checkbox" checked={editData.isPublished} onChange={e => setEditData({...editData, isPublished: e.target.checked})} className="rounded text-indigo-600 border-gray-300"/> Published Publicly
                             </label>
                           </div>
                        </div>
                      </div>
                      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button onClick={saveTournamentChanges} isLoading={saving}>Save Tournament Settings</Button>
                      </div>
                    </div>
                  )}

                  {/* PLAYERS TAB */}
                  {modalTab === 'players' && (
                    <div className="space-y-4">
                      {registrations.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No players registered yet.</p>
                      ) : (
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-gray-100 dark:bg-gray-800 text-gray-600 text-xs uppercase">
                              <th className="p-3">Player Info</th>
                              <th className="p-3">In-Game Details</th>
                              <th className="p-3">Payment</th>
                              <th className="p-3">Status</th>
                              <th className="p-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                            {registrations.map(r => (
                              <tr key={r.id}>
                                <td className="p-3 font-mono text-xs">{r.userId}</td>
                                <td className="p-3">
                                  <p className="font-bold text-gray-900 dark:text-white">{r.inGameName}</p>
                                  <p className="text-xs text-gray-500">ID: {r.inGameUid}</p>
                                </td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold 
                                    ${r.paymentStatus === 'verified' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                    {r.paymentStatus}
                                  </span>
                                </td>
                                <td className="p-3">
                                   <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold 
                                    ${r.status === 'approved' ? 'bg-blue-100 text-blue-800' : r.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {r.status}
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  {r.status === 'pending' ? (
                                    <div className="flex justify-end gap-1">
                                      <Button variant="success" size="sm" onClick={() => handleRegAction(r.id, 'approved')}>Approve</Button>
                                      <Button variant="danger" size="sm" onClick={() => handleRegAction(r.id, 'rejected')}>Reject</Button>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-400">Processed</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* ROOMS TAB */}
                  {modalTab === 'rooms' && (
                    <div className="space-y-4">
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 text-sm flex gap-3">
                        <MapPin className="shrink-0"/>
                        <p>When you add Room ID and Password here, it is securely revealed <strong>only</strong> to approved participants in their match dashboard.</p>
                      </div>

                      {matches.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-gray-500 mb-4">No matches generated yet.</p>
                          <Button variant="outline">Auto-Generate Match Bracket</Button>
                        </div>
                      ) : (
                        <div className="grid gap-4">
                          {matches.map(m => (
                            <div key={m.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-800">
                              <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                                <h4 className="font-bold text-gray-900 dark:text-white">Round {m.round} Bracket</h4>
                                <span className="text-xs font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">Match ID: {m.id}</span>
                              </div>
                              
                              {editingMatch?.id === m.id ? (
                                <div className="space-y-3 bg-white dark:bg-gray-900 p-4 rounded-lg border border-indigo-200">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-500 mb-1">Room ID</label>
                                      <Input value={roomId} onChange={e => setRoomId(e.target.value)} placeholder="e.g. 1928374" />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-500 mb-1">Room Password</label>
                                      <Input value={roomPassword} onChange={e => setRoomPassword(e.target.value)} placeholder="e.g. x123" />
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setEditingMatch(null)}>Cancel</Button>
                                    <Button variant="primary" size="sm" onClick={saveRoomDetails}>Save & Notify Players</Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-900 p-4 rounded-lg">
                                  <div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                      Room ID: <span className="font-mono font-bold text-gray-900 dark:text-white">{m.roomId || 'Not set'}</span>
                                    </p>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                      Password: <span className="font-mono font-bold text-gray-900 dark:text-white">{m.roomPassword || 'Not set'}</span>
                                    </p>
                                  </div>
                                  <Button variant="outline" size="sm" onClick={() => {
                                    setEditingMatch(m);
                                    setRoomId(m.roomId || '');
                                    setRoomPassword(m.roomPassword || '');
                                  }}>
                                    Update Credentials
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
