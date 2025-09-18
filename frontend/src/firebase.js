import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// --- Firebase Configuration ---
// Reads the configuration from a single FIREBASE_CONFIG environment variable
let firebaseConfig;

try {
  // Parse the JSON string from FIREBASE_CONFIG environment variable
  firebaseConfig = JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG || '{}');
} catch (error) {
  console.error('Error parsing FIREBASE_CONFIG:', error);
  firebaseConfig = {};
}

// Validate required Firebase config fields
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingFields = requiredFields.filter(field => !firebaseConfig[field]);

if (missingFields.length > 0) {
  throw new Error(`Firebase config is missing required fields: ${missingFields.join(', ')}. Make sure your REACT_APP_FIREBASE_CONFIG environment variable is properly set with a valid JSON object.`);
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
