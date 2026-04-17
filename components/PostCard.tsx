import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, MoreHorizontal, Edit2, Trash2, Pin, Archive, MessageSquareOff, Flag, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Post, User } from '../models';
import { updatePost, softDeletePost, deletePost, togglePinPost, toggleArchivePost, toggleComments, createPost } from '../firestoreService';
import { MediaRenderer, Button } from '../widgets';

interface PostCardProps {
  post: Post;
  author: User | undefined;
  currentUser: User;
  isLiked: boolean;
  actualIsLiked: boolean;
  displayLikes: number;
  onLike: (postId: string, isLiked: boolean) => void;
  onShare: (postId: string) => void;
  isAdmin?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  author,
  currentUser,
  isLiked,
  actualIsLiked,
  displayLikes,
  onLike,
  onShare,
  isAdmin = false
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editedCaption, setEditedCaption] = useState(post.caption || '');
  const [editedContent, setEditedContent] = useState(post.content || '');
  const [editedVisibility, setEditedVisibility] = useState<'public' | 'friends' | 'private'>(post.visibility || 'public');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isOwner = currentUser.uid === post.uid;
  // 24 hour time limit for editing
  const canEdit = isOwner && (Date.now() - post.createdAt < 24 * 60 * 60 * 1000);
  const canDelete = isOwner || isAdmin;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEditSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updatePost(post.id, {
        caption: editedCaption,
        content: editedContent,
        visibility: editedVisibility,
      });
      toast.success('Post updated successfully');
      setIsEditModalOpen(false);
    } catch (error) {
      toast.error('Failed to update post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async (permanent: boolean = false) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (permanent) {
        await deletePost(post.id);
        toast.success('Post permanently deleted');
      } else {
        await softDeletePost(post.id);
        toast.success('Post moved to trash');
      }
      setIsDeleteModalOpen(false);
    } catch (error) {
      toast.error('Failed to delete post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePin = async () => {
    try {
      await togglePinPost(post.id, !post.isPinned);
      toast.success(post.isPinned ? 'Post unpinned' : 'Post pinned');
    } catch (error) {
      toast.error('Failed to pin post');
    }
    setIsDropdownOpen(false);
  };

  const handleToggleArchive = async () => {
    try {
      await toggleArchivePost(post.id, !post.isArchived);
      toast.success(post.isArchived ? 'Post unarchived' : 'Post archived');
    } catch (error) {
      toast.error('Failed to archive post');
    }
    setIsDropdownOpen(false);
  };

  const handleToggleComments = async () => {
    try {
      await toggleComments(post.id, !post.commentsDisabled);
      toast.success(post.commentsDisabled ? 'Comments enabled' : 'Comments disabled');
    } catch (error) {
      toast.error('Failed to toggle comments');
    }
    setIsDropdownOpen(false);
  };

  const handleDuplicatePost = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await createPost({
        uid: currentUser.uid,
        type: post.type,
        content: post.content,
        caption: post.caption,
        visibility: post.visibility || 'public',
      });
      toast.success('Post duplicated successfully');
    } catch (error) {
      toast.error('Failed to duplicate post');
    } finally {
      setIsSubmitting(false);
      setIsDropdownOpen(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200"
    >
      {post.isPinned && (
        <div className="bg-indigo-50 px-5 py-2 flex items-center gap-2 text-indigo-600 text-sm font-medium border-b border-indigo-100">
          <Pin size={14} className="fill-indigo-600" />
          Pinned Post
        </div>
      )}
      
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
              <p className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                {author?.name || 'Unknown User'}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{formatDistanceToNow(post.createdAt, { addSuffix: true })}</span>
                {post.isEdited && (
                  <>
                    <span>•</span>
                    <span>Edited</span>
                  </>
                )}
                {post.visibility && (
                  <>
                    <span>•</span>
                    <span className="capitalize">{post.visibility}</span>
                  </>
                )}
              </div>
            </div>
          </Link>
          
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-50 transition-colors"
            >
              <MoreHorizontal size={20} />
            </button>
            
            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-10"
                >
                  {canEdit && (
                    <button 
                      onClick={() => { setIsEditModalOpen(true); setIsDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Edit2 size={16} /> Edit Post
                    </button>
                  )}
                  <button 
                    onClick={handleDuplicatePost}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Share2 size={16} /> Duplicate Post
                  </button>
                  {isOwner && (
                    <>
                      <button 
                        onClick={handleTogglePin}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Pin size={16} /> {post.isPinned ? 'Unpin Post' : 'Pin to Profile'}
                      </button>
                      <button 
                        onClick={handleToggleArchive}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Archive size={16} /> {post.isArchived ? 'Unarchive' : 'Archive Post'}
                      </button>
                      <button 
                        onClick={handleToggleComments}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <MessageSquareOff size={16} /> {post.commentsDisabled ? 'Enable Comments' : 'Disable Comments'}
                      </button>
                    </>
                  )}
                  {canDelete && (
                    <button 
                      onClick={() => { setIsDeleteModalOpen(true); setIsDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 size={16} /> Delete Post
                    </button>
                  )}
                  {!isOwner && (
                    <Link 
                      to={`/report/${post.id}`}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Flag size={16} /> Report Post
                    </Link>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="mb-4">
          {post.type === 'text' ? (
            <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-wrap">{post.content}</p>
          ) : (
            <p className="text-gray-800 mb-3 whitespace-pre-wrap">{post.caption}</p>
          )}
          
          {post.type === 'image' && (
            <div className="rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
              <MediaRenderer url={post.content} type="image" className="w-full h-auto max-h-[600px] object-contain" />
            </div>
          )}
          
          {post.type === 'video' && (
            <div className="rounded-xl overflow-hidden bg-black border border-gray-100">
              <MediaRenderer url={post.content} type="video" className="w-full max-h-[600px]" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
          <div className="flex items-center space-x-6">
            <button 
              onClick={() => onLike(post.id, isLiked)}
              className={`flex items-center space-x-2 transition-colors ${
                isLiked ? 'text-rose-500' : 'text-gray-500 hover:text-rose-500'
              }`}
            >
              <Heart size={20} className={isLiked ? "fill-current" : ""} />
              <span className="font-medium text-sm">{displayLikes > 0 ? displayLikes : 'Like'}</span>
            </button>
            
            {!post.commentsDisabled && (
              <Link 
                to={`/post/${post.id}`} 
                className="flex items-center space-x-2 text-gray-500 hover:text-indigo-600 transition-colors"
              >
                <MessageCircle size={20} />
                <span className="font-medium text-sm">{post.commentsCount > 0 ? post.commentsCount : 'Comment'}</span>
              </Link>
            )}
          </div>
          
          <button 
            onClick={() => onShare(post.id)}
            className="flex items-center space-x-2 text-gray-500 hover:text-indigo-600 transition-colors"
          >
            <Share2 size={20} />
            <span className="font-medium text-sm">Share</span>
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Edit Post</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
                  <select
                    value={editedVisibility}
                    onChange={(e) => setEditedVisibility(e.target.value as any)}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  >
                    <option value="public">Public</option>
                    <option value="friends">Friends Only</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                {post.type === 'text' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                    <textarea 
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none h-32"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Caption</label>
                    <textarea 
                      value={editedCaption}
                      onChange={(e) => setEditedCaption(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none h-24"
                    />
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                <Button 
                  variant="secondary"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleEditSubmit}
                  isLoading={isSubmitting}
                  className="px-5 py-2.5 flex items-center gap-2"
                >
                  <Check size={18} /> Save Changes
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-900">Delete Post?</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-6">Are you sure you want to delete this post? You can move it to trash or permanently delete it.</p>
                <div className="flex flex-col gap-3">
                  <Button 
                    variant="outline"
                    onClick={() => handleDeleteConfirm(false)}
                    isLoading={isSubmitting}
                    className="w-full py-3 text-orange-700 border-orange-200 hover:bg-orange-50"
                  >
                    Move to Trash (Soft Delete)
                  </Button>
                  <Button 
                    variant="danger"
                    onClick={() => handleDeleteConfirm(true)}
                    isLoading={isSubmitting}
                    className="w-full py-3"
                  >
                    Permanently Delete
                  </Button>
                  <Button 
                    variant="ghost"
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="w-full py-3"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
