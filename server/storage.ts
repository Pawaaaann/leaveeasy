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
      let q = query(
        requestsRef,
        where("currentApprovalStep", "==", step),
        orderBy("createdAt", "desc")
      );
      
      // For HODs, filter by department
      if (role === "hod") {
        const approver = await this.getUser(approverId);
        if (approver && approver.department) {
          // Get students from the same department
          const studentsRef = collection(adminDb, COLLECTIONS.USERS);
          const studentsQuery = query(
            studentsRef,
            where("role", "==", "student"),
            where("department", "==", approver.department)
          );
          const studentsSnapshot = await getDocs(studentsQuery);
          const studentIds = studentsSnapshot.docs.map(doc => doc.id);
          
          if (studentIds.length === 0) return [];
          
          // Filter requests by students in this department
          const departmentRequests: LeaveRequest[] = [];
          for (const studentId of studentIds) {
            const studentRequestsQuery = query(
              requestsRef,
              where("currentApprovalStep", "==", step),
              where("studentId", "==", studentId),
              orderBy("createdAt", "desc")
            );
            const studentRequestsSnapshot = await getDocs(studentRequestsQuery);
            departmentRequests.push(
              ...studentRequestsSnapshot.docs.map(docSnap => 
                this.convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as LeaveRequest
              )
            );
          }
          return departmentRequests.sort((a, b) => 
            (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
          );
        }
      }
      
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

// Development memory storage implementation
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
    const users = Array.from(this.users.values());
    return users.find(user => user.username === username);
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
    return user;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === role);
  }

  // Leave request operations
  async createLeaveRequest(requestData: InsertLeaveRequest): Promise<LeaveRequest> {
    const id = this.generateId();
    const now = new Date();
    const request: LeaveRequest = {
      id,
      ...requestData,
      status: "pending" as any,
      currentApprovalStep: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.leaveRequests.set(id, request);
    return request;
  }

  async getLeaveRequest(id: string): Promise<LeaveRequest | undefined> {
    return this.leaveRequests.get(id);
  }

  async getLeaveRequestsByStudent(studentId: string): Promise<LeaveRequest[]> {
    return Array.from(this.leaveRequests.values())
      .filter(request => request.studentId === studentId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getPendingRequestsByApprover(approverId: string, role: string): Promise<LeaveRequest[]> {
    const roleStepMap = {
      mentor: 1,
      hod: 3,
      principal: 4,
      warden: 5,
    };
    
    const step = roleStepMap[role as keyof typeof roleStepMap];
    if (!step) return [];

    let requests = Array.from(this.leaveRequests.values())
      .filter(request => request.currentApprovalStep === step);
    
    // For HODs, filter by department
    if (role === "hod") {
      const approver = await this.getUser(approverId);
      if (approver && approver.department) {
        // Get students from the same department
        const departmentStudents = Array.from(this.users.values())
          .filter(user => user.role === "student" && user.department === approver.department)
          .map(user => user.id);
        
        requests = requests.filter(request => departmentStudents.includes(request.studentId));
      }
    }
    
    return requests.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
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
    const today = new Date();
    return Array.from(this.leaveRequests.values())
      .filter(request => request.status === "approved" && request.toDate <= today);
  }

  // Approval operations
  async createApproval(approvalData: InsertApproval): Promise<Approval> {
    const id = this.generateId();
    const now = new Date();
    const approval: Approval = {
      id,
      ...approvalData,
      createdAt: now,
    };
    this.approvals.set(id, approval);
    return approval;
  }

  async getApprovalsByRequest(requestId: string): Promise<Approval[]> {
    return Array.from(this.approvals.values())
      .filter(approval => approval.leaveRequestId === requestId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getApprovalsByApprover(approverId: string, role: string): Promise<Approval[]> {
    return Array.from(this.approvals.values())
      .filter(approval => approval.approverId === approverId && approval.approverRole === role)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getApprovedRequestsByApprover(approverId: string, role: string): Promise<LeaveRequest[]> {
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
  }

  async updateApprovalStatus(id: string, status: string, comments?: string): Promise<void> {
    const approval = this.approvals.get(id);
    if (approval) {
      approval.status = status as any;
      approval.comments = comments;
      if (status === "approved") {
        approval.approvedAt = new Date();
      }
    }
  }

  // QR code operations
  async createQrCode(qrCodeData: InsertQrCode): Promise<QrCode> {
    const id = this.generateId();
    const now = new Date();
    const qrCode: QrCode = {
      id,
      ...qrCodeData,
      isUsed: false,
      createdAt: now,
    };
    this.qrCodes.set(id, qrCode);
    return qrCode;
  }

  async getQrCodeByData(qrData: string): Promise<QrCode | undefined> {
    const qrCodes = Array.from(this.qrCodes.values());
    return qrCodes.find(qrCode => qrCode.qrData === qrData);
  }

  async markQrCodeAsUsed(id: string, scannedBy: string): Promise<void> {
    const qrCode = this.qrCodes.get(id);
    if (qrCode) {
      qrCode.isUsed = true;
      qrCode.scannedAt = new Date();
      qrCode.scannedBy = scannedBy;
    }
  }

  // Notification operations
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const id = this.generateId();
    const now = new Date();
    const notification: Notification = {
      id,
      ...notificationData,
      sent: false,
      createdAt: now,
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async getPendingNotifications(): Promise<Notification[]> {
    return Array.from(this.notifications.values()).filter(notification => !notification.sent);
  }

  async markNotificationAsSent(id: string): Promise<void> {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.sent = true;
      notification.sentAt = new Date();
    }
  }

  async clearAllData(): Promise<void> {
    console.log("Clearing all memory storage data...");
    this.users.clear();
    this.leaveRequests.clear();
    this.approvals.clear();
    this.qrCodes.clear();
    this.notifications.clear();
    console.log("Memory storage data cleared successfully!");
  }

  // Helper method
  private convertTimestamps(data: any): any {
    return data; // Memory storage already uses Date objects
  }
}

// Use memory storage for development to avoid Firebase permission issues
export const storage = new MemoryStorage();

// Initialize sample data for testing
export async function initializeSampleData(): Promise<void> {
  try {
    // Check if data already exists by trying to get a user
    const existingUser = await storage.getUserByUsername("student1");
    if (existingUser) {
      console.log("Sample data already exists, skipping initialization");
      return;
    }

    console.log("Initializing sample data...");
    
    // Create sample users first
    const sampleUsers = [
      {
        username: "student1",
        password: "password",
        role: "student" as const,
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@college.edu",
        department: "Computer Science",
        studentId: "CS2021001",
        phone: "+1234567890",
      },
      {
        username: "student2",
        password: "password",
        role: "student" as const,
        firstName: "Bob",
        lastName: "Smith",
        email: "bob@college.edu",
        department: "Electronics",
        studentId: "EC2021002",
        phone: "+1234567891",
      },
      {
        username: "mentor1",
        password: "password",
        role: "mentor" as const,
        firstName: "Dr. Sarah",
        lastName: "Wilson",
        email: "sarah@college.edu",
        department: "Computer Science",
      },
      {
        username: "hod1",
        password: "password",
        role: "hod" as const,
        firstName: "Dr. James",
        lastName: "Brown",
        email: "james@college.edu",
        department: "Computer Science",
      },
      {
        username: "principal1",
        password: "password",
        role: "principal" as const,
        firstName: "Dr. Maria",
        lastName: "Garcia",
        email: "maria@college.edu",
        department: "Administration",
      }
    ];

    const createdUsers: Record<string, User> = {};
    for (const userData of sampleUsers) {
      try {
        const user = await storage.createUser(userData);
        createdUsers[userData.username] = user;
        console.log(`Created user: ${userData.username} (${user.id})`);
      } catch (error) {
        console.log(`Error creating user ${userData.username}:`, error);
      }
    }

    // Create sample leave requests with different statuses
    const sampleRequests = [
      {
        studentId: createdUsers['student1']?.id || 'student1',
        leaveType: "medical" as const,
        studentType: "hostel" as const,
        fromDate: new Date('2024-01-15'),
        toDate: new Date('2024-01-17'),
        reason: "Medical treatment for fever",
        parentPhone: "+1234567890",
      },
      {
        studentId: createdUsers['student1']?.id || 'student1',
        leaveType: "personal" as const,
        studentType: "day_scholar" as const,
        fromDate: new Date('2024-01-20'),
        toDate: new Date('2024-01-22'),
        reason: "Family wedding ceremony",
        parentPhone: "+1234567890",
      },
      {
        studentId: createdUsers['student2']?.id || 'student2',
        leaveType: "family_emergency" as const,
        studentType: "hostel" as const,
        fromDate: new Date('2024-01-25'),
        toDate: new Date('2024-01-27'),
        reason: "Medical emergency - grandfather hospitalized",
        parentPhone: "+1234567891",
      },
      {
        studentId: createdUsers['student2']?.id || 'student2',
        leaveType: "personal" as const,
        studentType: "day_scholar" as const,
        fromDate: new Date('2024-02-01'),
        toDate: new Date('2024-02-03'),
        reason: "Sister's graduation ceremony",
        parentPhone: "+1234567891",
      }
    ];

    const createdRequests: LeaveRequest[] = [];
    for (const requestData of sampleRequests) {
      try {
        const request = await storage.createLeaveRequest(requestData);
        createdRequests.push(request);
        console.log(`Created leave request: ${request.id} for ${requestData.reason}`);
      } catch (error) {
        console.error(`Failed to create leave request:`, error);
      }
    }

    // Simulate some approved requests
    if (createdRequests.length > 0) {
      // Approve first request completely (approved status)
      const firstRequest = createdRequests[0];
      await storage.updateLeaveRequestStatus(firstRequest.id, "approved", 6);
      
      // Create approval records for the first request
      await storage.createApproval({
        leaveRequestId: firstRequest.id,
        approverId: createdUsers['mentor1']?.id || 'mentor1',
        approverRole: "mentor",
        status: "approved",
        comments: "Medical leave approved",
      });
      
      await storage.createApproval({
        leaveRequestId: firstRequest.id,
        approverId: createdUsers['hod1']?.id || 'hod1',
        approverRole: "hod",
        status: "approved",
        comments: "HOD approval granted",
      });
      
      await storage.createApproval({
        leaveRequestId: firstRequest.id,
        approverId: createdUsers['principal1']?.id || 'principal1',
        approverRole: "principal",
        status: "approved",
        comments: "Principal approval granted",
      });
      
      // Partially approve second request (HOD level)
      const secondRequest = createdRequests[1];
      await storage.updateLeaveRequestStatus(secondRequest.id, "hod_approved", 4);
      
      await storage.createApproval({
        leaveRequestId: secondRequest.id,
        approverId: createdUsers['mentor1']?.id || 'mentor1',
        approverRole: "mentor",
        status: "approved",
        comments: "Family event approved",
      });
      
      await storage.createApproval({
        leaveRequestId: secondRequest.id,
        approverId: createdUsers['hod1']?.id || 'hod1',
        approverRole: "hod",
        status: "approved",
        comments: "HOD approval granted",
      });
      
      // Third request pending at HOD level
      const thirdRequest = createdRequests[2];
      await storage.updateLeaveRequestStatus(thirdRequest.id, "mentor_approved", 3);
      
      await storage.createApproval({
        leaveRequestId: thirdRequest.id,
        approverId: createdUsers['mentor1']?.id || 'mentor1',
        approverRole: "mentor",
        status: "approved",
        comments: "Emergency leave approved by mentor",
      });
      
      console.log("Sample approvals created");
    }
    
    console.log("Sample data initialization completed successfully");
  } catch (error) {
    console.error("Error initializing sample data:", error);
  }
}