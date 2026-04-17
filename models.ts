export interface User {
  uid: string;
  name: string;
  email: string;
  avatarURL: string;
  bio: string;
  createdAt: number;
  role: 'user' | 'admin' | 'instructor' | 'host' | 'seller';
  // Admin & Security Fields
  status?: 'active' | 'banned' | 'suspended';
  shadowBanned?: boolean;
  warnings?: number;
  lastActiveAt?: number;
  ip?: string;
  deviceInfo?: string;
  assignedRoles?: string[]; // Allow multiple roles
  walletStatus?: 'active' | 'frozen';
  suspensionEnd?: number;
  twoFactorEnabled?: boolean;
  adminNotes?: string;
  isVerifiedEmail?: boolean;
  isVerifiedPhone?: boolean;

  // Advanced Profile Fields
  username?: string;
  phone?: string;
  coverURL?: string;
  country?: string;
  city?: string;
  language?: string;
  isVerified?: boolean;
  isTopPerformer?: boolean;
  level?: number;
  rank?: string;
  profileViews?: number;
  followersCount?: number;
  followingCount?: number;
  followers?: string[];
  following?: string[];
  socialLinks?: {
    facebook?: string;
    youtube?: string;
    discord?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
  gaming?: {
    ffUid?: string;
    inGameName?: string;
    matchesPlayed?: number;
    wins?: number;
    kills?: number;
    rank?: string;
  };
  walletBalance?: number;
  lockedBalance?: number;
  totalEarnings?: number;
  withdrawnAmount?: number;
  savedContent?: string[]; // Post IDs
  likedContent?: string[]; // Post IDs
  privacy?: {
    isPublic: boolean;
    showEmail: boolean;
    showPhone: boolean;
    allowMessagesFrom: 'everyone' | 'followers' | 'none';
  };
  blockedUsers?: string[];
  badges?: string[];
}

export interface UserActivity {
  id: string;
  uid: string;
  action: string;
  details: string;
  ip?: string;
  deviceInfo?: string;
  createdAt: number;
}

export interface RoleApplication {
  id: string;
  uid: string;
  roleRequested: 'instructor' | 'host' | 'seller';
  status: 'pending' | 'approved' | 'rejected';
  message: string;
  portfolioUrl?: string;
  createdAt: number;
  updatedAt?: number;
  adminFeedback?: string;
}

export type TournamentStatus = 'draft' | 'pending' | 'published' | 'live' | 'completed' | 'cancelled';
export type TournamentType = 'solo' | 'duo' | 'squad';

export interface Tournament {
  id: string;
  hostId: string;
  title: string;
  game: string;
  type: TournamentType;
  entryFee: number;
  prizePool: number;
  maxPlayers: number;
  registeredCount: number;
  scheduledAt: number;
  rules: string;
  bannerUrl?: string;
  status: TournamentStatus;
  createdAt: number;
  updatedAt: number;
  isPublished: boolean;
}

export interface TournamentRegistration {
  id: string;
  tournamentId: string;
  userId: string;
  inGameUid: string;
  inGameName: string;
  teamId?: string;
  paymentStatus: 'pending' | 'verified' | 'rejected' | 'free';
  transactionId?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  round: number;
  scheduledAt: number;
  roomId?: string;
  roomPassword?: string;
  status: 'upcoming' | 'live' | 'completed';
  createdAt: number;
}

export interface MatchResult {
  id: string;
  matchId: string;
  tournamentId: string;
  userId: string;
  placement: number;
  kills: number;
  points: number;
  createdAt: number;
}
export type TransactionStatus = 'pending' | 'approved' | 'rejected' | 'completed';
export type TransactionType = 'deposit' | 'withdrawal' | 'course_purchase' | 'premium_subscription' | 'tournament_fee';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  method?: 'bKash' | 'Nagad' | 'Rocket' | 'Wallet' | 'System';
  senderNumber?: string;
  transactionId?: string;
  proofUrl?: string;
  note?: string;
  relatedId?: string; // courseId, etc.
  createdAt: number;
  updatedAt: number;
  adminNote?: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  method: 'bKash' | 'Nagad' | 'Rocket';
  accountNumber: string;
  status: TransactionStatus;
  createdAt: number;
  updatedAt: number;
  adminNote?: string;
}

export interface Post {
  id: string;
  uid: string;
  type: 'video' | 'image' | 'text';
  content: string; // text or media URL
  caption: string;
  likes: string[]; // array of uids
  commentsCount: number;
  createdAt: number;
  isEdited?: boolean;
  editHistory?: { timestamp: number; content: string; caption: string }[];
  visibility?: 'public' | 'friends' | 'private';
  isDeleted?: boolean; // soft delete
  isPinned?: boolean;
  isArchived?: boolean;
  commentsDisabled?: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  uid: string;
  text: string;
  createdAt: number;
}

