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
  signInWithPopup, 
  GoogleAuthProvider, 
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
  const { login } = useAuth();
  const { toast } = useToast();

  const handleEmailLogin = async () => {
    if (!formData.email || !formData.password || !formData.role) {
      toast({
        title: "Missing Information",
        description: "Please fill in email, password, and select your role",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      let firebaseUser;
      
      if (isSignUp) {
        // Create new account
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
        // Sign in existing user
        const result = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        firebaseUser = result.user;
      }
      
      // Create user profile or get existing one
      const userData = {
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
      
      // Send user data to backend to create/update user
      try {
        await apiRequest('POST', '/api/users', userData);
      } catch (error) {
        console.log('User might already exist, continuing with login');
      }
      
      login({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      toast({
        title: isSignUp ? "Account Created" : "Login Successful",
        description: `Welcome, ${userData.firstName || userData.username}!`,
      });
    } catch (error: any) {
      console.error("Email login error:", error);
      let errorMessage = "Authentication failed. Please try again.";
      
      if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email. Please sign up first.";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password. Please try again.";
      } else if (error.code === "auth/email-already-in-use") {
        errorMessage = "An account with this email already exists. Please sign in instead.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password should be at least 6 characters long.";
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

  const handleGoogleLogin = async () => {
    if (!formData.role) {
      toast({
        title: "Please Select Role",
        description: "Please select your role before signing in with Google",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      
      // Create user profile or get existing one
      const userData = {
        id: firebaseUser.uid,
        username: firebaseUser.email?.split('@')[0] || firebaseUser.displayName || 'user',
        email: firebaseUser.email || '',
        role: formData.role as (typeof userRoles)[number],
        firstName: firebaseUser.displayName?.split(' ')[0] || '',
        lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
        department: formData.department || undefined,
        studentId: formData.studentId || undefined,
        phone: formData.phone || undefined,
      };
      
      // Send user data to backend to create/update user
      try {
        await apiRequest('POST', '/api/users', userData);
      } catch (error) {
        console.log('User might already exist, continuing with login');
      }
      
      login({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      toast({
        title: "Login Successful",
        description: `Welcome, ${userData.firstName || userData.username}!`,
      });
    } catch (error: any) {
      console.error("Google login error:", error);
      let errorMessage = "Failed to sign in with Google. Please try again.";
      
      if (error.code === "auth/unauthorized-domain") {
        errorMessage = "This domain is not authorized for Google Sign-In. Please contact support or use email login.";
      }
      
      toast({
        title: "Login Failed",
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
            {isSignUp ? "Create Account" : "College Leave Portal"}
          </CardTitle>
          <CardDescription>
            {isSignUp ? "Join the Automated Leave Management System" : "Automated Leave Management System"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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

            {/* Email Login Fields */}
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
            
            {/* Email Login Button */}
            <Button 
              type="button" 
              className="w-full" 
              disabled={isLoading}
              onClick={handleEmailLogin}
              data-testid="button-email-login"
            >
              <Mail className="h-4 w-4 mr-2" />
              {isLoading ? "Processing..." : (isSignUp ? "Create Account" : "Sign In")}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            
            {/* Google Login Button */}
            <Button 
              type="button" 
              variant="outline"
              className="w-full" 
              disabled={isLoading}
              onClick={handleGoogleLogin}
              data-testid="button-google-login"
            >
              {isLoading ? "Signing in..." : "Sign in with Google"}
            </Button>
          </div>
          
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
              {isSignUp ? "Already have an account? Sign In" : "New user? Create an account"}
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