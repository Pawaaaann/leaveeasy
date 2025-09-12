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
import { firebaseRestClient } from "./firebaseRestClient";
import { firebaseWebClient } from "./firebaseClient";
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
  // Helper function to convert Firestore timestamps and references to proper JavaScript types
  private convertTimestamps(data: any): any {
    if (!data) return data;
    
    const converted = { ...data };
    
    // Convert all fields recursively
    Object.keys(converted).forEach(key => {
      const value = converted[key];
      
      // Convert Firestore Timestamps to Date objects
      if (value && typeof value === 'object' && value.toDate) {
        converted[key] = value.toDate();
      }
      // Convert Firestore DocumentReferences to their ID strings
      else if (value && typeof value === 'object' && value._firestore && value._path) {
        converted[key] = value.id || value._path.segments[value._path.segments.length - 1];
      }
      // Handle arrays that might contain references
      else if (Array.isArray(value)) {
        converted[key] = value.map(item => {
          if (item && typeof item === 'object' && item._firestore && item._path) {
            return item.id || item._path.segments[item._path.segments.length - 1];
          }
          return item;
        });
      }
      // Handle nested objects
      else if (value && typeof value === 'object' && !Array.isArray(value)) {
        converted[key] = this.convertTimestamps(value);
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
    const now = new Date();
    const userWithTimestamps = {
      ...userData,
      createdAt: now,
      updatedAt: now,
    };

    try {
      console.log("Creating user via Web SDK...");
      const doc = await firebaseWebClient.createDocument(COLLECTIONS.USERS, userWithTimestamps);
      return { id: doc.id, ...doc } as User;
    } catch (error) {
      console.error("Error creating user via Web SDK:", error);
      
      // Fallback to REST API
      try {
        console.log("Falling back to REST API for user creation...");
        const doc = await firebaseRestClient.createDocument(COLLECTIONS.USERS, userWithTimestamps);
        return { id: doc.id, ...doc.data } as User;
      } catch (restError) {
        console.error("REST API fallback also failed:", restError);
      }
      
      // Final fallback to Admin SDK if available
      if (adminDb) {
        try {
          console.log("Falling back to Admin SDK for user creation...");
          const docRef = await adminDb.collection(COLLECTIONS.USERS).add(userWithTimestamps);
          return { id: docRef.id, ...userWithTimestamps } as User;
        } catch (adminError) {
          console.error("Admin SDK fallback also failed:", adminError);
        }
      }
      
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
      console.log("Attempting to fetch all users from Firebase via Web SDK...");
      const documents = await firebaseWebClient.getCollection(COLLECTIONS.USERS);
      console.log("Successfully fetched users via Web SDK, count:", documents.length);
      
      const users = documents.map((doc) => ({
        id: doc.id,
        ...doc,
        createdAt: doc.createdAt instanceof Date ? doc.createdAt : (doc.createdAt?.toDate?.() || new Date()),
        updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt : (doc.updatedAt?.toDate?.() || new Date()),
      })) as User[];
      
      console.log("Processed users via Web SDK:", users.length);
      return users;
    } catch (error) {
      console.error("Error getting all users via Web SDK:", error);
      
      // Fallback to REST API
      try {
        console.log("Attempting fallback to REST API...");
        const documents = await firebaseRestClient.getCollection(COLLECTIONS.USERS);
        const users = documents.map((doc) => ({
          id: doc.id,
          ...doc.data,
          createdAt: doc.data.createdAt || new Date(),
          updatedAt: doc.data.updatedAt || new Date(),
        })) as User[];
        console.log(`REST API fallback successful - fetched ${users.length} users`);
        return users;
      } catch (restError) {
        console.error("REST API fallback also failed:", restError);
      }
      
      // Final fallback to Admin SDK
      if (adminDb) {
        try {
          console.log("Attempting final fallback to Firebase Admin SDK...");
          const querySnapshot = await adminDb.collection(COLLECTIONS.USERS).get();
          const users = querySnapshot.docs.map((docSnap: any) => 
            this.convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as User
          );
          console.log(`Admin SDK fallback successful - fetched ${users.length} users`);
          return users;
        } catch (adminError) {
          console.error("Admin SDK fallback also failed:", adminError);
        }
      }
      
      console.log("All Firebase access methods failed, returning empty array");
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

// In-memory storage implementation as fallback
class MemoryStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private leaveRequests: Map<string, LeaveRequest> = new Map();
  private approvals: Map<string, Approval> = new Map();
  private qrCodes: Map<string, QrCode> = new Map();
  private notifications: Map<string, Notification> = new Map();

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.username === username) return user;
    }
    return undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.email === email) return user;
    }
    return undefined;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.generateId();
    const now = new Date();
    const user: User = {
      id,
      ...userData,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, user);
    console.log(`Created user in memory storage: ${user.username} (${user.role})`);
    return user;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === role);
  }

  async getAllUsers(): Promise<User[]> {
    const users = Array.from(this.users.values());
    console.log(`Memory storage: returning ${users.length} users`);
    return users;
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    const existingUser = this.users.get(id);
    if (!existingUser) throw new Error('User not found');
    
    const updatedUser: User = {
      ...existingUser,
      ...userData,
      id,
      updatedAt: new Date(),
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    this.users.delete(id);
  }

  async getMentorByDepartment(department: string): Promise<User | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.role === 'mentor' && user.department === department) return user;
    }
    return undefined;
  }

  // Leave request operations - basic implementation
  async getAllLeaveRequests(): Promise<LeaveRequest[]> {
    return Array.from(this.leaveRequests.values());
  }

  async createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest> {
    const id = this.generateId();
    const now = new Date();
    const leaveRequest: LeaveRequest = {
      id,
      ...request,
      status: 'pending',
      currentApprovalStep: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.leaveRequests.set(id, leaveRequest);
    return leaveRequest;
  }

  async getLeaveRequest(id: string): Promise<LeaveRequest | undefined> {
    return this.leaveRequests.get(id);
  }

  async getLeaveRequestsByStudent(studentId: string): Promise<LeaveRequest[]> {
    return Array.from(this.leaveRequests.values()).filter(req => req.studentId === studentId);
  }

  async getPendingRequestsByApprover(approverId: string, role: string): Promise<LeaveRequest[]> {
    return Array.from(this.leaveRequests.values()).filter(req => 
      req.status === 'pending'
    );
  }

  async getApprovedRequestsByApprover(approverId: string, role: string): Promise<LeaveRequest[]> {
    return Array.from(this.leaveRequests.values()).filter(req => 
      req.status === 'approved'
    );
  }

  async updateLeaveRequestStatus(id: string, status: string, currentStep: number): Promise<void> {
    const request = this.leaveRequests.get(id);
    if (request) {
      request.status = status as any;
      request.currentApprovalStep = currentStep;
      request.updatedAt = new Date();
    }
  }

  async getOverdueReturns(): Promise<LeaveRequest[]> {
    const now = new Date();
    return Array.from(this.leaveRequests.values()).filter(req => 
      req.status === 'approved' && req.toDate && req.toDate < now
    );
  }

  // Approval operations - basic implementation
  async createApproval(approval: InsertApproval): Promise<Approval> {
    const id = this.generateId();
    const now = new Date();
    const newApproval: Approval = {
      id,
      ...approval,
      createdAt: now,
    };
    this.approvals.set(id, newApproval);
    return newApproval;
  }

  async getApprovalsByRequest(requestId: string): Promise<Approval[]> {
    return Array.from(this.approvals.values()).filter(approval => approval.leaveRequestId === requestId);
  }

  async getApprovalsByApprover(approverId: string, role: string): Promise<Approval[]> {
    return Array.from(this.approvals.values()).filter(approval => 
      approval.approverId === approverId && approval.approverRole === role
    );
  }

  async updateApprovalStatus(id: string, status: string, comments?: string): Promise<void> {
    const approval = this.approvals.get(id);
    if (approval) {
      approval.status = status as any;
      if (comments) approval.comments = comments;
    }
  }

  // QR code operations - basic implementation
  async createQrCode(qrCode: InsertQrCode): Promise<QrCode> {
    const id = this.generateId();
    const now = new Date();
    const newQrCode: QrCode = {
      id,
      ...qrCode,
      isUsed: false,
      createdAt: now,
    };
    this.qrCodes.set(id, newQrCode);
    return newQrCode;
  }

  async getQrCodeByData(qrData: string): Promise<QrCode | undefined> {
    for (const qrCode of Array.from(this.qrCodes.values())) {
      if (qrCode.qrData === qrData) return qrCode;
    }
    return undefined;
  }

  async getQrCodeByRequestId(requestId: string): Promise<QrCode | undefined> {
    for (const qrCode of Array.from(this.qrCodes.values())) {
      if (qrCode.leaveRequestId === requestId) return qrCode;
    }
    return undefined;
  }

  async markQrCodeAsUsed(id: string, scannedBy: string): Promise<void> {
    const qrCode = this.qrCodes.get(id);
    if (qrCode) {
      qrCode.isUsed = true;
      qrCode.scannedBy = scannedBy;
      qrCode.scannedAt = new Date();
    }
  }

  // Notification operations - basic implementation
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = this.generateId();
    const now = new Date();
    const newNotification: Notification = {
      id,
      ...notification,
      sent: false,
      createdAt: now,
    };
    this.notifications.set(id, newNotification);
    return newNotification;
  }

  async getPendingNotifications(): Promise<Notification[]> {
    return Array.from(this.notifications.values()).filter(notif => !notif.sent);
  }

  async markNotificationAsSent(id: string): Promise<void> {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.sent = true;
      notification.sentAt = new Date();
    }
  }

  async clearAllData(): Promise<void> {
    this.users.clear();
    this.leaveRequests.clear();
    this.approvals.clear();
    this.qrCodes.clear();
    this.notifications.clear();
  }
}

