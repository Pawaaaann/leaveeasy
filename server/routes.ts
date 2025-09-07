import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { QrCodeService } from "./services/qrCodeService";
import { NotificationService } from "./services/notificationService";
import { insertLeaveRequestSchema, insertUserSchema, type LeaveRequest, COLLECTIONS } from "@shared/schema";
import { z } from "zod";
import { adminDb } from "./firebaseAdmin";
import { collection, query, where, limit, getDocs } from "firebase-admin/firestore";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
    }
  }
}

const authMiddleware = (req: Request, res: Response, next: any) => {
  const userId = Array.isArray(req.headers["x-user-id"]) ? req.headers["x-user-id"][0] : req.headers["x-user-id"];
  const userRole = Array.isArray(req.headers["x-user-role"]) ? req.headers["x-user-role"][0] : req.headers["x-user-role"];
  
  if (!userId || !userRole) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  req.userId = userId as string;
  req.userRole = userRole as string;
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {

  // User routes - stores user profiles when they register/login
  app.post("/api/users", async (req, res) => {
    try {
      console.log("Received user data:", JSON.stringify(req.body, null, 2));
      const userData = insertUserSchema.parse(req.body);
      console.log("Validated user data:", JSON.stringify(userData, null, 2));
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        console.log("User already exists:", existingUser.username);
        return res.json(existingUser); // Return existing user
      }
      
      // Create user profile in storage when they register/login through Firebase
      const user = await storage.createUser(userData);
      console.log("Created new user profile:", user.username, "Role:", user.role);
      res.json(user);
    } catch (error) {
      console.error("Create user error:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        res.status(400).json({ message: "Invalid user data", errors: error.errors });
      } else {
        res.status(400).json({ message: "Invalid user data" });
      }
    }
  });

  // Admin route for creating users directly (without Firebase auth)
  app.post("/api/admin/users", authMiddleware, async (req: Request, res: Response) => {
    try {
      // Only allow admin access
      if (req.userRole !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const userData = insertUserSchema.parse(req.body);
      
      // Prevent admin from creating other admin accounts
      if (userData.role === "admin") {
        return res.status(403).json({ message: "Cannot create admin accounts. Only students can create accounts through registration." });
      }
      
      // Check if user already exists by username
      const existingUser = await storage.getUserByUsername(userData.username || userData.email?.split('@')[0] || 'user');
      if (existingUser) {
        return res.status(400).json({ message: "User with this username already exists" });
      }

      // Check if user already exists by email
      if (userData.email) {
        const existingEmailUser = await storage.getUserByEmail(userData.email);
        if (existingEmailUser) {
          return res.status(400).json({ message: "User with this email already exists" });
        }
      }
      
      // Generate username from email if not provided
      if (!userData.username) {
        userData.username = userData.email?.split('@')[0] || 'user';
      }
      
      // Create user directly in database without Firebase auth
      const user = await storage.createUser(userData);
      console.log("Admin created new user:", user.username, "Role:", user.role);
      res.json(user);
    } catch (error) {
      console.error("Admin create user error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid user data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Check if user exists by email (for login validation)
  app.get("/api/users/check/:email", async (req: Request, res: Response) => {
    try {
      const { email } = req.params;
      
      // First try to find by username (email without domain)
      const username = email.split('@')[0];
      let user = await storage.getUserByUsername(username);
      
      // If not found by username, check all users to find by email
      if (!user) {
        const allUsers = await storage.getAllUsers();
        user = allUsers.find(u => u.email === email);
      }
      
      res.json({ exists: !!user, user });
    } catch (error) {
      console.error("Check user existence error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin-only routes for user management
  app.get("/api/users", authMiddleware, async (req: Request, res: Response) => {
    try {
      // Only allow admin access
      if (req.userRole !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      // For admin access, try to get users directly from Firebase
      try {
        const users = await storage.getAllUsers();
        res.json(users);
      } catch (firebaseError) {
        console.error("Firebase permission error, returning empty data:", firebaseError);
        // If Firebase permissions fail, return empty array but still allow admin access
        res.json([]);
      }
    } catch (error) {
      console.error("Get all users error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/role/:role", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { role } = req.params;
      const users = await storage.getUsersByRole(role);
      res.json(users);
    } catch (error) {
      console.error("Get users by role error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/users/:id", authMiddleware, async (req: Request, res: Response) => {
    try {
      // Only allow admin access
      if (req.userRole !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const userData = req.body;
      
      const updatedUser = await storage.updateUser(id, userData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/users/:id", authMiddleware, async (req: Request, res: Response) => {
    try {
      // Only allow admin access
      if (req.userRole !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      await storage.deleteUser(id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin route to get all leave requests
  app.get("/api/leave-requests", authMiddleware, async (req: Request, res: Response) => {
    try {
      // Only allow admin access
      if (req.userRole !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const requests = await storage.getAllLeaveRequests();
      res.json(requests);
    } catch (error) {
      console.error("Get all leave requests error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Leave request routes
  app.post("/api/leave-requests", authMiddleware, async (req: Request, res: Response) => {
    try {
      const requestData = insertLeaveRequestSchema.parse({
        ...req.body,
        studentId: req.userId,
      });
      
      const leaveRequest = await storage.createLeaveRequest(requestData);
      
      // Create initial approval record for mentor
      await storage.createApproval({
        leaveRequestId: leaveRequest.id,
        approverId: "mentor-placeholder", // In real app, get from department
        approverRole: "mentor",
        status: "pending",
      });
      
      // Notify mentor
      const student = await storage.getUser(req.userId!);
      if (student) {
        await NotificationService.notifyApprover(
          "mentor-placeholder",
          leaveRequest.id,
          `${student.firstName} ${student.lastName}`,
          leaveRequest.leaveType
        );
        
        // Notify parent via SMS
        if (leaveRequest.parentPhone) {
          await NotificationService.notifyParentBySMS(
            leaveRequest.parentPhone,
            leaveRequest.id,
            `${student.firstName} ${student.lastName}`,
            `${leaveRequest.leaveType} leave from ${new Date(leaveRequest.fromDate).toLocaleDateString()} to ${new Date(leaveRequest.toDate).toLocaleDateString()}`
          );
        }
      }
      
      res.json(leaveRequest);
    } catch (error) {
      console.error("Create leave request error:", error);
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.get("/api/leave-requests/student/:studentId", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { studentId } = req.params;
      
      // Check if user can access this student's requests
      if (req.userId !== studentId && req.userRole !== "mentor" && req.userRole !== "hod" && 
          req.userRole !== "principal" && req.userRole !== "warden") {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const requests = await storage.getLeaveRequestsByStudent(studentId);
      res.json(requests);
    } catch (error) {
      console.error("Get student requests error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/leave-requests/pending", authMiddleware, async (req: Request, res: Response) => {
    try {
      const requests = await storage.getPendingRequestsByApprover(req.userId!, req.userRole!);
      
      // Get additional details for each request
      const requestsWithDetails = await Promise.all(
        requests.map(async (request) => {
          const student = await storage.getUser(request.studentId);
          const approvals = await storage.getApprovalsByRequest(request.id);
          
          return {
            ...request,
            student,
            approvals,
          };
        })
      );
      
      res.json(requestsWithDetails);
    } catch (error) {
      console.error("Get pending requests error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get approved requests for an approver
  app.get("/api/leave-requests/approved", authMiddleware, async (req: Request, res: Response) => {
    try {
      const approvedRequests = await storage.getApprovedRequestsByApprover(req.userId!, req.userRole!);
      
      // Get additional details for each request
      const requestsWithDetails = await Promise.all(
        approvedRequests.map(async (request: LeaveRequest) => {
          const student = await storage.getUser(request.studentId);
          const approvals = await storage.getApprovalsByRequest(request.id);
          
          return {
            ...request,
            student,
            approvals,
          };
        })
      );
      
      res.json(requestsWithDetails);
    } catch (error) {
      console.error("Get approved requests error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get approved requests for today
  app.get("/api/leave-requests/approved-today", authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!req.userRole || !["mentor", "hod", "principal", "warden"].includes(req.userRole)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Get all approvals by this approver from today
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const allApprovals = await storage.getApprovalsByApprover(req.userId!, req.userRole!);
      const todayApprovals = allApprovals.filter((a: any) => 
        a.status === "approved" && 
        a.createdAt && a.createdAt >= todayStart
      );

      // Get the leave requests for these approvals
      const approvedTodayRequests = [];
      for (const approval of todayApprovals) {
        const request = await storage.getLeaveRequest(approval.leaveRequestId);
        if (request) {
          const student = await storage.getUser(request.studentId);
          approvedTodayRequests.push({ ...request, student });
        }
      }

      res.json(approvedTodayRequests);
    } catch (error) {
      console.error("Get approved today requests error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get monthly total requests
  app.get("/api/leave-requests/month-total", authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!req.userRole || !["mentor", "hod", "principal", "warden"].includes(req.userRole)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Get all approvals by this approver from this month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const allApprovals = await storage.getApprovalsByApprover(req.userId!, req.userRole!);
      const monthApprovals = allApprovals.filter((a: any) => 
        a.createdAt && a.createdAt >= monthStart
      );

      // Get the leave requests for these approvals
      const monthlyRequests = [];
      for (const approval of monthApprovals) {
        const request = await storage.getLeaveRequest(approval.leaveRequestId);
        if (request) {
          const student = await storage.getUser(request.studentId);
          monthlyRequests.push({ ...request, student });
        }
      }

      res.json(monthlyRequests);
    } catch (error) {
      console.error("Get monthly total requests error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get overdue return requests
  app.get("/api/leave-requests/overdue", authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!req.userRole || !["mentor", "hod", "principal", "warden"].includes(req.userRole)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const overdueRequests = await storage.getOverdueReturns();
      
      // Add student information to each request
      const overdueWithStudents = [];
      for (const request of overdueRequests) {
        const student = await storage.getUser(request.studentId);
        overdueWithStudents.push({ ...request, student });
      }

      res.json(overdueWithStudents);
    } catch (error) {
      console.error("Get overdue requests error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/leave-requests/:id", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const request = await storage.getLeaveRequest(id);
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      const student = await storage.getUser(request.studentId);
      const approvals = await storage.getApprovalsByRequest(id);
      
      res.json({
        ...request,
        student,
        approvals,
      });
    } catch (error) {
      console.error("Get request error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Approval routes
  app.post("/api/approvals/:requestId/approve", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params;
      const { comments } = req.body;
      
      const request = await storage.getLeaveRequest(requestId);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      // Create approval record
      await storage.createApproval({
        leaveRequestId: requestId,
        approverId: req.userId!,
        approverRole: req.userRole as any,
        status: "approved",
        comments,
      });
      
      // Update request status based on role
      let newStatus = request.status;
      let newStep = request.currentApprovalStep;
      
      const statusMap = {
        mentor: { status: "mentor_approved", step: 3 },
        hod: { status: "hod_approved", step: 4 },
        principal: { status: "principal_approved", step: 5 },
        warden: { status: "approved", step: 6 },
      };
      
      if (req.userRole && req.userRole in statusMap) {
        const update = statusMap[req.userRole as keyof typeof statusMap];
        newStatus = update.status as any;
        newStep = update.step;
      }
      
      await storage.updateLeaveRequestStatus(requestId, newStatus, newStep);
      
      // If fully approved, generate QR code
      if (newStatus === "approved") {
        await QrCodeService.createQrCode(requestId);
      }
      
      res.json({ message: "Request approved successfully" });
    } catch (error) {
      console.error("Approve request error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/approvals/:requestId/reject", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params;
      const { comments } = req.body;
      
      await storage.createApproval({
        leaveRequestId: requestId,
        approverId: req.userId!,
        approverRole: req.userRole as any,
        status: "rejected",
        comments,
      });
      
      await storage.updateLeaveRequestStatus(requestId, "rejected", 0);
      
      res.json({ message: "Request rejected" });
    } catch (error) {
      console.error("Reject request error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // QR code routes
  app.get("/api/qr-codes/:requestId", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params;
      const request = await storage.getLeaveRequest(requestId);
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      if (request.status !== "approved") {
        return res.status(400).json({ message: "Request not approved yet" });
      }
      
      // Get or create QR code for this request
      let qrCode = await storage.getQrCodeByRequestId(requestId);
      let qrData: string;
      
      if (qrCode) {
        qrData = qrCode.qrData;
      } else {
        try {
          qrData = await QrCodeService.createQrCode(requestId);
          qrCode = await storage.getQrCodeByRequestId(requestId);
        } catch (error) {
          console.error("QR code creation failed:", error);
          return res.status(500).json({ message: "Failed to generate QR code" });
        }
      }
      
      res.json({ qrData, request, ...qrCode });
    } catch (error) {
      console.error("Get QR code error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/qr-codes/scan", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { qrData } = req.body;
      
      if (req.userRole !== "security") {
        return res.status(403).json({ message: "Only security can scan QR codes" });
      }
      
      const result = await QrCodeService.scanQrCode(qrData, req.userId!);
      
      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          leaveRequest: result.leaveRequest,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
        });
      }
    } catch (error) {
      console.error("Scan QR code error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", authMiddleware, async (req: Request, res: Response) => {
    try {
      let stats = {};
      
      if (req.userRole === "student") {
        const requests = await storage.getLeaveRequestsByStudent(req.userId!);
        const pending = requests.filter(r => r.status === "pending").length;
        const approved = requests.filter(r => r.status === "approved").length;
        
        stats = {
          pendingRequests: pending,
          approvedThisMonth: approved,
          totalRequests: requests.length,
        };
      } else if (req.userRole && ["mentor", "hod", "principal", "warden"].includes(req.userRole)) {
        const pendingRequests = await storage.getPendingRequestsByApprover(req.userId!, req.userRole!);
        const overdueReturns = await storage.getOverdueReturns();
        
        // Calculate real stats from actual data
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Get all approvals for this approver to calculate real stats
        const allApprovals = await storage.getApprovalsByApprover(req.userId!, req.userRole!);
        
        const approvedToday = allApprovals.filter((a: any) => 
          a.status === "approved" && 
          a.createdAt && a.createdAt >= todayStart
        ).length;
        
        const totalMonth = allApprovals.filter((a: any) => 
          a.createdAt && a.createdAt >= monthStart
        ).length;
        
        stats = {
          pending: pendingRequests.length,
          overdue: overdueReturns.length,
          totalMonth,
          approvedToday,
        };
      }
      
      res.json(stats);
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get approved requests for today
  app.get("/api/leave-requests/approved-today", authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!req.userRole || !["mentor", "hod", "principal", "warden"].includes(req.userRole)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Get all approvals by this approver from today
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const allApprovals = await storage.getApprovalsByApprover(req.userId!, req.userRole!);
      const todayApprovals = allApprovals.filter((a: any) => 
        a.status === "approved" && 
        a.createdAt && a.createdAt >= todayStart
      );

      // Get the leave requests for these approvals
      const approvedTodayRequests = [];
      for (const approval of todayApprovals) {
        const request = await storage.getLeaveRequest(approval.leaveRequestId);
        if (request) {
          const student = await storage.getUser(request.studentId);
          approvedTodayRequests.push({ ...request, student });
        }
      }

      res.json(approvedTodayRequests);
    } catch (error) {
      console.error("Get approved today requests error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get monthly total requests
  app.get("/api/leave-requests/month-total", authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!req.userRole || !["mentor", "hod", "principal", "warden"].includes(req.userRole)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Get all approvals by this approver from this month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const allApprovals = await storage.getApprovalsByApprover(req.userId!, req.userRole!);
      const monthApprovals = allApprovals.filter((a: any) => 
        a.createdAt && a.createdAt >= monthStart
      );

      // Get the leave requests for these approvals
      const monthlyRequests = [];
      for (const approval of monthApprovals) {
        const request = await storage.getLeaveRequest(approval.leaveRequestId);
        if (request) {
          const student = await storage.getUser(request.studentId);
          monthlyRequests.push({ ...request, student });
        }
      }

      res.json(monthlyRequests);
    } catch (error) {
      console.error("Get monthly total requests error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get overdue return requests
  app.get("/api/leave-requests/overdue", authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!req.userRole || !["mentor", "hod", "principal", "warden"].includes(req.userRole)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const overdueRequests = await storage.getOverdueReturns();
      
      // Add student information to each request
      const overdueWithStudents = [];
      for (const request of overdueRequests) {
        const student = await storage.getUser(request.studentId);
        overdueWithStudents.push({ ...request, student });
      }

      res.json(overdueWithStudents);
    } catch (error) {
      console.error("Get overdue requests error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Notification processing (would be called by a cron job)
  app.post("/api/notifications/process", async (req, res) => {
    try {
      await NotificationService.processNotifications();
      res.json({ message: "Notifications processed" });
    } catch (error) {
      console.error("Process notifications error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Clear all data (for development/testing)
  app.post("/api/data/clear", async (req, res) => {
    try {
      await storage.clearAllData();
      res.json({ message: "All data cleared successfully" });
    } catch (error) {
      console.error("Clear data error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
