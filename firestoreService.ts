import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  onSnapshot,
  deleteDoc,
  runTransaction
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Post, Comment, Report, User, Course, CourseModule, Lesson, Enrollment, Payment, Transaction, WithdrawalRequest, Tournament, TournamentRegistration, TournamentMatch, MatchResult } from './models';
import { generateId } from './utils';
import { handleFirestoreError, OperationType } from './firestoreErrorHandler';

// ... existing code ...
export const createPost = async (postData: Omit<Post, 'id' | 'createdAt' | 'likes' | 'commentsCount'>): Promise<Post> => {
  const id = generateId();
  const newPost: Post = {
    ...postData,
    id,
    likes: [],
    commentsCount: 0,
    createdAt: Date.now(),
  };
  try {
    await setDoc(doc(db, 'posts', id), newPost);
    return newPost;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `posts/${id}`);
    throw error;
  }
};

export const getFeedPosts = async (limitCount: number = 10): Promise<Post[]> => {
  try {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Post);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'posts');
    throw error;
  }
};

export const getUserPosts = async (uid: string): Promise<Post[]> => {
  try {
    const q = query(collection(db, 'posts'), where('uid', '==', uid));
    const snapshot = await getDocs(q);
    const posts = snapshot.docs.map(doc => doc.data() as Post);
    return posts.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'posts');
    throw error;
  }
};

export const likePost = async (postId: string, uid: string, isLiked: boolean): Promise<void> => {
  const postRef = doc(db, 'posts', postId);
  try {
    if (isLiked) {
      await updateDoc(postRef, { likes: arrayRemove(uid) });
    } else {
      await updateDoc(postRef, { likes: arrayUnion(uid) });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
  }
};

export const addComment = async (postId: string, text: string, uid: string): Promise<Comment> => {
  const id = generateId();
  const newComment: Comment = {
    id,
    postId,
    uid,
    text,
    createdAt: Date.now(),
  };
  try {
    await setDoc(doc(db, 'comments', id), newComment);
    await updateDoc(doc(db, 'posts', postId), { commentsCount: increment(1) });
    return newComment;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `comments/${id}`);
    throw error;
  }
};

export const reportPost = async (postId: string, reason: string, uid: string): Promise<Report> => {
  const id = generateId();
  const newReport: Report = {
    id,
    reportedBy: uid,
    postId,
    reason,
    status: 'pending',
    createdAt: Date.now(),
  };
  try {
    await setDoc(doc(db, 'reports', id), newReport);
    return newReport;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `reports/${id}`);
    throw error;
  }
};

// Admin functions
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => doc.data() as User);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
    throw error;
  }
};

export const getReportedPosts = async (): Promise<Report[]> => {
  try {
    const q = query(collection(db, 'reports'), where('status', '==', 'pending'));
    const snapshot = await getDocs(q);
    const reports = snapshot.docs.map(doc => doc.data() as Report);
    return reports.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'reports');
    throw error;
  }
};

export const resolveReport = async (reportId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'reports', reportId), { status: 'resolved' });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `reports/${reportId}`);
  }
};

export const deletePost = async (postId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'posts', postId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
  }
};

export const deleteUser = async (uid: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'users', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
  }
};

export const subscribeToFeed = (callback: (posts: Post[]) => void) => {
  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => doc.data() as Post));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'posts');
  });
};

export const subscribeToComments = (postId: string, callback: (comments: Comment[]) => void) => {
  const q = query(collection(db, 'comments'), where('postId', '==', postId));
  return onSnapshot(q, (snapshot) => {
    const comments = snapshot.docs.map(doc => doc.data() as Comment);
    callback(comments.sort((a, b) => a.createdAt - b.createdAt));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'comments');
  });
};

export const getUser = async (uid: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.exists() ? (userDoc.data() as User) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    throw error;
  }
};

export const updateUser = async (uid: string, data: Partial<User>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'users', uid), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
};

// --- WALLET & TRANSACTION SYSTEM API ---

