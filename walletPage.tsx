import React, { useEffect, useState } from 'react';
import { User, Transaction, WithdrawalRequest } from './models';
import { subscribeToUserTransactions, submitAddMoneyRequest, requestWithdrawal, subscribeToUserWithdrawals } from './firestoreService';
import { Card, Button, Input, Loader } from './widgets';
import { Wallet, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

export const WalletPage = ({ currentUser }: { currentUser: User }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add Money State
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [addMethod, setAddMethod] = useState<'bKash' | 'Nagad'>('bKash');
  const [addSender, setAddSender] = useState('');
  const [addTrxId, setAddTrxId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Withdraw State
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<'bKash' | 'Nagad'>('bKash');
  const [withdrawAccount, setWithdrawAccount] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);

    let fetchedTxs = false;
    let fetchedWds = false;

    const checkLoading = () => {
      if (fetchedTxs && fetchedWds) setLoading(false);
    };

    const unsubTxs = subscribeToUserTransactions(currentUser.uid, (txs) => {
      setTransactions(txs);
      fetchedTxs = true;
      checkLoading();
    });

    const unsubWds = subscribeToUserWithdrawals(currentUser.uid, (wds) => {
      setWithdrawals(wds);
      fetchedWds = true;
      checkLoading();
    });

    return () => {
      unsubTxs();
      unsubWds();
    };
  }, [currentUser]);

  const handleAddMoney = async () => {
    if (!addAmount || !addSender || !addTrxId) {
      toast.error("Please fill all fields");
      return;
    }
    const amountNum = parseFloat(addAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Invalid amount");
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading("Submitting request...");
    try {
      await submitAddMoneyRequest(currentUser.uid, amountNum, addMethod, addSender, addTrxId);
      toast.success("Add money request submitted! Awaiting admin approval.", { id: toastId });
      setShowAddMoney(false);
      setAddAmount('');
      setAddSender('');
      setAddTrxId('');
      // Refresh
      const txs = await getUserTransactions(currentUser.uid);
      setTransactions(txs);
    } catch (error: any) {
      toast.error(error.message || "Failed to submit request", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !withdrawAccount) {
      toast.error("Please fill all fields");
      return;
    }
    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Invalid amount");
      return;
    }
    if (amountNum > (currentUser.walletBalance || 0)) {
      toast.error("Insufficient balance");
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading("Submitting withdrawal request...");
    try {
      await requestWithdrawal(currentUser.uid, amountNum, withdrawMethod, withdrawAccount);
      toast.success("Withdrawal request submitted! Awaiting admin approval.", { id: toastId });
      setShowWithdraw(false);
      setWithdrawAmount('');
      setWithdrawAccount('');
      // Refresh
      const wds = await getUserWithdrawals(currentUser.uid);
      setWithdrawals(wds);
    } catch (error: any) {
      toast.error(error.message || "Failed to submit request", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-md"><CheckCircle size={12} /> Approved</span>;
      case 'rejected':
        return <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-md"><XCircle size={12} /> Rejected</span>;
      default:
        return <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-md"><Clock size={12} /> Pending</span>;
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader /></div>;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 pb-24">
      <div className="flex items-center gap-3 mb-8">
        <Wallet className="text-indigo-600" size={32} />
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">My Wallet</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-6 md:col-span-2 shadow-xl border-0 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-indigo-100 font-medium mb-1">Available Balance</p>
                <h2 className="text-4xl sm:text-5xl font-extrabold mb-6 tracking-tight">৳ {(currentUser.walletBalance || 0).toFixed(2)}</h2>
              </div>
              {(currentUser.lockedBalance || 0) > 0 && (
                <div className="text-right bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                  <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider mb-1">Locked (Pending)</p>
                  <p className="text-xl font-bold text-white">৳ {(currentUser.lockedBalance || 0).toFixed(2)}</p>
                </div>
              )}
            </div>
            
            <div className="flex gap-4">
              <Button className="bg-white text-indigo-700 hover:bg-gray-50 font-bold px-6" onClick={() => setShowAddMoney(true)}>
                <ArrowDownLeft size={18} className="mr-2" /> Add Money
              </Button>
              {(currentUser.role === 'instructor' || currentUser.role === 'admin') && (
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 font-bold px-6" onClick={() => setShowWithdraw(true)}>
                  <ArrowUpRight size={18} className="mr-2" /> Withdraw
                </Button>
              )}
            </div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
            <Wallet size={200} />
          </div>
        </Card>

        {/* Stats Card (for instructors) */}
        {(currentUser.role === 'instructor' || currentUser.role === 'admin') && (
          <Card className="p-6 flex flex-col justify-center">
            <div className="mb-4">
              <p className="text-sm text-gray-500 font-medium">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900">৳ {(currentUser.totalEarnings || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Withdrawn</p>
              <p className="text-2xl font-bold text-green-600">৳ {(currentUser.withdrawnAmount || 0).toFixed(2)}</p>
            </div>
          </Card>
        )}
      </div>

      {/* Transaction History */}
      <Card className="overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Transaction History</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {transactions.length === 0 && withdrawals.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No transactions found.</div>
          ) : (
            [...transactions, ...withdrawals.map(w => ({ ...w, type: 'withdrawal' as any }))].sort((a, b) => b.createdAt - a.createdAt).map((tx: any) => (
              <div key={tx.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    tx.type === 'add_money' ? 'bg-green-100 text-green-600' :
                    tx.type === 'withdrawal' ? 'bg-amber-100 text-amber-600' :
                    'bg-indigo-100 text-indigo-600'
                  }`}>
                    {tx.type === 'add_money' ? <ArrowDownLeft size={20} /> :
                     tx.type === 'withdrawal' ? <ArrowUpRight size={20} /> :
                     <Wallet size={20} />}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 capitalize">
                      {tx.type.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(tx.createdAt).toLocaleString()} • {tx.method || 'Wallet'}
                    </p>
                    {tx.transactionId && <p className="text-xs text-gray-400 mt-0.5">TrxID: {tx.transactionId}</p>}
                    {tx.adminNote && <p className="text-xs text-red-500 mt-0.5">Note: {tx.adminNote}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${tx.type === 'add_money' || tx.type === 'course_sale' ? 'text-green-600' : 'text-gray-900'}`}>
                    {tx.type === 'add_money' || tx.type === 'course_sale' ? '+' : '-'}৳ {tx.amount.toFixed(2)}
                  </p>
                  <div className="mt-1 flex justify-end">
                    {getStatusBadge(tx.status)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Add Money Modal */}
      <AnimatePresence>
        {showAddMoney && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Add Money</h2>
                <button onClick={() => setShowAddMoney(false)} className="text-gray-400 hover:text-gray-600"><XCircle size={24} /></button>
              </div>
              <div className="p-6 space-y-5">
                <div className="flex gap-3">
                  <button 
                    className={`flex-1 py-2 rounded-xl border-2 font-bold transition-colors ${addMethod === 'bKash' ? 'border-pink-500 text-pink-600 bg-pink-50' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                    onClick={() => setAddMethod('bKash')}
                  >bKash</button>
                  <button 
                    className={`flex-1 py-2 rounded-xl border-2 font-bold transition-colors ${addMethod === 'Nagad' ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                    onClick={() => setAddMethod('Nagad')}
                  >Nagad</button>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl text-sm text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/30">
                  <p className="font-bold mb-2">Instructions:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Send money to our {addMethod} Personal number: <strong className="text-gray-900 dark:text-white font-mono bg-white dark:bg-gray-800 px-1 py-0.5 rounded ml-1">017XX-XXXXXX</strong></li>
                    <li>Use the "Send Money" option.</li>
                    <li>Save the Transaction ID and enter it below.</li>
                  </ol>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (৳)</label>
                  <Input type="number" placeholder="0.00" value={addAmount} onChange={(e) => setAddAmount(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Sender Number</label>
                  <Input placeholder="01XXXXXXXXX" value={addSender} onChange={(e) => setAddSender(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Transaction ID</label>
                  <Input placeholder="e.g. 9X2A4B..." value={addTrxId} onChange={(e) => setAddTrxId(e.target.value)} className="uppercase" />
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 bg-gray-50">
                <Button className="w-full py-3 text-lg" onClick={handleAddMoney} disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Withdraw Modal */}
      <AnimatePresence>
        {showWithdraw && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Request Withdrawal</h2>
                <button onClick={() => setShowWithdraw(false)} className="text-gray-400 hover:text-gray-600"><XCircle size={24} /></button>
              </div>
              <div className="p-6 space-y-5">
                <div className="bg-indigo-50 p-4 rounded-xl text-indigo-800 text-sm mb-4">
                  <span className="font-bold">Available Balance:</span> ৳ {(currentUser.walletBalance || 0).toFixed(2)}
                </div>

                <div className="flex gap-3">
                  <button 
                    className={`flex-1 py-2 rounded-xl border-2 font-bold transition-colors ${withdrawMethod === 'bKash' ? 'border-pink-500 text-pink-600 bg-pink-50' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                    onClick={() => setWithdrawMethod('bKash')}
                  >bKash</button>
                  <button 
                    className={`flex-1 py-2 rounded-xl border-2 font-bold transition-colors ${withdrawMethod === 'Nagad' ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                    onClick={() => setWithdrawMethod('Nagad')}
                  >Nagad</button>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Amount to Withdraw (৳)</label>
                  <Input type="number" placeholder="0.00" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Your {withdrawMethod} Number</label>
                  <Input placeholder="01XXXXXXXXX" value={withdrawAccount} onChange={(e) => setWithdrawAccount(e.target.value)} />
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 bg-gray-50">
                <Button className="w-full py-3 text-lg" onClick={handleWithdraw} disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
