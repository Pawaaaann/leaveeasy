import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { userRoles } from "@shared/schema";
import { Eye, EyeOff, Mail } from "lucide-react";
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { auth } from "@/lib/firebase";

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
  const [isPasswordSetup, setIsPasswordSetup] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [existingUserData, setExistingUserData] = useState<any>(null);
  const { login } = useAuth();
  const { toast } = useToast();

  const handleEmailLogin = async () => {
    // Handle admin login separately
    if (formData.role === "admin") {
      if (!formData.username || !formData.password) {
        toast({
          title: "Missing Information",
          description: "Please enter admin username and password",
          variant: "destructive",
        });
        return;
      }

      if (formData.username === "admin" && formData.password === "admin1234") {
        const adminUser = {
          id: "admin-user",
          username: "admin",
          email: "admin@college.edu",
          role: "admin" as const,
          firstName: "Admin",
          lastName: "User",
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        login(adminUser);
        
        toast({
          title: "Admin Login Successful",
          description: "Welcome, Administrator!",
        });
        return;
      } else {
        toast({
          title: "Invalid Credentials",
          description: "Invalid admin username or password",
          variant: "destructive",
        });
        return;
      }
    }

    if (!formData.email || !formData.password || !formData.role) {
      toast({
        title: "Missing Information",
        description: "Please fill in email, password, and select your role",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    // For non-student roles, check if user exists in database first
    if (formData.role !== "student") {
      try {
        const response = await fetch(`/api/users/check/${encodeURIComponent(formData.email)}`);
        const { exists, user: existingUser } = await response.json();
        
        if (!exists) {
          toast({
            title: "Account Not Found",
            description: "Your account needs to be created by an administrator. Please contact the admin.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        
        if (existingUser.role !== formData.role) {
          toast({
            title: "Role Mismatch",
            description: `Your account is registered as ${existingUser.role}. Please select the correct role.`,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.error("Error checking user existence:", error);
        toast({
          title: "Error",
          description: "Unable to verify account. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
    }
    
    try {
      let firebaseUser;
      
      if (isSignUp && formData.role === "student") {
        // Create new account - only for students
        if (!formData.firstName) {
          toast({
            title: "Missing Information",
            description: "Please enter your first name for account creation",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        
        const result = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        firebaseUser = result.user;
      } else {
        // Sign in existing user or create Firebase account for admin-created users
        try {
          const result = await signInWithEmailAndPassword(auth, formData.email, formData.password);
          firebaseUser = result.user;
        } catch (authError: any) {
          // Handle different authentication scenarios for admin-created users
          if ((authError.code === "auth/user-not-found" || authError.code === "auth/invalid-credential") && formData.role !== "student") {
            try {
              // Check if user exists in our database
              const response = await fetch(`/api/users/check/${encodeURIComponent(formData.email)}`);
              const { exists, user: dbUser } = await response.json();
              
              if (exists && dbUser) {
                // User exists in database but not in Firebase or wrong password
                // Switch to password setup mode
                setExistingUserData(dbUser);
                setIsPasswordSetup(true);
                setIsLoading(false);
                
                toast({
                  title: "Password Setup Required",
                  description: "Please set up your password to access your account.",
                });
                return;
              }
            } catch (checkError) {
              console.error("Error checking user existence:", checkError);
            }
          }
          
          // If it's auth/user-not-found and they exist in database, create Firebase account
          if (authError.code === "auth/user-not-found" && formData.role !== "student") {
            try {
              console.log("Creating Firebase account for admin-created user with email:", formData.email);
              const result = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
              firebaseUser = result.user;
              
              toast({
                title: "Account Setup Complete",
                description: "Your Firebase authentication has been set up successfully.",
              });
            } catch (createError: any) {
              console.error("Failed to create Firebase account:", createError);
              throw authError; // Re-throw original error
            }
          } else {
            throw authError; // Re-throw if it's not a user-not-found error
          }
        }
      }
      
      // For admin-created users, get the existing user data from database
      let userData;
      if (formData.role !== "student") {
        try {
          const response = await fetch(`/api/users/check/${encodeURIComponent(formData.email)}`);
          const { exists, user: existingUser } = await response.json();
          
          if (exists && existingUser) {
            // Use existing user data from database, but update the Firebase UID
            userData = {
              ...existingUser,
              id: firebaseUser.uid,
            };
            console.log("Using existing user data from database:", userData);
          } else {
            // Fallback to constructed data (shouldn't happen for admin-created users)
            userData = {
              id: firebaseUser.uid,
              username: formData.username || firebaseUser.email?.split('@')[0] || 'user',
              email: firebaseUser.email || '',
              role: formData.role as (typeof userRoles)[number],
              firstName: formData.firstName || '',
              lastName: formData.lastName || '',
              department: formData.department || undefined,
              studentId: formData.studentId || undefined,
              phone: formData.phone || undefined,
            };
          }
        } catch (error) {
          console.error("Error fetching existing user data:", error);
          // Fallback to constructed data
          userData = {
            id: firebaseUser.uid,
            username: formData.username || firebaseUser.email?.split('@')[0] || 'user',
            email: firebaseUser.email || '',
            role: formData.role as (typeof userRoles)[number],
            firstName: formData.firstName || '',
            lastName: formData.lastName || '',
            department: formData.department || undefined,
            studentId: formData.studentId || undefined,
            phone: formData.phone || undefined,
          };
        }
      } else {
        // For students, construct data from form
        userData = {
          id: firebaseUser.uid,
          username: formData.username || firebaseUser.email?.split('@')[0] || 'user',
          email: firebaseUser.email || '',
          role: formData.role as (typeof userRoles)[number],
          firstName: formData.firstName || '',
          lastName: formData.lastName || '',
          department: formData.department || undefined,
          studentId: formData.studentId || undefined,
          phone: formData.phone || undefined,
        };
      }
      
      // Send user data to backend to create/update user
      try {
        await apiRequest('POST', '/api/users', userData);
      } catch (error) {
        console.log('User might already exist, continuing with login');
      }
      
      const finalUserData = {
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      console.log("About to call login() with:", finalUserData);
      login(finalUserData);
      console.log("Login function called, should redirect now");
      
      toast({
        title: isSignUp ? "Account Created" : "Login Successful",
        description: `Welcome, ${userData.firstName || userData.username}!`,
      });
    } catch (error: any) {
      console.error("Email login error:", error);
      let errorMessage = "Authentication failed. Please try again.";
      
      if (error.code === "auth/user-not-found") {
        if (formData.role === "student") {
          errorMessage = "No account found with this email. Please sign up first.";
        } else {
          errorMessage = "No account found with this email. Please contact the admin to set up your account.";
        }
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password. Please try again.";
      } else if (error.code === "auth/email-already-in-use") {
        errorMessage = "An account with this email already exists. Please sign in instead.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password should be at least 6 characters long.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      }
      
      toast({
        title: isSignUp ? "Signup Failed" : "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  const handlePasswordSetup = async () => {
    if (!formData.password || formData.password.length < 6) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Create Firebase account with the new password
      console.log("Setting up Firebase account for:", formData.email);
      const result = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const firebaseUser = result.user;

      // Use the existing user data from database
      const userData = {
        ...existingUserData,
        id: firebaseUser.uid,
      };

      // Update user profile in backend
      try {
        await apiRequest('POST', '/api/users', userData);
      } catch (error) {
        console.log('User might already exist, continuing with login');
      }

      const finalUserData = {
        ...userData,
        createdAt: new Date(userData.createdAt),
        updatedAt: new Date(),
      };

      console.log("Password setup complete, logging in user:", finalUserData);
      login(finalUserData);

      toast({
        title: "Password Set Successfully",
        description: `Welcome, ${userData.firstName || userData.username}!`,
      });
    } catch (error: any) {
      console.error("Password setup error:", error);
      let errorMessage = "Failed to set up password. Please try again.";
      
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered. Please try signing in instead.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password should be at least 6 characters long.";
      }

      toast({
        title: "Password Setup Failed",
        description: errorMessage,
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
            {isPasswordSetup ? "Set Up Your Password" :
             isSignUp && formData.role === "student" ? "Create Student Account" : 
             "College Leave Portal"}
          </CardTitle>
          <CardDescription>
            {isPasswordSetup ? `Welcome ${existingUserData?.firstName || existingUserData?.username}! Please set up your password to access your ${existingUserData?.role} account.` :
             isSignUp && formData.role === "student" ? "Create your student account" :
             "Automated Leave Management System"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPasswordSetup ? (
            // Password Setup Form
            <div className="space-y-4">
              <div className="text-center text-sm text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                <p className="font-medium text-blue-700 dark:text-blue-300">Account Found!</p>
                <p className="text-blue-600 dark:text-blue-400 text-xs mt-1">
                  Email: {formData.email}<br />
                  Role: {existingUserData?.role?.charAt(0).toUpperCase() + existingUserData?.role?.slice(1)}
                  {existingUserData?.department && (
                    <><br />Department: {existingUserData.department}</>
                  )}
                </p>
              </div>
              
              <div>
                <Label htmlFor="setup-password">Choose Your Password</Label>
                <div className="relative">
                  <Input
                    id="setup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your new password (min 6 characters)"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    data-testid="input-setup-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-setup-password"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  data-testid="input-confirm-password"
                />
              </div>

              <Button 
                type="button" 
                className="w-full" 
                disabled={isLoading}
                onClick={handlePasswordSetup}
                data-testid="button-setup-password"
              >
                {isLoading ? "Setting Up..." : "Set Password & Login"}
              </Button>

              <div className="text-center">
                <Button
                  variant="link"
                  className="text-sm"
                  onClick={() => {
                    setIsPasswordSetup(false);
                    setExistingUserData(null);
                    setConfirmPassword("");
                    setFormData(prev => ({ ...prev, password: "" }));
                  }}
                  data-testid="button-back-to-login"
                >
                  ← Back to Login
                </Button>
              </div>
            </div>
          ) : (
            // Regular Login/Signup Form
            <div className="space-y-4">
              <div>
                <Label htmlFor="userType">{isSignUp ? "Account Type" : "Login As"}</Label>
                <Select value={formData.role} onValueChange={(value) => handleInputChange("role", value)}>
                  <SelectTrigger data-testid="select-role">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    {userRoles.filter(role => {
                      // For signup, only show student and admin roles
                      if (isSignUp && role !== "student" && role !== "admin") {
                        return false;
                      }
                      return true;
                    }).map((role) => (
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

              {/* Email/Username Login Fields */}
              {formData.role === "admin" ? (
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter admin username"
                  value={formData.username}
                  onChange={(e) => handleInputChange("username", e.target.value)}
                  data-testid="input-admin-username"
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  data-testid="input-email"
                />
              </div>
            )}

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  data-testid="input-password"
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
            
            {/* Show additional fields only for student signup */}
            {isSignUp && formData.role === "student" && (
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
                    <Label htmlFor="lastName">Last Name</Label>
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
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter username (optional)"
                    value={formData.username}
                    onChange={(e) => handleInputChange("username", e.target.value)}
                    data-testid="input-username"
                  />
                </div>
                
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
              </>
            )}
            
            {/* Email Login Button */}
            <Button 
              type="button" 
              className="w-full" 
              disabled={isLoading}
              onClick={handleEmailLogin}
              data-testid="button-email-login"
            >
              <Mail className="h-4 w-4 mr-2" />
              {isLoading ? "Processing..." : (
                isSignUp && formData.role === "student" ? "Create Student Account" :
                isSignUp ? "Account Setup" :
                "Sign In"
              )}
            </Button>
            
            <div className="mt-6 text-center space-y-2">
            {/* Only show signup toggle for students */}
            {(formData.role === "student" || !formData.role) && (
              <Button
                variant="link"
                className="text-sm"
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
                {isSignUp ? "Already have an account? Sign In" : "Need a student account? Create one"}
              </Button>
            )}
            
            {/* Warning for non-student roles */}
            {formData.role && formData.role !== "student" && formData.role !== "admin" && (
              <div className="text-sm text-center text-muted-foreground border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800 p-3 rounded-md">
                <p className="font-medium text-orange-700 dark:text-orange-300 mb-1">
                  Account Required
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  {formData.role.charAt(0).toUpperCase() + formData.role.slice(1)} accounts must be created by an administrator.
                  Please contact the admin to set up your account first.
                </p>
              </div>
            )}
            
            {!isSignUp && (
              <div>
                <a href="#" className="text-sm text-primary hover:underline">
                  Forgot Password?
                </a>
              </div>
            )}
            </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}