// Firebase Admin SDK setup for Vercel serverless functions
const admin = require('firebase-admin');

let firebaseApp = null;

function initializeFirebase() {
  if (firebaseApp) {
    return { db: admin.firestore(), auth: admin.auth() };
  }

  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error.message);
    throw error;
  }

  return { db: admin.firestore(), auth: admin.auth() };
}

module.exports = { initializeFirebase, admin };