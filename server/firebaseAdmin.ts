import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Use Firebase Admin SDK with service account credentials
const privateKey = process.env.FIREBASE_PRIVATE_KEY!
  .replace(/\\n/g, '\n')  // Replace escaped newlines
  .replace(/"/g, '')      // Remove quotes if any
  .trim();               // Remove whitespace

const serviceAccount: ServiceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID!,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
  privateKey: privateKey,
};

// Initialize Firebase Admin app
const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID,
});

// Get Firestore instance  
export const adminDb = getFirestore(app);