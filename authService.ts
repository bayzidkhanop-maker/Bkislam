import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import { User } from './models';
import { ADMIN_EMAIL, ROLES } from './constants';
import { handleFirestoreError, OperationType } from './firestoreErrorHandler';

export const signInWithGoogle = async (): Promise<User> => {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  const firebaseUser = userCredential.user;

  try {
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (userDoc.exists()) {
      return userDoc.data() as User;
    } else {
      // New user via Google
      const email = firebaseUser.email || '';
      const role = email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? ROLES.ADMIN : ROLES.USER;
      
      const newUser: User = {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || 'User',
        email,
        avatarURL: firebaseUser.photoURL || '',
        bio: '',
        createdAt: Date.now(),
        role: role as 'user' | 'admin',
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
      return newUser;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
    throw error;
  }
};

export const signUp = async (email: string, password: string, name: string): Promise<User> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const firebaseUser = userCredential.user;
  
  const role = email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? ROLES.ADMIN : ROLES.USER;
  
  const newUser: User = {
    uid: firebaseUser.uid,
    name,
    email,
    avatarURL: '',
    bio: '',
    createdAt: Date.now(),
    role: role as 'user' | 'admin',
  };

  try {
    await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${firebaseUser.uid}`);
  }
  return newUser;
};

export const signIn = async (email: string, password: string): Promise<User> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  try {
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    if (!userDoc.exists()) {
      throw new Error('User data not found');
    }
    return userDoc.data() as User;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userCredential.user.uid}`);
    throw error;
  }
};

export const signOut = async (): Promise<void> => {
  await firebaseSignOut(auth);
};

export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  let unsubscribeSnapshot: (() => void) | null = null;

  const unsubscribeAuth = firebaseOnAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
      unsubscribeSnapshot = null;
    }

    if (firebaseUser) {
      try {
        unsubscribeSnapshot = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            callback(docSnap.data() as User);
          } else {
            callback(null);
          }
        }, (error) => {
          console.error("Error listening to user document:", error);
          callback(null);
        });
      } catch (error) {
        console.error("Auth state change error:", error);
        callback(null);
      }
    } else {
      callback(null);
    }
  });

  return () => {
    unsubscribeAuth();
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
    }
  };
};
