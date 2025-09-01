import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { userRoles } from "@shared/firebaseSchema";
import { Eye, EyeOff } from "lucide-react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function Login() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "",
    firstName: "",
    lastName: "",
    email: "",
    department: "",
    studentId: "",
    phone: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.username || !formData.password || !formData.role) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Additional validation for sign up
    if (isSignUp) {
      if (!formData.firstName || !formData.lastName || !formData.email) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields for account creation",
          variant: "destructive",
        });
        return;
      }
      
      if (formData.role === "student" && !formData.studentId) {
        toast({
          title: "Validation Error",
          description: "Student ID is required for student accounts",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);
    
    try {
      if (isSignUp) {
        // Handle user registration with Firebase
        try {
          // Create Firebase auth user
          const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
          const firebaseUser = userCredential.user;
          
          // Create user profile in Firestore
          const newUser = {
            id: firebaseUser.uid,
            username: formData.username,
            email: formData.email,
            role: formData.role as typeof userRoles[number],
            firstName: formData.firstName,
            lastName: formData.lastName,
            department: formData.department || undefined,
            studentId: formData.studentId || undefined,
            phone: formData.phone || undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Store user profile in Firestore
          await setDoc(doc(db, "users", firebaseUser.uid), newUser);
          
          // Store locally for immediate access
          localStorage.setItem("userProfile", JSON.stringify(newUser));
          
          login(newUser);
          
          toast({
            title: "Account Created Successfully",
            description: `Welcome, ${newUser.firstName}! Your account has been created.`,
          });
        } catch (firebaseError: any) {
          console.error("Firebase signup error:", firebaseError);
          
          // Fallback to local storage for development
          const newUser = {
            id: `${formData.username}-id`,
            username: formData.username,
            email: formData.email,
            role: formData.role as typeof userRoles[number],
            firstName: formData.firstName,
            lastName: formData.lastName,
            department: formData.department || undefined,
            studentId: formData.studentId || undefined,
            phone: formData.phone || undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Store new user locally as fallback
          const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
          existingUsers[formData.username] = {
            ...newUser,
            password: formData.password
          };
          localStorage.setItem('registeredUsers', JSON.stringify(existingUsers));
          
          login(newUser);
          
          toast({
            title: "Account Created Successfully",
            description: `Welcome, ${newUser.firstName}! Your account has been created (offline mode).`,
          });
        }
      } else {
        // Handle user login
        
        // First try Firebase authentication for registered users
        try {
          const userCredential = await signInWithEmailAndPassword(auth, formData.email || `${formData.username}@college.edu`, formData.password);
          const firebaseUser = userCredential.user;
          
          // Get user profile from Firestore
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role === formData.role) {
              const user = { id: firebaseUser.uid, ...userData } as any;
              localStorage.setItem("userProfile", JSON.stringify(user));
              login(user);
              
              toast({
                title: "Login Successful",
                description: `Welcome back, ${userData.firstName || userData.username}!`,
              });
              return;
            } else {
              throw new Error("Role mismatch");
            }
          } else {
            throw new Error("User profile not found");
          }
        } catch (firebaseError: any) {
          console.log("Firebase login failed, trying fallback methods:", firebaseError.message);
          
          // Fallback: Check registered users in localStorage
          const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
          const registeredUser = registeredUsers[formData.username];
          
          if (registeredUser && registeredUser.password === formData.password && registeredUser.role === formData.role) {
            login(registeredUser);
            toast({
              title: "Login Successful",
              description: `Welcome back, ${registeredUser.firstName || registeredUser.username}!`,
            });
            return;
          }

          // Final fallback: Check dev credentials
          const devCredentials: Record<string, { password: string; role: string }> = {
            "student1": { password: "password", role: "student" },
            "mentor1": { password: "password", role: "mentor" },
            "parent1": { password: "password", role: "parent" },
            "hod1": { password: "password", role: "hod" },
            "principal1": { password: "password", role: "principal" },
            "warden1": { password: "password", role: "warden" },
            "security1": { password: "password", role: "security" },
          };

          const credentials = devCredentials[formData.username];
          if (!credentials || credentials.password !== formData.password || credentials.role !== formData.role) {
            throw new Error("Invalid credentials");
          }

          // Use sample user data for dev accounts
          const sampleUserData: Record<string, any> = {
            "student1": { id: "student1-id", username: "student1", email: "student1@college.edu", role: "student", firstName: "John", lastName: "Doe", department: "Computer Science", studentId: "CS001", parentId: "parent1" },
            "mentor1": { id: "mentor1-id", username: "mentor1", email: "mentor1@college.edu", role: "mentor", firstName: "Dr. Jane", lastName: "Smith", department: "Computer Science" },
            "parent1": { id: "parent1-id", username: "parent1", email: "parent1@email.com", role: "parent", firstName: "Robert", lastName: "Doe", phone: "+1234567890" },
            "hod1": { id: "hod1-id", username: "hod1", email: "hod1@college.edu", role: "hod", firstName: "Dr. Michael", lastName: "Johnson", department: "Computer Science" },
            "principal1": { id: "principal1-id", username: "principal1", email: "principal@college.edu", role: "principal", firstName: "Dr. Sarah", lastName: "Wilson" },
            "warden1": { id: "warden1-id", username: "warden1", email: "warden1@college.edu", role: "warden", firstName: "Mr. David", lastName: "Brown" },
            "security1": { id: "security1-id", username: "security1", email: "security1@college.edu", role: "security", firstName: "Officer", lastName: "Garcia" },
          };
          
          const user = sampleUserData[formData.username];
          
          if (!user || user.role !== formData.role) {
            throw new Error("Invalid credentials");
          }
          
          login(user);
          
          toast({
            title: "Login Successful",
            description: `Welcome back, ${user.firstName || user.username}! (Demo mode)`,
          });
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login Failed",
        description: "Invalid credentials. Please check your username, password, and role.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-accent flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary mb-2">
            {isSignUp ? "Create Account" : "College Leave Portal"}
          </CardTitle>
          <CardDescription>
            {isSignUp ? "Join the Automated Leave Management System" : "Automated Leave Management System"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="userType">{isSignUp ? "Account Type" : "Login As"}</Label>
              <Select value={formData.role} onValueChange={(value) => handleInputChange("role", value)}>
                <SelectTrigger data-testid="select-role">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  {userRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role === "hod" ? "Head of Department" : 
                       role === "mentor" ? "Department Mentor" :
                       role === "warden" ? "Hostel Warden" :
                       role.charAt(0).toUpperCase() + role.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {isSignUp && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="Enter first name"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange("firstName", e.target.value)}
                      data-testid="input-firstName"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Enter last name"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange("lastName", e.target.value)}
                      data-testid="input-lastName"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    data-testid="input-email"
                  />
                </div>
                
                {formData.role === "student" && (
                  <div>
                    <Label htmlFor="studentId">Student ID *</Label>
                    <Input
                      id="studentId"
                      type="text"
                      placeholder="Enter student ID"
                      value={formData.studentId}
                      onChange={(e) => handleInputChange("studentId", e.target.value)}
                      data-testid="input-studentId"
                    />
                  </div>
                )}
                
                {(formData.role === "student" || formData.role === "mentor" || formData.role === "hod") && (
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      type="text"
                      placeholder="Enter department"
                      value={formData.department}
                      onChange={(e) => handleInputChange("department", e.target.value)}
                      data-testid="input-department"
                    />
                  </div>
                )}
                
                {formData.role === "parent" && (
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter phone number"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      data-testid="input-phone"
                    />
                  </div>
                )}
              </>
            )}
            
            <div>
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter username"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                data-testid="input-username"
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  data-testid="input-password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
              data-testid={isSignUp ? "button-signup" : "button-login"}
            >
              {isLoading ? (isSignUp ? "Creating Account..." : "Logging in...") : (isSignUp ? "Create Account" : "Login")}
            </Button>
          </form>
          
          <div className="mt-6 text-center space-y-2">
            <Button
              variant="link"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setFormData({
                  username: "",
                  password: "",
                  role: "",
                  firstName: "",
                  lastName: "",
                  email: "",
                  department: "",
                  studentId: "",
                  phone: "",
                });
              }}
              data-testid="button-toggle-mode"
            >
              {isSignUp ? "Already have an account? Login" : "New user? Create an account"}
            </Button>
            
            {!isSignUp && (
              <div>
                <a href="#" className="text-sm text-primary hover:underline">
                  Forgot Password?
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
