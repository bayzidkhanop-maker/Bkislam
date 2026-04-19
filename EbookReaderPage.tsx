import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from './firebaseConfig';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { Book, User } from './models';
import { Loader } from './widgets';
import { ArrowLeft, ZoomIn, ZoomOut, Download, Bookmark, Moon, Sun, Settings, List, ChevronLeft, ChevronRight, Fullscreen, Search } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { toast } from 'sonner';

import { getBookPurchase, purchaseBookWithWallet } from './firestoreService';
import { Button } from './widgets';

// Set up PDF worker (Required for react-pdf)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export const EbookReaderPage = ({ currentUser }: { currentUser: User }) => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  
  // Reader State
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [darkMode, setDarkMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');

  const readerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bookId) {
      loadBook(bookId);
    }
  }, [bookId]);

  const loadBook = async (id: string) => {
    try {
      const docRef = doc(db, 'books', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const bookData = docSnap.data() as Book;
        setBook(bookData);
        // Increment view count securely
        await updateDoc(docRef, { totalViews: increment(1) });
        
        // Check purchase
        if (bookData.price === 0 || bookData.sellerId === currentUser.uid || currentUser.role === 'admin') {
          setHasPurchased(true);
        } else {
          const purchase = await getBookPurchase(currentUser.uid, id);
          if (purchase && purchase.status === 'completed') {
            setHasPurchased(true);
          }
        }

      } else {
        toast.error('Book not found');
        navigate('/library');
      }
    } catch (e) {
      toast.error('Failed to load book');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !book) return;
    setValidatingCoupon(true);
    setCouponError('');
    try {
      const { validateCoupon } = await import('./firestoreService');
      const res = await validateCoupon(couponCode, currentUser.uid, book.price, book.id, book.category);
      if (res.isValid && res.coupon) {
        setAppliedCoupon({ code: res.coupon.code, discountAmount: res.discountAmount });
        toast.success(`Coupon applied! You saved ৳${res.discountAmount}`);
      } else {
        setAppliedCoupon(null);
        setCouponError(res.error || 'Invalid coupon');
        toast.error(res.error || 'Invalid coupon');
      }
    } catch (e: any) {
      setCouponError('Error validating coupon');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handlePurchase = async () => {
    if (!book) return;
    
    let finalAmount = book.price;
    if (appliedCoupon) {
      finalAmount = Math.max(0, finalAmount - appliedCoupon.discountAmount);
    }

    if (finalAmount > 0 && (currentUser.walletBalance || 0) < finalAmount) {
      toast.error("Insufficient wallet balance. Please add money first.");
      return;
    }

    setIsPurchasing(true);
    const toastId = toast.loading('Processing payment...');
    try {
      await purchaseBookWithWallet(book.id, currentUser.uid, appliedCoupon?.code);
      setHasPurchased(true);
      toast.success('Purchase successful! Enjoy reading.', { id: toastId });
    } catch (error: any) {
      toast.error(error.message || 'Payment failed.', { id: toastId });
    } finally {
      setIsPurchasing(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => {
      const newPage = prevPageNumber + offset;
      return Math.min(Math.max(1, newPage), numPages || 1);
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      readerRef.current?.requestFullscreen().catch(err => {
        toast.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') changePage(1);
      if (e.key === 'ArrowLeft') changePage(-1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [numPages]);

  if (loading) {
    return <div className="h-[calc(100vh-64px)] flex items-center justify-center"><Loader /></div>;
  }

  if (!book) return null;

  return (
    <div 
      ref={readerRef}
      className={`relative flex flex-col h-[calc(100vh-64px)] ${isFullscreen ? 'h-screen fixed inset-0 z-50' : ''} ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'} transition-colors duration-300`}
    >
      {/* Reader Toolbar */}
      <div className={`flex items-center justify-between px-4 py-3 shadow-md ${darkMode ? 'bg-gray-800 border-b border-gray-700' : 'bg-white border-b border-gray-200'} z-10 transition-colors`}>
        <div className="flex items-center gap-4 flex-1">
          <button onClick={() => isFullscreen ? toggleFullscreen() : navigate(-1)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="font-bold text-lg truncate">{book.title}</h1>
            <p className="text-xs opacity-70 truncate">{book.author}</p>
          </div>
        </div>

        {/* Central Controls */}
        <div className="hidden md:flex items-center justify-center gap-4 flex-1">
          <div className={`flex items-center bg-gray-200 dark:bg-gray-700 rounded-lg p-1`}>
            <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded">
              <ZoomOut size={18} />
            </button>
            <span className="text-xs font-medium px-3 w-12 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded">
              <ZoomIn size={18} />
            </button>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center justify-end gap-1 sm:gap-2 flex-1">
          <button className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors tooltip" title="Table of Contents">
            <List size={20} />
          </button>
          <button className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors tooltip" title="Bookmark">
            <Bookmark size={20} />
          </button>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors tooltip" title="Toggle Reader Mode">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={toggleFullscreen} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors tooltip" title="Fullscreen">
            <Fullscreen size={20} />
          </button>
          {book.allowDownload && (hasPurchased || book.price === 0) && (
             <a href={book.fileUrl} download={`${book.title}.pdf`} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors tooltip" title="Download">
               <Download size={20} />
             </a>
          )}
        </div>
      </div>

      {/* Main Reader Area */}
      <div className="flex-1 overflow-auto flex justify-center py-6 relative custom-scrollbar">
        {!hasPurchased && book.price > 0 ? (
          <div className="w-full max-w-lg mx-auto mt-20 p-8 text-center bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 h-fit">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Purchase Required</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">This book costs ৳{book.price}. You can purchase it instantly using your wallet balance.</p>
            
            {/* Coupon Section */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-left">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Have a Coupon Code?</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Enter code" 
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  disabled={appliedCoupon !== null || validatingCoupon}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase"
                />
                {!appliedCoupon ? (
                  <Button type="button" variant="outline" onClick={handleApplyCoupon} disabled={!couponCode || validatingCoupon} className="whitespace-nowrap">
                    {validatingCoupon ? '...' : 'Apply'}
                  </Button>
                ) : (
                  <Button type="button" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20 whitespace-nowrap" onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}>
                    Remove
                  </Button>
                )}
              </div>
              {couponError && <p className="text-red-500 text-xs mt-2">{couponError}</p>}
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl mb-8 flex justify-between items-center text-sm font-medium">
              <span className="text-gray-500 text-left">
                Your Wallet Balance:<br/>
                <span className="text-gray-900 dark:text-white text-lg">৳{(currentUser.walletBalance || 0).toFixed(2)}</span>
              </span>
              <span className="text-gray-500 text-right">
                Total Payable:<br/>
                <span className="text-indigo-600 dark:text-indigo-400 text-lg font-bold">
                  ৳{appliedCoupon ? Math.max(0, book.price - appliedCoupon.discountAmount).toFixed(2) : book.price.toFixed(2)}
                </span>
              </span>
            </div>
            
            <Button className="w-full py-4 text-lg font-bold shadow-lg shadow-indigo-500/30" onClick={handlePurchase} isLoading={isPurchasing}>
              Pay ৳{appliedCoupon ? Math.max(0, book.price - appliedCoupon.discountAmount).toFixed(2) : book.price.toFixed(2)} from Wallet
            </Button>
            <p className="mt-4 text-xs text-gray-400">Atomic secure transaction will unlock access instantly.</p>
          </div>
        ) : (
          <>
            <div className={`shadow-2xl transition-transform ${darkMode ? 'brightness-90 invert hue-rotate-180' : ''}`} style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
              <Document
                file={hasPurchased || !book.sampleFileUrl ? book.fileUrl : book.sampleFileUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="flex flex-col items-center justify-center p-20 gap-4">
                    <Loader />
                    <p className="text-sm font-medium">Loading Document...</p>
                  </div>
                }
                error={
                  <div className="p-10 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                    <p className="font-bold">Failed to load PDF</p>
                    <p className="text-sm">Please check your internet connection or try again later.</p>
                  </div>
                }
              >
                <Page 
                  pageNumber={pageNumber} 
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  loading={<div className="w-[800px] h-[1000px] bg-white animate-pulse" />}
                />
              </Document>
            </div>

            {/* Floating Page Navigation */}
            <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 rounded-full shadow-xl z-20 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} backdrop-blur-md bg-opacity-90`}>
              <button 
                onClick={() => changePage(-1)} 
                disabled={pageNumber <= 1}
                className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full disabled:opacity-50 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="flex items-center gap-2 text-sm font-medium">
                 <input 
                   type="number" 
                   value={pageNumber}
                   onChange={(e) => {
                     let val = parseInt(e.target.value);
                     if (isNaN(val)) return;
                     if (val > (numPages || 1)) val = numPages || 1;
                     if (val < 1) val = 1;
                     setPageNumber(val);
                   }}
                   className={`w-12 text-center rounded px-1 py-1 focus:ring-2 focus:ring-indigo-500 outline-none ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}
                 />
                 <span>/ {numPages || '--'}</span>
              </div>

              <button 
                onClick={() => changePage(1)} 
                disabled={pageNumber >= (numPages || 1)}
                className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full disabled:opacity-50 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
