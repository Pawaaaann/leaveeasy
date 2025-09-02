import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Use client SDK for development environment since we don't have service account credentials
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: `${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${process.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase app for server use with client SDK
const app = initializeApp(firebaseConfig, "server");

// Get Firestore instance  
export const adminDb = getFirestore(app);