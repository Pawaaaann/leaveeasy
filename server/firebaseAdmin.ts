import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let adminDb: any = null;

try {
  // Use Firebase Admin SDK with service account credentials
  let privateKey = process.env.FIREBASE_PRIVATE_KEY!;
  
  console.log('Attempting to parse Firebase private key...');
  console.log('Project ID:', process.env.FIREBASE_PROJECT_ID);
  console.log('Client Email:', process.env.FIREBASE_CLIENT_EMAIL);

  // Handle different possible formats of the private key
  // First handle escaped newlines \\n
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }
  
  // Handle other backslash escape sequences
  privateKey = privateKey.replace(/\\r/g, '\r');
  privateKey = privateKey.replace(/\\\\/g, '\\');

  // Remove any surrounding quotes that might have been added during storage
  privateKey = privateKey.replace(/^["'](.*)["']$/, '$1');
  
  // Clean up any extra whitespace
  privateKey = privateKey.trim();
  
  // Handle case where the private key has backslashes at line ends 
  // (common when copying from some sources)
  privateKey = privateKey.replace(/\\\s*\n/g, '\n');

  // Ensure the private key has the proper PEM format
  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    console.error('Invalid private key format. Expected format: -----BEGIN PRIVATE KEY-----...-----END PRIVATE KEY-----');
    console.error('Actual key format received:', privateKey.substring(0, 100));
    throw new Error('Private key is not in proper PEM format. Please ensure it starts with -----BEGIN PRIVATE KEY----- and ends with -----END PRIVATE KEY-----');
  }

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