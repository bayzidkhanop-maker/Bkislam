import React, { useState, useEffect, useRef } from 'react';
import { localDb } from './indexedDbService';
import { Card, Button } from './widgets';
import { HardDrive, Trash2, Download, CheckCircle, Database, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export const DeviceStorageSettings = () => {
  const [quota, setQuota] = useState<number | null>(null);
  const [usage, setUsage] = useState<number | null>(null);
  const [isPersisted, setIsPersisted] = useState<boolean>(false);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStorageInfo = async () => {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        setQuota(estimate.quota || 0);
        setUsage(estimate.usage || 0);
      }
      if (navigator.storage && navigator.storage.persisted) {
        const persisted = await navigator.storage.persisted();
        setIsPersisted(persisted);
      }
      
      const allFiles = await localDb.getAllFiles();
      setFiles(allFiles);
    } catch (err) {
      console.warn("Storage API not supported", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorageInfo();
  }, []);

  const handleRequestPersistent = async () => {
    if (navigator.storage && navigator.storage.persist) {
      const granted = await navigator.storage.persist();
      setIsPersisted(granted);
      if (granted) {
        toast.success("Persistent storage granted!");
      } else {
        toast.error("Persistent storage denied by browser.");
      }
    }
  };

  const handleUploadTestFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileId = `file_${Date.now()}_${file.name}`;
      await localDb.saveFile(fileId, file, { name: file.name, type: file.type, size: file.size });
      toast.success(`Saved ${file.name} to local database`);
      fetchStorageInfo();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save to local DB");
    }
  };

  const handleDeleteFile = async (id: string) => {
    try {
      await localDb.deleteFile(id);
      toast.success("File deleted successfully");
      fetchStorageInfo();
    } catch (err) {
      toast.error("Error deleting file");
    }
  };

  const clearAllData = async () => {
    if (confirm("Are you sure you want to clear ALL cached local files?")) {
      await localDb.clearAll();
      toast.success("All local databases cleared");
      fetchStorageInfo();
    }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  if (loading) return null;

  const usagePercent = quota && quota > 0 ? ((usage || 0) / quota) * 100 : 0;

  return (
    <Card className="p-6 overflow-hidden border-0 shadow-sm ring-1 ring-gray-200">
      <div className="flex items-center gap-3 mb-6">
        <Database className="text-indigo-600" size={24} />
        <div>
          <h2 className="text-lg font-bold text-gray-900">Professional Local Storage (IndexedDB)</h2>
          <p className="text-sm text-gray-500">Robust 100GB+ capable offline caching</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Storage Stats */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-sm font-semibold text-gray-700">Storage Usage</p>
              <p className="text-2xl font-black text-gray-900">
                {formatBytes(usage || 0)} <span className="text-sm font-medium text-gray-500">/ {formatBytes(quota || 0)}</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-1 rounded-md">
                {usagePercent.toFixed(2)}% Used
              </span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
            <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${Math.min(usagePercent, 100)}%` }}></div>
          </div>
          
          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-white rounded-lg border border-gray-100">
            <div className="flex items-center gap-2">
              {isPersisted ? (
                <CheckCircle className="text-green-500" size={18} />
              ) : (
                <AlertTriangle className="text-amber-500" size={18} />
              )}
              <span className="text-sm font-medium text-gray-700">
                Persistent State: {isPersisted ? 'Enabled' : 'Disabled (Browser may clear data)'}
              </span>
            </div>
            {!isPersisted && (
              <Button size="sm" variant="outline" onClick={handleRequestPersistent}>
                Request Persistence
              </Button>
            )}
          </div>
        </div>

        {/* File Manager */}
        <div>
           <div className="flex items-center justify-between mb-4">
             <h3 className="text-md font-bold text-gray-800">Locally Stored Files</h3>
             <Button size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
               <HardDrive size={16} /> Load Offline File
             </Button>
             <input type="file" className="hidden" ref={fileInputRef} onChange={handleUploadTestFile} />
           </div>

           {files.length > 0 ? (
             <div className="border border-gray-200 rounded-xl overflow-hidden">
               <ul className="divide-y divide-gray-100">
                 {files.map((file) => (
                   <li key={file.id} className="p-4 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
                     <div className="flex-1 overflow-hidden">
                       <p className="text-sm font-bold text-gray-900 truncate" title={file.metadata?.name || file.id}>
                         {file.metadata?.name || file.id}
                       </p>
                       <div className="flex text-xs text-gray-500 mt-1 gap-3">
                         <span>{formatBytes(file.metadata?.size || file.data?.size || 0)}</span>
                         <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                       </div>
                     </div>
                     <Button size="sm" variant="ghost" onClick={() => handleDeleteFile(file.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                       <Trash2 size={16} />
                     </Button>
                   </li>
                 ))}
               </ul>
             </div>
           ) : (
             <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
               <HardDrive className="mx-auto text-gray-400 mb-2" size={32} />
               <p className="text-gray-500 font-medium">No files stored locally.</p>
             </div>
           )}
        </div>

        {files.length > 0 && (
          <div className="pt-4 border-t border-gray-100 text-right">
            <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={clearAllData}>
              Clear All Storage
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
