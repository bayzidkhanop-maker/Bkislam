import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getUser, getUserPosts, updateUser, followUser, unfollowUser, getInstructorCourses, getHostTournaments } from './firestoreService';
import { startCall } from './callService';
import { User, Post, Course, Tournament } from './models';
import { Card, Button, Input, Loader, MediaRenderer } from './widgets';
import { formatDistanceToNow } from 'date-fns';
import { 
  Heart, MessageCircle, Calendar, FileText, Image as ImageIcon, Video, Type,
  User as UserIcon, Gamepad2, GraduationCap, Wallet, Shield, Settings,
  CheckCircle2, MapPin, Globe, Facebook, Youtube, Twitch, Trophy, Target,
  Crosshair, Medal, CreditCard, History, Bell, Moon, Sun, Lock, Smartphone,
  LogOut, Trash2, Camera, UploadCloud, Share2, Phone, Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { auth } from './firebaseConfig';
import { uploadMedia } from './storageService';

const TABS = [
  { id: 'profile', label: 'About', icon: UserIcon },
  { id: 'posts', label: 'Posts', icon: FileText },
  { id: 'courses', label: 'Courses', icon: GraduationCap },
  { id: 'tournaments', label: 'Tournaments', icon: Trophy },
  { id: 'products', label: 'Products', icon: CreditCard },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
  { id: 'media', label: 'Media', icon: ImageIcon },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// Mock Data for Charts
const activityData = [
  { name: 'Mon', views: 4000, engagement: 2400 },
  { name: 'Tue', views: 3000, engagement: 1398 },
  { name: 'Wed', views: 2000, engagement: 9800 },
  { name: 'Thu', views: 2780, engagement: 3908 },
  { name: 'Fri', views: 1890, engagement: 4800 },
  { name: 'Sat', views: 2390, engagement: 3800 },
  { name: 'Sun', views: 3490, engagement: 4300 },
];

export const ProfilePage = () => {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  
  const currentUser = auth.currentUser;
  const isOwnProfile = currentUser?.uid === uid;

  useEffect(() => {
    if (!uid) return;
    const fetchData = async () => {
      setLoading(true);
      const fetchedUser = await getUser(uid);
      if (fetchedUser) {
        setUser(fetchedUser);
        const fetchedPosts = await getUserPosts(uid, isOwnProfile);
        setPosts(fetchedPosts);
      }
      setLoading(false);
    };
    fetchData();
  }, [uid]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    const toastId = toast.loading('Uploading cover image...');
    try {
      const url = await uploadMedia(file, `users/${user.uid}/cover`);
      await updateUser(user.uid, { coverURL: url });
      setUser({ ...user, coverURL: url });
      toast.success('Cover image updated!', { id: toastId });
    } catch (error) {
      toast.error('Failed to upload cover image.', { id: toastId });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    const toastId = toast.loading('Uploading profile picture...');
    try {
      const url = await uploadMedia(file, `users/${user.uid}/avatar`);
      await updateUser(user.uid, { avatarURL: url });
      setUser({ ...user, avatarURL: url });
      toast.success('Profile picture updated!', { id: toastId });
    } catch (error) {
      toast.error('Failed to upload profile picture.', { id: toastId });
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser || !user) return;
    const isFollowing = user.followers?.includes(currentUser.uid);
    try {
      if (isFollowing) {
        await unfollowUser(currentUser.uid, user.uid);
        setUser({
          ...user,
          followers: user.followers?.filter(id => id !== currentUser.uid) || [],
          followersCount: Math.max(0, (user.followersCount || 0) - 1)
        });
        toast.success(`Unfollowed ${user.name}`);
      } else {
        await followUser(currentUser.uid, user.uid);
        setUser({
          ...user,
          followers: [...(user.followers || []), currentUser.uid],
          followersCount: (user.followersCount || 0) + 1
        });
        toast.success(`Following ${user.name}`);
      }
    } catch (error) {
      toast.error('Failed to update follow status');
    }
  };

  if (loading) return <ProfileSkeleton />;

  if (!user) return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-4">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <span className="text-3xl">😕</span>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">User not found</h2>
      <p className="text-gray-500 text-center">The user you're looking for doesn't exist or has been removed.</p>
    </div>
  );

  // Filter tabs based on ownership and role
  const visibleTabs = TABS.filter(t => {
    if (t.id === 'wallet' || t.id === 'security' || t.id === 'settings') return isOwnProfile;
    if (t.id === 'courses') return user.role === 'instructor' || user.role === 'admin';
    if (t.id === 'tournaments') return user.role === 'host' || user.role === 'admin';
    if (t.id === 'products') return user.role === 'seller' || user.role === 'admin';
    return true; // profile, posts, gaming, media
  });

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 pb-24">
      {/* Premium Header / Banner */}
      <Card className="mb-8 overflow-hidden border-0 shadow-lg relative group">
        <div className="h-48 sm:h-64 bg-slate-900 relative">
          {user.coverURL ? (
            <img src={user.coverURL} alt="cover" className="w-full h-full object-cover opacity-80" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 opacity-90"></div>
          )}
          
          {isOwnProfile && (
            <label className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full cursor-pointer backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100">
              <Camera size={20} />
              <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
            </label>
          )}
        </div>

        <div className="px-6 sm:px-8 pb-8 relative bg-white">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-20 sm:-mt-16 mb-6">
            <div className="relative group/avatar">
              <div className="w-32 h-32 sm:w-40 sm:h-40 bg-white rounded-full p-1.5 shadow-xl flex-shrink-0 relative z-10">
                <div className="w-full h-full bg-gradient-to-tr from-indigo-100 to-purple-100 rounded-full flex items-center justify-center overflow-hidden border-4 border-white">
                  {user.avatarURL ? (
                    <img src={user.avatarURL} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-indigo-600 font-bold text-5xl">{user.name[0]?.toUpperCase()}</span>
                  )}
                </div>
              </div>
              {isOwnProfile && (
                <label className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover/avatar:opacity-100 cursor-pointer transition-opacity m-1.5">
                  <UploadCloud className="text-white" size={28} />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
              )}
            </div>
            
            <div className="text-center sm:text-left flex-1 pb-2">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{user.name}</h1>
                {user.isVerified && <CheckCircle2 className="text-blue-500 fill-blue-50" size={24} />}
                {user.isTopPerformer && <Medal className="text-yellow-500 fill-yellow-50" size={24} />}
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-3 mb-3">
                <p className="text-gray-500 font-medium text-lg">@{user.username || user.uid.slice(0,8)}</p>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full uppercase tracking-wider">
                  {user.role}
                </span>
                {user.level && (
                  <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-full uppercase tracking-wider">
                    Lvl {user.level}
                  </span>
                )}
              </div>
              
              {/* Stats */}
              <div className="flex items-center justify-center sm:justify-start gap-6 text-sm">
                <div className="flex flex-col items-center sm:items-start">
                  <span className="font-bold text-gray-900 text-lg">{user.followersCount || 0}</span>
                  <span className="text-gray-500">Followers</span>
                </div>
                <div className="flex flex-col items-center sm:items-start">
                  <span className="font-bold text-gray-900 text-lg">{user.followingCount || 0}</span>
                  <span className="text-gray-500">Following</span>
                </div>
                <div className="flex flex-col items-center sm:items-start">
                  <span className="font-bold text-gray-900 text-lg">{posts.length}</span>
                  <span className="text-gray-500">Posts</span>
                </div>
                {isOwnProfile && (
                  <div className="flex flex-col items-center sm:items-start">
                    <span className="font-bold text-gray-900 text-lg">{user.profileViews || 0}</span>
                    <span className="text-gray-500">Profile Views</span>
                  </div>
                )}
              </div>
            </div>

            {!isOwnProfile && (
              <div className="flex gap-3 pb-2">
                <Button 
                  variant={user.followers?.includes(currentUser?.uid || '') ? "outline" : "primary"} 
                  className="rounded-full px-6"
                  onClick={handleFollowToggle}
                >
                  {user.followers?.includes(currentUser?.uid || '') ? 'Following' : 'Follow'}
                </Button>
                <Button 
                  variant="outline" 
                  className="rounded-full px-6"
                  onClick={async () => {
                    try {
                      // We need to pass currentUser here, but it's not available in ProfilePage directly.
                      // Let's just navigate to inbox for now, and inbox will handle chat creation if needed.
                      // Actually, we can create the chat and then navigate.
                      // But we need currentUser. Let's assume we can navigate with state.
                      navigate('/inbox', { state: { startChatWith: user.uid } });
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                >
                  Message
                </Button>
                <Button 
                  variant="outline" 
                  className="rounded-full w-10 h-10 p-0 flex items-center justify-center"
                  onClick={() => {
                    if (currentUser && user) {
                      startCall(currentUser.uid, user.uid, 'audio');
                    }
                  }}
                >
                  <Phone size={18} />
                </Button>
                <Button 
                  variant="outline" 
                  className="rounded-full w-10 h-10 p-0 flex items-center justify-center"
                  onClick={() => {
                    if (currentUser && user) {
                      startCall(currentUser.uid, user.uid, 'video');
                    }
                  }}
                >
                  <Video size={18} />
                </Button>
              </div>
            )}
            {isOwnProfile && (
              <div className="flex gap-3 pb-2">
                <Button variant="outline" className="rounded-full px-6">Edit Profile</Button>
                <Button variant="outline" className="rounded-full w-10 h-10 p-0 flex items-center justify-center" onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Profile link copied!");
                }}>
                  <Share2 size={18} />
                </Button>
              </div>
            )}
          </div>

          {/* Quick Stats Bar */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-6 py-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin size={18} className="text-gray-400" />
              <span className="font-medium">{user.country || 'Global'}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Globe size={18} className="text-gray-400" />
              <span className="font-medium">{user.language || 'English'}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar size={18} className="text-gray-400" />
              <span className="font-medium">Joined {formatDistanceToNow(user.createdAt)} ago</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Tab Navigation */}
      <div className="flex overflow-x-auto hide-scrollbar mb-6 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 sticky top-4 z-30">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                isActive 
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-indigo-600' : 'text-gray-400'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'profile' && <ProfileTab user={user} />}
          {activeTab === 'posts' && <PostsTab posts={posts} />}
          {activeTab === 'courses' && <CoursesTab user={user} />}
          {activeTab === 'tournaments' && <TournamentsTab user={user} />}
          {activeTab === 'products' && <ProductsTab user={user} />}
          {activeTab === 'gaming' && <GamingTab user={user} />}
          {activeTab === 'media' && <MediaTab posts={posts} />}
          {activeTab === 'wallet' && isOwnProfile && <WalletTab />}
          {activeTab === 'security' && isOwnProfile && <SecurityTab />}
          {activeTab === 'settings' && isOwnProfile && <SettingsTab user={user} setUser={setUser} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// --- TAB COMPONENTS ---

const ProfileTab = ({ user }: { user: User }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="lg:col-span-1 space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">About Me</h3>
        <p className="text-gray-700 leading-relaxed">
          {user.bio || "This user hasn't written a bio yet."}
        </p>
        
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Social Links</h4>
          <div className="space-y-3">
            <a href={user.socialLinks?.facebook || '#'} className="flex items-center gap-3 text-gray-600 hover:text-blue-600 transition-colors">
              <Facebook size={20} />
              <span className="font-medium">{user.socialLinks?.facebook ? 'Facebook Profile' : 'Not connected'}</span>
            </a>
            <a href={user.socialLinks?.youtube || '#'} className="flex items-center gap-3 text-gray-600 hover:text-red-600 transition-colors">
              <Youtube size={20} />
              <span className="font-medium">{user.socialLinks?.youtube ? 'YouTube Channel' : 'Not connected'}</span>
            </a>
            <a href={user.socialLinks?.discord || '#'} className="flex items-center gap-3 text-gray-600 hover:text-indigo-500 transition-colors">
              <Twitch size={20} />
              <span className="font-medium">{user.socialLinks?.discord ? 'Discord Server' : 'Not connected'}</span>
            </a>
          </div>
        </div>
      </Card>
    </div>

    <div className="lg:col-span-2 space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Activity Analytics</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activityData}>
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
              <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              <Area type="monotone" dataKey="views" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  </div>
);

const PostsTab = ({ posts }: { posts: Post[] }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-bold text-gray-900">All Posts <span className="text-gray-400 font-normal ml-1">({posts.length})</span></h2>
    </div>

    {posts.length === 0 ? (
      <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText size={32} />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No posts yet</h3>
        <p className="text-gray-500">This user hasn't shared anything yet.</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map(post => (
          <Link 
            to={`/post/${post.id}`} 
            key={post.id} 
            className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden aspect-square hover:shadow-md transition-all duration-200"
          >
            {post.type === 'image' && <MediaRenderer url={post.content} type="image" className="w-full h-full object-cover" />}
            {post.type === 'video' && <MediaRenderer url={post.content} type="video" className="w-full h-full object-cover" />}
            {post.type === 'text' && (
              <div className="p-6 flex flex-col items-center justify-center h-full bg-gradient-to-br from-indigo-50 to-purple-50 text-center">
                <Type className="text-indigo-200 mb-3" size={32} />
                <p className="text-gray-800 font-medium line-clamp-4">{post.content}</p>
              </div>
            )}
            
            <div className="absolute top-3 right-3 flex gap-2">
              {post.isArchived && (
                <div className="p-1.5 bg-yellow-500/80 backdrop-blur-md rounded-lg text-white">
                  <Archive size={16} />
                </div>
              )}
              <div className="p-1.5 bg-black/40 backdrop-blur-md rounded-lg text-white">
                {post.type === 'image' && <ImageIcon size={16} />}
                {post.type === 'video' && <Video size={16} />}
                {post.type === 'text' && <Type size={16} />}
              </div>
            </div>

            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-6 text-white">
              <div className="flex items-center gap-2 font-semibold text-lg">
                <Heart size={24} className={post.likes.length > 0 ? "fill-white" : ""} />
                <span>{post.likes.length}</span>
              </div>
              <div className="flex items-center gap-2 font-semibold text-lg">
                <MessageCircle size={24} className={post.commentsCount > 0 ? "fill-white" : ""} />
                <span>{post.commentsCount}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    )}
  </div>
);

const MediaTab = ({ posts }: { posts: Post[] }) => {
  const mediaPosts = posts.filter(p => p.type === 'image' || p.type === 'video');
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Media Gallery <span className="text-gray-400 font-normal ml-1">({mediaPosts.length})</span></h2>
      </div>

      {mediaPosts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <ImageIcon size={32} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No media yet</h3>
          <p className="text-gray-500">This user hasn't uploaded any photos or videos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {mediaPosts.map(post => (
            <Link 
              to={`/post/${post.id}`} 
              key={post.id} 
              className="group relative bg-gray-100 rounded-xl overflow-hidden aspect-square hover:opacity-90 transition-opacity"
            >
              {post.type === 'image' && <MediaRenderer url={post.content} type="image" className="w-full h-full object-cover" />}
              {post.type === 'video' && <MediaRenderer url={post.content} type="video" className="w-full h-full object-cover" />}
              <div className="absolute top-2 right-2 flex gap-1">
                {post.isArchived && (
                  <div className="p-1 bg-yellow-500/80 backdrop-blur-md rounded text-white">
                    <Archive size={14} />
                  </div>
                )}
                <div className="p-1 bg-black/40 backdrop-blur-md rounded text-white">
                  {post.type === 'video' ? <Video size={14} /> : <ImageIcon size={14} />}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

const CoursesTab = ({ user }: { user: User }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const fetchedCourses = await getInstructorCourses(user.uid);
        setCourses(fetchedCourses);
      } catch (error) {
        console.error("Failed to fetch courses", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [user.uid]);

  if (loading) return <div className="flex justify-center py-10"><Loader /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Published Courses</h2>
      </div>
      {courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <Link key={course.id} to={`/courses/${course.id}`}>
              <Card className="overflow-hidden hover:shadow-xl transition-shadow h-full flex flex-col">
                <div className="aspect-video relative">
                  <img src={course.thumbnailURL} alt={course.title} className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md font-bold">
                    {course.price === 0 ? 'Free' : `৳ ${course.price}`}
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{course.title}</h3>
                  <div className="mt-auto flex items-center justify-between text-sm text-gray-500">
                    <span className="flex items-center gap-1"><Users size={14} /> {course.studentCount || 0}</span>
                    <span className="flex items-center gap-1"><Star size={14} className="text-amber-400" /> {course.rating?.toFixed(1) || 'N/A'}</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <GraduationCap size={32} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No courses yet</h3>
          <p className="text-gray-500">This instructor hasn't published any courses.</p>
        </div>
      )}
    </div>
  );
};

const TournamentsTab = ({ user }: { user: User }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const fetchedTournaments = await getHostTournaments(user.uid);
        setTournaments(fetchedTournaments);
      } catch (error) {
        console.error("Failed to fetch tournaments", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTournaments();
  }, [user.uid]);

  if (loading) return <div className="flex justify-center py-10"><Loader /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Hosted Tournaments</h2>
      </div>
      {tournaments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map(tournament => (
            <Link key={tournament.id} to={`/tournaments/${tournament.id}`}>
              <Card className="overflow-hidden hover:shadow-xl transition-shadow h-full flex flex-col">
                <div className="aspect-video relative">
                  <img src={tournament.bannerUrl} alt={tournament.title} className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md font-bold capitalize">
                    {tournament.status}
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{tournament.title}</h3>
                  <div className="mt-auto flex items-center justify-between text-sm text-gray-500">
                    <span className="flex items-center gap-1"><Users size={14} /> {tournament.registeredCount}/{tournament.maxParticipants}</span>
                    <span className="font-bold text-indigo-600">৳ {tournament.prizePool}</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy size={32} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No tournaments yet</h3>
          <p className="text-gray-500">This host hasn't created any tournaments.</p>
        </div>
      )}
    </div>
  );
};

const ProductsTab = ({ user }: { user: User }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-bold text-gray-900">Products & PDFs</h2>
    </div>
    <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
      <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
        <CreditCard size={32} />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">Products coming soon</h3>
      <p className="text-gray-500">This seller's products will appear here.</p>
    </div>
  </div>
);

const GamingTab = ({ user }: { user: User }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
            <Gamepad2 size={24} className="text-yellow-400" />
          </div>
          <div>
            <p className="text-slate-400 text-sm font-medium">Free Fire UID</p>
            <p className="text-xl font-bold font-mono">{user.gaming?.ffUid || 'Not Linked'}</p>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-slate-400 text-sm font-medium">In-Game Name</p>
          <p className="text-lg font-bold">{user.gaming?.inGameName || 'N/A'}</p>
        </div>
      </Card>

      <Card className="p-6 md:col-span-2">
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Target className="text-indigo-600" /> Player Statistics
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-2xl text-center">
            <p className="text-gray-500 text-sm font-medium mb-1">Matches</p>
            <p className="text-2xl font-bold text-gray-900">{user.gaming?.matchesPlayed || 0}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-2xl text-center">
            <p className="text-green-600 text-sm font-medium mb-1">Wins</p>
            <p className="text-2xl font-bold text-green-700">{user.gaming?.wins || 0}</p>
          </div>
          <div className="p-4 bg-red-50 rounded-2xl text-center">
            <p className="text-red-600 text-sm font-medium mb-1">Kills</p>
            <p className="text-2xl font-bold text-red-700">{user.gaming?.kills || 0}</p>
          </div>
        </div>
      </Card>
    </div>

    <Card className="p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Trophy className="text-yellow-500" /> Achievements & Badges
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center p-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${i === 1 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400'}`}>
              <Medal size={32} />
            </div>
            <p className="font-semibold text-gray-900 text-center text-sm">Tournament Winner</p>
            <p className="text-xs text-gray-500 text-center mt-1">Season {i}</p>
          </div>
        ))}
      </div>
    </Card>
  </div>
);

const WalletTab = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 shadow-lg">
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="text-emerald-100 font-medium mb-1">Available Balance</p>
            <h2 className="text-4xl font-bold">৳ 12,500</h2>
          </div>
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Wallet size={24} />
          </div>
        </div>
        <div className="flex gap-3">
          <Button className="bg-white text-emerald-700 hover:bg-emerald-50 flex-1">Add Money</Button>
          <Button className="bg-emerald-700 text-white hover:bg-emerald-800 border-0 flex-1">Withdraw</Button>
        </div>
      </Card>

      <Card className="p-6 md:col-span-2">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <CreditCard className="text-gray-400" /> Saved Payment Methods
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center text-pink-600 font-bold">bK</div>
              <div>
                <p className="font-semibold text-gray-900">bKash Personal</p>
                <p className="text-sm text-gray-500">+880 17** *** **89</p>
              </div>
            </div>
            <Button variant="ghost" size="sm">Edit</Button>
          </div>
          <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 font-bold">Ng</div>
              <div>
                <p className="font-semibold text-gray-900">Nagad Personal</p>
                <p className="text-sm text-gray-500">+880 19** *** **21</p>
              </div>
            </div>
            <Button variant="ghost" size="sm">Edit</Button>
          </div>
        </div>
      </Card>
    </div>

    <Card className="p-0 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <History className="text-gray-400" /> Transaction History
        </h3>
      </div>
      <div className="divide-y divide-gray-100">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${i % 2 === 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                {i % 2 === 0 ? <LogOut size={18} /> : <Wallet size={18} />}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{i % 2 === 0 ? 'Course Purchase' : 'Added to Wallet'}</p>
                <p className="text-sm text-gray-500">Oct 24, 2026 • 10:30 AM</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`font-bold ${i % 2 === 0 ? 'text-gray-900' : 'text-green-600'}`}>
                {i % 2 === 0 ? '-' : '+'}৳ {i * 500}
              </p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  </div>
);

const SecurityTab = () => (
  <div className="max-w-3xl space-y-6">
    <Card className="p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Lock className="text-gray-400" /> Change Password
      </h3>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); toast.success('Password updated successfully'); }}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
          <Input type="password" placeholder="••••••••" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <Input type="password" placeholder="••••••••" />
          <div className="mt-2 flex gap-1">
            <div className="h-1.5 flex-1 bg-green-500 rounded-full"></div>
            <div className="h-1.5 flex-1 bg-green-500 rounded-full"></div>
            <div className="h-1.5 flex-1 bg-green-500 rounded-full"></div>
            <div className="h-1.5 flex-1 bg-gray-200 rounded-full"></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Password strength: Strong</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
          <Input type="password" placeholder="••••••••" />
        </div>
        <Button type="submit" className="w-full sm:w-auto mt-2">Update Password</Button>
      </form>
    </Card>

    <Card className="p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Smartphone className="text-gray-400" /> Two-Factor Authentication (2FA)
      </h3>
      <p className="text-gray-600 mb-6">Add an extra layer of security to your account by requiring a verification code when you log in.</p>
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-gray-50">
        <div>
          <p className="font-semibold text-gray-900">Authenticator App</p>
          <p className="text-sm text-gray-500">Not configured</p>
        </div>
        <Button variant="outline">Enable</Button>
      </div>
    </Card>

    <Card className="p-6 border-red-100">
      <h3 className="text-lg font-bold text-red-600 mb-2 flex items-center gap-2">
        <Trash2 className="text-red-500" /> Danger Zone
      </h3>
      <p className="text-gray-600 mb-4">Once you delete your account, there is no going back. Please be certain.</p>
      <Button variant="danger">Delete Account</Button>
    </Card>
  </div>
);

