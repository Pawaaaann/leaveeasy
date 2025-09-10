import {
  COLLECTIONS,
  type User,
  type InsertUser,
  type LeaveRequest,
  type InsertLeaveRequest,
  type Approval,
  type InsertApproval,
  type QrCode,
  type InsertQrCode,
  type Notification,
  type InsertNotification,
} from "@shared/schema";
import { adminDb } from "./firebaseAdmin";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit
} from "firebase/firestore";
// Firebase Admin SDK uses different API - methods are called directly on collections and documents

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsersByRole(role: string): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, userData: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  getMentorByDepartment(department: string): Promise<User | undefined>;
  
  // Leave request operations
  getAllLeaveRequests(): Promise<LeaveRequest[]>;
  createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest>;
  getLeaveRequest(id: string): Promise<LeaveRequest | undefined>;
  getLeaveRequestsByStudent(studentId: string): Promise<LeaveRequest[]>;
  getPendingRequestsByApprover(approverId: string, role: string): Promise<LeaveRequest[]>;
  getApprovedRequestsByApprover(approverId: string, role: string): Promise<LeaveRequest[]>;
  updateLeaveRequestStatus(id: string, status: string, currentStep: number): Promise<void>;
  getOverdueReturns(): Promise<LeaveRequest[]>;
  
  // Approval operations
  createApproval(approval: InsertApproval): Promise<Approval>;
  getApprovalsByRequest(requestId: string): Promise<Approval[]>;
  getApprovalsByApprover(approverId: string, role: string): Promise<Approval[]>;
  updateApprovalStatus(id: string, status: string, comments?: string): Promise<void>;
  
  // QR code operations
  createQrCode(qrCode: InsertQrCode): Promise<QrCode>;
  getQrCodeByData(qrData: string): Promise<QrCode | undefined>;
  getQrCodeByRequestId(requestId: string): Promise<QrCode | undefined>;
  markQrCodeAsUsed(id: string, scannedBy: string): Promise<void>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getPendingNotifications(): Promise<Notification[]>;
  markNotificationAsSent(id: string): Promise<void>;
  
  // Data management operations
  clearAllData(): Promise<void>;
}

export class FirebaseStorage implements IStorage {
  // Helper function to convert Firestore timestamps to Date objects
  private convertTimestamps(data: any): any {
    if (!data) return data;
    
    const converted = { ...data };
    ['createdAt', 'updatedAt', 'fromDate', 'toDate', 'approvedAt', 'scannedAt', 'sentAt', 'expiresAt'].forEach(field => {
      if (converted[field] && converted[field].toDate) {
        converted[field] = converted[field].toDate();
      }
    });
    
    return converted;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    try {
      const userDoc = await adminDb.collection(COLLECTIONS.USERS).doc(id).get();
      
      if (userDoc.exists) {
        return this.convertTimestamps({ id: userDoc.id, ...userDoc.data() }) as User;
      }
      return undefined;
    } catch (error) {
      console.error("Error getting user:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const querySnapshot = await adminDb.collection(COLLECTIONS.USERS)
        .where("username", "==", username)
        .limit(1)
        .get();
      
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        return this.convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as User;
      }
      return undefined;
    } catch (error) {
      console.error("Error getting user by username:", error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const querySnapshot = await adminDb.collection(COLLECTIONS.USERS)
        .where("email", "==", email)
        .limit(1)
        .get();
      
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        return this.convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as User;
      }
      return undefined;
    } catch (error) {
      console.error("Error getting user by email:", error);
      return undefined;
    }
  }

