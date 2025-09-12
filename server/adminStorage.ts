// Admin-specific Firebase storage that uses Firebase Admin SDK directly
// This bypasses security rules and provides full admin access to Firebase data

import { adminDb } from './firebaseAdmin';
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
} from '@shared/schema';

export class AdminFirebaseStorage {
  private convertTimestamps(data: any): any {
    if (!data) return data;
    
    const converted = { ...data };
    
    // Convert Firestore Timestamps to Date objects
    if (converted.createdAt && typeof converted.createdAt.toDate === 'function') {
      converted.createdAt = converted.createdAt.toDate();
    }
    if (converted.updatedAt && typeof converted.updatedAt.toDate === 'function') {
      converted.updatedAt = converted.updatedAt.toDate();
    }
    if (converted.submittedAt && typeof converted.submittedAt.toDate === 'function') {
      converted.submittedAt = converted.submittedAt.toDate();
    }
    if (converted.leaveStartDate && typeof converted.leaveStartDate.toDate === 'function') {
      converted.leaveStartDate = converted.leaveStartDate.toDate();
    }
    if (converted.leaveEndDate && typeof converted.leaveEndDate.toDate === 'function') {
      converted.leaveEndDate = converted.leaveEndDate.toDate();
    }
    if (converted.approvedAt && typeof converted.approvedAt.toDate === 'function') {
      converted.approvedAt = converted.approvedAt.toDate();
    }
    if (converted.scannedAt && typeof converted.scannedAt.toDate === 'function') {
      converted.scannedAt = converted.scannedAt.toDate();
    }
    if (converted.expiresAt && typeof converted.expiresAt.toDate === 'function') {
      converted.expiresAt = converted.expiresAt.toDate();
    }
    if (converted.sentAt && typeof converted.sentAt.toDate === 'function') {
      converted.sentAt = converted.sentAt.toDate();
    }
    
    return converted;
  }

  // Direct Firebase Admin SDK operations - bypasses all security rules

  async getAllUsers(): Promise<User[]> {
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }

    try {
      console.log('Admin: Fetching all users via Firebase Admin SDK...');
      const snapshot = await adminDb.collection(COLLECTIONS.USERS).get();
      const users = snapshot.docs.map((doc: any) => 
        this.convertTimestamps({ id: doc.id, ...doc.data() })
      ) as User[];
      console.log(`Admin: Successfully fetched ${users.length} users`);
      return users;
    } catch (error) {
      console.error('Admin: Error fetching all users:', error);
      throw error;
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }

