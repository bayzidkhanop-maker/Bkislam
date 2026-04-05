import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPost } from './firestoreService';
import { uploadMedia } from './storageService';
import { User } from './models';
import { Card, Button, Input } from './widgets';
import { Image as ImageIcon, Video, Type, UploadCloud, X } from 'lucide-react';
import { toast } from 'sonner';

export const UploadPage = ({ currentUser }: { currentUser: User }) => {
  const [type, setType] = useState<'text' | 'image' | 'video'>('text');
  const [content, setContent] = useState('');
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (type !== 'text' && !file) {
      toast.error('Please select a file to upload');
      return;
    }
    if (type === 'text' && !content.trim()) {
      toast.error('Please enter some text');
      return;
    }

    setUploading(true);
    try {
      let finalContent = content;
      if (type !== 'text' && file) {
        const path = `posts/${currentUser.uid}/${Date.now()}-${file.name}`;
        finalContent = await uploadMedia(file, path, setProgress);
      }

      await createPost({
        uid: currentUser.uid,
        type,
        content: finalContent,
        caption,
      });
      toast.success('Post created successfully!');
      navigate('/');
    } catch (error: any) {
      console.error('Upload failed', error);
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create Post</h1>
        <p className="text-gray-500">Share your thoughts, photos, or videos with the community.</p>
      </div>

      <Card className="p-6">
        <div className="flex space-x-2 mb-6 p-1 bg-gray-100 rounded-xl">
          <button
            onClick={() => { setType('text'); clearFile(); }}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg font-medium transition-all ${type === 'text' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <Type size={18} />
            <span>Text</span>
          </button>
          <button
            onClick={() => { setType('image'); setContent(''); }}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg font-medium transition-all ${type === 'image' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <ImageIcon size={18} />
            <span>Image</span>
          </button>
          <button
            onClick={() => { setType('video'); setContent(''); }}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg font-medium transition-all ${type === 'video' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <Video size={18} />
            <span>Video</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {type === 'text' ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">What's on your mind?</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={6}
                placeholder="Write your post here..."
                className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Upload Media</label>
              
              {!previewUrl ? (
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600 mb-1">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-500">
                    {type === 'image' ? 'PNG, JPG, GIF up to 10MB' : 'MP4, WebM up to 50MB'}
                  </p>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 group">
                  {type === 'image' ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-auto max-h-[400px] object-contain" />
                  ) : (
                    <video src={previewUrl} controls className="w-full max-h-[400px]" />
                  )}
                  <button
                    type="button"
                    onClick={clearFile}
                    className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept={type === 'image' ? 'image/*' : 'video/*'}
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Caption (Optional)</label>
                <Input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write a caption..."
                />
              </div>
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Uploading...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300 ease-out" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-gray-100">
            <Button 
              type="submit" 
              disabled={uploading || (type !== 'text' && !file) || (type === 'text' && !content.trim())} 
              className="w-full py-3 text-base"
            >
              {uploading ? 'Publishing...' : 'Publish Post'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
