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
import { Post, Comment, Report, User, Course, CourseModule, Lesson, Enrollment, Payment, Transaction, WithdrawalRequest, Tournament, TournamentRegistration, TournamentMatch, MatchResult, Notification, Chat, Message, Call, Review, Category } from './models';
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

export const getUserPosts = async (uid: string, includeArchived = false): Promise<Post[]> => {
  try {
    const q = query(collection(db, 'posts'), where('uid', '==', uid));
    const snapshot = await getDocs(q);
    let posts = snapshot.docs.map(doc => doc.data() as Post).filter(p => !p.isDeleted);
    if (!includeArchived) {
      posts = posts.filter(p => !p.isArchived);
    }
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

export const getUserProfile = async (userId: string): Promise<User | null> => {
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as User;
    }
    return null;
  } catch (error) {
    try { handleFirestoreError(error, OperationType.GET, `users/${userId}`); } catch (e) {}
    return {
      uid: userId,
      name: 'Unknown User',
      email: '',
      role: 'user',
      createdAt: Date.now(),
      avatarURL: `https://ui-avatars.com/api/?name=Unknown&background=random`
    } as User;
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

export const updatePost = async (postId: string, data: Partial<Post>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'posts', postId), {
      ...data,
      isEdited: true,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
    throw error;
  }
};

export const softDeletePost = async (postId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'posts', postId), { isDeleted: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
    throw error;
  }
};

export const restorePost = async (postId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'posts', postId), { isDeleted: false });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
    throw error;
  }
};

export const togglePinPost = async (postId: string, isPinned: boolean): Promise<void> => {
  try {
    await updateDoc(doc(db, 'posts', postId), { isPinned });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
    throw error;
  }
};

export const toggleArchivePost = async (postId: string, isArchived: boolean): Promise<void> => {
  try {
    await updateDoc(doc(db, 'posts', postId), { isArchived });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
    throw error;
  }
};

export const toggleComments = async (postId: string, commentsDisabled: boolean): Promise<void> => {
  try {
    await updateDoc(doc(db, 'posts', postId), { commentsDisabled });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
    throw error;
  }
};

export const deleteUser = async (uid: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'users', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
  }
};

export const updateUserRole = async (uid: string, role: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'users', uid), { role });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    throw error;
  }
};

export const subscribeToFeed = (callback: (posts: Post[]) => void) => {
  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map(doc => doc.data() as Post).filter(p => !p.isDeleted && !p.isArchived);
    callback(posts);
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
    try { handleFirestoreError(error, OperationType.GET, `users/${uid}`); } catch (e) {}
    return {
      uid,
      name: 'Unknown User',
      email: '',
      role: 'user',
      createdAt: Date.now(),
      avatarURL: `https://ui-avatars.com/api/?name=Unknown&background=random`
    } as User;
  }
};

export const updateUser = async (uid: string, data: Partial<User>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'users', uid), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
};

