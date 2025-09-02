import { storage } from "../storage";
import type { InsertNotification } from "@shared/schema";

export class NotificationService {
  static async notifyParent(
    parentId: string,
    leaveRequestId: string,
    studentName: string,
    leaveDetails: string
  ): Promise<void> {
    const message = `Your child ${studentName} has requested leave: ${leaveDetails}. Please confirm by replying YES or NO.`;
    
    const notification: InsertNotification = {
      userId: parentId,
      leaveRequestId,
      type: "sms",
      message,
    };

    await storage.createNotification(notification);
    // In a real implementation, integrate with SMS API here
    console.log(`SMS notification created for parent ${parentId}: ${message}`);
  }

  static async notifyParentBySMS(
    phoneNumber: string,
    leaveRequestId: string,
    studentName: string,
    leaveDetails: string
  ): Promise<void> {
    const message = `Your child ${studentName} has requested leave: ${leaveDetails}. Please confirm by replying YES or NO.`;
    
    const notification: InsertNotification = {
      userId: phoneNumber, // Using phone number as identifier for SMS
      leaveRequestId,
      type: "sms",
      message,
    };

    await storage.createNotification(notification);
    // SMS Service Integration Note: In production, integrate with SMS API like Twilio here
    // For now, this is simulated - the message would be sent to the parent's phone
    console.log(`SMS sent to ${phoneNumber}: ${message}`);
  }

  static async notifyApprover(
    approverId: string,
    leaveRequestId: string,
    studentName: string,
    leaveType: string
  ): Promise<void> {
    const message = `New leave request from ${studentName} requires your approval. Leave type: ${leaveType}`;
    
    const notification: InsertNotification = {
      userId: approverId,
      leaveRequestId,
      type: "email",
      message,
    };

    await storage.createNotification(notification);
    console.log(`Email notification created for approver ${approverId}: ${message}`);
  }

  static async notifyOverdueReturn(
    studentId: string,
    parentId: string,
    studentName: string,
    returnDate: string
  ): Promise<void> {
    const studentMessage = `Your leave period ended on ${returnDate}. Please report to college immediately.`;
    const parentMessage = `Your child ${studentName} has not returned to college after leave period ended on ${returnDate}.`;
    
    // Notify student
    await storage.createNotification({
      userId: studentId,
      type: "sms",
      message: studentMessage,
    });

    // Notify parent
    await storage.createNotification({
      userId: parentId,
      type: "sms",
      message: parentMessage,
    });

    console.log(`Overdue notifications created for student ${studentId} and parent ${parentId}`);
  }

  static async processNotifications(): Promise<void> {
    const pendingNotifications = await storage.getPendingNotifications();
    
    for (const notification of pendingNotifications) {
      try {
        if (notification.type === "email") {
          // Integrate with email service (Nodemailer, SendGrid, etc.)
          console.log(`Sending email to user ${notification.userId}: ${notification.message}`);
        } else if (notification.type === "sms") {
          // Integrate with SMS service (Twilio, AWS SNS, etc.)
          console.log(`Sending SMS to user ${notification.userId}: ${notification.message}`);
        }
        
        await storage.markNotificationAsSent(notification.id);
      } catch (error) {
        console.error(`Failed to send notification ${notification.id}:`, error);
      }
    }
  }
}