export const submitAddMoneyRequest = async (
  userId: string,
  amount: number,
  method: 'bKash' | 'Nagad' | 'Rocket',
  senderNumber: string,
  transactionId: string,
  proofUrl?: string
): Promise<void> => {
  try {
    // Check for duplicate transaction ID
    const q = query(collection(db, 'transactions'), where('transactionId', '==', transactionId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      throw new Error('Transaction ID already exists.');
    }

    const id = generateId();
    const transaction: Transaction = {
      id,
      userId,
      type: 'add_money',
      amount,
      status: 'pending',
      method,
      senderNumber,
      transactionId,
      proofUrl,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await setDoc(doc(db, 'transactions', id), transaction);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'transactions');
    throw error;
  }
};

export const getUserTransactions = async (userId: string): Promise<Transaction[]> => {
  try {
    const q = query(collection(db, 'transactions'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map(doc => doc.data() as Transaction);
    return transactions.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'transactions');
    throw error;
  }
};

export const requestWithdrawal = async (
  userId: string,
  amount: number,
  method: 'bKash' | 'Nagad' | 'Rocket',
  accountNumber: string
): Promise<void> => {
  try {
    await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', userId);
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists()) {
        throw new Error("User not found");
      }

      const userData = userDoc.data() as User;
      const currentBalance = userData.walletBalance || 0;

      if (currentBalance < amount) {
        throw new Error("Insufficient balance");
      }

      // Deduct from walletBalance and add to lockedBalance
      transaction.update(userRef, {
        walletBalance: currentBalance - amount,
        lockedBalance: (userData.lockedBalance || 0) + amount
      });

      const id = generateId();
      const withdrawal: WithdrawalRequest = {
        id,
        userId,
        amount,
        method,
        accountNumber,
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const withdrawalRef = doc(db, 'withdrawals', id);
      transaction.set(withdrawalRef, withdrawal);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'withdrawals');
    throw error;
  }
};

export const getUserWithdrawals = async (userId: string): Promise<WithdrawalRequest[]> => {
  try {
    const q = query(collection(db, 'withdrawals'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const withdrawals = snapshot.docs.map(doc => doc.data() as WithdrawalRequest);
    return withdrawals.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'withdrawals');
    throw error;
  }
};

export const purchaseCourseWithWallet = async (userId: string, courseId: string, amount: number): Promise<void> => {
  try {
    await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', userId);
      const courseRef = doc(db, 'courses', courseId);
      
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) throw new Error("User not found");
      
      const courseDoc = await transaction.get(courseRef);
      if (!courseDoc.exists()) throw new Error("Course not found");

      const userData = userDoc.data() as User;
      const courseData = courseDoc.data() as Course;
      const currentBalance = userData.walletBalance || 0;

      if (currentBalance < amount) {
        throw new Error("Insufficient wallet balance");
      }

      // Deduct balance from user
      transaction.update(userRef, { walletBalance: currentBalance - amount });

      // Add balance to instructor (assuming 10% platform commission)
      const instructorRef = doc(db, 'users', courseData.instructorId);
      const instructorDoc = await transaction.get(instructorRef);
      if (instructorDoc.exists()) {
        const instructorData = instructorDoc.data() as User;
        const earnings = amount * 0.9; // 90% to instructor
        transaction.update(instructorRef, {
          walletBalance: (instructorData.walletBalance || 0) + earnings,
          totalEarnings: (instructorData.totalEarnings || 0) + earnings
        });

        // Create Transaction Record for Instructor
        const instructorTxId = generateId();
        const instructorTxRef = doc(db, 'transactions', instructorTxId);
        transaction.set(instructorTxRef, {
          id: instructorTxId,
          userId: courseData.instructorId,
          type: 'course_sale',
          amount: earnings,
          status: 'completed',
          method: 'System',
          relatedId: courseId,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }

      // Create Transaction Record for User
      const txId = generateId();
      const txRef = doc(db, 'transactions', txId);
      transaction.set(txRef, {
        id: txId,
        userId,
        type: 'course_purchase',
        amount,
        status: 'completed',
        method: 'Wallet',
        relatedId: courseId,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      // Create Enrollment
      const enrollmentId = generateId();
      const enrollmentRef = doc(db, 'enrollments', enrollmentId);
      transaction.set(enrollmentRef, {
        id: enrollmentId,
        userId,
        courseId,
        progress: 0,
        completedLessons: [],
        status: 'active',
        enrolledAt: Date.now()
      });

      // Create Payment Record (for legacy compatibility)
      const paymentId = generateId();
      const paymentRef = doc(db, 'payments', paymentId);
      transaction.set(paymentRef, {
        id: paymentId,
        userId,
        courseId,
        amount,
        method: 'Wallet',
        transactionId: txId,
        status: 'approved',
        createdAt: Date.now()
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'wallet_purchase');
    throw error;
  }
};

// Admin functions for wallet
export const getAllTransactions = async (): Promise<Transaction[]> => {
  try {
    const q = query(collection(db, 'transactions'));
    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map(doc => doc.data() as Transaction);
    return transactions.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'transactions');
    throw error;
  }
};

export const getAllPendingTransactions = async (): Promise<Transaction[]> => {
  try {
    const q = query(collection(db, 'transactions'), where('status', '==', 'pending'));
    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map(doc => doc.data() as Transaction);
    return transactions.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'transactions');
    throw error;
  }
};

export const approveTransaction = async (transactionId: string, userId: string, amount: number): Promise<void> => {
  try {
    await runTransaction(db, async (tx) => {
      const txRef = doc(db, 'transactions', transactionId);
      const userRef = doc(db, 'users', userId);
      
      const txDoc = await tx.get(txRef);
      if (!txDoc.exists() || txDoc.data().status !== 'pending') {
        throw new Error("Transaction is not pending or does not exist");
      }

      tx.update(txRef, { status: 'approved', updatedAt: Date.now() });
      tx.update(userRef, { walletBalance: increment(amount) });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `transactions/${transactionId}`);
    throw error;
  }
};

export const rejectTransaction = async (transactionId: string, adminNote: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'transactions', transactionId), {
      status: 'rejected',
      adminNote,
      updatedAt: Date.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `transactions/${transactionId}`);
    throw error;
  }
};

export const getAllPendingWithdrawals = async (): Promise<WithdrawalRequest[]> => {
  try {
    const q = query(collection(db, 'withdrawals'), where('status', '==', 'pending'));
    const snapshot = await getDocs(q);
    const withdrawals = snapshot.docs.map(doc => doc.data() as WithdrawalRequest);
    return withdrawals.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'withdrawals');
    throw error;
  }
};

export const approveWithdrawal = async (withdrawalId: string, userId: string, amount: number): Promise<void> => {
  try {
    await runTransaction(db, async (tx) => {
      const wRef = doc(db, 'withdrawals', withdrawalId);
      const userRef = doc(db, 'users', userId);
      
      const wDoc = await tx.get(wRef);
      if (!wDoc.exists() || wDoc.data().status !== 'pending') {
        throw new Error("Withdrawal is not pending or does not exist");
      }

      const userDoc = await tx.get(userRef);
      const currentLockedBalance = userDoc.data()?.lockedBalance || 0;
      
      if (currentLockedBalance < amount) {
        throw new Error("Insufficient locked balance for withdrawal");
      }

      tx.update(wRef, { status: 'approved', updatedAt: Date.now() });
      tx.update(userRef, { 
        lockedBalance: currentLockedBalance - amount,
        withdrawnAmount: increment(amount)
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `withdrawals/${withdrawalId}`);
    throw error;
  }
};

export const rejectWithdrawal = async (withdrawalId: string, adminNote: string): Promise<void> => {
  try {
    await runTransaction(db, async (tx) => {
      const wRef = doc(db, 'withdrawals', withdrawalId);
      const wDoc = await tx.get(wRef);
      
      if (!wDoc.exists() || wDoc.data().status !== 'pending') {
        throw new Error("Withdrawal is not pending or does not exist");
      }
      
      const withdrawalData = wDoc.data() as WithdrawalRequest;
      const userRef = doc(db, 'users', withdrawalData.userId);
      const userDoc = await tx.get(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        // Return locked balance to wallet balance
        tx.update(userRef, {
          walletBalance: (userData.walletBalance || 0) + withdrawalData.amount,
          lockedBalance: Math.max(0, (userData.lockedBalance || 0) - withdrawalData.amount)
        });
      }

      tx.update(wRef, {
        status: 'rejected',
        adminNote,
        updatedAt: Date.now()
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `withdrawals/${withdrawalId}`);
    throw error;
  }
};

export const getCourses = async (): Promise<Course[]> => {
  try {
    const q = query(collection(db, 'courses'), where('published', '==', true));
    const snapshot = await getDocs(q);
    const courses = snapshot.docs.map(doc => doc.data() as Course);
    return courses.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'courses');
    throw error;
  }
};

export const getCourse = async (courseId: string): Promise<Course | null> => {
  try {
    const docRef = await getDoc(doc(db, 'courses', courseId));
    return docRef.exists() ? (docRef.data() as Course) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `courses/${courseId}`);
    throw error;
  }
};

export const getCourseModules = async (courseId: string): Promise<CourseModule[]> => {
  try {
    const q = query(collection(db, 'courseModules'), where('courseId', '==', courseId));
    const snapshot = await getDocs(q);
    const modules = snapshot.docs.map(doc => doc.data() as CourseModule);
    return modules.sort((a, b) => a.order - b.order);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'courseModules');
    throw error;
  }
};

export const getModuleLessons = async (moduleId: string): Promise<Lesson[]> => {
  try {
    const q = query(collection(db, 'lessons'), where('moduleId', '==', moduleId));
    const snapshot = await getDocs(q);
    const lessons = snapshot.docs.map(doc => doc.data() as Lesson);
    return lessons.sort((a, b) => a.order - b.order);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'lessons');
    throw error;
  }
};

export const getEnrollment = async (userId: string, courseId: string): Promise<Enrollment | null> => {
  try {
    const q = query(collection(db, 'enrollments'), where('userId', '==', userId), where('courseId', '==', courseId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as Enrollment;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'enrollments');
    throw error;
  }
};

export const enrollInCourse = async (userId: string, courseId: string, amount: number, method: string, transactionId: string): Promise<void> => {
  try {
    const paymentId = generateId();
    const enrollmentId = generateId();

    const isFree = amount === 0;
    const status = isFree ? 'active' : 'pending';

    const payment: Payment = {
      id: paymentId,
      userId,
      courseId,
      amount,
      method: method as any,
      transactionId: transactionId || 'FREE',
      status: isFree ? 'approved' : 'pending',
      createdAt: Date.now()
    };

    const enrollment: Enrollment = {
      id: enrollmentId,
      userId,
      courseId,
      progress: 0,
      completedLessons: [],
      status,
      enrolledAt: Date.now()
    };

    await setDoc(doc(db, 'payments', paymentId), payment);
    await setDoc(doc(db, 'enrollments', enrollmentId), enrollment);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'enrollments/payments');
    throw error;
  }
};

export const markLessonComplete = async (enrollmentId: string, lessonId: string, currentCompleted: string[]): Promise<void> => {
  try {
    if (!currentCompleted.includes(lessonId)) {
      await updateDoc(doc(db, 'enrollments', enrollmentId), {
        completedLessons: arrayUnion(lessonId)
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `enrollments/${enrollmentId}`);
    throw error;
  }
};

export const seedDummyCourses = async (instructorId: string, instructorName: string) => {
  try {
    const existing = await getDocs(query(collection(db, 'courses'), limit(1)));
    if (!existing.empty) return; // Already seeded

    const courseId = generateId();
    const course: Course = {
      id: courseId,
      title: 'Complete Web Development Bootcamp 2026',
      description: 'Learn React, Node.js, Firebase, and modern web development from scratch. Build real-world projects and get hired.',
      instructorId,
      instructorName,
      price: 2500,
      thumbnailURL: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
      tags: ['Web Dev', 'React', 'JavaScript'],
      level: 'All Levels',
      language: 'English',
      rating: 4.8,
      totalReviews: 124,
      studentsCount: 1050,
      published: true,
      createdAt: Date.now()
    };
    await setDoc(doc(db, 'courses', courseId), course);

    const moduleId = generateId();
    await setDoc(doc(db, 'courseModules', moduleId), {
      id: moduleId,
      courseId,
      instructorId,
      title: 'Module 1: Introduction to Web Development',
      order: 1
    });

    const lesson1Id = generateId();
    await setDoc(doc(db, 'lessons', lesson1Id), {
      id: lesson1Id,
      moduleId,
      courseId,
      instructorId,
      title: 'How the Web Works',
      type: 'video',
      content: 'https://www.w3schools.com/html/mov_bbb.mp4',
      duration: 12,
      isFreePreview: true,
      order: 1
    });

    const lesson2Id = generateId();
    await setDoc(doc(db, 'lessons', lesson2Id), {
      id: lesson2Id,
      moduleId,
      courseId,
      instructorId,
      title: 'Setting up your environment',
      type: 'video',
      content: 'https://www.w3schools.com/html/mov_bbb.mp4',
      duration: 18,
      isFreePreview: false,
      order: 2
    });
  } catch (error) {
    // Silently fail if permissions are insufficient, as this is just a seeder
    console.warn("Could not seed dummy courses due to permissions. Please update Firestore rules.");
  }
};

// ==========================================
// TOURNAMENT SYSTEM
// ==========================================

export const createTournament = async (tournamentData: Omit<Tournament, 'id' | 'createdAt' | 'updatedAt' | 'registeredCount' | 'status' | 'isPublished'>): Promise<Tournament> => {
  const id = generateId();
  const newTournament: Tournament = {
    ...tournamentData,
    id,
    registeredCount: 0,
    status: 'draft',
    isPublished: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  try {
    await setDoc(doc(db, 'tournaments', id), newTournament);
    return newTournament;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `tournaments/${id}`);
    throw error;
  }
};

export const updateTournament = async (id: string, updates: Partial<Tournament>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'tournaments', id), { ...updates, updatedAt: Date.now() });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `tournaments/${id}`);
    throw error;
  }
};

export const getTournaments = async (statusFilter?: string): Promise<Tournament[]> => {
  try {
    let q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'));
    if (statusFilter) {
      q = query(collection(db, 'tournaments'), where('status', '==', statusFilter), orderBy('createdAt', 'desc'));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Tournament);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'tournaments');
    throw error;
  }
};

export const getTournament = async (id: string): Promise<Tournament | null> => {
  try {
    const docSnap = await getDoc(doc(db, 'tournaments', id));
    return docSnap.exists() ? (docSnap.data() as Tournament) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `tournaments/${id}`);
    throw error;
  }
};