const SettingsTab = ({ user, setUser }: { user: User, setUser: any }) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    username: user.username || '',
    phone: user.phone || '',
    bio: user.bio || '',
    country: user.country || '',
    language: user.language || '',
    ffUid: user.gaming?.ffUid || '',
    inGameName: user.gaming?.inGameName || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading('Saving changes...');
    try {
      const updates = {
        name: formData.name,
        username: formData.username,
        phone: formData.phone,
        bio: formData.bio,
        country: formData.country,
        language: formData.language,
        gaming: {
          ...user.gaming,
          ffUid: formData.ffUid,
          inGameName: formData.inGameName,
        }
      };
      await updateUser(user.uid, updates);
      setUser({ ...user, ...updates });
      toast.success('Profile updated successfully!', { id: toastId });
    } catch (error) {
      toast.error('Failed to update profile.', { id: toastId });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Basic Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <Input name="name" value={formData.name} onChange={handleChange} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <Input name="username" value={formData.username} onChange={handleChange} placeholder="johndoe" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="+880..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <Input value={user.email} disabled className="bg-gray-50 text-gray-500" />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed here.</p>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio / About Me</label>
            <textarea 
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              className="flex w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-all min-h-[100px] resize-y"
              placeholder="Tell us about yourself..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <Input name="country" value={formData.country} onChange={handleChange} placeholder="Bangladesh" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
            <Input name="language" value={formData.language} onChange={handleChange} placeholder="English, Bengali" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Gaming Profile</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Free Fire UID</label>
            <Input name="ffUid" value={formData.ffUid} onChange={handleChange} placeholder="123456789" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">In-Game Name</label>
            <Input name="inGameName" value={formData.inGameName} onChange={handleChange} placeholder="ProGamer99" />
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline">Cancel</Button>
        <Button type="submit">Save Changes</Button>
      </div>
    </form>
  );
};

const ProfileSkeleton = () => (
  <div className="max-w-5xl mx-auto p-4 sm:p-6 pt-8">
    <Card className="mb-8 overflow-hidden border-0 shadow-lg animate-pulse">
      <div className="h-48 sm:h-64 bg-slate-200"></div>
      <div className="px-6 sm:px-8 pb-8 relative bg-white">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-20 sm:-mt-16 mb-6">
          <div className="w-32 h-32 sm:w-40 sm:h-40 bg-gray-200 rounded-full border-4 border-white flex-shrink-0 z-10"></div>
          <div className="space-y-3 flex-1 w-full text-center sm:text-left pt-4">
            <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto sm:mx-0"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto sm:mx-0"></div>
          </div>
        </div>
      </div>
    </Card>
    <div className="flex gap-4 mb-6 overflow-hidden">
      {[1,2,3,4].map(i => <div key={i} className="h-10 w-24 bg-gray-200 rounded-xl animate-pulse"></div>)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="h-64 bg-gray-200 rounded-2xl animate-pulse"></div>
      <div className="lg:col-span-2 h-96 bg-gray-200 rounded-2xl animate-pulse"></div>
    </div>
  </div>
);
