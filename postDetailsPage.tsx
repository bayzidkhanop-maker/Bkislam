import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { subscribeToComments, addComment, getUser, likePost } from './firestoreService';
import { Post, Comment, User } from './models';
import { Card, Button, Input, MediaRenderer } from './widgets';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Heart, MessageCircle, Send, Share2, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { PostCard } from './components/PostCard';

export const PostDetailsPage = ({ currentUser }: { currentUser: User }) => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [author, setAuthor] = useState<User | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentAuthors, setCommentAuthors] = useState<Record<string, User>>({});
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  useEffect(() => {
    if (!postId) return;

    const fetchPost = async () => {
      try {
        const postDoc = await getDoc(doc(db, 'posts', postId));
        if (postDoc.exists()) {
          const postData = postDoc.data() as Post;
          if (postData.isDeleted) {
            setPost(null);
          } else {
            setPost({ ...postData, id: postDoc.id });
            setLiked(postData.likes.includes(currentUser.uid));
            setLikesCount(postData.likes.length);
            
            const authorData = await getUser(postData.uid);
            setAuthor(authorData);
          }
        }
      } catch (error) {
        toast.error('Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();

    const unsubscribe = subscribeToComments(postId, async (newComments) => {
      setComments(newComments);
      
      // Fetch authors for new comments
      const newAuthorsMap = { ...commentAuthors };
      let authorsUpdated = false;
      
      for (const comment of newComments) {
        if (!newAuthorsMap[comment.uid]) {
          const user = await getUser(comment.uid);
          if (user) {
            newAuthorsMap[comment.uid] = user;
            authorsUpdated = true;
          }
        }
      }
      
      if (authorsUpdated) {
        setCommentAuthors(newAuthorsMap);
      }
    });

    return () => unsubscribe();
  }, [postId, currentUser.uid]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !postId || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await addComment(postId, newComment.trim(), currentUser.uid);
      setNewComment('');
      toast.success('Comment added');
    } catch (error) {
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (postId: string, isCurrentlyLiked: boolean) => {
    if (!post) return;
    
    // Optimistic update
    setLiked(!isCurrentlyLiked);
    setLikesCount(prev => isCurrentlyLiked ? prev - 1 : prev + 1);
    
    try {
      await likePost(post.id, currentUser.uid, isCurrentlyLiked);
    } catch (error) {
      // Revert on failure
      setLiked(isCurrentlyLiked);
      setLikesCount(prev => isCurrentlyLiked ? prev + 1 : prev - 1);
      toast.error('Failed to like post');
    }
  };

  const handleShare = (postId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
    toast.success('Link copied to clipboard!');
  };

  if (loading) return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 pt-8">
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-8 bg-gray-200 rounded-full mb-6"></div>
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/6"></div>
            </div>
          </div>
          <div className="h-64 bg-gray-200 rounded-xl mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </Card>
      </div>
    </div>
  );

  if (!post) return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-4">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <span className="text-2xl">🔍</span>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Post not found</h2>
      <p className="text-gray-500 mb-6">This post may have been deleted or you don't have permission to view it.</p>
      <Button onClick={() => navigate('/')} variant="outline">Go back home</Button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-24">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors font-medium"
      >
        <ArrowLeft size={20} />
        Back
      </button>

      <div className="mb-6">
        <PostCard
          post={post}
          author={author || undefined}
          currentUser={currentUser}
          isLiked={liked}
          actualIsLiked={liked}
          displayLikes={likesCount}
          onLike={handleLike}
          onShare={handleShare}
          isAdmin={currentUser.role === 'admin'}
        />
      </div>

      {!post.commentsDisabled ? (
        <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-gray-100">
          <div className="p-4 sm:p-5">
            <div className="space-y-6">
              <h3 className="font-bold text-gray-900">Comments</h3>
              
              <form onSubmit={handleAddComment} className="flex gap-3">
                <div className="w-8 h-8 bg-gradient-to-tr from-indigo-100 to-purple-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 mt-1">
                  {currentUser.avatarURL ? (
                    <img src={currentUser.avatarURL} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-indigo-600 font-bold text-sm">{currentUser.name[0]?.toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 relative">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="pr-12 bg-gray-50 border-transparent focus:bg-white rounded-2xl"
                    disabled={isSubmitting}
                  />
                  <button 
                    type="submit" 
                    disabled={!newComment.trim() || isSubmitting}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-full disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </form>

              <div className="space-y-5 mt-6">
                {comments.length === 0 ? (
                  <p className="text-center text-gray-500 py-4 text-sm">No comments yet. Be the first to share your thoughts!</p>
                ) : (
                  comments.map(comment => {
                    const cAuthor = commentAuthors[comment.uid];
                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={comment.id} 
                        className="flex gap-3"
                      >
                        <Link to={`/profile/${comment.uid}`} className="flex-shrink-0">
                          <div className="w-8 h-8 bg-gradient-to-tr from-gray-100 to-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                            {cAuthor?.avatarURL ? (
                              <img src={cAuthor.avatarURL} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-gray-600 font-bold text-xs">{cAuthor?.name?.[0]?.toUpperCase()}</span>
                            )}
                          </div>
                        </Link>
                        <div className="flex-1">
                          <div className="bg-gray-50 rounded-2xl rounded-tl-none px-4 py-3 inline-block max-w-full">
                            <Link to={`/profile/${comment.uid}`} className="font-semibold text-sm text-gray-900 hover:underline mr-2">
                              {cAuthor?.name || 'Unknown'}
                            </Link>
                            <p className="text-gray-800 text-[15px] mt-0.5 break-words">{comment.text}</p>
                          </div>
                          <div className="flex items-center gap-4 mt-1.5 ml-2">
                            <span className="text-xs text-gray-500 font-medium">
                              {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-gray-100 p-8 text-center">
          <MessageCircle size={32} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Comments are disabled</h3>
          <p className="text-gray-500">The author has turned off comments for this post.</p>
        </Card>
      )}
    </div>
  );
};