export const followUser = async (currentUserId: string, targetUserId: string): Promise<void> => {
  try {
    await runTransaction(db, async (transaction) => {
      const currentUserRef = doc(db, 'users', currentUserId);
      const targetUserRef = doc(db, 'users', targetUserId);

      const currentUserDoc = await transaction.get(currentUserRef);
      const targetUserDoc = await transaction.get(targetUserRef);

      if (!currentUserDoc.exists() || !targetUserDoc.exists()) {
        throw new Error("User does not exist!");
      }

      transaction.update(currentUserRef, {
        following: arrayUnion(targetUserId),
        followingCount: increment(1)
      });

      transaction.update(targetUserRef, {
        followers: arrayUnion(currentUserId),
        followersCount: increment(1)
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users`);
    throw error;
  }
};

export const unfollowUser = async (currentUserId: string, targetUserId: string): Promise<void> => {
  try {
    await runTransaction(db, async (transaction) => {
      const currentUserRef = doc(db, 'users', currentUserId);
      const targetUserRef = doc(db, 'users', targetUserId);

      const currentUserDoc = await transaction.get(currentUserRef);
      const targetUserDoc = await transaction.get(targetUserRef);

      if (!currentUserDoc.exists() || !targetUserDoc.exists()) {
        throw new Error("User does not exist!");
      }

      transaction.update(currentUserRef, {
        following: arrayRemove(targetUserId),
        followingCount: increment(-1)
      });

      transaction.update(targetUserRef, {
        followers: arrayRemove(currentUserId),
        followersCount: increment(-1)
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users`);
    throw error;
  }
};

export const createNotification = async (notificationData: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<Notification> => {
  const id = generateId();
  const newNotification: Notification = {
    ...notificationData,
    id,
    read: false,
    createdAt: Date.now(),
  };
  try {
    await setDoc(doc(db, 'notifications', id), newNotification);
    return newNotification;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `notifications/${id}`);
    throw error;
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

      const withdrawalRef = doc(db, 'withdrawalRequests', id);
      transaction.set(withdrawalRef, withdrawal);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'withdrawalRequests');
    throw error;
  }
};

export const getUserWithdrawals = async (userId: string): Promise<WithdrawalRequest[]> => {
  try {
    const q = query(collection(db, 'withdrawalRequests'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const withdrawals = snapshot.docs.map(doc => doc.data() as WithdrawalRequest);
    return withdrawals.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'withdrawalRequests');
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

export const getAllWithdrawals = async (): Promise<WithdrawalRequest[]> => {
  try {
    const q = query(collection(db, 'withdrawalRequests'));
    const snapshot = await getDocs(q);
    const withdrawals = snapshot.docs.map(doc => doc.data() as WithdrawalRequest);
    return withdrawals.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'withdrawalRequests');
    throw error;
  }
};

export const getAllPendingWithdrawals = async (): Promise<WithdrawalRequest[]> => {
  try {
    const q = query(collection(db, 'withdrawalRequests'), where('status', '==', 'pending'));
    const snapshot = await getDocs(q);
    const withdrawals = snapshot.docs.map(doc => doc.data() as WithdrawalRequest);
    return withdrawals.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'withdrawalRequests');
    throw error;
  }
};

export const approveWithdrawal = async (withdrawalId: string, userId: string, amount: number): Promise<void> => {
  try {
    await runTransaction(db, async (tx) => {
      const wRef = doc(db, 'withdrawalRequests', withdrawalId);
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
    handleFirestoreError(error, OperationType.UPDATE, `withdrawalRequests/${withdrawalId}`);
    throw error;
  }
};

export const rejectWithdrawal = async (withdrawalId: string, adminNote: string): Promise<void> => {
  try {
    await runTransaction(db, async (tx) => {
      const wRef = doc(db, 'withdrawalRequests', withdrawalId);
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
    handleFirestoreError(error, OperationType.UPDATE, `withdrawalRequests/${withdrawalId}`);
    throw error;
  }
};

export const getCategories = async (): Promise<Category[]> => {
  try {
    const q = query(collection(db, 'categories'), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Category);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'categories');
    throw error;
  }
};

export const createCategory = async (name: string, description?: string): Promise<Category> => {
  const id = generateId();
  const newCategory: Category = {
    id,
    name,
    description,
    createdAt: Date.now()
  };
  try {
    await setDoc(doc(db, 'categories', id), newCategory);
    return newCategory;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `categories/${id}`);
    throw error;
  }
};

export const deleteCategory = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'categories', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `categories/${id}`);
    throw error;
  }
};

export const getCourses = async (): Promise<Course[]> => {
  try {
    const q = query(collection(db, 'courses'));
    const snapshot = await getDocs(q);
    const courses = snapshot.docs.map(doc => doc.data() as Course);
    return courses.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'courses');
    throw error;
  }
};

export const getInstructorCourses = async (instructorId: string): Promise<Course[]> => {
  try {
    const q = query(collection(db, 'courses'), where('instructorId', '==', instructorId));
    const snapshot = await getDocs(q);
    const courses = snapshot.docs.map(doc => doc.data() as Course);
    return courses.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'courses');
    throw error;
  }
};

