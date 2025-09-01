import crypto from "crypto";
import { storage } from "../firebaseStorage";
import type { InsertQrCode } from "@shared/firebaseSchema";

export class QrCodeService {
  static generateQrData(leaveRequestId: string, studentId: string): string {
    const timestamp = Date.now();
    const hash = crypto
      .createHash("sha256")
      .update(`${leaveRequestId}-${studentId}-${timestamp}`)
      .digest("hex");
    return `LEAVE-${hash.substring(0, 16).toUpperCase()}`;
  }

  static async createQrCode(leaveRequestId: string): Promise<string> {
    const leaveRequest = await storage.getLeaveRequest(leaveRequestId);
    if (!leaveRequest) {
      throw new Error("Leave request not found");
    }

    const qrData = this.generateQrData(leaveRequestId, leaveRequest.studentId);
    
    // QR code expires at the end of the leave period
    const expiresAt = new Date(leaveRequest.toDate);
    expiresAt.setHours(23, 59, 59, 999);

    const qrCodeData: InsertQrCode = {
      leaveRequestId,
      qrData,
      expiresAt,
    };

    await storage.createQrCode(qrCodeData);
    return qrData;
  }

  static async validateQrCode(qrData: string): Promise<{
    valid: boolean;
    message: string;
    leaveRequest?: any;
    qrCode?: any;
  }> {
    const qrCode = await storage.getQrCodeByData(qrData);
    
    if (!qrCode) {
      return { valid: false, message: "Invalid QR code" };
    }

    if (qrCode.isUsed) {
      return { valid: false, message: "QR code has already been used" };
    }

    if (new Date() > qrCode.expiresAt) {
      return { valid: false, message: "QR code has expired" };
    }

    const leaveRequest = await storage.getLeaveRequest(qrCode.leaveRequestId);
    if (!leaveRequest || leaveRequest.status !== "approved") {
      return { valid: false, message: "Leave request is not approved" };
    }

    return {
      valid: true,
      message: "QR code is valid",
      leaveRequest,
      qrCode,
    };
  }

  static async scanQrCode(qrData: string, scannedBy: string): Promise<{
    success: boolean;
    message: string;
    leaveRequest?: any;
  }> {
    const validation = await this.validateQrCode(qrData);
    
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }

    // Mark QR code as used
    await storage.markQrCodeAsUsed(validation.qrCode!.id, scannedBy);

    return {
      success: true,
      message: "Student exit confirmed",
      leaveRequest: validation.leaveRequest,
    };
  }
}