export const registerForTournament = async (registrationData: Omit<TournamentRegistration, 'id' | 'createdAt' | 'status'>): Promise<TournamentRegistration> => {
  const id = generateId();
  const newRegistration: TournamentRegistration = {
    ...registrationData,
    id,
    status: registrationData.paymentStatus === 'free' ? 'approved' : 'pending',
    createdAt: Date.now(),
  };
  try {
    await runTransaction(db, async (transaction) => {
      const tRef = doc(db, 'tournaments', registrationData.tournamentId);
      const tDoc = await transaction.get(tRef);
      if (!tDoc.exists()) throw new Error("Tournament not found");
      const tournament = tDoc.data() as Tournament;
      
      if (tournament.registeredCount >= tournament.maxPlayers) {
        throw new Error("Tournament is full");
      }

      transaction.set(doc(db, 'tournamentRegistrations', id), newRegistration);
      transaction.update(tRef, { registeredCount: increment(1) });
    });
    return newRegistration;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `tournamentRegistrations/${id}`);
    throw error;
  }
};

export const getTournamentRegistrations = async (tournamentId: string): Promise<TournamentRegistration[]> => {
  try {
    const q = query(collection(db, 'tournamentRegistrations'), where('tournamentId', '==', tournamentId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as TournamentRegistration);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'tournamentRegistrations');
    throw error;
  }
};