export const createCourse = async (courseData: Omit<Course, 'id' | 'createdAt'>): Promise<Course> => {
  const id = generateId();
  const newCourse: Course = {
    ...courseData,
    id,
    createdAt: Date.now(),
  };
  try {
    await setDoc(doc(db, 'courses', id), newCourse);
    return newCourse;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `courses/${id}`);
    throw error;
  }
};

export const updateCourse = async (courseId: string, updates: Partial<Course>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'courses', courseId), {
      ...updates,
      updatedAt: Date.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `courses/${courseId}`);
    throw error;
  }
};

export const deleteCourse = async (courseId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'courses', courseId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `courses/${courseId}`);
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

export const createCourseModule = async (moduleData: Omit<CourseModule, 'id'>): Promise<CourseModule> => {
  const id = generateId();
  const newModule: CourseModule = { ...moduleData, id };
  try {
    await setDoc(doc(db, 'courseModules', id), newModule);
    return newModule;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `courseModules/${id}`);
    throw error;
  }
};

export const updateCourseModule = async (moduleId: string, updates: Partial<CourseModule>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'courseModules', moduleId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `courseModules/${moduleId}`);
    throw error;
  }
};

export const deleteCourseModule = async (moduleId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'courseModules', moduleId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `courseModules/${moduleId}`);
    throw error;
  }
};

export const createLesson = async (lessonData: Omit<Lesson, 'id'>): Promise<Lesson> => {
  const id = generateId();
  const newLesson: Lesson = { ...lessonData, id };
  try {
    await setDoc(doc(db, 'lessons', id), newLesson);
    return newLesson;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `lessons/${id}`);
    throw error;
  }
};

export const updateLesson = async (lessonId: string, updates: Partial<Lesson>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'lessons', lessonId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `lessons/${lessonId}`);
    throw error;
  }
};

export const deleteLesson = async (lessonId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'lessons', lessonId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `lessons/${lessonId}`);
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

export const getCourseEnrollments = async (courseId: string): Promise<Enrollment[]> => {
  try {
    const q = query(collection(db, 'enrollments'), where('courseId', '==', courseId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Enrollment);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'enrollments');
    throw error;
  }
};

export const removeStudentFromCourse = async (enrollmentId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'enrollments', enrollmentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `enrollments/${enrollmentId}`);
    throw error;
  }
};

export const issueCertificate = async (enrollmentId: string, certificateUrl: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'enrollments', enrollmentId), {
      certificateIssued: true,
      certificateUrl
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `enrollments/${enrollmentId}`);
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

