import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, pgEnum, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", [
  "student", "mentor", "parent", "hod", "principal", "warden", "security"
]);

export const leaveTypeEnum = pgEnum("leave_type", [
  "medical", "personal", "family_emergency", "academic"
]);

export const studentTypeEnum = pgEnum("student_type", [
  "day_scholar", "hostel"
]);

export const requestStatusEnum = pgEnum("request_status", [
  "pending", "mentor_approved", "parent_confirmed", "hod_approved", 
  "principal_approved", "warden_approved", "approved", "rejected"
]);

export const approvalStatusEnum = pgEnum("approval_status", [
  "pending", "approved", "rejected"
]);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").notNull().unique(),
  email: varchar("email"),
  password: varchar("password"),
  role: userRoleEnum("role").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  phone: varchar("phone"),
  department: varchar("department"),
  studentId: varchar("student_id"),
  parentId: varchar("parent_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Leave requests table
export const leaveRequests = pgTable("leave_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull(),
  leaveType: leaveTypeEnum("leave_type").notNull(),
  studentType: studentTypeEnum("student_type").notNull(),
  fromDate: timestamp("from_date").notNull(),
  toDate: timestamp("to_date").notNull(),
  reason: text("reason").notNull(),
  status: requestStatusEnum("status").notNull().default("pending"),
  currentApprovalStep: integer("current_approval_step").notNull().default(1),
  supportingDocuments: text("supporting_documents").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Approvals table
export const approvals = pgTable("approvals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leaveRequestId: varchar("leave_request_id").notNull(),
  approverId: varchar("approver_id").notNull(),
  approverRole: userRoleEnum("approver_role").notNull(),
  status: approvalStatusEnum("status").notNull().default("pending"),
  comments: text("comments"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// QR codes table
export const qrCodes = pgTable("qr_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leaveRequestId: varchar("leave_request_id").notNull(),
  qrData: text("qr_data").notNull(),
  isUsed: boolean("is_used").notNull().default(false),
  scannedAt: timestamp("scanned_at"),
  scannedBy: varchar("scanned_by"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  leaveRequestId: varchar("leave_request_id"),
  type: varchar("type").notNull(), // email, sms
  message: text("message").notNull(),
  sent: boolean("sent").notNull().default(false),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  leaveRequests: many(leaveRequests),
  approvals: many(approvals),
  notifications: many(notifications),
  parent: one(users, { fields: [users.parentId], references: [users.id] }),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({ one, many }) => ({
  student: one(users, { fields: [leaveRequests.studentId], references: [users.id] }),
  approvals: many(approvals),
  qrCode: one(qrCodes),
  notifications: many(notifications),
}));

export const approvalsRelations = relations(approvals, ({ one }) => ({
  leaveRequest: one(leaveRequests, { fields: [approvals.leaveRequestId], references: [leaveRequests.id] }),
  approver: one(users, { fields: [approvals.approverId], references: [users.id] }),
}));

export const qrCodesRelations = relations(qrCodes, ({ one }) => ({
  leaveRequest: one(leaveRequests, { fields: [qrCodes.leaveRequestId], references: [leaveRequests.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  leaveRequest: one(leaveRequests, { fields: [notifications.leaveRequestId], references: [leaveRequests.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({ 
  id: true, 
  status: true, 
  currentApprovalStep: true, 
  createdAt: true, 
  updatedAt: true 
});
export const insertApprovalSchema = createInsertSchema(approvals).omit({ id: true, createdAt: true });
export const insertQrCodeSchema = createInsertSchema(qrCodes).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;
export type Approval = typeof approvals.$inferSelect;
export type InsertApproval = z.infer<typeof insertApprovalSchema>;
export type QrCode = typeof qrCodes.$inferSelect;
export type InsertQrCode = z.infer<typeof insertQrCodeSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Export enums as arrays for compatibility
export const leaveTypes = leaveTypeEnum.enumValues;
export const studentTypes = studentTypeEnum.enumValues;
export const userRoles = userRoleEnum.enumValues;
export const requestStatuses = requestStatusEnum.enumValues;
export const approvalStatuses = approvalStatusEnum.enumValues;
