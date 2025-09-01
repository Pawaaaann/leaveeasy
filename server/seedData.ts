import { storage } from "./firebaseStorage";
import type { InsertUser } from "@shared/firebaseSchema";

export async function seedSampleUsers() {
  const sampleUsers: InsertUser[] = [
    {
      username: "student1",
      email: "student1@college.edu",
      role: "student",
      firstName: "John",
      lastName: "Doe",
      department: "Computer Science",
      studentId: "CS001",
      parentId: "parent1",
    },
    {
      username: "mentor1",
      email: "mentor1@college.edu", 
      role: "mentor",
      firstName: "Dr. Jane",
      lastName: "Smith",
      department: "Computer Science",
    },
    {
      username: "parent1",
      email: "parent1@email.com",
      role: "parent",
      firstName: "Robert",
      lastName: "Doe",
      phone: "+1234567890",
    },
    {
      username: "hod1",
      email: "hod1@college.edu",
      role: "hod",
      firstName: "Dr. Michael",
      lastName: "Johnson",
      department: "Computer Science",
    },
    {
      username: "principal1",
      email: "principal@college.edu",
      role: "principal",
      firstName: "Dr. Sarah",
      lastName: "Wilson",
    },
    {
      username: "warden1",
      email: "warden1@college.edu",
      role: "warden",
      firstName: "Mr. David",
      lastName: "Brown",
    },
    {
      username: "security1",
      email: "security1@college.edu",
      role: "security",
      firstName: "Officer",
      lastName: "Garcia",
    },
  ];

  try {
    for (const userData of sampleUsers) {
      const existingUser = await storage.getUserByUsername(userData.username);
      if (!existingUser) {
        await storage.createUser(userData);
        console.log(`Created user: ${userData.username}`);
      } else {
        console.log(`User already exists: ${userData.username}`);
      }
    }
    console.log("Sample users seeded successfully");
  } catch (error) {
    console.error("Error seeding users:", error);
  }
}

// Simple login credentials for development (in production, use proper Firebase Auth)
export const devCredentials = {
  "student1": { password: "password", role: "student" },
  "mentor1": { password: "password", role: "mentor" },
  "parent1": { password: "password", role: "parent" },
  "hod1": { password: "password", role: "hod" },
  "principal1": { password: "password", role: "principal" },
  "warden1": { password: "password", role: "warden" },
  "security1": { password: "password", role: "security" },
};