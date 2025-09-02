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
  query, 
  where, 
  orderBy, 
  limit 
} from "firebase/firestore";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsersByRole(role: string): Promise<User[]>;
  
  // Leave request operations
  createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest>;
  getLeaveRequest(id: string): Promise<LeaveRequest | undefined>;
  getLeaveRequestsByStudent(studentId: string): Promise<LeaveRequest[]>;
  getPendingRequestsByApprover(approverId: string, role: string): Promise<LeaveRequest[]>;
  updateLeaveRequestStatus(id: string, status: string, currentStep: number): Promise<void>;
  getOverdueReturns(): Promise<LeaveRequest[]>;
  
  // Approval operations
  createApproval(approval: InsertApproval): Promise<Approval>;
  getApprovalsByRequest(requestId: string): Promise<Approval[]>;
  updateApprovalStatus(id: string, status: string, comments?: string): Promise<void>;
  
  // QR code operations
  createQrCode(qrCode: InsertQrCode): Promise<QrCode>;
  getQrCodeByData(qrData: string): Promise<QrCode | undefined>;
  markQrCodeAsUsed(id: string, scannedBy: string): Promise<void>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getPendingNotifications(): Promise<Notification[]>;
  markNotificationAsSent(id: string): Promise<void>;
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
      const userRef = doc(adminDb, COLLECTIONS.USERS, id);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return this.convertTimestamps({ id: userSnap.id, ...userSnap.data() }) as User;
      }
      return undefined;
    } catch (error) {
      console.error("Error getting user:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const usersRef = collection(adminDb, COLLECTIONS.USERS);
      const q = query(usersRef, where("username", "==", username), limit(1));
      const querySnapshot = await getDocs(q);
      
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

  async createUser(userData: InsertUser): Promise<User> {
    try {
      const usersRef = collection(adminDb, COLLECTIONS.USERS);
      const now = new Date();
      const userWithTimestamps = {
        ...userData,
        createdAt: now,
        updatedAt: now,
      };
      
      const docRef = await addDoc(usersRef, userWithTimestamps);
      return { id: docRef.id, ...userWithTimestamps } as User;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async getUsersByRole(role: string): Promise<User[]> {
    try {
      const usersRef = collection(adminDb, COLLECTIONS.USERS);
      const q = query(usersRef, where("role", "==", role));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(docSnap => 
        this.convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as User
      );
    } catch (error) {
      console.error("Error getting users by role:", error);
      return [];
    }
  }

  // Leave request operations
  async createLeaveRequest(requestData: InsertLeaveRequest): Promise<LeaveRequest> {
    try {
      const requestsRef = collection(adminDb, COLLECTIONS.LEAVE_REQUESTS);
      const now = new Date();
      const requestWithTimestamps = {
        ...requestData,
        status: "pending",
        currentApprovalStep: 1,
        createdAt: now,
        updatedAt: now,
      };
      
      const docRef = await addDoc(requestsRef, requestWithTimestamps);
      return { id: docRef.id, ...requestWithTimestamps } as LeaveRequest;
    } catch (error) {
      console.error("Error creating leave request:", error);
      throw error;
    }
  }

  async getLeaveRequest(id: string): Promise<LeaveRequest | undefined> {
    try {
      const requestRef = doc(adminDb, COLLECTIONS.LEAVE_REQUESTS, id);
      const requestSnap = await getDoc(requestRef);
      
      if (requestSnap.exists()) {
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
      const requestsRef = collection(adminDb, COLLECTIONS.LEAVE_REQUESTS);
      const q = query(
        requestsRef, 
        where("studentId", "==", studentId),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(docSnap => 
        this.convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as LeaveRequest
      );
    } catch (error) {
      console.error("Error getting leave requests by student:", error);
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

      const requestsRef = collection(adminDb, COLLECTIONS.LEAVE_REQUESTS);
      const q = query(
        requestsRef,
        where("currentApprovalStep", "==", step),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(docSnap => 
        this.convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as LeaveRequest
      );
    } catch (error) {
      console.error("Error getting pending requests by approver:", error);
      return [];
    }
  }

  async updateLeaveRequestStatus(id: string, status: string, currentStep: number): Promise<void> {
    try {
      const requestRef = doc(adminDb, COLLECTIONS.LEAVE_REQUESTS, id);
      await updateDoc(requestRef, {
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
        status: "pending",
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
}

export const storage = new FirebaseStorage();