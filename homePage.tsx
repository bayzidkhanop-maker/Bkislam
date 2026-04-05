import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { subscribeToFeed, likePost, getUser } from './firestoreService';
import { cachePost, getCachedFeed } from './localStorageService';
import { Post, User } from './models';
import { Card, Loader } from './widgets';
import { Heart, MessageCircle, Flag, MoreHorizontal, Share2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export const HomePage = ({ currentUser }: { currentUser: User }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [authors, setAuthors] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

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

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-8 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Your Feed</h1>
      </div>
      
      {posts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle size={32} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No posts yet</h3>
          <p className="text-gray-500">Follow people or create your first post!</p>
          <Link to="/upload" className="mt-6 inline-flex items-center justify-center rounded-xl px-4 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors">
            Create Post
          </Link>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {posts.map(post => {
            const author = authors[post.uid];
            // Use optimistic state if available, otherwise use actual state
            const isLiked = likedPosts.has(post.id) || post.likes.includes(currentUser.uid);
            // Adjust count based on optimistic state
            const actualIsLiked = post.likes.includes(currentUser.uid);
            let displayLikes = post.likes.length;
            if (isLiked && !actualIsLiked) displayLikes++;
            if (!isLiked && actualIsLiked) displayLikes--;

            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200">
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <Link to={`/profile/${post.uid}`} className="flex items-center space-x-3 group">
                        <div className="w-11 h-11 bg-gradient-to-tr from-indigo-100 to-purple-100 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-white shadow-sm">
                          {author?.avatarURL ? (
                            <img src={author.avatarURL} alt="avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-indigo-600 font-semibold text-lg">{author?.name?.[0]?.toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                            {author?.name || 'Unknown User'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(post.createdAt, { addSuffix: true })}
                          </p>
                        </div>
                      </Link>
                      <button className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-50 transition-colors">
                        <MoreHorizontal size={20} />
                      </button>
                    </div>

                    <div className="mb-4">
                      {post.type === 'text' ? (
                        <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-wrap">{post.content}</p>
                      ) : (
                        <p className="text-gray-800 mb-3">{post.caption}</p>
                      )}
                      
                      {post.type === 'image' && (
                        <div className="rounded-2xl overflow-hidden bg-gray-100 border border-gray-100">
                          <img src={post.content} alt="post" className="w-full h-auto max-h-[600px] object-contain" loading="lazy" />
                        </div>
                      )}
                      {post.type === 'video' && (
                        <div className="rounded-2xl overflow-hidden bg-black border border-gray-100">
                          <video src={post.content} controls className="w-full max-h-[600px]" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <motion.button 
                        whileTap={{ scale: 0.85 }}
                        onClick={() => handleLike(post.id, isLiked)}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-colors ${
                          isLiked 
                            ? 'text-red-500 bg-red-50 hover:bg-red-100' 
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Heart size={20} className={isLiked ? "fill-current" : ""} />
                        <span className="font-medium text-sm">{displayLikes > 0 ? displayLikes : 'Like'}</span>
                      </motion.button>

                      <Link 
                        to={`/post/${post.id}`} 
                        className="flex items-center space-x-2 px-3 py-1.5 rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <MessageCircle size={20} />
                        <span className="font-medium text-sm">{post.commentsCount > 0 ? post.commentsCount : 'Comment'}</span>
                      </Link>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button 
                        onClick={() => handleShare(post.id)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                        title="Share"
                      >
                        <Share2 size={18} />
                      </button>
                      <Link 
                        to={`/report/${post.id}`} 
                        className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-full transition-colors"
                        title="Report"
                      >
                        <Flag size={18} />
                      </Link>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
};
