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
import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";

export default function Login() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password || !formData.role) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Check dev credentials first
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

      // Use local storage as fallback when Firebase permissions are blocked
      let user;
      const sampleUserData: Record<string, any> = {
        "student1": { id: "student1-id", username: "student1", email: "student1@college.edu", role: "student", firstName: "John", lastName: "Doe", department: "Computer Science", studentId: "CS001", parentId: "parent1" },
        "mentor1": { id: "mentor1-id", username: "mentor1", email: "mentor1@college.edu", role: "mentor", firstName: "Dr. Jane", lastName: "Smith", department: "Computer Science" },
        "parent1": { id: "parent1-id", username: "parent1", email: "parent1@email.com", role: "parent", firstName: "Robert", lastName: "Doe", phone: "+1234567890" },
        "hod1": { id: "hod1-id", username: "hod1", email: "hod1@college.edu", role: "hod", firstName: "Dr. Michael", lastName: "Johnson", department: "Computer Science" },
        "principal1": { id: "principal1-id", username: "principal1", email: "principal@college.edu", role: "principal", firstName: "Dr. Sarah", lastName: "Wilson" },
        "warden1": { id: "warden1-id", username: "warden1", email: "warden1@college.edu", role: "warden", firstName: "Mr. David", lastName: "Brown" },
        "security1": { id: "security1-id", username: "security1", email: "security1@college.edu", role: "security", firstName: "Officer", lastName: "Garcia" },
      };
      
      user = sampleUserData[formData.username];
      
      if (!user || user.role !== formData.role) {
        throw new Error("Invalid credentials");
      }
      
      // Store user in localStorage for demo purposes
      localStorage.setItem('demoUser', JSON.stringify(user));
      
      login(user);
      
      toast({
        title: "Login Successful",
        description: `Welcome back, ${user.firstName || user.username}!`,
      });
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
            College Leave Portal
          </CardTitle>
          <CardDescription>
            Automated Leave Management System
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="userType">Login As</Label>
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
            
            <div>
              <Label htmlFor="username">Username</Label>
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
              <Label htmlFor="password">Password</Label>
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
              data-testid="button-login"
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <a href="#" className="text-sm text-primary hover:underline">
              Forgot Password?
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
