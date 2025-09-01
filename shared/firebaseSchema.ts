import { z } from "zod";

// Enums for Firestore
export const userRoles = [
  "student", "mentor", "parent", "hod", "principal", "warden", "security"
] as const;

export const leaveTypes = [
  "medical", "personal", "family_emergency", "academic"
] as const;

export const studentTypes = [
  "day_scholar", "hostel"
] as const;

export const requestStatuses = [
  "pending", "mentor_approved", "parent_confirmed", "hod_approved", 
  "principal_approved", "warden_approved", "approved", "rejected"
] as const;

export const approvalStatuses = [
  "pending", "approved", "rejected"
] as const;

// User schema for Firestore
export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email().optional(),
  role: z.enum(userRoles),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
  studentId: z.string().optional(),
  parentId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Leave request schema
export const leaveRequestSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  leaveType: z.enum(leaveTypes),
  studentType: z.enum(studentTypes),
  fromDate: z.date(),
  toDate: z.date(),
  reason: z.string(),
  status: z.enum(requestStatuses),
  currentApprovalStep: z.number(),
  supportingDocuments: z.array(z.string()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Approval schema
export const approvalSchema = z.object({
  id: z.string(),
  leaveRequestId: z.string(),
  approverId: z.string(),
  approverRole: z.enum(userRoles),
  status: z.enum(approvalStatuses),
  comments: z.string().optional(),
  approvedAt: z.date().optional(),
  createdAt: z.date(),
});

// QR code schema
export const qrCodeSchema = z.object({
  id: z.string(),
  leaveRequestId: z.string(),
  qrData: z.string(),
  isUsed: z.boolean(),
  scannedAt: z.date().optional(),
  scannedBy: z.string().optional(),
  expiresAt: z.date(),
  createdAt: z.date(),
});

// Notification schema
export const notificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  leaveRequestId: z.string().optional(),
  type: z.string(), // email, sms
  message: z.string(),
  sent: z.boolean(),
  sentAt: z.date().optional(),
  createdAt: z.date(),
});

// Insert schemas (omit generated fields)
export const insertUserSchema = userSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertLeaveRequestSchema = leaveRequestSchema.omit({ 
  id: true, 
  status: true, 
  currentApprovalStep: true, 
  createdAt: true, 
  updatedAt: true 
});
export const insertApprovalSchema = approvalSchema.omit({ id: true, createdAt: true });
export const insertQrCodeSchema = qrCodeSchema.omit({ id: true, createdAt: true });
export const insertNotificationSchema = notificationSchema.omit({ id: true, createdAt: true });

// Types
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LeaveRequest = z.infer<typeof leaveRequestSchema>;
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;
export type Approval = z.infer<typeof approvalSchema>;
export type InsertApproval = z.infer<typeof insertApprovalSchema>;
export type QrCode = z.infer<typeof qrCodeSchema>;
export type InsertQrCode = z.infer<typeof insertQrCodeSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;