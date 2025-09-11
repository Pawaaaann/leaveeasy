// Direct Firebase REST API client to bypass JWT signing issues
interface FirebaseRestResponse {
  name: string;
  fields: Record<string, any>;
  createTime: string;
  updateTime: string;
}

interface FirebaseDocument {
  id: string;
  data: Record<string, any>;
  createTime: Date;
  updateTime: Date;
}

class FirebaseRestClient {
  private projectId: string;
  private baseUrl: string;

  constructor(projectId: string) {
    this.projectId = projectId;
    this.baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  }

  // Convert Firebase field value to JavaScript value
  private convertFieldValue(field: any): any {
    if (!field || typeof field !== 'object') return field;
    
    if ('stringValue' in field) return field.stringValue;
    if ('integerValue' in field) return parseInt(field.integerValue);
    if ('doubleValue' in field) return parseFloat(field.doubleValue);
    if ('booleanValue' in field) return field.booleanValue;
    if ('timestampValue' in field) return new Date(field.timestampValue);
    if ('nullValue' in field) return null;
    if ('arrayValue' in field && field.arrayValue.values) {
      return field.arrayValue.values.map((v: any) => this.convertFieldValue(v));
    }
    if ('mapValue' in field && field.mapValue.fields) {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(field.mapValue.fields)) {
        result[key] = this.convertFieldValue(value);
      }
      return result;
    }
    
    return field;
  }

  // Convert JavaScript value to Firebase field value
  private convertToFieldValue(value: any): any {
    if (value === null) return { nullValue: null };
    if (typeof value === 'string') return { stringValue: value };
    if (typeof value === 'number') {
      return Number.isInteger(value) 
        ? { integerValue: value.toString() }
        : { doubleValue: value };
    }
    if (typeof value === 'boolean') return { booleanValue: value };
    if (value instanceof Date) return { timestampValue: value.toISOString() };
    if (Array.isArray(value)) {
      return {
        arrayValue: {
          values: value.map(v => this.convertToFieldValue(v))
        }
      };
    }
    if (typeof value === 'object') {
      const fields: Record<string, any> = {};
      for (const [key, val] of Object.entries(value)) {
        fields[key] = this.convertToFieldValue(val);
      }
      return { mapValue: { fields } };
    }
    
    return { stringValue: String(value) };
  }

  // Convert Firebase document response to clean JavaScript object
  private convertDocument(doc: FirebaseRestResponse): FirebaseDocument {
    const id = doc.name.split('/').pop() || '';
    const data: Record<string, any> = {};
    
    for (const [key, field] of Object.entries(doc.fields || {})) {
      data[key] = this.convertFieldValue(field);
    }

    return {
      id,
      data,
      createTime: new Date(doc.createTime),
      updateTime: new Date(doc.updateTime),
    };
  }

  // Get all documents from a collection
  async getCollection(collectionName: string): Promise<FirebaseDocument[]> {
    try {
      const url = `${this.baseUrl}/${collectionName}`;
      console.log(`Fetching Firebase collection via REST: ${collectionName}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`Firebase REST error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        throw new Error(`Firebase REST API error: ${response.status}`);
      }

      const result = await response.json();
      console.log(`Found ${result.documents?.length || 0} documents in ${collectionName}`);
      
      if (!result.documents) {
        return [];
      }

      return result.documents.map((doc: FirebaseRestResponse) => this.convertDocument(doc));
    } catch (error) {
      console.error(`Error fetching collection ${collectionName}:`, error);
      throw error;
    }
  }

  // Get a specific document by ID
  async getDocument(collectionName: string, documentId: string): Promise<FirebaseDocument | null> {
    try {
      const url = `${this.baseUrl}/${collectionName}/${documentId}`;
      console.log(`Fetching Firebase document via REST: ${collectionName}/${documentId}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        console.error(`Firebase REST error: ${response.status} ${response.statusText}`);
        throw new Error(`Firebase REST API error: ${response.status}`);
      }

      const result = await response.json();
      return this.convertDocument(result);
    } catch (error) {
      console.error(`Error fetching document ${collectionName}/${documentId}:`, error);
      throw error;
    }
  }

  // Create a new document
  async createDocument(collectionName: string, data: Record<string, any>): Promise<FirebaseDocument> {
    try {
      const url = `${this.baseUrl}/${collectionName}`;
      console.log(`Creating Firebase document via REST: ${collectionName}`);
      
      const fields: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        fields[key] = this.convertToFieldValue(value);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
      });

      if (!response.ok) {
        console.error(`Firebase REST error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        throw new Error(`Firebase REST API error: ${response.status}`);
      }

      const result = await response.json();
      return this.convertDocument(result);
    } catch (error) {
      console.error(`Error creating document in ${collectionName}:`, error);
      throw error;
    }
  }

  // Update an existing document
  async updateDocument(collectionName: string, documentId: string, data: Record<string, any>): Promise<FirebaseDocument> {
    try {
      const url = `${this.baseUrl}/${collectionName}/${documentId}`;
      console.log(`Updating Firebase document via REST: ${collectionName}/${documentId}`);
      
      const fields: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        fields[key] = this.convertToFieldValue(value);
      }

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
      });

      if (!response.ok) {
        console.error(`Firebase REST error: ${response.status} ${response.statusText}`);
        throw new Error(`Firebase REST API error: ${response.status}`);
      }

      const result = await response.json();
      return this.convertDocument(result);
    } catch (error) {
      console.error(`Error updating document ${collectionName}/${documentId}:`, error);
      throw error;
    }
  }

  // Delete a document
  async deleteDocument(collectionName: string, documentId: string): Promise<void> {
    try {
      const url = `${this.baseUrl}/${collectionName}/${documentId}`;
      console.log(`Deleting Firebase document via REST: ${collectionName}/${documentId}`);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok && response.status !== 404) {
        console.error(`Firebase REST error: ${response.status} ${response.statusText}`);
        throw new Error(`Firebase REST API error: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error deleting document ${collectionName}/${documentId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const firebaseRestClient = new FirebaseRestClient(process.env.FIREBASE_PROJECT_ID!);