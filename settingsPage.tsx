import React, { useState, useRef } from 'react';
import { updateUser } from './firestoreService';
import { uploadMedia } from './storageService';
import { User } from './models';
import { Card, Button, Input } from './widgets';
import { toast } from 'sonner';
import { Camera, User as UserIcon, Save } from 'lucide-react';
import { DeviceStorageSettings } from './DeviceStorageSettings';
import { AudioSettings } from './AudioSettings';
import { soundService } from './soundService';

export const SettingsPage = ({ currentUser }: { currentUser: User }) => {
  const [name, setName] = useState(currentUser.name);
  const [bio, setBio] = useState(currentUser.bio || '');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(currentUser.avatarURL || null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    
    setSaving(true);
    try {
      let avatarURL = currentUser.avatarURL;
      if (file) {
        // We use local base64 storage now, so path is just for reference
        const path = `avatars/${currentUser.uid}/${Date.now()}-${file.name}`;
        avatarURL = await uploadMedia(file, path);
      }

      await updateUser(currentUser.uid, { name: name.trim(), bio: bio.trim(), avatarURL });
      toast.success('Settings saved successfully');
      
      // Optional: reload to see changes immediately if not using global state
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error saving settings', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-24 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Settings</h1>
        <p className="text-gray-500">Manage your profile and account preferences</p>
      </div>

      <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-gray-100">
        <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-8">
          
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-gray-100">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-24 h-24 bg-gradient-to-tr from-indigo-100 to-purple-100 rounded-full flex items-center justify-center overflow-hidden ring-4 ring-white shadow-md transition-transform group-hover:scale-105">
                {preview ? (
                  <img src={preview} alt="avatar preview" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-10 h-10 text-indigo-300" />
                )}
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="text-white w-8 h-8" />
              </div>
            </div>
            <div className="text-center sm:text-left">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Profile Picture</h3>
              <p className="text-sm text-gray-500 mb-3">JPG, GIF or PNG. 5MB max.</p>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Change Picture
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Profile Info Section */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Display Name</label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your full name"
                className="bg-gray-50 border-transparent focus:bg-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                placeholder="Tell us a little bit about yourself..."
                className="w-full p-3 bg-gray-50 border border-transparent rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent focus:bg-white transition-all resize-none text-gray-900"
              />
              <p className="text-xs text-gray-500 mt-2 text-right">
                {bio.length}/160 characters
              </p>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button 
              type="submit" 
              disabled={saving || (!name.trim())} 
              className="w-full sm:w-auto px-8 gap-2"
              onClick={() => soundService.play('click')}
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>

      <AudioSettings />

      <DeviceStorageSettings />
    </div>
  );
};
