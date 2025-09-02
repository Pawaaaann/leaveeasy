import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage, initializeSampleData } from "./storage";
import { QrCodeService } from "./services/qrCodeService";
import { NotificationService } from "./services/notificationService";
import { insertLeaveRequestSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";

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
  // Initialize sample data on startup
  initializeSampleData().catch(console.error);

  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.json(existingUser); // Return existing user
      }
      
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      console.error("Create user error:", error);
      res.status(400).json({ message: "Invalid user data" });
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

  // Parent confirmation route
  app.post("/api/parent/confirm/:requestId", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params;
      const { confirmed } = req.body;
      
      if (req.userRole !== "parent") {
        return res.status(403).json({ message: "Only parents can confirm" });
      }
      
      if (confirmed) {
        await storage.updateLeaveRequestStatus(requestId, "parent_confirmed", 3);
      } else {
        await storage.updateLeaveRequestStatus(requestId, "rejected", 0);
      }
      
      res.json({ message: confirmed ? "Leave confirmed" : "Leave rejected" });
    } catch (error) {
      console.error("Parent confirmation error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Parent notification route
  app.post("/api/notifications/parent/:requestId", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params;
      const { phoneNumber, studentName, leaveDetails } = req.body;
      
      if (!phoneNumber || !studentName || !leaveDetails) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Send SMS notification to parent
      await NotificationService.notifyParentBySMS(
        phoneNumber,
        requestId,
        studentName,
        leaveDetails
      );
      
      res.json({ 
        message: "SMS notification sent successfully",
        phoneNumber: phoneNumber
      });
    } catch (error) {
      console.error("Parent notification error:", error);
      res.status(500).json({ message: "Failed to send notification" });
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
      
      // Generate QR code if it doesn't exist
      let qrData: string;
      try {
        qrData = await QrCodeService.createQrCode(requestId);
      } catch (error) {
        console.error("QR code creation failed:", error);
        return res.status(500).json({ message: "Failed to generate QR code" });
      }
      
      res.json({ qrData, request });
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

  const httpServer = createServer(app);
  return httpServer;
}