export interface Report {
  id: string;
  reportedBy: string; // UID of the user who reported
  targetType: 'post' | 'comment' | 'message' | 'user';
  targetId: string; // ID of the reported content/user
  reason: string;
  details?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'rejected';
  createdAt: number;
  updatedAt?: number;
  assignedTo?: string; // Admin UID
  adminNotes?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface ModerationLog {
  id: string;
  adminId: string;
  action: string;
  targetType: 'post' | 'comment' | 'message' | 'user' | 'report' | 'system';
  targetId: string;
  details: string;
  createdAt: number;
}

export interface AutoModSettings {
  id: string; // usually 'global'
  enabled: boolean;
  blockedKeywords: string[];
  spamProtection: boolean;
  maxPostsPerMinute: number;
  toxicityFilter: boolean;
}

export interface Book {
  id: string;
  sellerId: string;
  title: string;
  author: string;
  description: string;
  coverUrl: string;
  fileUrl: string; // Secure URL
  sampleFileUrl?: string; // Free preview (optional)
  category: string;
  tags: string[];
  price: number;
  isPublished: boolean;
  status: 'pending' | 'approved' | 'rejected';
  allowDownload: boolean;
  fileSize?: number;
  pages?: number;
  totalViews: number;
  totalDownloads: number;
  totalSales: number;
  createdAt: number;
  updatedAt: number;
}

export interface PlatformSettings {
  id: string; // usually 'global'
  branding: {
    logoLight: string;
    logoDark: string;
    favicon: string;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    themeStyle: 'modern' | 'minimal' | 'playful';
    borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  };
  general: {
    siteName: string;
    tagline: string;
    seoDescription: string;
    maintenanceMode: boolean;
    defaultLanguage: string;
    timezone: string;
  };
  financial: {
    platformCommission: number; // percentage
    minWithdrawal: number;
    transactionFee: number;
    currency: string;
    enableNagad: boolean;
    enableBkash: boolean;
    enableCard: boolean;
  };
  security: {
    require2FA: boolean;
    sessionTimeoutHours: number;
    maxLoginAttempts: number;
  };
  integrations: {
    googleAnalyticsId: string;
    facebookPixel: string;
  };
  advanced: {
    debugMode: boolean;
    maxUploadSizeMB: number;
    enableCaching: boolean;
  };
}

export interface Chat {
  id: string;
  type: 'direct' | 'group';
  name?: string; // For groups
  groupIcon?: string; // For groups
  adminIds?: string[]; // For groups
  participants: string[];
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: number;
    type: 'text' | 'image' | 'video' | 'voice' | 'file';
  };
  updatedAt: number;
  unreadCount: Record<string, number>;
  pinnedBy: string[];
  archivedBy: string[];
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  type: 'text' | 'image' | 'video' | 'voice' | 'file';
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  createdAt: number;
  status: 'sent' | 'delivered' | 'read';
  replyTo?: string; // Message ID
  deletedFor: string[];
  isEdited?: boolean;
}

export interface Call {
  id: string;
  callerId: string;
  receiverId: string;
  status: 'calling' | 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed';
  type: 'audio' | 'video';
  offer?: any;
  answer?: any;
  callerCandidates?: any[];
  receiverCandidates?: any[];
  startedAt: number;
  endedAt?: number;
}

export interface Notification {
  id: string;
  uid: string; // receiver
  actorUid: string; // who did it
  type: 'like' | 'comment';
  postId: string;
  read: boolean;
  createdAt: number;
}

// --- ACADEMY / COURSE SYSTEM MODELS ---

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
}

export interface Course {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  instructorId: string;
  instructorName: string;
  price: number;
  discountPrice?: number;
  thumbnailURL: string;
  promoVideoURL?: string;
  category?: string;
  subcategory?: string;
  tags: string[];
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
  language: string;
  rating: number;
  totalReviews: number;
  studentsCount: number;
  status: 'draft' | 'pending' | 'published' | 'archived';
  version?: number;
  isFeatured?: boolean;
  requirements?: string[];
  whatYouWillLearn?: string[];
  targetAudience?: string[];
  estimatedDuration?: string;
  certificateEnabled?: boolean;
  lifetimeAccess?: boolean;
  dripContentEnabled?: boolean;
  createdAt: number;
  updatedAt?: number;
}

export interface CourseModule {
  id: string;
  courseId: string;
  instructorId: string;
  title: string;
  order: number;
}

export interface Lesson {
  id: string;
  moduleId: string;
  courseId: string;
  instructorId: string;
  title: string;
  type: 'video' | 'text' | 'file';
  content: string; // video URL or text content
  duration: number; // in minutes
  isFreePreview: boolean;
  order: number;
  downloadableResources?: string[];
  externalLinks?: string[];
  dripDays?: number; // Days after enrollment to unlock
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  progress: number;
  completedLessons: string[]; // array of lesson IDs
  status: 'pending' | 'active' | 'completed';
  certificateIssued?: boolean;
  certificateUrl?: string;
  enrolledAt: number;
}

export interface Review {
  id: string;
  courseId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1-5
  comment: string;
  teacherReply?: string;
  createdAt: number;
}

export interface Payment {
  id: string;
  userId: string;
  courseId: string;
  amount: number;
  method: 'bKash' | 'Nagad' | 'Manual' | 'Free';
  transactionId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}
