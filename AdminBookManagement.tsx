import React, { useState, useEffect, useMemo } from 'react';
import { User, Book } from './models';
import { Card, Button, Input, Loader } from './widgets';
import { 
  BookOpen, Search, Upload, Filter, Image as ImageIcon, FileText, 
  Trash2, Edit3, XCircle, CheckCircle, Shield, Eye, Download, DollarSign, Settings,
  BarChart
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { 
  getBooks, updateBook, deleteBook, createBook, getUser
} from './firestoreService';
import { uploadMedia } from './storageService';

export const AdminBookManagement = ({ currentUser }: { currentUser: User }) => {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters -> Library
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [modalTab, setModalTab] = useState<'details' | 'stats' | 'reader'>('details');
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<Book>>({});

  // Upload Form
  const [uploadData, setUploadData] = useState<Partial<Book>>({
    title: '', author: '', description: '', category: 'General', tags: [], price: 0,
    isPublished: true, status: 'approved', allowDownload: false
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [previewPdfFile, setPreviewPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [tagsInput, setTagsInput] = useState('');

  // Reader Mock State
  const [readerPage, setReaderPage] = useState(1);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    setLoading(true);
    try {
      const data = await getBooks(statusFilter === 'all' ? undefined : statusFilter);
      setBooks(data);
    } catch (e) {
      toast.error('Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'library') loadBooks();
  }, [statusFilter, activeTab]);

  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      const matchSearch = b.title.toLowerCase().includes(search.toLowerCase()) || 
                          b.author.toLowerCase().includes(search.toLowerCase()) ||
                          b.id.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [books, search]);

  const handleUploadSubmit = async () => {
    if (!uploadData.title || !pdfFile || !coverFile) {
      toast.error('Title, Cover Image, and PDF File are required');
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    const toastId = toast.loading('Uploading assets... 0%');
    try {
      const progressWeights = previewPdfFile ? [0.1, 0.8, 0.1] : [0.2, 0.8];
      let currentFileIndex = 0;

      const updateProgress = (p: number) => {
        let base = 0;
        for(let i=0; i<currentFileIndex; i++){
           base += progressWeights[i] * 100;
        }
        const current = (p / 100) * progressWeights[currentFileIndex] * 100;
        const total = Math.round(base + current);
        setUploadProgress(total);
        toast.loading(`Uploading assets... ${total}%`, { id: toastId });
      };

      // 1. Upload Cover
      const coverUrl = await uploadMedia(coverFile, `books/covers/${Date.now()}_${coverFile.name}`, updateProgress);
      currentFileIndex++;
      
      // 2. Upload Main PDF (Secure URL logic handled by Firebase Rules ideally, but we store URL)
      const fileUrl = await uploadMedia(pdfFile, `books/files/${Date.now()}_${pdfFile.name}`, updateProgress);
      currentFileIndex++;

      // 3. Upload Preview PDF (Optional)
      let sampleFileUrl = '';
      if (previewPdfFile) {
        sampleFileUrl = await uploadMedia(previewPdfFile, `books/samples/${Date.now()}_${previewPdfFile.name}`, updateProgress);
      }

      // 4. Create Document
      const newBook = await createBook({
        title: uploadData.title!,
        author: uploadData.author || 'Unknown',
        description: uploadData.description || '',
        category: uploadData.category || 'General',
        tags: uploadData.tags || [],
        price: uploadData.price || 0,
        isPublished: uploadData.isPublished || false,
        status: 'approved', // Auto-approve if uploaded by admin
        allowDownload: uploadData.allowDownload || false,
        sellerId: currentUser.uid,
        coverUrl,
        fileUrl,
        sampleFileUrl,
        fileSize: pdfFile.size,
      });

      toast.success('Book published successfully!', { id: toastId });
      
      // Reset form
      setUploadData({ title: '', author: '', description: '', category: 'General', tags: [], price: 0, isPublished: true, status: 'approved', allowDownload: false });
      setCoverFile(null); setPdfFile(null); setPreviewPdfFile(null); setTagsInput('');
      setUploadProgress(0);
      setActiveTab('library');
      loadBooks();
      
    } catch (e) {
      toast.error('Failed to upload book', { id: toastId });
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedBook) return;
    setSaving(true);
    try {
      await updateBook(selectedBook.id, editData);
      setBooks(books.map(b => b.id === selectedBook.id ? { ...b, ...editData } as Book : b));
      toast.success('Book updated successfully');
    } catch (e) {
      toast.error('Failed to update book');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to permanently delete "${title}"? This cannot be undone.`)) {
      try {
        await deleteBook(id);
        setBooks(books.filter(b => b.id !== id));
        toast.success('Book deleted');
      } catch (e) {
        toast.error('Failed to delete book');
      }
    }
  };

  const openModal = (b: Book) => {
    setSelectedBook(b);
    setEditData(b);
    setModalTab('details');
  };

  return (
    <div className="space-y-6">
      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-max">
        <button 
          onClick={() => setActiveTab('library')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'library' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <BookOpen size={16}/> Library Manager
        </button>
        <button 
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'upload' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Upload size={16}/> Upload New Book
        </button>
      </div>

      {loading && activeTab === 'library' ? <Loader /> : (
        <>
          {activeTab === 'library' && (
            <Card className="p-4 sm:p-6">
              <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search titles, authors, IDs..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl"
                  />
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-2 text-sm">
                  <option value="all">All Books</option>
                  <option value="approved">Published / Approved</option>
                  <option value="pending">Pending Review (Sellers)</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredBooks.map(book => (
                  <div key={book.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg transition-all group flex flex-col">
                    <div className="relative h-48 bg-gray-100 dark:bg-gray-900 overflow-hidden flex items-center justify-center">
                      {book.coverUrl ? (
                        <img src={book.coverUrl} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" alt={book.title} />
                      ) : (
                        <ImageIcon className="text-gray-300" size={40} />
                      )}
                      {book.price > 0 ? (
                        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded shadow">
                          ${book.price.toFixed(2)}
                        </div>
                      ) : (
                        <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded shadow">
                          FREE
                        </div>
                      )}
                      {book.status === 'pending' && (
                        <div className="absolute top-2 left-2 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded shadow">
                          Pending Review
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1" title={book.title}>{book.title}</h4>
                      <p className="text-xs text-gray-500 mb-2">{book.author}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-400 mt-auto mb-3">
                         <span className="flex items-center gap-1"><Eye size={12}/> {book.totalViews}</span>
                         <span className="flex items-center gap-1"><Download size={12}/> {book.totalDownloads}</span>
                         {(book.fileSize || 0) > 0 && <span>{(book.fileSize! / (1024*1024)).toFixed(1)}MB</span>}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-auto">
                        <Button variant="outline" size="sm" onClick={() => openModal(book)} className="text-xs">Manage</Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(book.id, book.title)} className="text-xs">Delete</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {filteredBooks.length === 0 && (
                <div className="text-center py-20 text-gray-500">
                  <BookOpen className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No books found</h3>
                  <p>Try adjusting your search or filters.</p>
                </div>
              )}
            </Card>
          )}

          {activeTab === 'upload' && (
            <Card className="p-6 max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Upload className="text-indigo-600"/> Publish New eBook</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Col: Files */}
                <div className="col-span-1 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cover Image (Thumbnail)</label>
                    <div className="w-full aspect-[2/3] bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex items-center justify-center relative overflow-hidden">
                      {coverFile ? (
                        <img src={URL.createObjectURL(coverFile)} className="w-full h-full object-cover" alt="Cover Preview" />
                      ) : (
                        <div className="text-center p-4">
                           <ImageIcon className="mx-auto text-gray-400 mb-2" size={32}/>
                           <span className="text-xs text-gray-500">Click to upload cover (.jpg, .png)</span>
                        </div>
                      )}
                      <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => setCoverFile(e.target.files?.[0] || null)} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Main eBook File (PDF/EPUB)</label>
                    <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-900 text-center">
                      <input type="file" accept=".pdf,.epub" className="hidden" onChange={e => setPdfFile(e.target.files?.[0] || null)} />
                      {pdfFile ? (
                        <div className="flex items-center gap-2 text-indigo-600"><CheckCircle size={16}/> {pdfFile.name.substring(0,20)}...</div>
                      ) : (
                        <div className="text-sm text-gray-500"><FileText className="mx-auto mb-1 text-gray-400"/> Upload Full PDF</div>
                      )}
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview Sample (Optional)</label>
                    <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-900 text-center">
                      <input type="file" accept=".pdf" className="hidden" onChange={e => setPreviewPdfFile(e.target.files?.[0] || null)} />
                      {previewPdfFile ? (
                        <div className="flex items-center gap-2 text-indigo-600"><CheckCircle size={16}/> {previewPdfFile.name}</div>
                      ) : (
                        <div className="text-sm text-gray-500"><FileText className="mx-auto mb-1 text-gray-400"/> Upload Sample Pages</div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Right Col: Details */}
                <div className="col-span-1 md:col-span-2 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Book Title *</label>
                    <Input value={uploadData.title} onChange={e => setUploadData({...uploadData, title: e.target.value})} placeholder="e.g. Master the Platform" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Author</label>
                      <Input value={uploadData.author} onChange={e => setUploadData({...uploadData, author: e.target.value})} placeholder="Author Name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                      <select value={uploadData.category} onChange={e => setUploadData({...uploadData, category: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 dark:bg-gray-800 dark:border-gray-600 text-sm">
                        <option value="Education">Education</option>
                        <option value="Technology">Technology</option>
                        <option value="Business">Business</option>
                        <option value="Fiction">Fiction</option>
                        <option value="Guides">Guides / Tutorials</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description / Summary</label>
                    <textarea 
                      className="w-full rounded-xl border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 p-3 text-sm focus:ring-indigo-500" 
                      rows={4}
                      value={uploadData.description}
                      onChange={e => setUploadData({...uploadData, description: e.target.value})}
                      placeholder="What is this book about?"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price ($) - 0 for Free</label>
                      <Input type="number" min="0" step="0.01" value={uploadData.price} onChange={e => setUploadData({...uploadData, price: Number(e.target.value)})} />
                     </div>
                     <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (Comma separated)</label>
                      <Input 
                        value={tagsInput} 
                        onChange={e => {
                          setTagsInput(e.target.value);
                          setUploadData({...uploadData, tags: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)});
                        }} 
                        placeholder="e.g. guide, business, 2026" 
                      />
                     </div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3 mt-4">
                     <h4 className="font-bold flex items-center gap-2"><Settings size={16}/> Access & Publishing Rules</h4>
                     <label className="flex items-center gap-3 text-sm">
                      <input type="checkbox" checked={uploadData.allowDownload} onChange={e => setUploadData({...uploadData, allowDownload: e.target.checked})} className="rounded text-indigo-600 w-4 h-4" />
                      Allow users to download file directly (If unchecked, reads via web viewer only)
                     </label>
                     <label className="flex items-center gap-3 text-sm">
                      <input type="checkbox" checked={uploadData.isPublished} onChange={e => setUploadData({...uploadData, isPublished: e.target.checked})} className="rounded text-indigo-600 w-4 h-4" />
                      Publish immediately upon upload
                     </label>
                  </div>

                  <div className="pt-4 flex justify-end flex-col sm:flex-row gap-4 items-center">
                    {uploading && (
                      <div className="flex-1 w-full flex items-center gap-3">
                        <div className="text-xs font-bold text-gray-500 whitespace-nowrap">Uploading...</div>
                        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                          <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                        <div className="text-xs font-bold text-gray-700 dark:text-gray-300 w-8">{uploadProgress}%</div>
                      </div>
                    )}
                    <Button variant="primary" size="lg" className="w-full md:w-auto" isLoading={uploading} onClick={handleUploadSubmit}>
                      Upload & Publish Book
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* BOOK EDIT / PREVIEW MODAL */}
      {selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
              
              <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 z-10">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-bold">{selectedBook.title}</h3>
                  <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded-full border 
                    ${selectedBook.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' : 
                      selectedBook.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                    {selectedBook.status}
                  </span>
                </div>
                <button onClick={() => setSelectedBook(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"><XCircle size={24} className="text-gray-500"/></button>
              </div>

              <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                <button className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${modalTab === 'details' ? 'border-indigo-600 text-indigo-900 dark:text-indigo-400' : 'border-transparent text-gray-500'}`} onClick={() => setModalTab('details')}>Book Details & Approvals</button>
                <button className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${modalTab === 'stats' ? 'border-indigo-600 text-indigo-900 dark:text-indigo-400' : 'border-transparent text-gray-500'}`} onClick={() => setModalTab('stats')}>Sales & Analytics</button>
                <button className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${modalTab === 'reader' ? 'border-indigo-600 text-indigo-900 dark:text-indigo-400' : 'border-transparent text-gray-500'}`} onClick={() => setModalTab('reader')}>Web Viewer Test</button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {modalTab === 'details' && (
                  <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="col-span-1 space-y-4">
                      <div className="w-full aspect-[2/3] bg-gray-100 rounded-xl overflow-hidden shadow-inner border border-gray-200 dark:border-gray-800">
                         {selectedBook.coverUrl ? <img src={selectedBook.coverUrl} className="w-full h-full object-cover" alt="Cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400">No Cover</div>}
                      </div>
                      <div className="space-y-2">
                        <Button variant="outline" className="w-full text-xs items-center justify-center gap-2 flex" onClick={() => window.open(selectedBook.fileUrl, '_blank')}><Download size={14}/> Download Source PDF</Button>
                        {selectedBook.sampleFileUrl && (
                          <Button variant="ghost" className="w-full text-xs">View Sample PDF</Button>
                        )}
                      </div>
                    </div>
                    <div className="col-span-1 md:col-span-2 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                          <Input value={editData.title || ''} onChange={e => setEditData({...editData, title: e.target.value})} />
                         </div>
                         <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Author</label>
                          <Input value={editData.author || ''} onChange={e => setEditData({...editData, author: e.target.value})} />
                         </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                        <textarea className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-sm" rows={4} value={editData.description || ''} onChange={e => setEditData({...editData, description: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Price ($)</label>
                          <Input type="number" value={editData.price || 0} onChange={e => setEditData({...editData, price: Number(e.target.value)})} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                          <select value={editData.status} onChange={e => setEditData({...editData, status: e.target.value as any})} className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-sm">
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                          <Input value={editData.category || ''} onChange={e => setEditData({...editData, category: e.target.value})} />
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl space-y-3 border border-gray-200 dark:border-gray-800 mt-6">
                        <h4 className="font-bold text-sm">Security & Access Flags</h4>
                        <label className="flex items-center gap-3 text-sm">
                          <input type="checkbox" checked={editData.allowDownload} onChange={e => setEditData({...editData, allowDownload: e.target.checked})} className="rounded" /> Allow Direct Download
                        </label>
                         <label className="flex items-center gap-3 text-sm">
                          <input type="checkbox" checked={editData.isPublished} onChange={e => setEditData({...editData, isPublished: e.target.checked})} className="rounded" /> Published & Visible in Store
                        </label>
                      </div>

                      <div className="pt-6 flex justify-end gap-3">
                         {selectedBook.status === 'pending' && <Button variant="success" onClick={() => {setEditData({...editData, status: 'approved'}); handleUpdate();}}>Quick Approve</Button>}
                         {selectedBook.status === 'pending' && <Button variant="danger" onClick={() => {setEditData({...editData, status: 'rejected'}); handleUpdate();}}>Reject</Button>}
                         <Button variant="primary" onClick={handleUpdate} isLoading={saving}>Save Changes</Button>
                      </div>
                    </div>
                  </div>
                )}

                {modalTab === 'stats' && (
                  <div className="p-6 space-y-6">
                     <div className="grid grid-cols-3 gap-4">
                       <Card className="p-4 bg-indigo-50 border-indigo-100 dark:bg-indigo-900/20">
                         <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">Total Views</p>
                         <h3 className="text-3xl font-bold text-indigo-900 dark:text-indigo-100">{selectedBook.totalViews}</h3>
                       </Card>
                       <Card className="p-4 bg-green-50 border-green-100 dark:bg-green-900/20">
                         <p className="text-sm text-green-600 dark:text-green-400 font-medium">Total Sales</p>
                         <h3 className="text-3xl font-bold text-green-900 dark:text-green-100">{selectedBook.totalSales}</h3>
                       </Card>
                       <Card className="p-4 bg-amber-50 border-amber-100 dark:bg-amber-900/20">
                         <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">Gross Revenue</p>
                         <h3 className="text-3xl font-bold text-amber-900 dark:text-amber-100">${(selectedBook.totalSales * selectedBook.price).toFixed(2)}</h3>
                       </Card>
                     </div>
                     <div className="p-8 text-center text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                       <BarChart size={32} className="mx-auto text-gray-300 mb-2"/>
                       Detail charts would render here fetching `transactions` filtered by `relatedId === selectedBook.id`
                     </div>
                  </div>
                )}

                {modalTab === 'reader' && (
                  <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-950">
                    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-2 flex justify-between items-center">
                       <div className="flex gap-2">
                         <Button variant="ghost" size="sm" onClick={() => setReaderPage(Math.max(1, readerPage - 1))}>Prev Page</Button>
                         <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono">Page {readerPage}</span>
                         <Button variant="ghost" size="sm" onClick={() => setReaderPage(readerPage + 1)}>Next Page</Button>
                       </div>
                       <Shield className="text-green-500" size={16} />
                    </div>
                    {/* Native Object tag as a basic secure fallback if iframe/pdfjs is complex in env. Ideal world: PDF.js */}
                    <div className="flex-1 w-full h-[600px] overflow-hidden relative group">
                      <div className="absolute inset-0 z-20 pointer-events-none p-4 opacity-10 flex flex-col justify-between items-center text-black pointer-events-none transform -rotate-45 text-4xl font-bold uppercase overflow-hidden stop-copy">
                        <span>{currentUser.email} • {currentUser.email} • {currentUser.email}</span>
                        <span>CONFIDENTIAL • CONFIDENTIAL</span>
                      </div>
                      <iframe 
                        src={`${selectedBook.fileUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
                        className="w-full h-full border-none pointer-events-auto"
                        title="Book Reader"
                        sandbox="allow-scripts allow-same-origin"
                      />
                    </div>
                  </div>
                )}
              </div>
           </div>
        </div>
      )}

    </div>
  );
};
