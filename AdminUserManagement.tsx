import React, { useState, useEffect, useMemo } from 'react';
import { User, UserActivity, RoleApplication } from './models';
import { Card, Button, Input, Loader } from './widgets';
import { 
  Search, Filter, Edit, Ban, Trash2, Shield, Wallet, Activity, 
  MapPin, Clock, Eye, AlertTriangle, ArrowUpRight, CheckCircle, XCircle 
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { 
  updateUserAdminStatus, adjustUserWalletAsAdmin, getUserActivities, 
  getAllRoleApplications, updateRoleApplicationStatus, updateUserRole, deleteUser 
} from './firestoreService';
import { auth } from './firebaseConfig';

export const AdminUserManagement = ({ users: initialUsers, currentUser, onUpdate }: { users: User[], currentUser: User, onUpdate: () => void }) => {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc'|'desc' }>({ key: 'createdAt', direction: 'desc' });
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalView, setModalView] = useState<'details' | 'edit' | 'wallet' | 'ban' | 'activities' | null>(null);
  
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [roleApps, setRoleApps] = useState<RoleApplication[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'applications'>('users');

  const [actionLoading, setActionLoading] = useState(false);
  const [walletAmount, setWalletAmount] = useState(0);
  const [adminReason, setAdminReason] = useState('');

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  useEffect(() => {
    if (activeTab === 'applications') {
      loadApplications();
    }
  }, [activeTab]);

  const loadApplications = async () => {
    const apps = await getAllRoleApplications();
    setRoleApps(apps);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = (u.name || '').toLowerCase().includes(search.toLowerCase()) || 
                            (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
                            (u.uid || '').includes(search);
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || (u.status || 'active') === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    }).sort((a: any, b: any) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [users, search, roleFilter, statusFilter, sortConfig]);

  const openModal = async (u: User, view: typeof modalView) => {
    setSelectedUser(u);
    setModalView(view);
    setAdminReason('');
    setWalletAmount(0);
    if (view === 'activities') {
      setLoadingActivities(true);
      const logs = await getUserActivities(u.uid);
      setActivities(logs);
      setLoadingActivities(false);
    }
  };

  const handleBanSubmit = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const newStatus = selectedUser.status === 'banned' ? 'active' : 'banned';
      await updateUserAdminStatus(selectedUser.uid, { status: newStatus }, currentUser.uid, adminReason || 'No reason provided');
      setUsers(users.map(u => u.uid === selectedUser.uid ? { ...u, status: newStatus } : u));
      toast.success(`User ${newStatus === 'banned' ? 'banned' : 'unbanned'} successfully`);
      setModalView(null);
      onUpdate();
    } catch (e) {
      toast.error("Failed to update user status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleWalletSubmit = async () => {
    if (!selectedUser || walletAmount === 0) return;
    setActionLoading(true);
    try {
      await adjustUserWalletAsAdmin(selectedUser.uid, walletAmount, currentUser.uid, adminReason || 'Manual adjustment');
      const newBalance = (selectedUser.walletBalance || 0) + Number(walletAmount);
      setUsers(users.map(u => u.uid === selectedUser.uid ? { ...u, walletBalance: newBalance } : u));
      toast.success("Wallet adjusted successfully");
      setModalView(null);
      onUpdate();
    } catch (e) {
      toast.error("Failed to adjust wallet");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (u: User) => {
    if (u.role === 'admin') {
      toast.error("Cannot delete another admin");
      return;
    }
    if (window.confirm(`Permanently delete user ${u.name}? This action cannot be undone.`)) {
      setActionLoading(true);
      try {
        await deleteUser(u.uid);
        setUsers(users.filter(user => user.uid !== u.uid));
        toast.success("User deleted");
        onUpdate();
      } catch (e) {
        toast.error("Failed to delete user");
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleApproveApplication = async (app: RoleApplication, approve: boolean) => {
    setActionLoading(true);
    try {
      await updateRoleApplicationStatus(app.id, approve ? 'approved' : 'rejected', adminReason, currentUser.uid);
      if (approve) {
        await updateUserRole(app.uid, app.roleRequested);
      }
      toast.success(approve ? 'Application approved' : 'Application rejected');
      loadApplications();
      onUpdate();
    } catch (e) {
      toast.error("Failed to process application");
    } finally {
      setActionLoading(false);
      setAdminReason('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-max">
        <button 
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'users' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
        >
          All Users
        </button>
        <button 
          onClick={() => setActiveTab('applications')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'applications' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
        >
          Role Applications
          {roleApps.filter(a => a.status === 'pending').length > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
              {roleApps.filter(a => a.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'users' && (
        <Card className="p-4 sm:p-6 overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by Name, Email or UID..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select 
              value={roleFilter} 
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2"
            >
              <option value="all">All Roles</option>
              <option value="user">User</option>
              <option value="instructor">Instructor</option>
              <option value="host">Host</option>
              <option value="seller">Seller</option>
              <option value="admin">Admin</option>
            </select>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="banned">Banned</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700 text-sm">
                  <th className="p-3 font-medium text-gray-500 cursor-pointer" onClick={() => handleSort('name')}>User</th>
                  <th className="p-3 font-medium text-gray-500 cursor-pointer" onClick={() => handleSort('role')}>Role</th>
                  <th className="p-3 font-medium text-gray-500">Status</th>
                  <th className="p-3 font-medium text-gray-500 cursor-pointer" onClick={() => handleSort('walletBalance')}>Wallet</th>
                  <th className="p-3 font-medium text-gray-500 cursor-pointer" onClick={() => handleSort('createdAt')}>Joined</th>
                  <th className="p-3 font-medium text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredUsers.map(u => (
                  <tr key={u.uid} className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${u.status === 'banned' ? 'opacity-60' : ''}`}>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img src={u.avatarURL || `https://ui-avatars.com/api/?name=${u.name}`} className="w-8 h-8 rounded-full" alt="" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                            {u.name}
                            {u.isVerifiedEmail && <CheckCircle size={12} className="text-blue-500" />}
                          </p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' :
                        u.role === 'instructor' ? 'bg-blue-100 text-blue-700' :
                        u.role === 'host' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'seller' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        u.status === 'banned' ? 'bg-red-100 text-red-700' :
                        u.status === 'suspended' ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {(u.status || 'active').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-gray-700 dark:text-gray-300">
                      ${(u.walletBalance || 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-xs text-gray-500">
                      {format(u.createdAt, 'MMM dd, yyyy')}
                    </td>
                    <td className="p-3 text-right space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => openModal(u, 'details')} title="View Details"><Eye size={16}/></Button>
                      <Button variant="ghost" size="sm" onClick={() => openModal(u, 'activities')} title="Activity Logs"><Activity size={16}/></Button>
                      <Button variant="ghost" size="sm" onClick={() => openModal(u, 'wallet')} title="Adjust Wallet"><Wallet size={16}/></Button>
                      <Button variant="ghost" size="sm" onClick={() => openModal(u, 'ban')} className="text-amber-600 hover:bg-amber-50" title="Ban/Suspend"><Ban size={16}/></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(u)} className="text-red-600 hover:bg-red-50" title="Delete"><Trash2 size={16}/></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && <p className="text-center py-8 text-gray-500">No users found.</p>}
          </div>
        </Card>
      )}

      {activeTab === 'applications' && (
        <div className="space-y-4">
          {roleApps.map(app => (
            <Card key={app.id} className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">{users.find(u => u.uid === app.uid)?.name || 'Unknown User'}</span>
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">Requested: {app.roleRequested}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${app.status === 'pending' ? 'bg-amber-100 text-amber-700' : app.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {app.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{app.message}</p>
                {app.portfolioUrl && <a href={app.portfolioUrl} target="_blank" rel="noreferrer" className="text-xs flex items-center gap-1 text-indigo-600 hover:underline mt-1"><ArrowUpRight size={12}/> Portfolio Link</a>}
                <p className="text-xs text-gray-400 mt-2">Applied {formatDistanceToNow(app.createdAt)} ago</p>
              </div>
              
              {app.status === 'pending' && (
                <div className="flex flex-col gap-2 w-full sm:w-64">
                  <Input placeholder="Admin feedback (required for rejection)" value={adminReason} onChange={e => setAdminReason(e.target.value)} className="text-sm py-1" />
                  <div className="flex gap-2">
                    <Button variant="success" size="sm" className="flex-1" onClick={() => handleApproveApplication(app, true)} isLoading={actionLoading}><CheckCircle size={16} className="mr-1"/> Approve</Button>
                    <Button variant="danger" size="sm" className="flex-1" onClick={() => handleApproveApplication(app, false)} isLoading={actionLoading} disabled={!adminReason}><XCircle size={16} className="mr-1"/> Reject</Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
          {roleApps.length === 0 && <p className="text-center text-gray-500 py-8">No applications found.</p>}
        </div>
      )}

      {/* MODALS */}
      {selectedUser && modalView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md z-10">
              <h3 className="text-xl font-bold flex items-center gap-2">
                {modalView === 'details' && <><Shield className="text-indigo-600"/> User Details</>}
                {modalView === 'ban' && <><Ban className="text-amber-600"/> Access Control</>}
                {modalView === 'wallet' && <><Wallet className="text-green-600"/> Wallet Management</>}
                {modalView === 'activities' && <><Activity className="text-blue-600"/> Activity Logs</>}
              </h3>
              <button onClick={() => setModalView(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><XCircle size={24} className="text-gray-500"/></button>
            </div>
            
            <div className="p-6">
              {/* Profile Overview Banner (always visible in modals except activities maybe) */}
              <div className="flex items-center gap-4 mb-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                <img src={selectedUser.avatarURL || `https://ui-avatars.com/api/?name=${selectedUser.name}`} className="w-16 h-16 rounded-full" alt="" />
                <div>
                  <h4 className="font-bold text-lg text-gray-900 dark:text-white">{selectedUser.name} <span className="text-sm font-normal text-gray-500">({selectedUser.role})</span></h4>
                  <p className="text-sm text-gray-600">{selectedUser.email} • UID: <span className="font-mono text-xs">{selectedUser.uid}</span></p>
                  <p className="text-sm text-gray-600 mt-1">Status: <span className={`font-medium ${selectedUser.status === 'banned' ? 'text-red-600' : 'text-green-600'}`}>{(selectedUser.status || 'active').toUpperCase()}</span></p>
                </div>
              </div>

              {/* DETAILS VIEW */}
              {modalView === 'details' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 border-b pb-2">Profile Info</h5>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li><strong>Username:</strong> {selectedUser.username || 'N/A'}</li>
                      <li><strong>Phone:</strong> {selectedUser.phone || 'N/A'}</li>
                      <li><strong>Location:</strong> {selectedUser.city}{selectedUser.city && selectedUser.country ? ', ' : ''}{selectedUser.country}</li>
                      <li><strong>Joined:</strong> {format(selectedUser.createdAt, 'PPpp')}</li>
                      <li><strong>Last Active:</strong> {selectedUser.lastActiveAt ? format(selectedUser.lastActiveAt, 'PPpp') : 'Unknown'}</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 border-b pb-2">Platform Stats</h5>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li><strong>Wallet Balance:</strong> ${selectedUser.walletBalance?.toFixed(2) || '0.00'}</li>
                      <li><strong>Total Earnings:</strong> ${selectedUser.totalEarnings?.toFixed(2) || '0.00'}</li>
                      <li><strong>Level / Rank:</strong> {selectedUser.level || 1} / {selectedUser.rank || 'Beginner'}</li>
                      <li><strong>Followers:</strong> {selectedUser.followersCount || 0}</li>
                      <li><strong>IP Address:</strong> {selectedUser.ip || 'Unknown'}</li>
                    </ul>
                  </div>
                  <div className="sm:col-span-2">
                    <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Bio</h5>
                    <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">{selectedUser.bio || 'No bio provided.'}</p>
                  </div>
                </div>
              )}

              {/* BAN / ACCESS CONTROL VIEW */}
              {modalView === 'ban' && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl border ${selectedUser.status === 'banned' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    <AlertTriangle className="mb-2" />
                    <h5 className="font-bold mb-1">{selectedUser.status === 'banned' ? 'Lift Ban' : 'Ban User'}</h5>
                    <p className="text-sm opacity-90">
                      {selectedUser.status === 'banned' 
                        ? 'This will restore the user\'s access to the platform.' 
                        : 'Banning this user will immediately revoke their access. You must provide a reason.'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Recorded in Audit Logs)</label>
                    <textarea 
                      className="w-full p-3 border rounded-xl" 
                      rows={3} 
                      value={adminReason} 
                      onChange={e => setAdminReason(e.target.value)}
                      placeholder="e.g. Violation of terms, spam..."
                    />
                  </div>
                  
                  <div className="flex justify-end gap-3 mt-4">
                    <Button variant="ghost" onClick={() => setModalView(null)}>Cancel</Button>
                    <Button 
                      variant={selectedUser.status === 'banned' ? 'success' : 'danger'} 
                      onClick={handleBanSubmit} 
                      isLoading={actionLoading}
                      disabled={selectedUser.status !== 'banned' && !adminReason.trim()}
                    >
                      {selectedUser.status === 'banned' ? 'Unban User' : 'Confirm Ban'}
                    </Button>
                  </div>
                </div>
              )}

              {/* WALLET MANAGEMENT VIEW */}
              {modalView === 'wallet' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                      <p className="text-sm text-green-600 mb-1">Current Balance</p>
                      <p className="text-2xl font-bold text-green-700">${selectedUser.walletBalance?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Amount (+ or -)</label>
                    <Input 
                      type="number" 
                      value={walletAmount} 
                      onChange={e => setWalletAmount(Number(e.target.value))} 
                      placeholder="e.g. 50 or -20" 
                    />
                    <p className="text-sm text-gray-500 mt-1">New Balance will be: ${(Number(selectedUser.walletBalance || 0) + Number(walletAmount)).toFixed(2)}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Adjustment</label>
                    <Input 
                      value={adminReason} 
                      onChange={e => setAdminReason(e.target.value)} 
                      placeholder="e.g. Manual refund, prize payout" 
                    />
                  </div>

                  <div className="flex justify-end gap-3 mt-4">
                    <Button variant="ghost" onClick={() => setModalView(null)}>Cancel</Button>
                    <Button variant="primary" onClick={handleWalletSubmit} isLoading={actionLoading} disabled={!walletAmount || !adminReason}>
                      Submit Adjustment
                    </Button>
                  </div>
                </div>
              )}

              {/* ACTIVITIES LOG VIEW */}
              {modalView === 'activities' && (
                <div>
                  {loadingActivities ? <Loader /> : (
                    <div className="space-y-3">
                      {activities.length === 0 ? (
                        <p className="text-center py-8 text-gray-500">No activity logs found for this user.</p>
                      ) : (
                        activities.map(log => (
                          <div key={log.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 flex justify-between items-start">
                            <div className="flex items-start gap-3">
                              <div className="mt-1 p-1 bg-white rounded shadow-sm"><Activity size={14} className="text-gray-500"/></div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{log.action.toUpperCase()}</p>
                                <p className="text-xs text-gray-600 mt-0.5">{log.details}</p>
                                {(log.ip || log.deviceInfo) && (
                                  <p className="text-[10px] text-gray-400 mt-1 font-mono">{log.ip} • {log.deviceInfo}</p>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] text-gray-400 whitespace-nowrap">{formatDistanceToNow(log.createdAt, { addSuffix: true })}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
