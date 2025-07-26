import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// --- Firebase Configuration ---
// Reads the configuration from environment variables (Replit Secrets).
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

if (!firebaseConfig.apiKey) {
    throw new Error("Firebase config is missing. Make sure your REACT_APP_FIREBASE secrets are set in Replit.");
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
