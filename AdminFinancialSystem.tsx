import React, { useState, useEffect, useMemo } from 'react';
import { User, Transaction, WithdrawalRequest } from './models';
import { Card, Button, Input, Loader } from './widgets';
import { 
  DollarSign, TrendingUp, AlertTriangle, CheckCircle, XCircle, Search, 
  Filter, Eye, Wallet, RefreshCcw, Download, CreditCard, ShieldAlert,
  Activity
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { 
  getAllTransactions, getAllWithdrawals, approveTransaction, rejectTransaction,
  approveWithdrawal, rejectWithdrawal, getUser
} from './firestoreService';

export const AdminFinancialSystem = ({ currentUser }: { currentUser: User }) => {
  const [activeTab, setActiveTab] = useState<'ledger' | 'payments' | 'withdrawals' | 'analytics' | 'coupons'>('ledger');
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  
  // Modals
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [selectedWt, setSelectedWt] = useState<WithdrawalRequest | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [txs, wts] = await Promise.all([
        getAllTransactions(),
        getAllWithdrawals()
      ]);
      setTransactions(txs);
      setWithdrawals(wts);
      
      // Load user details for references
      const userIds = [...new Set([...txs.map(t=>t.userId), ...wts.map(w=>w.userId)])];
      const users: Record<string, User> = {};
      await Promise.all(userIds.map(async (uid) => {
        const u = await getUser(uid);
        if (u) users[uid] = u;
      }));
      setUsersMap(users);
    } catch (e) {
      toast.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch = t.id.toLowerCase().includes(search.toLowerCase()) || 
                          t.userId.toLowerCase().includes(search.toLowerCase()) ||
                          t.transactionId?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchType = typeFilter === 'all' || t.type === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [transactions, search, statusFilter, typeFilter]);

  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter(w => {
      const matchSearch = w.id.toLowerCase().includes(search.toLowerCase()) || 
                          w.userId.toLowerCase().includes(search.toLowerCase()) ||
                          w.accountNumber?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || w.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [withdrawals, search, statusFilter]);

  const handleTxAction = async (action: 'approve' | 'reject') => {
    if (!selectedTx) return;
    setActionLoading(true);
    try {
      if (action === 'approve') {
        await approveTransaction(selectedTx.id, selectedTx.userId, selectedTx.amount);
        toast.success("Transaction approved");
      } else {
        await rejectTransaction(selectedTx.id, adminNote || 'Rejected by admin');
        toast.success("Transaction rejected");
      }
      setSelectedTx(null);
      setAdminNote('');
      loadData();
    } catch (e) {
      toast.error("Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleWtAction = async (action: 'approve' | 'reject') => {
    if (!selectedWt) return;
    setActionLoading(true);
    try {
      if (action === 'approve') {
        await approveWithdrawal(selectedWt.id, selectedWt.userId, selectedWt.amount);
        toast.success("Withdrawal approved");
      } else {
        await rejectWithdrawal(selectedWt.id, adminNote || 'Rejected by admin');
        toast.success("Withdrawal rejected");
      }
      setSelectedWt(null);
      setAdminNote('');
      loadData();
    } catch (e) {
      toast.error("Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  // KPIs
  const totalRevenue = transactions.filter(t => (t.status === 'completed' || t.status === 'approved') && t.type !== 'withdrawal').reduce((sum, t) => sum + t.amount, 0);
  const pendingTxs = transactions.filter(t => t.status === 'pending').length;
  const pendingWts = withdrawals.filter(w => w.status === 'pending').length;
  const totalPaidOut = withdrawals.filter(w => w.status === 'approved' || w.status === 'completed').reduce((sum, w) => sum + w.amount, 0);

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-green-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Gross Processed</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">${totalRevenue.toFixed(2)}</h3>
            </div>
            <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg text-green-600"><DollarSign size={20}/></div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-amber-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Validations</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{pendingTxs}</h3>
            </div>
            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-600"><Activity size={20}/></div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-blue-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Payout Requests</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{pendingWts}</h3>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600"><Wallet size={20}/></div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-purple-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Settled Payouts</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">${totalPaidOut.toFixed(2)}</h3>
            </div>
            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-purple-600"><TrendingUp size={20}/></div>
          </div>
        </Card>
      </div>

      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex-wrap gap-1 w-fit">
        <button 
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'ledger' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
        >
          General Ledger
        </button>
        <button 
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'payments' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Payment Validation
          {pendingTxs > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingTxs}</span>}
        </button>
        <button 
          onClick={() => setActiveTab('withdrawals')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'withdrawals' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Payouts
          {pendingWts > 0 && <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingWts}</span>}
        </button>
        <button 
          onClick={() => setActiveTab('coupons')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'coupons' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Coupons
        </button>
      </div>

      {/* LEDGER TAB */}
      {activeTab === 'ledger' && (
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search txn ID, user ID..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl"
              />
            </div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-2">
              <option value="all">All Types</option>
              <option value="deposit">Deposit</option>
              <option value="course_purchase">Course Purchase</option>
              <option value="withdrawal">Withdrawal</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-2">
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed / Approved</option>
              <option value="rejected">Rejected / Failed</option>
            </select>
            <Button variant="outline"><Download size={16} className="mr-2"/> Export</Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 text-gray-500 text-xs uppercase">
                  <th className="p-3">Ref ID</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Date</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                {filteredTransactions.slice(0, 50).map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-3 font-mono text-xs">{t.id.substring(0, 8)}..</td>
                    <td className="p-3">
                      <p className="font-medium">{usersMap[t.userId]?.name || t.userId.substring(0,6)}</p>
                      <p className="text-xs text-gray-500">{usersMap[t.userId]?.email}</p>
                    </td>
                    <td className="p-3 capitalize">{t.type.replace('_', ' ')}</td>
                    <td className={`p-3 text-right font-medium ${t.type === 'deposit' ? 'text-green-600' : 'text-gray-900 dark:text-gray-100'}`}>
                      ${t.amount.toFixed(2)}
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold 
                        ${t.status === 'completed' || t.status === 'approved' ? 'bg-green-100 text-green-800' : 
                          t.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500">{format(t.createdAt, 'MMM dd, HH:mm')}</td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedTx(t)}><Eye size={16}/></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* PAYMENTS & VALIDATION */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-start gap-3">
            <ShieldAlert className="mt-0.5 shrink-0" />
            <div>
              <h4 className="font-bold">Manual Verification Required</h4>
              <p className="text-sm opacity-90">These transactions were submitted via manual payment methods (bKash/Nagad). Verify the TxID and proof before approving to prevent fraud.</p>
            </div>
          </div>
          
          <div className="grid gap-4">
            {transactions.filter(t => t.status === 'pending').map(t => (
              <Card key={t.id} className="p-4 sm:p-6 flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex justify-between">
                    <div>
                      <h4 className="font-bold text-lg">{usersMap[t.userId]?.name || 'Unknown User'}</h4>
                      <p className="text-sm text-gray-500">{t.userId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">${t.amount.toFixed(2)}</p>
                      <span className="text-xs font-semibold px-2 py-1 bg-amber-100 text-amber-800 rounded uppercase">{t.type}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                    <div><span className="text-gray-500">Gateway:</span> <span className="font-medium">{t.method}</span></div>
                    <div><span className="text-gray-500">Sender:</span> <span className="font-mono">{t.senderNumber || 'N/A'}</span></div>
                    <div className="col-span-2"><span className="text-gray-500">TxID:</span> <span className="font-mono font-bold bg-yellow-100 dark:bg-yellow-900/30 px-1">{t.transactionId || 'N/A'}</span></div>
                  </div>
                </div>
                
                <div className="w-full md:w-64 flex flex-col justify-between border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800 pt-4 md:pt-0 md:pl-6">
                  {t.proofUrl ? (
                    <a href={t.proofUrl} target="_blank" rel="noreferrer" className="block w-full h-32 bg-gray-100 rounded-lg overflow-hidden border">
                      <img src={t.proofUrl} className="w-full h-full object-cover hover:scale-105 transition-transform" alt="Proof" />
                    </a>
                  ) : (
                    <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">No image proof</div>
                  )}
                  <Button variant="primary" className="mt-4 w-full" onClick={() => setSelectedTx(t)}>Review & Action</Button>
                </div>
              </Card>
            ))}
            {transactions.filter(t => t.status === 'pending').length === 0 && (
              <p className="text-center py-10 text-gray-500">No pending payments require validation.</p>
            )}
          </div>
        </div>
      )}

      {/* WITHDRAWALS */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-4">
           <div className="grid gap-4">
            {withdrawals.filter(w => w.status === 'pending').map(w => (
              <Card key={w.id} className="p-4 sm:p-6 flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex justify-between">
                    <div>
                      <h4 className="font-bold text-lg">{usersMap[w.userId]?.name || 'Unknown User'}</h4>
                      <p className="text-sm text-gray-500">Locked Balance: ${usersMap[w.userId]?.lockedBalance?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-red-600">-${w.amount.toFixed(2)}</p>
                      <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-800 rounded uppercase">PAYOUT</span>
                    </div>
                  </div>
                  
                  <div className="text-sm bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                    <p className="mb-2"><span className="text-gray-500">Payout Method:</span> <span className="font-bold">{w.method}</span></p>
                    <p className="mb-1"><span className="text-gray-500">Destination Account:</span></p>
                    <p className="font-mono text-lg font-bold bg-white dark:bg-gray-900 border p-2 rounded">{w.accountNumber}</p>
                  </div>
                </div>
                
                <div className="w-full md:w-64 flex flex-col justify-end border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800 pt-4 md:pt-0 md:pl-6 space-y-2">
                  <Button variant="success" onClick={() => {setSelectedWt(w); setAdminNote(''); handleWtAction('approve');}} isLoading={actionLoading}>Mark Paid & Disburse</Button>
                  <Button variant="danger" onClick={() => setSelectedWt(w)}>Reject & Refund</Button>
                </div>
              </Card>
            ))}
            {withdrawals.filter(w => w.status === 'pending').length === 0 && (
              <p className="text-center py-10 text-gray-500">No pending payout requests.</p>
            )}
           </div>
        </div>
      )}

      {/* TX MODAL */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold">Transaction Details</h3>
              <button onClick={() => setSelectedTx(null)} className="p-1 hover:bg-gray-100 rounded-full"><XCircle size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-center mb-6">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">${selectedTx.amount.toFixed(2)}</p>
                <p className="text-sm text-gray-500 capitalize">{selectedTx.type.replace('_', ' ')} via {selectedTx.method || 'System'}</p>
              </div>

              {selectedTx.status === 'pending' && (
                <>
                  <label className="block text-sm font-medium mb-1">Admin Notes (Reason for rejection if applicable)</label>
                  <textarea 
                    className="w-full p-3 border rounded-xl"
                    rows={2}
                    value={adminNote}
                    onChange={e => setAdminNote(e.target.value)}
                  />
                  <div className="flex gap-3 pt-4">
                    <Button variant="success" className="flex-1" onClick={() => handleTxAction('approve')} isLoading={actionLoading}>Approve</Button>
                    <Button variant="danger" className="flex-1" onClick={() => handleTxAction('reject')} isLoading={actionLoading} disabled={!adminNote}>Reject</Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* WT MODAL (REJECT ONLY) */}
      {selectedWt && activeTab === 'withdrawals' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-red-600">Reject Payout Request</h3>
              <button onClick={() => setSelectedWt(null)} className="p-1 hover:bg-gray-100 rounded-full"><XCircle size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">You are rejecting a payout of <strong>${selectedWt.amount.toFixed(2)}</strong>. This will return the locked funds back to the user's available wallet balance.</p>
              <label className="block text-sm font-medium mb-1">Reason for Rejection (Required)</label>
              <textarea 
                className="w-full p-3 border rounded-xl"
                rows={3}
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                placeholder="e.g. Invalid account number..."
              />
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => setSelectedWt(null)}>Cancel</Button>
                <Button variant="danger" onClick={() => handleWtAction('reject')} isLoading={actionLoading} disabled={!adminNote}>Confirm Rejection</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'coupons' && <AdminCouponsTab />}
    </div>
  );
};

import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Coupon } from './models';
import { getCoupons, createCoupon, deleteCoupon, updateCoupon } from './firestoreService';

const AdminCouponsTab = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [editingId, setEditingId] = useState('');
  const [formData, setFormData] = useState<Partial<Coupon>>({
    code: '',
    type: 'percentage',
    value: 0,
    isActive: true,
    maxUsesGlobal: 100,
    maxUsesPerUser: 1,
    minPurchaseAmount: 0,
  });

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const data = await getCoupons();
      setCoupons(data);
    } catch (e) {
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.value) return;

    try {
      if (editingId) {
        await updateCoupon(editingId, formData);
        toast.success('Coupon updated');
      } else {
        await createCoupon({
          ...formData as unknown as Omit<Coupon, 'id' | 'createdAt' | 'currentUsesGlobal'>,
          startDate: formData.startDate || Date.now(),
          expiryDate: formData.expiryDate || Date.now() + 30 * 86400000,
        });
        toast.success('Coupon created');
      }
      setShowModal(false);
      setEditingId('');
      loadCoupons();
    } catch (e: any) {
      toast.error(e.message || 'Error saving coupon');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await deleteCoupon(id);
      toast.success('Coupon deleted');
      loadCoupons();
    } catch (e) {
      toast.error('Failed to delete coupon');
    }
  };

  const openNew = () => {
    setEditingId('');
    setFormData({
      code: '',
      type: 'percentage',
      value: 0,
      isActive: true,
      maxUsesGlobal: 100,
      maxUsesPerUser: 1,
      minPurchaseAmount: 0,
      startDate: Date.now(),
      expiryDate: Date.now() + 30 * 86400000,
    });
    setShowModal(true);
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
        <h2 className="text-xl font-bold">Manage Coupons</h2>
        <Button onClick={openNew} className="flex items-center gap-2"><Plus size={16}/> New Coupon</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-semibold text-gray-600">Code</th>
              <th className="p-4 font-semibold text-gray-600">Value</th>
              <th className="p-4 font-semibold text-gray-600">Uses</th>
              <th className="p-4 font-semibold text-gray-600">Expiry</th>
              <th className="p-4 font-semibold text-gray-600">Status</th>
              <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-4 font-bold text-indigo-600">{c.code}</td>
                <td className="p-4">{c.type === 'percentage' ? `${c.value}%` : `৳${c.value}`}</td>
                <td className="p-4">{c.currentUsesGlobal} / {c.maxUsesGlobal}</td>
                <td className="p-4">{format(c.expiryDate, 'dd MMM yyyy')}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {c.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => { setEditingId(c.id); setFormData(c); setShowModal(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16}/></button>
                    <button onClick={() => handleDelete(c.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {coupons.length === 0 && <div className="p-8 text-center text-gray-500">No coupons found.</div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 my-8 shadow-xl">
            <h3 className="text-xl font-bold mb-4">{editingId ? 'Edit Coupon' : 'Create Coupon'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Coupon Code</label>
                  <Input required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} placeholder="e.g. SUMMER50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select className="w-full border rounded-lg p-2" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as 'percentage'|'fixed'})}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (৳)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Value</label>
                  <Input type="number" required min={1} value={formData.value} onChange={e => setFormData({...formData, value: Number(e.target.value)})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Max Discount Cap (For % coupons only, 0 for unlimited)</label>
                  <Input type="number" value={formData.maxDiscountCap || 0} onChange={e => setFormData({...formData, maxDiscountCap: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Global Limit (Total uses)</label>
                  <Input type="number" required min={1} value={formData.maxUsesGlobal} onChange={e => setFormData({...formData, maxUsesGlobal: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Per User Limit</label>
                  <Input type="number" required min={1} value={formData.maxUsesPerUser} onChange={e => setFormData({...formData, maxUsesPerUser: Number(e.target.value)})} />
                </div>
                <div className="col-span-2 flex items-center gap-2 mt-2">
                  <input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4"/>
                  <label htmlFor="isActive" className="font-medium">Active (Can be used immediately if dates match)</label>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input type="checkbox" id="newUsersOnly" checked={formData.newUsersOnly || false} onChange={e => setFormData({...formData, newUsersOnly: e.target.checked})} className="w-4 h-4"/>
                  <label htmlFor="newUsersOnly" className="font-medium text-amber-600">New Users Only (No previous transactions)</label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit">Save Coupon</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
