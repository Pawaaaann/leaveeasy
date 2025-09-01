import {
  users,
  leaveRequests,
  approvals,
  qrCodes,
  notifications,
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
import { db } from "./db";
import { eq, and, desc, count, gte, lte } from "drizzle-orm";

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

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role as any));
  }

  // Leave request operations
  async createLeaveRequest(requestData: InsertLeaveRequest): Promise<LeaveRequest> {
    const [request] = await db.insert(leaveRequests).values(requestData).returning();
    return request;
  }

  async getLeaveRequest(id: string): Promise<LeaveRequest | undefined> {
    const [request] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id));
    return request;
  }

  async getLeaveRequestsByStudent(studentId: string): Promise<LeaveRequest[]> {
    return await db
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.studentId, studentId))
      .orderBy(desc(leaveRequests.createdAt));
  }

  async getPendingRequestsByApprover(approverId: string, role: string): Promise<LeaveRequest[]> {
    // Get requests that need approval from this role
    const roleStepMap = {
      mentor: 1,
      hod: 3,
      principal: 4,
      warden: 5,
    };
    
    const step = roleStepMap[role as keyof typeof roleStepMap];
    if (!step) return [];

    return await db
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.currentApprovalStep, step))
      .orderBy(desc(leaveRequests.createdAt));
  }

  async updateLeaveRequestStatus(id: string, status: string, currentStep: number): Promise<void> {
    await db
      .update(leaveRequests)
      .set({ status: status as any, currentApprovalStep: currentStep, updatedAt: new Date() })
      .where(eq(leaveRequests.id, id));
  }

  async getOverdueReturns(): Promise<LeaveRequest[]> {
    const today = new Date();
    return await db
      .select()
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.status, "approved"),
          lte(leaveRequests.toDate, today)
        )
      );
  }

  // Approval operations
  async createApproval(approvalData: InsertApproval): Promise<Approval> {
    const [approval] = await db.insert(approvals).values(approvalData).returning();
    return approval;
  }

  async getApprovalsByRequest(requestId: string): Promise<Approval[]> {
    return await db
      .select()
      .from(approvals)
      .where(eq(approvals.leaveRequestId, requestId))
      .orderBy(desc(approvals.createdAt));
  }

  async updateApprovalStatus(id: string, status: string, comments?: string): Promise<void> {
    await db
      .update(approvals)
      .set({
        status: status as any,
        comments,
        approvedAt: status === "approved" ? new Date() : undefined,
      })
      .where(eq(approvals.id, id));
  }

  // QR code operations
  async createQrCode(qrCodeData: InsertQrCode): Promise<QrCode> {
    const [qrCode] = await db.insert(qrCodes).values(qrCodeData).returning();
    return qrCode;
  }

  async getQrCodeByData(qrData: string): Promise<QrCode | undefined> {
    const [qrCode] = await db.select().from(qrCodes).where(eq(qrCodes.qrData, qrData));
    return qrCode;
  }

  async markQrCodeAsUsed(id: string, scannedBy: string): Promise<void> {
    await db
      .update(qrCodes)
      .set({ isUsed: true, scannedAt: new Date(), scannedBy })
      .where(eq(qrCodes.id, id));
  }

  // Notification operations
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(notificationData).returning();
    return notification;
  }

  async getPendingNotifications(): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.sent, false));
  }

  async markNotificationAsSent(id: string): Promise<void> {
    await db
      .update(notifications)
      .set({ sent: true, sentAt: new Date() })
      .where(eq(notifications.id, id));
  }
}

export const storage = new DatabaseStorage();