    try {
      const userDoc = await adminDb.collection(COLLECTIONS.USERS).doc(id).get();
      if (userDoc.exists) {
        return this.convertTimestamps({ id: userDoc.id, ...userDoc.data() }) as User;
      }
      return undefined;
    } catch (error) {
      console.error('Admin: Error getting user:', error);
      throw error;
    }
  }

  async createUser(userData: InsertUser): Promise<User> {
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }

    try {
      const now = new Date();
      const userWithTimestamps = {
        ...userData,
        createdAt: now,
        updatedAt: now,
      };

      console.log('Admin: Creating user via Firebase Admin SDK...');
      const docRef = await adminDb.collection(COLLECTIONS.USERS).add(userWithTimestamps);
      const newUser = { id: docRef.id, ...userWithTimestamps } as User;
      console.log(`Admin: Successfully created user ${newUser.username}`);
      return newUser;
    } catch (error) {
      console.error('Admin: Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }

    try {
      const updateData = {
        ...userData,
        updatedAt: new Date(),
      };
      
      console.log(`Admin: Updating user ${id} via Firebase Admin SDK...`);
      await adminDb.collection(COLLECTIONS.USERS).doc(id).update(updateData);
      
      // Get updated user
      const updatedUser = await this.getUser(id);
      if (!updatedUser) {
        throw new Error(`User ${id} not found after update`);
      }
      console.log(`Admin: Successfully updated user ${updatedUser.username}`);
      return updatedUser;
    } catch (error) {
      console.error('Admin: Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }

    try {
      // First check if user exists
      const userDoc = await adminDb.collection(COLLECTIONS.USERS).doc(id).get();
      if (!userDoc.exists) {
        throw new Error(`User with ID ${id} not found`);
      }

      console.log(`Admin: Deleting user ${id} via Firebase Admin SDK...`);
      await adminDb.collection(COLLECTIONS.USERS).doc(id).delete();
      console.log(`Admin: Successfully deleted user with ID: ${id}`);
    } catch (error) {
      console.error('Admin: Error deleting user:', error);
      throw error;
    }
  }

  async getAllLeaveRequests(): Promise<LeaveRequest[]> {
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }

    try {
      console.log('Admin: Fetching all leave requests via Firebase Admin SDK...');
      const snapshot = await adminDb.collection(COLLECTIONS.LEAVE_REQUESTS)
        .orderBy('submittedAt', 'desc')
        .get();
      
      const requests = snapshot.docs.map((doc: any) => 
        this.convertTimestamps({ id: doc.id, ...doc.data() })
      ) as LeaveRequest[];
      console.log(`Admin: Successfully fetched ${requests.length} leave requests`);
      return requests;
    } catch (error) {
      console.error('Admin: Error fetching leave requests:', error);
      throw error;
    }
  }

  async getLeaveRequest(id: string): Promise<LeaveRequest | undefined> {
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }

    try {
      const requestDoc = await adminDb.collection(COLLECTIONS.LEAVE_REQUESTS).doc(id).get();
      if (requestDoc.exists) {
        return this.convertTimestamps({ id: requestDoc.id, ...requestDoc.data() }) as LeaveRequest;
      }
      return undefined;
    } catch (error) {
      console.error('Admin: Error getting leave request:', error);
      throw error;
    }
  }

  async updateLeaveRequestStatus(id: string, status: string, currentStep: number): Promise<void> {
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }

    try {
      console.log(`Admin: Updating leave request ${id} status to ${status} via Firebase Admin SDK...`);
      const updateData = {
        status,
        currentApprovalStep: currentStep,
        updatedAt: new Date(),
      };
      
      await adminDb.collection(COLLECTIONS.LEAVE_REQUESTS).doc(id).update(updateData);
      console.log(`Admin: Successfully updated leave request ${id} status`);
    } catch (error) {
      console.error('Admin: Error updating leave request status:', error);
      throw error;
    }
  }

  async createLeaveRequest(requestData: InsertLeaveRequest): Promise<LeaveRequest> {
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }

    try {
      const now = new Date();
      const requestWithTimestamps = {
        ...requestData,
        status: "pending",
        currentApprovalStep: 1,
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      
      console.log('Admin: Creating leave request via Firebase Admin SDK...');
      const docRef = await adminDb.collection(COLLECTIONS.LEAVE_REQUESTS).add(requestWithTimestamps);
      const newRequest = { id: docRef.id, ...requestWithTimestamps } as LeaveRequest;
      console.log(`Admin: Successfully created leave request ${newRequest.id}`);
      return newRequest;
    } catch (error) {
      console.error('Admin: Error creating leave request:', error);
      throw error;
    }
  }

  // Utility methods for admin panel data management
  async clearAllData(): Promise<void> {
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }

    try {
      console.log('Admin: Clearing all data via Firebase Admin SDK...');
      
      // Delete all users
      const usersSnapshot = await adminDb.collection(COLLECTIONS.USERS).get();
      const deleteUsersPromises = usersSnapshot.docs.map((doc: any) => doc.ref.delete());
      await Promise.all(deleteUsersPromises);
      
      // Delete all leave requests
      const requestsSnapshot = await adminDb.collection(COLLECTIONS.LEAVE_REQUESTS).get();
      const deleteRequestsPromises = requestsSnapshot.docs.map((doc: any) => doc.ref.delete());
      await Promise.all(deleteRequestsPromises);
      
      // Delete all approvals
      const approvalsSnapshot = await adminDb.collection(COLLECTIONS.APPROVALS).get();
      const deleteApprovalsPromises = approvalsSnapshot.docs.map((doc: any) => doc.ref.delete());
      await Promise.all(deleteApprovalsPromises);
      
      console.log('Admin: Successfully cleared all data');
    } catch (error) {
      console.error('Admin: Error clearing all data:', error);
      throw error;
    }
  }

  async getCollectionStats(): Promise<{
    users: number;
    leaveRequests: number;
    approvals: number;
    qrCodes: number;
    notifications: number;
  }> {
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }

    try {
      console.log('Admin: Getting collection statistics via Firebase Admin SDK...');
      
      const [users, requests, approvals, qrCodes, notifications] = await Promise.all([
        adminDb.collection(COLLECTIONS.USERS).get(),
        adminDb.collection(COLLECTIONS.LEAVE_REQUESTS).get(),
        adminDb.collection(COLLECTIONS.APPROVALS).get(),
        adminDb.collection(COLLECTIONS.QR_CODES).get(),
        adminDb.collection(COLLECTIONS.NOTIFICATIONS).get(),
      ]);

      const stats = {
        users: users.size,
        leaveRequests: requests.size,
        approvals: approvals.size,
        qrCodes: qrCodes.size,
        notifications: notifications.size,
      };

      console.log('Admin: Collection stats:', stats);
      return stats;
    } catch (error) {
      console.error('Admin: Error getting collection stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const adminStorage = new AdminFirebaseStorage();