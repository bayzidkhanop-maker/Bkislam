import React, { useState, useEffect } from 'react';
import { User, Book } from './models';
import { db } from './firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Card, Button, Input, Loader } from './widgets';
import { Search, Book as BookIcon, Download, Eye, Star, Filter } from 'lucide-react';
import { toast } from 'sonner';

export const EbooksPage = ({ currentUser }: { currentUser: User }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const q = query(collection(db, 'books'), where('isPublished', '==', true));
      const snapshot = await getDocs(q);
      const bks = snapshot.docs.map(doc => doc.data() as Book);
      setBooks(bks);
    } catch (error) {
      toast.error('Failed to load library');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', ...Array.from(new Set(books.map(b => b.category)))];

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          book.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = category === 'All' || book.category === category;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return <div className="h-[calc(100vh-64px)] flex items-center justify-center"><Loader /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="relative rounded-3xl overflow-hidden bg-indigo-900 text-white shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900 to-indigo-600 opacity-90"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative p-10 md:p-16 flex flex-col md:flex-row items-center gap-8 justify-between">
          <div className="max-w-xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Deenstream Library</h1>
            <p className="text-xl text-indigo-100 mb-8">Access thousands of premium Islamic books, academic journals, and PDF resources.</p>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by title, author, or keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              />
            </div>
          </div>
          <div className="hidden md:flex flex-col gap-4 items-center justify-center bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/20">
            <BookIcon size={48} className="text-indigo-200" />
            <div className="text-center">
              <div className="text-3xl font-bold">{books.length}+</div>
              <div className="text-indigo-200 text-sm">Books Available</div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-hide">
        <div className="flex items-center gap-2 text-gray-500 mr-2 flex-shrink-0">
          <Filter size={18} />
          <span className="font-medium">Filter:</span>
        </div>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-5 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors border ${
              category === cat
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Book Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {filteredBooks.map((book) => (
          <Link key={book.id} to={`/library/read/${book.id}`} className="group flex flex-col h-full">
            <Card className="flex-1 overflow-hidden transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1 border-0 ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-gray-900">
              <div className="relative aspect-[2/3] bg-gray-100 dark:bg-gray-800 overflow-hidden">
                {book.coverUrl ? (
                  <img src={book.coverUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={book.title} />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <BookIcon className="w-12 h-12 text-gray-300" />
                  </div>
                )}
                {/* Badges */}
                <div className="absolute top-2 right-2 flex flex-col gap-1">
                  {book.price === 0 ? (
                    <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">FREE</span>
                  ) : (
                    <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">৳{book.price}</span>
                  )}
                </div>
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-white text-indigo-900 px-4 py-2 rounded-full font-bold text-sm shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                    Read Now
                  </div>
                </div>
              </div>
              <div className="p-3 flex flex-col gap-1">
                <h3 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">
                  {book.title}
                </h3>
                <p className="text-xs text-gray-500 line-clamp-1">{book.author}</p>
                <div className="flex items-center justify-between mt-auto pt-2">
                  <div className="flex items-center gap-1 text-[10px] text-gray-400">
                    <Eye size={12} /> {book.totalViews || 0}
                  </div>
                  <div className="flex items-center gap-0.5 text-amber-500">
                    <Star size={12} className="fill-current" />
                    <span className="text-[10px] font-medium text-gray-600">{4.8}</span>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {filteredBooks.length === 0 && (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700">
          <BookIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">No books found</h3>
          <p className="text-gray-500 mt-2">Try adjusting your search or filters.</p>
        </div>
      )}
    </div>
  );
};
