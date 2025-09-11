import { initializeApp, cert, type ServiceAccount, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let adminDb: any = null;

try {
  // Check if Firebase Admin is already initialized
  if (getApps().length > 0) {
    console.log('Firebase Admin already initialized');
    adminDb = getFirestore();
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Use Firebase Admin SDK with service account JSON credentials
    console.log('Initializing Firebase Admin with service account JSON...');
    
    let serviceAccountData;
    try {
      serviceAccountData = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (parseError) {
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT JSON format. Please ensure it contains valid JSON.');
    }
    
    // Validate required fields
    if (!serviceAccountData.project_id || !serviceAccountData.client_email || !serviceAccountData.private_key) {
      throw new Error('Service account JSON missing required fields: project_id, client_email, or private_key');
    }
    
    // Initialize Firebase Admin app
    const app = initializeApp({
      credential: cert(serviceAccountData as ServiceAccount),
      projectId: serviceAccountData.project_id,
    });

    // Get Firestore instance with settings to handle connection issues
    adminDb = getFirestore(app);
    
    // Configure Firestore settings to handle gRPC connectivity issues
    adminDb.settings({
      ignoreUndefinedProperties: true,
      preferRest: true, // Use REST API instead of gRPC to avoid connection issues
    });
    
    console.log('Firebase Admin initialized successfully with service account JSON');
  } else {
    console.log('No Firebase service account credentials found. Admin SDK not available.');
  }

} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
  console.log('App will continue to run without Firebase Admin functionality');
}

// Export adminDb (will be null if initialization failed)
export { adminDb };