import { z } from "zod";

// Enums as const arrays for Firebase
export const userRoles = [
  "student", "mentor", "hod", "principal", "warden", "security", "admin"
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

// Zod schemas for validation
export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().optional(),
  password: z.string().optional(),
  role: z.enum(userRoles),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
  studentId: z.string().optional(),
  parentId: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const leaveRequestSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  leaveType: z.enum(leaveTypes),
  studentType: z.enum(studentTypes),
  fromDate: z.date(),
  toDate: z.date(),
  reason: z.string(),
  parentPhone: z.string(),
  status: z.enum(requestStatuses).default("pending"),
  currentApprovalStep: z.number().default(1),
  supportingDocuments: z.array(z.string()).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const approvalSchema = z.object({
  id: z.string(),
  leaveRequestId: z.string(),
  approverId: z.string(),
  approverRole: z.enum(userRoles),
  status: z.enum(approvalStatuses),
  comments: z.string().optional(),
  approvedAt: z.date().optional(),
  createdAt: z.date().optional(),
});

export const qrCodeSchema = z.object({
  id: z.string(),
  leaveRequestId: z.string(),
  qrData: z.string(),
  isUsed: z.boolean().default(false),
  scannedAt: z.date().optional(),
  scannedBy: z.string().optional(),
  expiresAt: z.date(),
  createdAt: z.date().optional(),
});

export const notificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  leaveRequestId: z.string().optional(),
  type: z.string(), // email, sms
  message: z.string(),
  sent: z.boolean().default(false),
  sentAt: z.date().optional(),
  createdAt: z.date().optional(),
});

// Insert schemas (omit id and timestamps for creation)
export const insertUserSchema = userSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertLeaveRequestSchema = leaveRequestSchema.omit({ 
  id: true, 
  status: true, 
  currentApprovalStep: true, 
  createdAt: true, 
  updatedAt: true 
}).extend({
  fromDate: z.string().transform((val) => new Date(val)),
  toDate: z.string().transform((val) => new Date(val)),
});

export const insertApprovalSchema = approvalSchema.omit({ 
  id: true, 
  createdAt: true 
});

export const insertQrCodeSchema = qrCodeSchema.omit({ 
  id: true, 
  isUsed: true,
  scannedAt: true,
  scannedBy: true,
  createdAt: true 
});

export const insertNotificationSchema = notificationSchema.omit({ 
  id: true, 
  createdAt: true,
  sent: true,
  sentAt: true
});

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

// Firebase collection names
export const COLLECTIONS = {
  USERS: "users",
  LEAVE_REQUESTS: "leaveRequests", 
  APPROVALS: "approvals",
  QR_CODES: "qrCodes",
  NOTIFICATIONS: "notifications"
} as const;