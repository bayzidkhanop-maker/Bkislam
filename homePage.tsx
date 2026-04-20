import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { subscribeToFeed, likePost, getUser } from './firestoreService';
import { cachePost, getCachedFeed } from './localStorageService';
import { Post, User } from './models';
import { Card, Loader, MediaRenderer } from './widgets';
import { Heart, MessageCircle, Flag, MoreHorizontal, Share2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { PostCard } from './components/PostCard';

export const HomePage = ({ currentUser }: { currentUser: User }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [authors, setAuthors] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<'all' | 'video' | 'image' | 'text'>('all');

  useEffect(() => {
    // Load from cache first
    getCachedFeed().then(cached => {
      if (cached.length > 0) {
        setPosts(cached);
        setLoading(false);
      }
    });

    const unsubscribe = subscribeToFeed(async (newPosts) => {
      setPosts(newPosts);
      setLoading(false);
      
      // Cache posts
      newPosts.forEach(post => cachePost(post));

      // Fetch authors
      const newAuthors = { ...authors };
      for (const post of newPosts) {
        if (!newAuthors[post.uid]) {
          const author = await getUser(post.uid);
          if (author) newAuthors[post.uid] = author;
        }
      }
      setAuthors(newAuthors);
    });

    return () => unsubscribe();
  }, []);

  const handleLike = async (postId: string, isLiked: boolean) => {
    // Optimistic update
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (isLiked) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });

    try {
      await likePost(postId, currentUser.uid, isLiked);
    } catch (error) {
      // Revert on failure
      setLikedPosts(prev => {
        const next = new Set(prev);
        if (isLiked) {
          next.add(postId);
        } else {
          next.delete(postId);
        }
        return next;
      });
      toast.error('Failed to update like');
    }
  };

  const handleShare = (postId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
    toast.success('Link copied to clipboard!');
  };

  if (loading) return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 pt-8">
      {[1, 2, 3].map(i => (
        <Card key={i} className="p-6 animate-pulse">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/6"></div>
            </div>
          </div>
          <div className="h-32 bg-gray-200 rounded-xl mb-4"></div>
          <div className="flex gap-4">
            <div className="h-8 bg-gray-200 rounded w-16"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
        </Card>
      ))}
    </div>
  );

  const filteredPosts = posts.filter(post => {
    if (filterType === 'all') return true;
    return post.type === filterType;
  });

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-8 pb-24">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Your Feed</h1>
        
        <div className="flex bg-gray-100 p-1 rounded-full overflow-x-auto w-full sm:w-auto scrollbar-hide">
          <button 
            onClick={() => setFilterType('all')} 
            className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${filterType === 'all' ? 'bg-white text-indigo-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            All
          </button>
          <button 
            onClick={() => setFilterType('video')} 
            className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${filterType === 'video' ? 'bg-white text-indigo-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Videos
          </button>
          <button 
            onClick={() => setFilterType('image')} 
            className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${filterType === 'image' ? 'bg-white text-indigo-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Images
          </button>
          <button 
            onClick={() => setFilterType('text')} 
            className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${filterType === 'text' ? 'bg-white text-indigo-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Text
          </button>
        </div>
      </div>
      
      {filteredPosts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle size={32} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No posts found</h3>
          <p className="text-gray-500">{posts.length > 0 ? "Try changing your filter criteria." : "Follow people or create your first post!"}</p>
          {posts.length === 0 && (
            <Link to="/upload" className="mt-6 inline-flex items-center justify-center rounded-xl px-4 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors">
              Create Post
            </Link>
          )}
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {filteredPosts.map(post => {
            const author = authors[post.uid];
            // Use optimistic state if available, otherwise use actual state
            const isLiked = likedPosts.has(post.id) || post.likes.includes(currentUser.uid);
            // Adjust count based on optimistic state
            const actualIsLiked = post.likes.includes(currentUser.uid);
            let displayLikes = post.likes.length;
            if (isLiked && !actualIsLiked) displayLikes++;
            if (!isLiked && actualIsLiked) displayLikes--;

            return (
              <PostCard
                key={post.id}
                post={post}
                author={author}
                currentUser={currentUser}
                isLiked={isLiked}
                actualIsLiked={actualIsLiked}
                displayLikes={displayLikes}
                onLike={handleLike}
                onShare={handleShare}
                isAdmin={currentUser.role === 'admin'}
              />
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
};
