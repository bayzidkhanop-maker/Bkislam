export interface User {
  uid: string;
  name: string;
  email: string;
  avatarURL: string;
  bio: string;
  createdAt: number;
  role: 'user' | 'admin' | 'instructor';
  // Advanced Profile Fields
  username?: string;
  phone?: string;
  coverURL?: string;
  country?: string;
  language?: string;
  isVerified?: boolean;
  socialLinks?: {
    facebook?: string;
    youtube?: string;
    discord?: string;
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
  reportedBy: string;
  postId: string;
  reason: string;
  status: 'pending' | 'resolved';
  createdAt: number;
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

export interface Course {
  id: string;
  title: string;
  description: string;
  instructorId: string;
  instructorName: string;
  price: number;
  thumbnailURL: string;
  tags: string[];
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
  language: string;
  rating: number;
  totalReviews: number;
  studentsCount: number;
  published: boolean;
  createdAt: number;
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
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  progress: number;
  completedLessons: string[]; // array of lesson IDs
  status: 'pending' | 'active' | 'completed';
  enrolledAt: number;
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
