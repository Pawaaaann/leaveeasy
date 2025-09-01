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
import { Eye, EyeOff } from "lucide-react";
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
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
      toast({
        title: "Login Failed",
        description: error.message || "Failed to sign in with Google. Please try again.",
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
            
            <Button 
              type="button" 
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
