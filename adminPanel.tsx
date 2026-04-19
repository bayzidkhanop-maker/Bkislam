import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, BookOpen, Trophy, Wallet, 
  Settings, Image as ImageIcon, Bell, Shield, MessageSquare, 
  FileText, LogOut, Menu, X, ChevronRight, Globe, Lock,
  AlertTriangle, ShieldCheck, Trash2, ExternalLink, CheckCircle, XCircle, ArrowUpRight,
  Search, Filter, MoreVertical, Edit, Ban, PlayCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getAllUsers, getReportedPosts, resolveReport, deletePost, deleteUser, getAllPendingTransactions, getAllPendingWithdrawals, approveTransaction, rejectTransaction, approveWithdrawal, rejectWithdrawal, getAllTransactions, updateUserRole } from './firestoreService';
import { User, Report, Transaction, WithdrawalRequest } from './models';
import { Card, Button, Loader, Input } from './widgets';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { AdminCourseManagement } from './AdminCourseManagement';
import { AdminUserManagement } from './AdminUserManagement';
import { AdminModerationSystem } from './AdminModerationSystem';
import { AdminSettingsSystem } from './AdminSettingsSystem';
import { AdminFinancialSystem } from './AdminFinancialSystem';
import { AdminTournamentManagement } from './AdminTournamentManagement';
import { AdminBookManagement } from './AdminBookManagement';

export const AdminPanel = ({ currentUser }: { currentUser: User }) => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState('');

  // Filters
  const [txFilterStatus, setTxFilterStatus] = useState<string>('all');
  const [txFilterType, setTxFilterType] = useState<string>('all');
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      navigate('/');
      return;
    }

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
  }, [currentUser, navigate]);

  const handleRoleChange = async (uid: string, newRole: 'user' | 'admin' | 'instructor' | 'host') => {
    setActionLoading(uid);
    try {
      await updateUserRole(uid, newRole);
      setUsers(users.map(u => u.uid === uid ? { ...u, role: newRole } : u));
      toast.success(`User role updated to ${newRole}`);
    } catch (error) {
      toast.error('Failed to update user role');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (uid: string) => {
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
      cancel: { label: 'Cancel', onClick: () => {} }
    });
  };

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

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users & Roles', icon: Users },
    { id: 'courses', label: 'Video Courses', icon: PlayCircle },
    { id: 'books', label: 'eBooks & PDFs', icon: BookOpen },
    { id: 'tournaments', label: 'Tournaments', icon: Trophy },
    { id: 'financials', label: 'Financials', icon: Wallet },
    { id: 'reports', label: 'Moderation', icon: AlertTriangle },
    { id: 'settings', label: 'Settings & Branding', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col z-20 shadow-lg"
          >
            <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-700">
              <Shield className="text-indigo-600 mr-2" size={24} />
              <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Admin Pro</span>
            </div>
            
            <div className="flex-1 overflow-y-auto py-4">
              <nav className="space-y-1 px-3">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive 
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <Icon size={18} className={isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'} />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <Link to="/">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors">
                  <ExternalLink size={16} />
                  Back to App
                </button>
              </Link>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 sm:px-6 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white capitalize">
              {activeTab.replace('-', ' ')}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-400 hover:text-gray-500 relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="flex items-center gap-2">
              <img src={currentUser?.avatarURL || `https://ui-avatars.com/api/?name=${currentUser?.name}`} alt="Admin" className="w-8 h-8 rounded-full" />
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto">
            
            {/* Dashboard View */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="p-6 border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Users</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{users.length}</p>
                      </div>
                      <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Users size={24} />
                      </div>
                    </div>
                  </Card>
                  <Card className="p-6 border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Reports</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{reports.length}</p>
                      </div>
                      <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <AlertTriangle size={24} />
                      </div>
                    </div>
                  </Card>
                  <Card className="p-6 border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Txs</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{pendingTransactions.length}</p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                        <Wallet size={24} />
                      </div>
                    </div>
                  </Card>
                  <Card className="p-6 border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                          ৳ {allTransactions.filter(t => t.status === 'completed' && t.type === 'course_purchase').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <ArrowUpRight size={24} />
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Quick Actions */}
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-8 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button onClick={() => setActiveTab('users')} className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-indigo-500 transition-colors text-left">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg"><Users size={20}/></div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Manage Users</p>
                      <p className="text-xs text-gray-500">View, edit, or ban users</p>
                    </div>
                  </button>
                  <button onClick={() => setActiveTab('financials')} className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-green-500 transition-colors text-left">
                    <div className="p-2 bg-green-50 dark:bg-green-900/30 text-green-600 rounded-lg"><Wallet size={20}/></div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Review Payments</p>
                      <p className="text-xs text-gray-500">{pendingTransactions.length} pending approvals</p>
                    </div>
                  </button>
                  <button onClick={() => setActiveTab('settings')} className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-purple-500 transition-colors text-left">
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 rounded-lg"><Settings size={20}/></div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Site Settings</p>
                      <p className="text-xs text-gray-500">Update logo & branding</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Users View */}
            {activeTab === 'users' && (
              <AdminUserManagement 
                users={users} 
                currentUser={currentUser} 
                onUpdate={async () => {
                  const fetchedUsers = await getAllUsers();
                  setUsers(fetchedUsers);
                }} 
              />
            )}

            {/* Financials View */}
            {activeTab === 'financials' && (
              <AdminFinancialSystem currentUser={currentUser} />
            )}

            {/* Settings & Branding View */}
            {activeTab === 'settings' && (
              <AdminSettingsSystem currentUser={currentUser} />
            )}

            {/* Moderation / Reports View */}
            {activeTab === 'reports' && (
              <AdminModerationSystem currentUser={currentUser} />
            )}

            {/* Placeholders for other tabs */}
            {activeTab === 'courses' && (
              <AdminCourseManagement currentUser={currentUser} />
            )}

            {/* Tournaments View */}
            {activeTab === 'tournaments' && (
              <AdminTournamentManagement currentUser={currentUser} />
            )}

            {/* eBooks View */}
            {activeTab === 'books' && (
              <AdminBookManagement currentUser={currentUser} />
            )}

          </div>
        </main>
      </div>
    </div>
  );
};