export const getUserRegistrations = async (userId: string): Promise<TournamentRegistration[]> => {
  try {
    const q = query(collection(db, 'tournamentRegistrations'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as TournamentRegistration);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'tournamentRegistrations');
    throw error;
  }
};

export const updateRegistrationStatus = async (id: string, status: 'approved' | 'rejected'): Promise<void> => {
  try {
    await updateDoc(doc(db, 'tournamentRegistrations', id), { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `tournamentRegistrations/${id}`);
    throw error;
  }
};

export const createTournamentMatch = async (matchData: Omit<TournamentMatch, 'id' | 'createdAt'>): Promise<TournamentMatch> => {
  const id = generateId();
  const newMatch: TournamentMatch = {
    ...matchData,
    id,
    createdAt: Date.now(),
  };
  try {
    await setDoc(doc(db, 'tournamentMatches', id), newMatch);
    return newMatch;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `tournamentMatches/${id}`);
    throw error;
  }
};

export const getTournamentMatches = async (tournamentId: string): Promise<TournamentMatch[]> => {
  try {
    const q = query(collection(db, 'tournamentMatches'), where('tournamentId', '==', tournamentId), orderBy('round', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as TournamentMatch);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'tournamentMatches');
    throw error;
  }
};

export const updateMatch = async (id: string, updates: Partial<TournamentMatch>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'tournamentMatches', id), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `tournamentMatches/${id}`);
    throw error;
  }
};

export const submitMatchResult = async (resultData: Omit<MatchResult, 'id' | 'createdAt'>): Promise<MatchResult> => {
  const id = generateId();
  const newResult: MatchResult = {
    ...resultData,
    id,
    createdAt: Date.now(),
  };
  try {
    await setDoc(doc(db, 'matchResults', id), newResult);
    return newResult;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `matchResults/${id}`);
    throw error;
  }
};

export const getMatchResults = async (tournamentId: string): Promise<MatchResult[]> => {
  try {
    const q = query(collection(db, 'matchResults'), where('tournamentId', '==', tournamentId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as MatchResult);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'matchResults');
    throw error;
  }
};

