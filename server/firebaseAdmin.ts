// For this demo, we'll use a simple in-memory storage instead of Firebase admin
// In production, you would set up proper Firebase Admin SDK with service account

interface FirestoreEmulator {
  collection(name: string): {
    doc(id: string): {
      get(): Promise<{ exists: boolean; id: string; data(): any }>;
      update(data: any): Promise<void>;
    };
    add(data: any): Promise<{ id: string }>;
    where(field: string, op: string, value: any): {
      limit(count: number): {
        get(): Promise<{ empty: boolean; docs: Array<{ id: string; data(): any }> }>;
      };
      orderBy(field: string, direction: string): {
        get(): Promise<{ docs: Array<{ id: string; data(): any }> }>;
      };
      get(): Promise<{ docs: Array<{ id: string; data(): any }> }>;
    };
    orderBy(field: string, direction: string): {
      get(): Promise<{ docs: Array<{ id: string; data(): any }> }>;
    };
    get(): Promise<{ docs: Array<{ id: string; data(): any }> }>;
  };
}

// Simple in-memory storage for demo purposes
const memoryStore = new Map<string, Map<string, any>>();

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export const adminDb: FirestoreEmulator = {
  collection(collectionName: string) {
    if (!memoryStore.has(collectionName)) {
      memoryStore.set(collectionName, new Map());
    }
    const collection = memoryStore.get(collectionName)!;

    return {
      doc(id: string) {
        return {
          async get() {
            const data = collection.get(id);
            return {
              exists: !!data,
              id,
              data: () => data || {}
            };
          },
          async update(updateData: any) {
            const existing = collection.get(id) || {};
            collection.set(id, { ...existing, ...updateData });
          }
        };
      },
      async add(data: any) {
        const id = generateId();
        collection.set(id, data);
        return { id };
      },
      where(field: string, op: string, value: any) {
        const whereQuery = {
          limit(count: number) {
            return {
              async get() {
                const docs = Array.from(collection.entries())
                  .filter(([_, doc]) => {
                    if (op === "==") return doc[field] === value;
                    if (op === "<=") return doc[field] <= value;
                    return false;
                  })
                  .slice(0, count)
                  .map(([id, data]) => ({ id, data: () => data }));
                return { empty: docs.length === 0, docs };
              }
            };
          },
          orderBy(orderField: string, direction: string) {
            return {
              async get() {
                const docs = Array.from(collection.entries())
                  .filter(([_, doc]) => {
                    if (op === "==") return doc[field] === value;
                    if (op === "<=") return doc[field] <= value;
                    return false;
                  })
                  .sort(([_, a], [__, b]) => {
                    if (direction === "desc") {
                      return b[orderField] > a[orderField] ? 1 : -1;
                    }
                    return a[orderField] > b[orderField] ? 1 : -1;
                  })
                  .map(([id, data]) => ({ id, data: () => data }));
                return { docs };
              }
            };
          },
          async get() {
            const docs = Array.from(collection.entries())
              .filter(([_, doc]) => {
                if (op === "==") return doc[field] === value;
                if (op === "<=") return doc[field] <= value;
                return false;
              })
              .map(([id, data]) => ({ id, data: () => data }));
            return { docs };
          }
        };
        return whereQuery;
      },
      orderBy(field: string, direction: string) {
        return {
          async get() {
            const docs = Array.from(collection.entries())
              .sort(([_, a], [__, b]) => {
                if (direction === "desc") {
                  return b[field] > a[field] ? 1 : -1;
                }
                return a[field] > b[field] ? 1 : -1;
              })
              .map(([id, data]) => ({ id, data: () => data }));
            return { docs };
          }
        };
      },
      async get() {
        const docs = Array.from(collection.entries())
          .map(([id, data]) => ({ id, data: () => data }));
        return { docs };
      }
    };
  }
};