export const getHostTournaments = async (hostId: string): Promise<Tournament[]> => {
  try {
    const q = query(collection(db, 'tournaments'), where('hostId', '==', hostId), orderBy('createdAt', 'desc'));
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

export const deleteTournament = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'tournaments', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `tournaments/${id}`);
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
    
    // Create notification for the user
    await createNotification({
      userId: registrationData.userId,
      title: 'Tournament Registration',
      message: `You have successfully registered for the tournament. Status: ${newRegistration.status}`,
      type: 'system',
      link: `/tournaments/${registrationData.tournamentId}`
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

export const updateRegistrationStatus = async (id: string, status: 'approved' | 'rejected', userId: string, tournamentId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'tournamentRegistrations', id), { status });
    
    await createNotification({
      userId,
      title: 'Tournament Registration Update',
      message: `Your registration has been ${status}.`,
      type: 'system',
      link: `/tournaments/${tournamentId}`
    });
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

// --- CHAT & MESSAGING ---

export const createOrGetChat = async (userId1: string, userId2: string): Promise<Chat> => {
  try {
    // Check if chat exists
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', userId1));
    const snapshot = await getDocs(q);
    
    let existingChat: Chat | null = null;
    snapshot.forEach(doc => {
      const chat = doc.data() as Chat;
      if (chat.participants.includes(userId2) && chat.participants.length === 2) {
        existingChat = chat;
      }
    });

    if (existingChat) return existingChat;

    // Create new chat
    const id = generateId();
    const newChat: Chat = {
      id,
      type: 'direct',
      participants: [userId1, userId2],
      updatedAt: Date.now(),
      unreadCount: { [userId1]: 0, [userId2]: 0 },
      pinnedBy: [],
      archivedBy: []
    };

    await setDoc(doc(db, 'chats', id), newChat);
    return newChat;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'chats');
    throw error;
  }
};

export const createGroupChat = async (creatorId: string, participantIds: string[], name: string, groupIcon?: string): Promise<Chat> => {
  const id = generateId();
  const allParticipants = [creatorId, ...participantIds.filter(pid => pid !== creatorId)];
  const unreadCount: Record<string, number> = {};
  allParticipants.forEach(p => unreadCount[p] = 0);

  const newChat: Chat = {
    id,
    type: 'group',
    name,
    groupIcon,
    adminIds: [creatorId],
    participants: allParticipants,
    updatedAt: Date.now(),
    unreadCount,
    pinnedBy: [],
    archivedBy: []
  };

  try {
    await setDoc(doc(db, 'chats', id), newChat);
    return newChat;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `chats/${id}`);
    throw error;
  }
};

export const deleteMessage = async (messageId: string, type: 'for_me' | 'for_everyone', userId?: string): Promise<void> => {
  try {
    if (type === 'for_everyone') {
      await deleteDoc(doc(db, 'messages', messageId));
    } else if (type === 'for_me' && userId) {
      await updateDoc(doc(db, 'messages', messageId), {
        deletedFor: arrayUnion(userId)
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `messages/${messageId}`);
    throw error;
  }
};

export const subscribeToChats = (userId: string, callback: (chats: Chat[]) => void) => {
  const q = query(collection(db, 'chats'), where('participants', 'array-contains', userId));
  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map(doc => doc.data() as Chat);
    // Sort client-side to avoid requiring a composite index
    chats.sort((a, b) => b.updatedAt - a.updatedAt);
    callback(chats);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'chats');
  });
};

export const sendMessage = async (chatId: string, senderId: string, text: string, type: Message['type'] = 'text', mediaUrl?: string, fileName?: string, fileSize?: number, replyTo?: string): Promise<Message> => {
  const id = generateId();
  const newMessage: Message = {
    id,
    chatId,
    senderId,
    text,
    type,
    mediaUrl,
    fileName,
    fileSize,
    createdAt: Date.now(),
    status: 'sent',
    deletedFor: [],
    replyTo
  };

  try {
    await runTransaction(db, async (transaction) => {
      const chatRef = doc(db, 'chats', chatId);
      const chatDoc = await transaction.get(chatRef);
      if (!chatDoc.exists()) throw new Error("Chat not found");
      
      const chat = chatDoc.data() as Chat;
      const otherParticipants = chat.participants.filter(p => p !== senderId);
      
      const newUnreadCount = { ...chat.unreadCount };
      otherParticipants.forEach(p => {
        newUnreadCount[p] = (newUnreadCount[p] || 0) + 1;
      });

      transaction.set(doc(db, 'messages', id), newMessage);
      transaction.update(chatRef, {
        lastMessage: {
          text: type === 'text' ? text : `Sent a ${type}`,
          senderId,
          createdAt: newMessage.createdAt,
          type
        },
        updatedAt: newMessage.createdAt,
        unreadCount: newUnreadCount
      });
    });
    return newMessage;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `messages/${id}`);
    throw error;
  }
};

export const subscribeToMessages = (chatId: string, callback: (messages: Message[]) => void) => {
  const q = query(collection(db, 'messages'), where('chatId', '==', chatId), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => doc.data() as Message);
    callback(messages);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'messages');
  });
};

