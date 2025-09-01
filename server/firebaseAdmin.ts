import admin from "firebase-admin";

// Initialize Firebase Admin SDK for server-side operations
// This approach works better for server-side database operations
if (!admin.apps.length) {
  try {
    // Try to initialize with service account (production)
    admin.initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      // For development, we'll rely on the environment being configured
    });
  } catch (error) {
    console.log("Using development Firebase configuration");
    // Fallback for development environment
    admin.initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    });
  }
}

// Get Firestore instance from admin SDK
export const adminDb = admin.firestore();