  async createUser(userData: InsertUser): Promise<User> {
    try {
      const now = new Date();
      const userWithTimestamps = {
        ...userData,
        createdAt: now,
        updatedAt: now,
      };
      
      const docRef = await adminDb.collection(COLLECTIONS.USERS).add(userWithTimestamps);
      return { id: docRef.id, ...userWithTimestamps } as User;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async getUsersByRole(role: string): Promise<User[]> {
    try {
      const querySnapshot = await adminDb.collection(COLLECTIONS.USERS)
        .where("role", "==", role)
        .get();
      
      return querySnapshot.docs.map((docSnap: any) => 
        this.convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as User
      );
    } catch (error) {
      console.error("Error getting users by role:", error);
      return [];
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      console.log("Attempting to fetch all users from Firebase...");
      const querySnapshot = await adminDb.collection(COLLECTIONS.USERS).get();
      console.log("Successfully fetched users, count:", querySnapshot.docs.length);
      
      const users = querySnapshot.docs.map((docSnap: any) => 
        this.convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as User
      );
      console.log("Processed users:", users.length);
      return users;
    } catch (error) {
      console.error("Error getting all users:", error);
      return [];
    }
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    try {
      const updateData = {
        ...userData,
        updatedAt: new Date(),
      };
      
      await adminDb.collection(COLLECTIONS.USERS).doc(id).update(updateData);
      
      // Get updated user
      const updatedUser = await this.getUser(id);
      return updatedUser!;
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  async getMentorByDepartment(department: string): Promise<User | undefined> {
    try {
      const querySnapshot = await adminDb.collection(COLLECTIONS.USERS)
        .where("role", "==", "mentor")
        .where("department", "==", department)
        .limit(1)
        .get();
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return this.convertTimestamps({ id: doc.id, ...doc.data() }) as User;
      }
      return undefined;
    } catch (error) {
      console.error("Error getting mentor by department:", error);
      return undefined;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      // First check if user exists
      const userDoc = await adminDb.collection(COLLECTIONS.USERS).doc(id).get();
      if (!userDoc.exists) {
        throw new Error(`User with ID ${id} not found`);
      }

      // Delete the user document
      await adminDb.collection(COLLECTIONS.USERS).doc(id).delete();
      console.log(`Successfully deleted user with ID: ${id}`);
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  // Leave request operations
  async createLeaveRequest(requestData: InsertLeaveRequest): Promise<LeaveRequest> {
    try {
      const now = new Date();
      const requestWithTimestamps = {
        ...requestData,
        status: "pending",
        currentApprovalStep: 1,
        createdAt: now,
        updatedAt: now,
      };
      
      const docRef = await adminDb.collection(COLLECTIONS.LEAVE_REQUESTS).add(requestWithTimestamps);
      return { id: docRef.id, ...requestWithTimestamps } as LeaveRequest;
    } catch (error) {
      console.error("Error creating leave request:", error);
      throw error;
    }
  }

  async getLeaveRequest(id: string): Promise<LeaveRequest | undefined> {
    try {
      const requestSnap = await adminDb.collection(COLLECTIONS.LEAVE_REQUESTS).doc(id).get();
      
      if (requestSnap.exists) {
        return this.convertTimestamps({ id: requestSnap.id, ...requestSnap.data() }) as LeaveRequest;
      }
      return undefined;
    } catch (error) {
      console.error("Error getting leave request:", error);
      return undefined;
    }
  }

  async getLeaveRequestsByStudent(studentId: string): Promise<LeaveRequest[]> {
    try {
      const querySnapshot = await adminDb.collection(COLLECTIONS.LEAVE_REQUESTS)
        .where("studentId", "==", studentId)
        .orderBy("createdAt", "desc")
        .get();
      
      return querySnapshot.docs.map((docSnap: any) => 
        this.convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as LeaveRequest
      );
    } catch (error) {
      console.error("Error getting leave requests by student:", error);
      return [];
    }
  }

  async getAllLeaveRequests(): Promise<LeaveRequest[]> {
    try {
      const querySnapshot = await adminDb.collection(COLLECTIONS.LEAVE_REQUESTS)
        .orderBy("createdAt", "desc")
        .get();
      
      return querySnapshot.docs.map((docSnap: any) => 
        this.convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as LeaveRequest
      );
    } catch (error) {
      console.error("Error getting all leave requests:", error);
      return [];
    }
  }

  async getPendingRequestsByApprover(approverId: string, role: string): Promise<LeaveRequest[]> {
    try {
      const roleStepMap = {
        mentor: 1,
        hod: 3,
        principal: 4,
        warden: 5,
      };
      
      const step = roleStepMap[role as keyof typeof roleStepMap];
      if (!step) return [];

      // For mentors and HODs, filter by department
      if (role === "mentor" || role === "hod") {
        const approver = await this.getUser(approverId);
        if (approver && approver.department) {
          // Get students from the same department
          const studentsSnapshot = await adminDb.collection(COLLECTIONS.USERS)
            .where("role", "==", "student")
            .where("department", "==", approver.department)
            .get();
          const studentIds = studentsSnapshot.docs.map((doc: any) => doc.id);
          
          if (studentIds.length === 0) return [];
          
          // Filter requests by students in this department
          const departmentRequests: LeaveRequest[] = [];
          for (const studentId of studentIds) {
            const studentRequestsSnapshot = await adminDb.collection(COLLECTIONS.LEAVE_REQUESTS)
              .where("currentApprovalStep", "==", step)
              .where("studentId", "==", studentId)
              .orderBy("createdAt", "desc")
              .get();
            departmentRequests.push(
              ...studentRequestsSnapshot.docs.map((docSnap: any) => 
                this.convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as LeaveRequest
              )
            );
          }
          return departmentRequests.sort((a, b) => 
            (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
          );
        }
      }
      
      const querySnapshot = await adminDb.collection(COLLECTIONS.LEAVE_REQUESTS)
        .where("currentApprovalStep", "==", step)
        .orderBy("createdAt", "desc")
        .get();
      
      return querySnapshot.docs.map((docSnap: any) => 
        this.convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as LeaveRequest
      );
    } catch (error) {
      console.error("Error getting pending requests by approver:", error);
      return [];
    }
  }

  async updateLeaveRequestStatus(id: string, status: string, currentStep: number): Promise<void> {
    try {
      await adminDb.collection(COLLECTIONS.LEAVE_REQUESTS).doc(id).update({
        status,
        currentApprovalStep: currentStep,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error("Error updating leave request status:", error);
      throw error;
    }
  }

  async getOverdueReturns(): Promise<LeaveRequest[]> {
    try {
      const today = new Date();
      const requestsRef = collection(adminDb, COLLECTIONS.LEAVE_REQUESTS);
      const q = query(
        requestsRef,
        where("status", "==", "approved"),
        where("toDate", "<=", today)
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(docSnap => 
        this.convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as LeaveRequest
      );
    } catch (error) {
      console.error("Error getting overdue returns:", error);
      return [];
    }
  }

  // Approval operations
  async createApproval(approvalData: InsertApproval): Promise<Approval> {
    try {
      const approvalsRef = collection(adminDb, COLLECTIONS.APPROVALS);
      const now = new Date();
      
      const approvalWithTimestamps = {
        ...approvalData,
        createdAt: now,
      };
      
      const docRef = await addDoc(approvalsRef, approvalWithTimestamps);
      return { id: docRef.id, ...approvalWithTimestamps } as Approval;
    } catch (error) {
      console.error("Error creating approval:", error);
      throw error;
    }
  }

  async getApprovalsByRequest(requestId: string): Promise<Approval[]> {
    try {
      const approvalsRef = collection(adminDb, COLLECTIONS.APPROVALS);
      const q = query(
        approvalsRef,
        where("leaveRequestId", "==", requestId),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(docSnap => 
        this.convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as Approval
      );
    } catch (error) {
      console.error("Error getting approvals by request:", error);
      return [];
    }
  }

  async getApprovalsByApprover(approverId: string, role: string): Promise<Approval[]> {
    try {
      const approvalsRef = collection(adminDb, COLLECTIONS.APPROVALS);
      const q = query(
        approvalsRef,
        where("approverId", "==", approverId),
        where("approverRole", "==", role),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(docSnap => 
        this.convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as Approval
      );
    } catch (error) {
      console.error("Error getting approvals by approver:", error);
      return [];
    }
  }

  async getApprovedRequestsByApprover(approverId: string, role: string): Promise<LeaveRequest[]> {
    try {
      // Get all approvals by this approver that were approved
      const approvals = await this.getApprovalsByApprover(approverId, role);
      const approvedApprovals = approvals.filter(approval => approval.status === "approved");
      
      // Get unique leave request IDs
      const requestIds = Array.from(new Set(approvedApprovals.map(approval => approval.leaveRequestId)));
      
      // Fetch the actual leave requests
      const approvedRequests: LeaveRequest[] = [];
      for (const requestId of requestIds) {
        const request = await this.getLeaveRequest(requestId);
        if (request) {
          approvedRequests.push(request);
        }
      }
      
      // Sort by creation date (newest first)
      return approvedRequests.sort((a, b) => 
        (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
      );
    } catch (error) {
      console.error("Error getting approved requests by approver:", error);
      return [];
    }
  }

  async updateApprovalStatus(id: string, status: string, comments?: string): Promise<void> {
    try {
      const approvalRef = doc(adminDb, COLLECTIONS.APPROVALS, id);
      const updateData: any = {
        status,
        comments,
      };
      
      if (status === "approved") {
        updateData.approvedAt = new Date();
      }
      
      await updateDoc(approvalRef, updateData);
    } catch (error) {
      console.error("Error updating approval status:", error);
      throw error;
    }
  }

  // QR code operations
  async createQrCode(qrCodeData: InsertQrCode): Promise<QrCode> {
    try {
      const qrCodesRef = collection(adminDb, COLLECTIONS.QR_CODES);
      const now = new Date();
      const qrCodeWithTimestamps = {
        ...qrCodeData,
        isUsed: false,
        createdAt: now,
      };
      
      const docRef = await addDoc(qrCodesRef, qrCodeWithTimestamps);
      return { id: docRef.id, ...qrCodeWithTimestamps } as QrCode;
    } catch (error) {
      console.error("Error creating QR code:", error);
      throw error;
    }
  }

  async getQrCodeByData(qrData: string): Promise<QrCode | undefined> {
    try {
      const qrCodesRef = collection(adminDb, COLLECTIONS.QR_CODES);
      const q = query(qrCodesRef, where("qrData", "==", qrData), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        return this.convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as QrCode;
      }
      return undefined;
    } catch (error) {
      console.error("Error getting QR code by data:", error);
      return undefined;
    }
  }

  async getQrCodeByRequestId(requestId: string): Promise<QrCode | undefined> {
    try {
      const qrCodesRef = collection(adminDb, COLLECTIONS.QR_CODES);
      const q = query(qrCodesRef, where("leaveRequestId", "==", requestId), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        return this.convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as QrCode;
      }
      return undefined;
    } catch (error) {
      console.error("Error getting QR code by request ID:", error);
      return undefined;
    }
  }

  async markQrCodeAsUsed(id: string, scannedBy: string): Promise<void> {
    try {
      const qrCodeRef = doc(adminDb, COLLECTIONS.QR_CODES, id);
      await updateDoc(qrCodeRef, {
        isUsed: true,
        scannedAt: new Date(),
        scannedBy,
      });
    } catch (error) {
      console.error("Error marking QR code as used:", error);
      throw error;
    }
  }

  // Notification operations
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    try {
      const notificationsRef = collection(adminDb, COLLECTIONS.NOTIFICATIONS);
      const now = new Date();
      const notificationWithTimestamps = {
        ...notificationData,
        sent: false,
        createdAt: now,
      };
      
      const docRef = await addDoc(notificationsRef, notificationWithTimestamps);
      return { id: docRef.id, ...notificationWithTimestamps } as Notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  async getPendingNotifications(): Promise<Notification[]> {
    try {
      const notificationsRef = collection(adminDb, COLLECTIONS.NOTIFICATIONS);
      const q = query(notificationsRef, where("sent", "==", false));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(docSnap => 
        this.convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as Notification
      );
    } catch (error) {
      console.error("Error getting pending notifications:", error);
      return [];
    }
  }

  async markNotificationAsSent(id: string): Promise<void> {
    try {
      const notificationRef = doc(adminDb, COLLECTIONS.NOTIFICATIONS, id);
      await updateDoc(notificationRef, {
        sent: true,
        sentAt: new Date(),
      });
    } catch (error) {
      console.error("Error marking notification as sent:", error);
      throw error;
    }
  }

  async clearAllData(): Promise<void> {
    try {
      console.log("Starting to clear all Firebase data...");
      
      // Clear all collections
      const collections = [
        COLLECTIONS.LEAVE_REQUESTS,
        COLLECTIONS.APPROVALS,
        COLLECTIONS.NOTIFICATIONS,
        COLLECTIONS.QR_CODES
      ];

      for (const collectionName of collections) {
        const collectionRef = collection(adminDb, collectionName);
        const snapshot = await getDocs(collectionRef);
        
        const deletePromises = snapshot.docs.map((document) => {
          return deleteDoc(doc(adminDb, collectionName, document.id));
        });
        
        await Promise.all(deletePromises);
        console.log(`Cleared ${snapshot.docs.length} documents from ${collectionName}`);
      }
      
      console.log("All Firebase data cleared successfully!");
    } catch (error) {
      console.error("Error clearing Firebase data:", error);
      throw error;
    }
  }
}

// Create and initialize storage instance - Firebase only
const createStorage = (): IStorage => {
  if (!adminDb) {
    console.error('Firebase Admin is not properly configured. Please ensure Firebase credentials are set correctly.');
    console.log('Temporarily falling back to temporary storage until Firebase is configured...');
    // Temporary fallback until Firebase is properly configured
    throw new Error('Firebase configuration required. Please set up Firebase credentials properly.');
  }
  console.log("Using Firebase storage");
  return new FirebaseStorage();
};

// Initialize storage - Firebase only (no fallback)
export const storage: IStorage = createStorage();