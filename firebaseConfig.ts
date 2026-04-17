import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAwezdfd9mGIyQyWmqXn0oUh5SCiV46sFs",
  authDomain: "bkacademy-437c4.firebaseapp.com",
  projectId: "bkacademy-437c4",
  storageBucket: "bkacademy-437c4.firebasestorage.app",
  messagingSenderId: "49163375452",
  appId: "1:49163375452:web:4c02c96f4fbe9b17b2e799",
  measurementId: "G-GWTZ3D8YQ3"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);

// Initialize other Firebase services required by the app
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