export const markMessagesAsRead = async (chatId: string, userId: string) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      [`unreadCount.${userId}`]: 0
    });
    
    // Update message status to read (simplified, usually done via batch)
    // In a real app, you'd query unread messages and update them.
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}`);
  }
};

export const togglePinChat = async (chatId: string, userId: string, isPinned: boolean) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      pinnedBy: isPinned ? arrayRemove(userId) : arrayUnion(userId)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}`);
  }
};

export const toggleArchiveChat = async (chatId: string, userId: string, isArchived: boolean) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      archivedBy: isArchived ? arrayRemove(userId) : arrayUnion(userId)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}`);
  }
};

// --- Reviews ---
export const getCourseReviews = async (courseId: string): Promise<Review[]> => {
  try {
    const q = query(collection(db, 'reviews'), where('courseId', '==', courseId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Review);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'reviews');
    throw error;
  }
};

export const deleteReview = async (reviewId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'reviews', reviewId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `reviews/${reviewId}`);
    throw error;
  }
};

export const createReview = async (reviewData: Omit<Review, 'id' | 'createdAt'>): Promise<Review> => {
  const id = generateId();
  const newReview: Review = {
    ...reviewData,
    id,
    createdAt: Date.now(),
  };
  try {
    await setDoc(doc(db, 'reviews', id), newReview);
    return newReview;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `reviews/${id}`);
    throw error;
  }
};

// --- Advanced Admin & User Management ---

export const logUserActivity = async (uid: string, action: string, details: string, ip?: string, deviceInfo?: string) => {
  const activityId = generateId();
  try {
    const activityDoc = doc(db, 'users', uid, 'activities', activityId);
    await setDoc(activityDoc, {
      id: activityId,
      uid,
      action,
      details,
      ip,
      deviceInfo,
      createdAt: Date.now()
    });
  } catch (error) {
    console.error("Failed to log activity", error);
  }
};

export const getUserActivities = async (uid: string): Promise<UserActivity[]> => {
  try {
    const q = query(collection(db, 'users', uid, 'activities'), orderBy('createdAt', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as UserActivity);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${uid}/activities`);
    return [];
  }
};

export const updateUserAdminStatus = async (uid: string, data: Partial<User>, adminId: string, reason: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'users', uid), data);
    await logUserActivity(uid, 'admin_update', `Admin (${adminId}) updated user status. Reason: ${reason}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    throw error;
  }
};

export const adjustUserWalletAsAdmin = async (uid: string, amount: number, adminId: string, reason: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      walletBalance: increment(amount) // Ensure positive/negative amounts are handled correctly
    });
    
    // Log transaction
    const txId = generateId();
    await setDoc(doc(db, 'transactions', txId), {
      id: txId,
      userId: uid,
      amount: Math.abs(amount),
      type: amount >= 0 ? 'deposit' : 'withdrawal',
      status: 'completed',
      date: Date.now(),
      description: `Admin adjustment: ${reason}`
    });

    await logUserActivity(uid, 'wallet_adjustment', `Admin (${adminId}) adjusted wallet by ${amount}. Reason: ${reason}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    throw error;
  }
};

export const getAllRoleApplications = async (): Promise<RoleApplication[]> => {
  try {
    const q = query(collection(db, 'roleApplications'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as RoleApplication);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'roleApplications');
    return [];
  }
};

export const updateRoleApplicationStatus = async (appId: string, status: 'approved' | 'rejected', adminFeedback: string, adminId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'roleApplications', appId), {
      status,
      adminFeedback,
      updatedAt: Date.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `roleApplications/${appId}`);
    throw error;
  }
};

// --- Moderation System ---

export const getAllReports = async (): Promise<Report[]> => {
  try {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Report);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'reports');
    return [];
  }
};

