import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let adminDb: any = null;

try {
  // Use Firebase Admin SDK with service account credentials
  let privateKey = process.env.FIREBASE_PRIVATE_KEY!;

  // Handle different possible formats of the private key
  if (privateKey.includes('\\n')) {
    // If the key has escaped newlines, convert them to actual newlines
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  // Remove any surrounding quotes that might have been added during storage
  privateKey = privateKey.replace(/^["'](.*)["']$/, '$1');

  // Ensure the private key has the proper PEM format
  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new Error('Private key is not in proper PEM format. Please ensure it starts with -----BEGIN PRIVATE KEY----- and ends with -----END PRIVATE KEY-----');
  }

  privateKey = privateKey.trim();

  const serviceAccount = {
    project_id: process.env.FIREBASE_PROJECT_ID!,
    client_email: process.env.FIREBASE_CLIENT_EMAIL!,
    private_key: privateKey,
  } as ServiceAccount;

  // Initialize Firebase Admin app
  const app = initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });

  // Get Firestore instance  
  adminDb = getFirestore(app);
  console.log('Firebase Admin initialized successfully');

} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
  console.log('App will continue to run without Firebase functionality');
}

// Export adminDb (will be null if initialization failed)
export { adminDb };