// Hybrid storage wrapper that tries Firebase first, falls back to memory
class HybridStorage implements IStorage {
  private firebaseStorage: FirebaseStorage;
  private memoryStorage: MemoryStorage;
  private useMemoryFallback = false;

  constructor() {
    this.firebaseStorage = new FirebaseStorage();
    this.memoryStorage = new MemoryStorage();
  }

  private async tryFirebaseOrFallback<T>(
    firebaseOp: () => Promise<T>,
    memoryOp: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    if (this.useMemoryFallback) {
      return memoryOp();
    }

    try {
      const result = await firebaseOp();
      return result;
    } catch (error) {
      if (error instanceof Error && (
        error.message.includes('DECODER routines::unsupported') ||
        error.message.includes('Getting metadata from plugin failed') ||
        error.message.includes('UNKNOWN') ||
        error.message.includes('gRPC') ||
        error.message.includes('ERR_OSSL_UNSUPPORTED')
      )) {
        console.log(`Firebase error detected for ${operationName}, switching to memory storage`);
        this.useMemoryFallback = true;
        return memoryOp();
      }
      throw error;
    }
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.tryFirebaseOrFallback(
      () => this.firebaseStorage.getUser(id),
      () => this.memoryStorage.getUser(id),
      'getUser'
    );
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.tryFirebaseOrFallback(
      () => this.firebaseStorage.getUserByUsername(username),
      () => this.memoryStorage.getUserByUsername(username),
      'getUserByUsername'
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.tryFirebaseOrFallback(
      () => this.firebaseStorage.getUserByEmail(email),
      () => this.memoryStorage.getUserByEmail(email),
      'getUserByEmail'
    );
  }

  async createUser(userData: InsertUser): Promise<User> {
    return this.tryFirebaseOrFallback(
      () => this.firebaseStorage.createUser(userData),
      () => this.memoryStorage.createUser(userData),
      'createUser'
    );
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return this.tryFirebaseOrFallback(
      () => this.firebaseStorage.getUsersByRole(role),
      () => this.memoryStorage.getUsersByRole(role),
      'getUsersByRole'
    );
  }

  async getAllUsers(): Promise<User[]> {
    return this.tryFirebaseOrFallback(
      () => this.firebaseStorage.getAllUsers(),
      () => this.memoryStorage.getAllUsers(),
      'getAllUsers'
    );
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    return this.tryFirebaseOrFallback(
      () => this.firebaseStorage.updateUser(id, userData),
      () => this.memoryStorage.updateUser(id, userData),
      'updateUser'
    );
  }

  async deleteUser(id: string): Promise<void> {
    return this.tryFirebaseOrFallback(
      () => this.firebaseStorage.deleteUser(id),
      () => this.memoryStorage.deleteUser(id),
      'deleteUser'
    );
  }

  async getMentorByDepartment(department: string): Promise<User | undefined> {
    return this.tryFirebaseOrFallback(
      () => this.firebaseStorage.getMentorByDepartment(department),
      () => this.memoryStorage.getMentorByDepartment(department),
      'getMentorByDepartment'
    );
  }

  // Leave request operations
  async getAllLeaveRequests(): Promise<LeaveRequest[]> {
    return this.tryFirebaseOrFallback(
      () => this.firebaseStorage.getAllLeaveRequests(),
      () => this.memoryStorage.getAllLeaveRequests(),
      'getAllLeaveRequests'
    );
  }

  async createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest> {
    return this.tryFirebaseOrFallback(
      () => this.firebaseStorage.createLeaveRequest(request),
      () => this.memoryStorage.createLeaveRequest(request),
      'createLeaveRequest'
    );
  }

  async getLeaveRequest(id: string): Promise<LeaveRequest | undefined> {
    return this.tryFirebaseOrFallback(
      () => this.firebaseStorage.getLeaveRequest(id),
      () => this.memoryStorage.getLeaveRequest(id),
      'getLeaveRequest'
    );
  }

  async getLeaveRequestsByStudent(studentId: string): Promise<LeaveRequest[]> {
    return this.tryFirebaseOrFallback(
      () => this.firebaseStorage.getLeaveRequestsByStudent(studentId),
      () => this.memoryStorage.getLeaveRequestsByStudent(studentId),
      'getLeaveRequestsByStudent'
    );
  }

  async getPendingRequestsByApprover(approverId: string, role: string): Promise<LeaveRequest[]> {
    return this.tryFirebaseOrFallback(
      () => this.firebaseStorage.getPendingRequestsByApprover(approverId, role),
      () => this.memoryStorage.getPendingRequestsByApprover(approverId, role),
      'getPendingRequestsByApprover'
    );
  }

  async getApprovedRequestsByApprover(approverId: string, role: string): Promise<LeaveRequest[]> {
    return this.tryFirebaseOrFallback(
      () => this.firebaseStorage.getApprovedRequestsByApprover(approverId, role),
      () => this.memoryStorage.getApprovedRequestsByApprover(approverId, role),
      'getApprovedRequestsByApprover'
    );
  }

  async updateLeaveRequestStatus(id: string, status: string, currentStep: number): Promise<void> {
    return this.tryFirebaseOrFallback(
      () => this.firebaseStorage.updateLeaveRequestStatus(id, status, currentStep),
      () => this.memoryStorage.updateLeaveRequestStatus(id, status, currentStep),
      'updateLeaveRequestStatus'
    );
  }

  async getOverdueReturns(): Promise<LeaveRequest[]> {
    return this.tryFirebaseOrFallback(
      () => this.firebaseStorage.getOverdueReturns(),
      () => this.memoryStorage.getOverdueReturns(),
      'getOverdueReturns'
    );
  }

  // Approval operations
  async createApproval(approval: InsertApproval): Promise<Approval> {
    return this.tryFirebaseOrFallback(
      () => this.firebaseStorage.createApproval(approval),
      () => this.memoryStorage.createApproval(approval),
      'createApproval'
    );
  }

  async getApprovalsByRequest(requestId: string): Promise<Approval[]> {
    return this.tryFirebaseOrFallback(
      () => this.firebaseStorage.getApprovalsByRequest(requestId),
      () => this.memoryStorage.getApprovalsByRequest(requestId),
      'getApprovalsByRequest'
    );
  }

  async getApprovalsByApprover(approverId: string, role: string): Promise<Approval[]> {
    return this.tryFirebaseOrFallback(
      () => this.firebaseStorage.getApprovalsByApprover(approverId, role),
      () => this.memoryStorage.getApprovalsByApprover(approverId, role),
      'getApprovalsByApprover'
    );
  }

  async updateApprovalStatus(id: string, status: string, comments?: string): Promise<void> {
    return this.tryFirebaseOrFallback(
      () => this.firebaseStorage.updateApprovalStatus(id, status, comments),
      () => this.memoryStorage.updateApprovalStatus(id, status, comments),
      'updateApprovalStatus'
    );
  }

  // QR code operations
  async createQrCode(qrCode: InsertQrCode): Promise<QrCode> {
    return this.tryFirebaseOrFallback(
      () => this.firebaseStorage.createQrCode(qrCode),
      () => this.memoryStorage.createQrCode(qrCode),
      'createQrCode'
    );
  }

  async getQrCodeByData(qrData: string): Promise<QrCode | undefined> {
    return this.tryFirebaseOrFallback(
      () => this.firebaseStorage.getQrCodeByData(qrData),
      () => this.memoryStorage.getQrCodeByData(qrData),
      'getQrCodeByData'
    );
  }

  async getQrCodeByRequestId(requestId: string): Promise<QrCode | undefined> {
    return this.tryFirebaseOrFallback(
      () => this.firebaseStorage.getQrCodeByRequestId(requestId),
      () => this.memoryStorage.getQrCodeByRequestId(requestId),
      'getQrCodeByRequestId'
    );
  }

  async markQrCodeAsUsed(id: string, scannedBy: string): Promise<void> {
    return this.tryFirebaseOrFallback(
      () => this.firebaseStorage.markQrCodeAsUsed(id, scannedBy),
      () => this.memoryStorage.markQrCodeAsUsed(id, scannedBy),
      'markQrCodeAsUsed'
    );
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    return this.tryFirebaseOrFallback(
      () => this.firebaseStorage.createNotification(notification),
      () => this.memoryStorage.createNotification(notification),
      'createNotification'
    );
  }

  async getPendingNotifications(): Promise<Notification[]> {
    return this.tryFirebaseOrFallback(
      () => this.firebaseStorage.getPendingNotifications(),
      () => this.memoryStorage.getPendingNotifications(),
      'getPendingNotifications'
    );
  }

  async markNotificationAsSent(id: string): Promise<void> {
    return this.tryFirebaseOrFallback(
      () => this.firebaseStorage.markNotificationAsSent(id),
      () => this.memoryStorage.markNotificationAsSent(id),
      'markNotificationAsSent'
    );
  }

  async clearAllData(): Promise<void> {
    return this.tryFirebaseOrFallback(
      () => this.firebaseStorage.clearAllData(),
      () => this.memoryStorage.clearAllData(),
      'clearAllData'
    );
  }
}

// Create and initialize storage instance - Firebase with memory fallback
const createStorage = (): IStorage => {
  if (!adminDb) {
    console.error('Firebase Admin is not properly configured. Using memory storage only.');
    return new MemoryStorage();
  }
  console.log("Using hybrid storage (Firebase with memory fallback)");
  return new HybridStorage();
};

// Initialize storage - Firebase only (no fallback)
export const storage: IStorage = createStorage();