export const updateReportStatus = async (reportId: string, updates: Partial<Report>, adminId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'reports', reportId), {
      ...updates,
      updatedAt: Date.now()
    });
    
    // Log moderation action
    const logId = generateId();
    await setDoc(doc(db, 'moderationLogs', logId), {
      id: logId,
      adminId,
      action: 'update_report',
      targetType: 'report',
      targetId: reportId,
      details: `Updated report status to ${updates.status || 'unknown'}`,
      createdAt: Date.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `reports/${reportId}`);
    throw error;
  }
};

export const createModerationLog = async (log: Omit<ModerationLog, 'id' | 'createdAt'>): Promise<void> => {
  try {
    const id = generateId();
    await setDoc(doc(db, 'moderationLogs', id), {
      ...log,
      id,
      createdAt: Date.now()
    });
  } catch (error) {
    console.error("Failed to create moderation log:", error);
  }
};

export const getModerationLogs = async (): Promise<ModerationLog[]> => {
  try {
    const q = query(collection(db, 'moderationLogs'), orderBy('createdAt', 'desc'), limit(100));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as ModerationLog);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'moderationLogs');
    return [];
  }
};

export const getAutoModSettings = async (): Promise<AutoModSettings | null> => {
  try {
    const docRef = doc(db, 'settings', 'automod');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as AutoModSettings;
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch automod settings:", error);
    return null;
  }
};

export const updateAutoModSettings = async (settings: Partial<AutoModSettings>, adminId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'settings', 'automod');
    await setDoc(docRef, settings, { merge: true });
    
    await createModerationLog({
      adminId,
      action: 'update_automod',
      targetType: 'system',
      targetId: 'automod',
      details: 'Updated global auto-moderation settings.'
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'settings/automod');
    throw error;
  }
};

export const getPlatformSettings = async (): Promise<PlatformSettings | null> => {
  try {
    const docRef = doc(db, 'settings', 'platform');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as PlatformSettings;
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch platform settings:", error);
    return null;
  }
};

export const updatePlatformSettings = async (settings: Partial<PlatformSettings>, adminId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'settings', 'platform');
    await setDoc(docRef, settings, { merge: true });
    
    // Log setting modification
    await createModerationLog({
      adminId,
      action: 'update_settings',
      targetType: 'system',
      targetId: 'platform_settings',
      details: 'Updated global platform settings.'
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'settings/platform');
    throw error;
  }
};

// --- EBOOKS / PDF SYSTEM ---

export const createBook = async (bookData: Omit<Book, 'id' | 'createdAt' | 'updatedAt' | 'totalViews' | 'totalDownloads' | 'totalSales'>): Promise<Book> => {
  const id = generateId();
  const newBook: Book = {
    ...bookData,
    id,
    totalViews: 0,
    totalDownloads: 0,
    totalSales: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  try {
    await setDoc(doc(db, 'books', id), newBook);
    return newBook;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `books/${id}`);
    throw error;
  }
};

export const updateBook = async (id: string, updates: Partial<Book>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'books', id), { ...updates, updatedAt: Date.now() });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `books/${id}`);
    throw error;
  }
};

export const getBooks = async (statusFilter?: string, sellerId?: string): Promise<Book[]> => {
  try {
    let q = query(collection(db, 'books'), orderBy('createdAt', 'desc'));
    
    // Simplistic handling, in a real app might need composite indexes for both status+seller
    if (sellerId) {
      q = query(collection(db, 'books'), where('sellerId', '==', sellerId), orderBy('createdAt', 'desc'));
    } else if (statusFilter && statusFilter !== 'all') {
      q = query(collection(db, 'books'), where('status', '==', statusFilter), orderBy('createdAt', 'desc'));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Book);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'books');
    throw error;
  }
};

export const getBook = async (id: string): Promise<Book | null> => {
  try {
    const docSnap = await getDoc(doc(db, 'books', id));
    return docSnap.exists() ? (docSnap.data() as Book) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `books/${id}`);
    throw error;
  }
};

export const deleteBook = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'books', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `books/${id}`);
    throw error;
  }
};