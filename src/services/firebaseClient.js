/**
 * AI Tally Sync - Firebase Client
 * Initialize Firebase app with project credentials
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Firebase configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBgX18lz-qi22NEGIPzjumHy3FUriVG1l4",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "booksneo-9723d.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "booksneo-9723d",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "booksneo-9723d.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "276565858040",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:276565858040:web:ea594a25d23a7490b58d0d",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-LK794C9WMY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Analytics (only in browser environment)
let analytics = null;
if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
}
export { analytics };

export default app;
