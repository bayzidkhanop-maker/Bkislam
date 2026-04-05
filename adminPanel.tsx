import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllUsers, getReportedPosts, resolveReport, deletePost, deleteUser, getAllPendingTransactions, getAllPendingWithdrawals, approveTransaction, rejectTransaction, approveWithdrawal, rejectWithdrawal, getAllTransactions } from './firestoreService';
import { User, Report, Transaction, WithdrawalRequest } from './models';
import { Card, Button, Loader, Input } from './widgets';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Users, AlertTriangle, ShieldCheck, Trash2, ExternalLink, Shield, Wallet, CheckCircle, XCircle, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';

export const AdminPanel = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'reports' | 'financials' | 'transactions'>('users');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState('');
  
  // Filters for transactions
  const [txFilterStatus, setTxFilterStatus] = useState<string>('all');
  const [txFilterType, setTxFilterType] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [fetchedUsers, fetchedReports, fetchedPendingTxs, fetchedWds, fetchedAllTxs] = await Promise.all([
          getAllUsers(),
          getReportedPosts(),
          getAllPendingTransactions(),
          getAllPendingWithdrawals(),
          getAllTransactions()
        ]);
        setUsers(fetchedUsers);
        setReports(fetchedReports);
        setPendingTransactions(fetchedPendingTxs);
        setWithdrawals(fetchedWds);
        setAllTransactions(fetchedAllTxs);
      } catch (error) {
        toast.error('Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleResolveReport = async (reportId: string, postId: string, deleteContent: boolean) => {
    setActionLoading(reportId);
    try {
      await resolveReport(reportId);
      if (deleteContent) {
        await deletePost(postId);
        toast.success('Post deleted and report resolved');
      } else {
        toast.success('Report dismissed');
      }
      setReports(reports.filter(r => r.id !== reportId));
    } catch (error) {
      toast.error('Failed to resolve report');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    // We use a custom toast instead of window.confirm for better UX
    toast('Are you sure you want to delete this user?', {
      action: {
        label: 'Delete',
        onClick: async () => {
          setActionLoading(uid);
          try {
            await deleteUser(uid);
            setUsers(users.filter(u => u.uid !== uid));
            toast.success('User deleted successfully');
          } catch (error) {
            toast.error('Failed to delete user');
          } finally {
            setActionLoading(null);
          }
        }
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {}
      }
    });
  };

  const handleApproveTransaction = async (tx: Transaction) => {
    setActionLoading(tx.id);
    try {
      await approveTransaction(tx.id, tx.userId, tx.amount);
      setPendingTransactions(pendingTransactions.filter(t => t.id !== tx.id));
      setAllTransactions(allTransactions.map(t => t.id === tx.id ? { ...t, status: 'approved' } : t));
      toast.success('Transaction approved');
    } catch (error) {
      toast.error('Failed to approve transaction');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectTransaction = async (txId: string) => {
    if (!adminNote) {
      toast.error("Please provide a rejection note");
      return;
    }
    setActionLoading(txId);
    try {
      await rejectTransaction(txId, adminNote);
      setPendingTransactions(pendingTransactions.filter(t => t.id !== txId));
      setAllTransactions(allTransactions.map(t => t.id === txId ? { ...t, status: 'rejected', adminNote } : t));
      setAdminNote('');
      toast.success('Transaction rejected');
    } catch (error) {
      toast.error('Failed to reject transaction');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveWithdrawal = async (wd: WithdrawalRequest) => {
    setActionLoading(wd.id);
    try {
      await approveWithdrawal(wd.id, wd.userId, wd.amount);
      setWithdrawals(withdrawals.filter(w => w.id !== wd.id));
      toast.success('Withdrawal approved');
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve withdrawal');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectWithdrawal = async (wdId: string) => {
    if (!adminNote) {
      toast.error("Please provide a rejection note");
      return;
    }
    setActionLoading(wdId);
    try {
      await rejectWithdrawal(wdId, adminNote);
      setWithdrawals(withdrawals.filter(w => w.id !== wdId));
      setAdminNote('');
      toast.success('Withdrawal rejected');
    } catch (error) {
      toast.error('Failed to reject withdrawal');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return (
    <div className="p-6 max-w-6xl mx-auto pt-12">
      <div className="animate-pulse space-y-8">
        <div className="h-10 bg-gray-200 rounded w-1/4"></div>
        <div className="flex gap-4">
          <div className="h-12 bg-gray-200 rounded w-32"></div>
          <div className="h-12 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="h-96 bg-gray-200 rounded-2xl"></div>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <Shield className="text-indigo-600" size={32} />
            Admin Dashboard
          </h1>
          <p className="text-gray-500 mt-1">Manage users and content moderation</p>
        </div>
        <Link to="/">
          <Button variant="outline" className="gap-2">
            <ExternalLink size={18} />
            Back to App
          </Button>
        </Link>
      </div>

      <div className="flex space-x-2 mb-8 bg-gray-100 p-1.5 rounded-xl inline-flex">
        <button
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'users' 
              ? 'bg-white text-indigo-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
          }`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={18} />
          Users
          <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs ml-1">{users.length}</span>
        </button>
        <button
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'reports' 
              ? 'bg-white text-amber-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
          }`}
          onClick={() => setActiveTab('reports')}
        >
          <AlertTriangle size={18} />
          Reports
          {reports.length > 0 && (
            <span className="bg-amber-100 text-amber-700 py-0.5 px-2 rounded-full text-xs ml-1">{reports.length}</span>
          )}
        </button>
        <button
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'financials' 
              ? 'bg-white text-green-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
          }`}
          onClick={() => setActiveTab('financials')}
        >
          <Wallet size={18} />
          Financials
          {(pendingTransactions.length + withdrawals.length) > 0 && (
            <span className="bg-green-100 text-green-700 py-0.5 px-2 rounded-full text-xs ml-1">{pendingTransactions.length + withdrawals.length}</span>
          )}
        </button>
        <button
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'transactions' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
          }`}
          onClick={() => setActiveTab('transactions')}
        >
          <ArrowUpRight size={18} />
          Transactions
        </button>
      </div>

      {activeTab === 'users' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-sm uppercase tracking-wider">
                    <th className="p-4 font-semibold">User</th>
                    <th className="p-4 font-semibold">Email</th>
                    <th className="p-4 font-semibold">Role</th>
                    <th className="p-4 font-semibold">Joined</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map(user => (
                    <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-100 to-purple-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                            {user.avatarURL ? (
                              <img src={user.avatarURL} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-indigo-600 font-bold text-sm">{user.name[0]?.toUpperCase()}</span>
                            )}
                          </div>
                          <span className="font-medium text-gray-900">{user.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600">{user.email}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'admin' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500 text-sm">
                        {formatDistanceToNow(user.createdAt, { addSuffix: true })}
                      </td>
                      <td className="p-4 text-right">
                        {user.role !== 'admin' && (
                          <button 
                            onClick={() => handleDeleteUser(user.uid)} 
                            disabled={actionLoading === user.uid}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete User"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}

      {activeTab === 'reports' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {reports.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="h-10 w-10 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">All clear!</h3>
              <p className="text-gray-500">There are no pending reports to review.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {reports.map(report => (
                <Card key={report.id} className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle size={18} className="text-amber-500" />
                        <h3 className="font-bold text-gray-900">Reported Content</h3>
                      </div>
                      <p className="text-gray-800 mb-2"><span className="font-medium text-gray-500">Reason:</span> {report.reason}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <Link to={`/post/${report.postId}`} className="text-indigo-600 hover:underline flex items-center gap-1">
                          View Post <ExternalLink size={14} />
                        </Link>
                        <span>•</span>
                        <span>Reported {formatDistanceToNow(report.createdAt, { addSuffix: true })}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button 
                        variant="outline"
                        onClick={() => handleResolveReport(report.id, report.postId, false)} 
                        disabled={actionLoading === report.id}
                        className="flex-1 sm:flex-none"
                      >
                        Dismiss
                      </Button>
                      <Button 
                        variant="danger"
                        onClick={() => handleResolveReport(report.id, report.postId, true)} 
                        disabled={actionLoading === report.id}
                        className="flex-1 sm:flex-none gap-2"
                      >
                        <Trash2 size={16} />
                        Delete Post
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      )}
      {activeTab === 'financials' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-8"
        >
          {/* Add Money Requests */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Wallet className="text-green-600" size={24} />
              Pending Add Money Requests
            </h2>
            {pendingTransactions.length === 0 ? (
              <Card className="p-12 text-center text-gray-500 border-dashed">
                <CheckCircle size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-lg font-medium text-gray-900">All caught up!</p>
                <p>No pending add money requests.</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingTransactions.map(tx => (
                  <Card key={tx.id} className="p-4 sm:p-6 hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">Add Money</span>
                          <h3 className="font-bold text-gray-900">৳ {tx.amount.toFixed(2)}</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">Method:</span> {tx.method} • <span className="font-medium">Sender:</span> {tx.senderNumber}
                        </p>
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">TrxID:</span> <span className="font-mono bg-gray-100 px-1 rounded">{tx.transactionId}</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          User ID: {tx.userId} • {formatDistanceToNow(tx.createdAt, { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 w-full sm:w-auto">
                        <Input 
                          placeholder="Rejection note (optional)" 
                          value={adminNote} 
                          onChange={(e) => setAdminNote(e.target.value)}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button 
                            variant="danger"
                            onClick={() => handleRejectTransaction(tx.id)} 
                            disabled={actionLoading === tx.id}
                            className="flex-1"
                          >
                            Reject
                          </Button>
                          <Button 
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleApproveTransaction(tx)} 
                            disabled={actionLoading === tx.id}
                          >
                            Approve
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Withdrawal Requests */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ArrowUpRight className="text-amber-600" size={24} />
              Pending Withdrawal Requests
            </h2>
            {withdrawals.length === 0 ? (
              <Card className="p-12 text-center text-gray-500 border-dashed">
                <CheckCircle size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-lg font-medium text-gray-900">All caught up!</p>
                <p>No pending withdrawal requests.</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {withdrawals.map(wd => (
                  <Card key={wd.id} className="p-4 sm:p-6 hover:shadow-md transition-shadow border-l-4 border-amber-500">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">Withdrawal</span>
                          <h3 className="font-bold text-gray-900">৳ {wd.amount.toFixed(2)}</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">Method:</span> {wd.method} • <span className="font-medium">Account:</span> {wd.accountNumber}
                        </p>
                        <p className="text-xs text-gray-500">
                          User ID: {wd.userId} • {formatDistanceToNow(wd.createdAt, { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 w-full sm:w-auto">
                        <Input 
                          placeholder="Rejection note (optional)" 
                          value={adminNote} 
                          onChange={(e) => setAdminNote(e.target.value)}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button 
                            variant="danger"
                            onClick={() => handleRejectWithdrawal(wd.id)} 
                            disabled={actionLoading === wd.id}
                            className="flex-1"
                          >
                            Reject
                          </Button>
                          <Button 
                            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={() => handleApproveWithdrawal(wd)} 
                            disabled={actionLoading === wd.id}
                          >
                            Approve
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
      {activeTab === 'transactions' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select 
                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={txFilterStatus}
                onChange={(e) => setTxFilterStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select 
                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={txFilterType}
                onChange={(e) => setTxFilterType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="add_money">Add Money</option>
                <option value="course_purchase">Course Purchase</option>
                <option value="course_sale">Course Sale</option>
              </select>
            </div>
          </div>

          <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-sm uppercase tracking-wider">
                    <th className="p-4 font-semibold">Date</th>
                    <th className="p-4 font-semibold">User ID</th>
                    <th className="p-4 font-semibold">Type</th>
                    <th className="p-4 font-semibold">Amount</th>
                    <th className="p-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allTransactions
                    .filter(tx => txFilterStatus === 'all' || tx.status === txFilterStatus)
                    .filter(tx => txFilterType === 'all' || tx.type === txFilterType)
                    .map(tx => (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-sm text-gray-600">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4 text-sm font-mono text-gray-600">
                        {tx.userId.substring(0, 8)}...
                      </td>
                      <td className="p-4 text-sm text-gray-900 capitalize">
                        {tx.type.replace('_', ' ')}
                      </td>
                      <td className="p-4 text-sm font-bold text-gray-900">
                        ৳ {tx.amount.toFixed(2)}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          tx.status === 'approved' || tx.status === 'completed' ? 'bg-green-100 text-green-800' :
                          tx.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {allTransactions.filter(tx => txFilterStatus === 'all' || tx.status === txFilterStatus).filter(tx => txFilterType === 'all' || tx.type === txFilterType).length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">
                        No transactions found matching the filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
};
