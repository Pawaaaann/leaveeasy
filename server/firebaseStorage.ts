import { adminDb } from "./firebaseAdmin";
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp 
} from "firebase/firestore";
import type {
  User,
  InsertUser,
  LeaveRequest,
  InsertLeaveRequest,
  Approval,
  InsertApproval,
  QrCode,
  InsertQrCode,
  Notification,
  InsertNotification,
} from "@shared/firebaseSchema";

export interface IFirebaseStorage {
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

export class FirebaseStorage implements IFirebaseStorage {
  private toFirestoreData(data: any): any {
    const result = { ...data };
    // Firebase admin handles Date objects automatically
    return result;
  }

  private fromFirestoreData(data: any): any {
    const result = { ...data };
    // Firebase admin handles timestamps automatically
    return result;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const docRef = doc(adminDb, "users", id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return this.fromFirestoreData({ id: docSnap.id, ...docSnap.data() }) as User;
    }
    return undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const q = query(
      collection(adminDb, "users"),
      where("username", "==", username),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      return this.fromFirestoreData({ id: docSnap.id, ...docSnap.data() }) as User;
    }
    return undefined;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const now = new Date();
    const userWithTimestamps = {
      ...userData,
      createdAt: now,
      updatedAt: now,
    };
    
    const docRef = await addDoc(collection(adminDb, "users"), this.toFirestoreData(userWithTimestamps));
    return { id: docRef.id, ...userWithTimestamps } as User;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    const q = query(
      collection(adminDb, "users"),
      where("role", "==", role)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(docSnap => 
      this.fromFirestoreData({ id: docSnap.id, ...docSnap.data() }) as User
    );
  }

  // Leave request operations
  async createLeaveRequest(requestData: InsertLeaveRequest): Promise<LeaveRequest> {
    const now = new Date();
    const requestWithDefaults = {
      ...requestData,
      status: "pending" as const,
      currentApprovalStep: 1,
      createdAt: now,
      updatedAt: now,
    };
    
    const docRef = await addDoc(collection(adminDb, "leaveRequests"), this.toFirestoreData(requestWithDefaults));
    return { id: docRef.id, ...requestWithDefaults } as LeaveRequest;
  }

  async getLeaveRequest(id: string): Promise<LeaveRequest | undefined> {
    const docRef = doc(adminDb, "leaveRequests", id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return this.fromFirestoreData({ id: docSnap.id, ...docSnap.data() }) as LeaveRequest;
    }
    return undefined;
  }

  async getLeaveRequestsByStudent(studentId: string): Promise<LeaveRequest[]> {
    const q = query(
      collection(adminDb, "leaveRequests"),
      where("studentId", "==", studentId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(docSnap => 
      this.fromFirestoreData({ id: docSnap.id, ...docSnap.data() }) as LeaveRequest
    );
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

    const q = query(
      collection(adminDb, "leaveRequests"),
      where("currentApprovalStep", "==", step),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(docSnap => 
      this.fromFirestoreData({ id: docSnap.id, ...docSnap.data() }) as LeaveRequest
    );
  }

  async updateLeaveRequestStatus(id: string, status: string, currentStep: number): Promise<void> {
    const docRef = doc(adminDb, "leaveRequests", id);
    await updateDoc(docRef, this.toFirestoreData({
      status,
      currentApprovalStep: currentStep,
      updatedAt: new Date(),
    }));
  }

  async getOverdueReturns(): Promise<LeaveRequest[]> {
    const today = new Date();
    const q = query(
      collection(adminDb, "leaveRequests"),
      where("status", "==", "approved"),
      where("toDate", "<=", today)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(docSnap => 
      this.fromFirestoreData({ id: docSnap.id, ...docSnap.data() }) as LeaveRequest
    );
  }

  // Approval operations
  async createApproval(approvalData: InsertApproval): Promise<Approval> {
    const now = new Date();
    const approvalWithTimestamp = {
      ...approvalData,
      status: approvalData.status || "pending" as const,
      createdAt: now,
    };
    
    const docRef = await addDoc(collection(adminDb, "approvals"), this.toFirestoreData(approvalWithTimestamp));
    return { id: docRef.id, ...approvalWithTimestamp } as Approval;
  }

  async getApprovalsByRequest(requestId: string): Promise<Approval[]> {
    const q = query(
      collection(adminDb, "approvals"),
      where("leaveRequestId", "==", requestId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(docSnap => 
      this.fromFirestoreData({ id: docSnap.id, ...docSnap.data() }) as Approval
    );
  }

  async updateApprovalStatus(id: string, status: string, comments?: string): Promise<void> {
    const docRef = doc(adminDb, "approvals", id);
    const updateData: any = {
      status,
      comments,
    };
    
    if (status === "approved") {
      updateData.approvedAt = new Date();
    }
    
    await updateDoc(docRef, this.toFirestoreData(updateData));
  }

  // QR code operations
  async createQrCode(qrCodeData: InsertQrCode): Promise<QrCode> {
    const now = new Date();
    const qrCodeWithDefaults = {
      ...qrCodeData,
      isUsed: false,
      createdAt: now,
    };
    
    const docRef = await addDoc(collection(adminDb, "qrCodes"), this.toFirestoreData(qrCodeWithDefaults));
    return { id: docRef.id, ...qrCodeWithDefaults } as QrCode;
  }

  async getQrCodeByData(qrData: string): Promise<QrCode | undefined> {
    const q = query(
      collection(adminDb, "qrCodes"),
      where("qrData", "==", qrData),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      return this.fromFirestoreData({ id: docSnap.id, ...docSnap.data() }) as QrCode;
    }
    return undefined;
  }

  async markQrCodeAsUsed(id: string, scannedBy: string): Promise<void> {
    const docRef = doc(adminDb, "qrCodes", id);
    await updateDoc(docRef, this.toFirestoreData({
      isUsed: true,
      scannedAt: new Date(),
      scannedBy,
    }));
  }

  // Notification operations
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const now = new Date();
    const notificationWithDefaults = {
      ...notificationData,
      sent: false,
      createdAt: now,
    };
    
    const docRef = await addDoc(collection(adminDb, "notifications"), this.toFirestoreData(notificationWithDefaults));
    return { id: docRef.id, ...notificationWithDefaults } as Notification;
  }

  async getPendingNotifications(): Promise<Notification[]> {
    const q = query(
      collection(adminDb, "notifications"),
      where("sent", "==", false)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(docSnap => 
      this.fromFirestoreData({ id: docSnap.id, ...docSnap.data() }) as Notification
    );
  }

  async markNotificationAsSent(id: string): Promise<void> {
    const docRef = doc(adminDb, "notifications", id);
    await updateDoc(docRef, this.toFirestoreData({
      sent: true,
      sentAt: new Date(),
    }));
  }
}

export const storage = new FirebaseStorage();