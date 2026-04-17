import React, { useState, useEffect, useMemo } from 'react';
import { User, Report, Post, ModerationLog, AutoModSettings } from './models';
import { Card, Button, Input, Loader } from './widgets';
import { 
  AlertTriangle, Search, Filter, Shield, Clock, CheckCircle, 
  XCircle, Trash2, Eye, Flag, Settings as SettingsIcon, MessageSquare, FileText
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { 
  getAllReports, updateReportStatus, getModerationLogs, 
  getAutoModSettings, updateAutoModSettings, softDeletePost, 
  deletePost, updateUserAdminStatus, createModerationLog
} from './firestoreService';

export const AdminModerationSystem = ({ currentUser }: { currentUser: User }) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'logs' | 'automod'>('queue');
  
  // Data States
  const [reports, setReports] = useState<Report[]>([]);
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [autoMod, setAutoMod] = useState<AutoModSettings>({
    id: 'global',
    enabled: true,
    blockedKeywords: ['spam', 'scam', 'fake'],
    spamProtection: true,
    maxPostsPerMinute: 5,
    toxicityFilter: true
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [reportFilter, setReportFilter] = useState<'all'|'pending'|'reviewed'|'resolved'|'rejected'>('pending');
  const [priorityFilter, setPriorityFilter] = useState<'all'|'low'|'medium'|'high'|'urgent'>('all');
  const [search, setSearch] = useState('');

  // Modals
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'queue') {
        const fetchedReports = await getAllReports();
        setReports(fetchedReports);
      } else if (activeTab === 'logs') {
        const fetchedLogs = await getModerationLogs();
        setLogs(fetchedLogs);
      } else if (activeTab === 'automod') {
        const settings = await getAutoModSettings();
        if (settings) setAutoMod(settings);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load moderation data');
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const matchStatus = reportFilter === 'all' || r.status === reportFilter;
      const matchPrio = priorityFilter === 'all' || r.priority === priorityFilter;
      const matchSearch = r.id.toLowerCase().includes(search.toLowerCase()) || 
                          r.targetId.toLowerCase().includes(search.toLowerCase()) || 
                          r.reason.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchPrio && matchSearch;
    });
  }, [reports, reportFilter, priorityFilter, search]);

  const handleUpdateReport = async (status: Report['status']) => {
    if (!selectedReport) return;
    setActionLoading(true);
    try {
      await updateReportStatus(selectedReport.id, { 
        status, 
        adminNotes: actionReason,
        assignedTo: currentUser.uid 
      }, currentUser.uid);
      toast.success(`Report marked as ${status}`);
      setReports(reports.map(r => r.id === selectedReport.id ? { ...r, status, adminNotes: actionReason } : r));
      setSelectedReport(null);
      setActionReason('');
    } catch (e) {
      toast.error('Failed to update report');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTakeAction = async (action: 'hide_post' | 'ban_user') => {
    if (!selectedReport) return;
    setActionLoading(true);
    try {
      if (action === 'hide_post' && selectedReport.targetType === 'post') {
        await softDeletePost(selectedReport.targetId);
        await createModerationLog({
          adminId: currentUser.uid,
          action: 'hide_post',
          targetType: 'post',
          targetId: selectedReport.targetId,
          details: `Post hidden due to report ${selectedReport.id}. Reason: ${actionReason}`
        });
        toast.success("Post hidden successfully");
      } else if (action === 'ban_user') {
        const uid = selectedReport.targetType === 'user' ? selectedReport.targetId : ''; // Ideally we fetch post author, but simplified here
        if (uid) {
          await updateUserAdminStatus(uid, { status: 'banned', warnings: 1 }, currentUser.uid, actionReason);
          toast.success("User banned successfully");
        } else {
          toast.error("Could not determine user ID");
        }
      }
    } catch (e) {
      toast.error("Failed to take action");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveAutoMod = async () => {
    setActionLoading(true);
    try {
      await updateAutoModSettings(autoMod, currentUser.uid);
      toast.success('Auto-moderation settings saved');
    } catch (e) {
      toast.error('Failed to save settings');
    } finally {
      setActionLoading(false);
    }
  };

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-max">
        <button 
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'queue' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Review Queue
          {reports.filter(r => r.status === 'pending').length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
              {reports.filter(r => r.status === 'pending').length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'logs' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Audit Logs
        </button>
        <button 
          onClick={() => setActiveTab('automod')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'automod' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Auto-Mod Settings
        </button>
      </div>

      {loading ? <Loader /> : (
        <>
          {/* QUEUE TAB */}
          {activeTab === 'queue' && (
            <Card className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search report ID, target ID, reason..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl"
                  />
                </div>
                <select 
                  value={reportFilter} 
                  onChange={(e) => setReportFilter(e.target.value as any)}
                  className="bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-2"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="reviewed">Under Review</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected (False Report)</option>
                </select>
                <select 
                  value={priorityFilter} 
                  onChange={(e) => setPriorityFilter(e.target.value as any)}
                  className="bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-2"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div className="space-y-3">
                {filteredReports.map(report => (
                  <div key={report.id} className="p-4 border border-gray-100 dark:border-gray-800 rounded-xl hover:border-gray-200 dark:hover:border-gray-700 transition-colors flex flex-col sm:flex-row justify-between items-start gap-4 bg-white dark:bg-gray-800">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getPriorityColor(report.priority || 'low')}`}>
                          {report.priority || 'low'}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">#{report.id.substring(0,8)}</span>
                        <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={12}/> {formatDistanceToNow(report.createdAt)} ago</span>
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white capitalize flex items-center gap-2">
                        {report.targetType === 'post' ? <FileText size={16}/> : report.targetType === 'message' ? <MessageSquare size={16}/> : <AlertTriangle size={16}/>}
                        {report.reason}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{report.details || 'No additional details provided.'}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300">Target ID: {report.targetId.substring(0,10)}...</span>
                        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300">Reported By: {report.reportedBy.substring(0,10)}...</span>
                      </div>
                    </div>
                    <div>
                      {report.status === 'pending' || report.status === 'reviewed' ? (
                        <Button onClick={() => setSelectedReport(report)} size="sm" variant="primary">Review Case</Button>
                      ) : (
                        <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${report.status === 'resolved' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {report.status.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {filteredReports.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Shield className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p>No reports found matching your criteria.</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* LOGS TAB */}
          {activeTab === 'logs' && (
            <Card className="p-4 sm:p-6">
               <h3 className="text-lg font-bold mb-4">Moderation Audit Trail</h3>
               <div className="space-y-2">
                 {logs.map(log => (
                   <div key={log.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm flex justify-between items-center">
                     <div>
                       <span className="font-semibold text-indigo-600 dark:text-indigo-400 mr-2">[{log.action.toUpperCase()}]</span>
                       <span className="text-gray-900 dark:text-white">{log.details}</span>
                       <p className="text-xs text-gray-500 mt-1">Admin: {log.adminId} • Target {log.targetType}: {log.targetId}</p>
                     </div>
                     <span className="text-xs text-gray-400">{formatDistanceToNow(log.createdAt, { addSuffix: true })}</span>
                   </div>
                 ))}
                 {logs.length === 0 && <p className="text-gray-500 text-center py-4">No logs found.</p>}
               </div>
            </Card>
          )}

          {/* AUTOMOD TAB */}
          {activeTab === 'automod' && (
             <Card className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Auto-Moderation Settings</h3>
                    <p className="text-sm text-gray-500">Configure AI and rule-based filters.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={autoMod.enabled} onChange={e => setAutoMod({...autoMod, enabled: e.target.checked})} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className={`space-y-6 ${!autoMod.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Spam Protection</p>
                      <p className="text-sm text-gray-500">Block rapid duplicate messages</p>
                    </div>
                    <input type="checkbox" checked={autoMod.spamProtection} onChange={e => setAutoMod({...autoMod, spamProtection: e.target.checked})} className="rounded text-indigo-600" />
                  </div>
                  
                  <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">AI Toxicity Filter</p>
                      <p className="text-sm text-gray-500">Automatically flag highly toxic language</p>
                    </div>
                    <input type="checkbox" checked={autoMod.toxicityFilter} onChange={e => setAutoMod({...autoMod, toxicityFilter: e.target.checked})} className="rounded text-indigo-600" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max Posts / Minute (Rate Limit)</label>
                    <input 
                      type="number" 
                      value={autoMod.maxPostsPerMinute} 
                      onChange={e => setAutoMod({...autoMod, maxPostsPerMinute: Number(e.target.value)})}
                      className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Blocked Keywords (comma separated)</label>
                    <textarea 
                      rows={3} 
                      value={autoMod.blockedKeywords.join(', ')}
                      onChange={e => setAutoMod({...autoMod, blockedKeywords: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})}
                      className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-800"
                      placeholder="spam, scam, badword"
                    />
                  </div>

                  <Button onClick={handleSaveAutoMod} isLoading={actionLoading} className="w-full sm:w-auto">Save Auto-Mod Configuration</Button>
                </div>
             </Card>
          )}

        </>
      )}

      {/* REVIEW MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Flag className="text-indigo-600"/> Review Moderation Case
              </h3>
              <button onClick={() => setSelectedReport(null)} className="p-2 hover:bg-gray-100 rounded-full"><XCircle size={24} className="text-gray-500"/></button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="p-4 bg-red-50 text-red-900 rounded-xl border border-red-100">
                <p className="font-bold mb-1">Report Reason: {selectedReport.reason}</p>
                <p className="text-sm opacity-90">{selectedReport.details}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-xl">
                <div>
                  <p className="text-gray-500">Target Type</p>
                  <p className="font-medium uppercase">{selectedReport.targetType}</p>
                </div>
                <div>
                  <p className="text-gray-500">Target ID</p>
                  <p className="font-mono text-xs break-all">{selectedReport.targetId}</p>
                </div>
                <div>
                  <p className="text-gray-500">Reported By UID</p>
                  <p className="font-mono text-xs break-all">{selectedReport.reportedBy}</p>
                </div>
                <div>
                  <p className="text-gray-500">Submitted</p>
                  <p className="font-medium">{format(selectedReport.createdAt, 'PPp')}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Admin Internal Notes / Resolution Reason</label>
                <textarea 
                  className="w-full p-3 border rounded-xl"
                  rows={3}
                  value={actionReason}
                  onChange={e => setActionReason(e.target.value)}
                  placeholder="Required for any action..."
                />
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900">Enforcement Actions</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedReport.targetType === 'post' && (
                    <Button variant="danger" size="sm" onClick={() => handleTakeAction('hide_post')} disabled={!actionReason} isLoading={actionLoading}>Soft Delete Post</Button>
                  )}
                  {selectedReport.targetType === 'user' && (
                    <Button variant="danger" size="sm" onClick={() => handleTakeAction('ban_user')} disabled={!actionReason} isLoading={actionLoading}>Ban User</Button>
                  )}
                  <Button variant="warning" size="sm" disabled>Send Warning Message</Button>
                </div>

                <div className="pt-4 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => handleUpdateReport('rejected')} disabled={!actionReason} isLoading={actionLoading}>Reject Report</Button>
                  <Button variant="primary" onClick={() => handleUpdateReport('resolved')} disabled={!actionReason} isLoading={actionLoading}>Mark Resolved</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
