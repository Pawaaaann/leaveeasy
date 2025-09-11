// Firebase Web SDK client for server-side use to bypass Admin SDK JWT signing issues
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit } from 'firebase/firestore';

// Firebase config from environment variables - minimal config to avoid auth issues
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID!,
  // Skip auth configuration to avoid API key issues
};

// Initialize Firebase app (singleton pattern)
let app: any = null;
let db: any = null;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
  console.log('Firebase Web SDK initialized without authentication');
} catch (error) {
  console.error('Failed to initialize Firebase Web SDK:', error);
}

// Firebase Web SDK client class
export class FirebaseWebClient {
  async getCollection(collectionName: string): Promise<any[]> {
    if (!db) {
      throw new Error('Firebase Web SDK not initialized');
    }

    try {
      console.log(`Fetching Firebase collection via Web SDK: ${collectionName}`);
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      
      console.log(`Found ${snapshot.docs.length} documents in ${collectionName} via Web SDK`);
      
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      return documents;
    } catch (error) {
      console.error(`Error fetching collection ${collectionName} via Web SDK:`, error);
      throw error;
    }
  }

  async getDocument(collectionName: string, documentId: string): Promise<any | null> {
    if (!db) {
      throw new Error('Firebase Web SDK not initialized');
    }

    try {
      console.log(`Fetching Firebase document via Web SDK: ${collectionName}/${documentId}`);
      const docRef = doc(db, collectionName, documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error(`Error fetching document ${collectionName}/${documentId} via Web SDK:`, error);
      throw error;
    }
  }

  async createDocument(collectionName: string, data: Record<string, any>): Promise<any> {
    if (!db) {
      throw new Error('Firebase Web SDK not initialized');
    }

    try {
      console.log(`Creating Firebase document via Web SDK: ${collectionName}`);
      const collectionRef = collection(db, collectionName);
      const docRef = await addDoc(collectionRef, data);
      
      return {
        id: docRef.id,
        ...data,
      };
    } catch (error) {
      console.error(`Error creating document in ${collectionName} via Web SDK:`, error);
      throw error;
    }
  }

  async updateDocument(collectionName: string, documentId: string, data: Record<string, any>): Promise<any> {
    if (!db) {
      throw new Error('Firebase Web SDK not initialized');
    }

    try {
      console.log(`Updating Firebase document via Web SDK: ${collectionName}/${documentId}`);
      const docRef = doc(db, collectionName, documentId);
      await updateDoc(docRef, data);
      
      // Return updated document
      const updatedDoc = await this.getDocument(collectionName, documentId);
      return updatedDoc;
    } catch (error) {
      console.error(`Error updating document ${collectionName}/${documentId} via Web SDK:`, error);
      throw error;
    }
  }

  async deleteDocument(collectionName: string, documentId: string): Promise<void> {
    if (!db) {
      throw new Error('Firebase Web SDK not initialized');
    }

    try {
      console.log(`Deleting Firebase document via Web SDK: ${collectionName}/${documentId}`);
      const docRef = doc(db, collectionName, documentId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting document ${collectionName}/${documentId} via Web SDK:`, error);
      throw error;
    }
  }

  async queryCollection(collectionName: string, filters: any[] = []): Promise<any[]> {
    if (!db) {
      throw new Error('Firebase Web SDK not initialized');
    }

    try {
      console.log(`Querying Firebase collection via Web SDK: ${collectionName}`);
      const collectionRef = collection(db, collectionName);
      
      let q = query(collectionRef);
      
      // Apply filters if provided
      for (const filter of filters) {
        if (filter.type === 'where') {
          q = query(q, where(filter.field, filter.operator, filter.value));
        } else if (filter.type === 'orderBy') {
          q = query(q, orderBy(filter.field, filter.direction || 'asc'));
        } else if (filter.type === 'limit') {
          q = query(q, limit(filter.count));
        }
      }
      
      const snapshot = await getDocs(q);
      
      console.log(`Found ${snapshot.docs.length} documents via Web SDK query`);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error(`Error querying collection ${collectionName} via Web SDK:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const firebaseWebClient = new FirebaseWebClient();