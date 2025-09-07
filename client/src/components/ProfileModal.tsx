import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, MapPin, Mail, Phone, Calendar, GraduationCap, Shield } from "lucide-react";
import { User as UserType } from "@shared/schema";

interface ProfileModalProps {
  user: UserType;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ user, isOpen, onClose }: ProfileModalProps) {
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'student':
        return <GraduationCap className="h-4 w-4" />;
      case 'admin':
        return <Shield className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const formatRole = (role: string) => {
    const roleMap = {
      'student': 'Student',
      'mentor': 'Mentor',
      'hod': 'Head of Department',
      'principal': 'Principal',
      'warden': 'Warden',
      'parent': 'Parent',
      'security': 'Security',
      'admin': 'Administrator'
    };
    return roleMap[role as keyof typeof roleMap] || role.charAt(0).toUpperCase() + role.slice(1);
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-profile">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            User Profile
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* User Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{user.firstName || 'N/A'} {user.lastName || ''}</span>
                <Badge variant="outline" className="flex items-center gap-1">
                  {getRoleIcon(user.role)}
                  {formatRole(user.role)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Username */}
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Username</p>
                  <p className="text-sm text-muted-foreground">{user.username || 'N/A'}</p>
                </div>
              </div>

              {/* Email */}
              {user.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              )}

              {/* Phone */}
              {user.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">{user.phone}</p>
                  </div>
                </div>
              )}

              {/* Department */}
              {user.department && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Department</p>
                    <p className="text-sm text-muted-foreground">{user.department}</p>
                  </div>
                </div>
              )}

              {/* Student ID */}
              {user.studentId && (
                <div className="flex items-center gap-3">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Student ID</p>
                    <p className="text-sm text-muted-foreground">{user.studentId}</p>
                  </div>
                </div>
              )}

              {/* Created Date */}
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Member Since</p>
                  <p className="text-sm text-muted-foreground">{formatDate(user.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Close Button */}
          <div className="flex justify-end">
            <Button onClick={onClose} data-testid="button-close-profile">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}