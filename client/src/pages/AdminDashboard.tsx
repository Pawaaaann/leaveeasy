import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Users, FileText, Settings, BarChart3 } from "lucide-react";
import { User, LeaveRequest } from "@shared/schema";

export default function AdminDashboard() {
  const { user, logout } = useAuth();

  // Fetch system statistics
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: user?.role === 'admin'
  });

  const { data: leaveRequests } = useQuery<LeaveRequest[]>({
    queryKey: ['/api/leave-requests'],
    enabled: user?.role === 'admin'
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-primary">Admin Dashboard</h1>
            <Badge variant="secondary">Administrator</Badge>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.firstName || user?.username}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={logout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="grid gap-6">
          {/* Statistics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card data-testid="card-total-users">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-users">
                  {users?.length ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Registered in the system
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-requests">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Leave Requests</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-requests">
                  {leaveRequests?.length ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total requests submitted
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-pending-requests">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-pending-requests">
                  {leaveRequests?.filter((req: LeaveRequest) => req.status === 'pending' || req.status.includes('approved')).length ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting approval
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-approved-requests">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approved Requests</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-approved-requests">
                  {leaveRequests?.filter((req: LeaveRequest) => req.status === 'approved').length ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Fully approved
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Admin Management Sections */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* User Management */}
            <Card data-testid="card-user-management">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage system users and their roles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {users?.slice(0, 5).map((user: User) => (
                    <div key={user.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1">
                        <div className="font-medium" data-testid={`text-username-${user.id}`}>
                          {user.firstName} {user.lastName} ({user.username})
                        </div>
                        <div className="text-sm text-muted-foreground" data-testid={`text-role-${user.id}`}>
                          {user.role} {user.department && `• ${user.department}`}
                        </div>
                      </div>
                      <Badge variant="outline" data-testid={`badge-role-${user.id}`}>
                        {user.role}
                      </Badge>
                    </div>
                  ))}
                </div>
                {users && users.length > 5 && (
                  <p className="text-sm text-muted-foreground">
                    And {users.length - 5} more users...
                  </p>
                )}
                <Button variant="outline" className="w-full" data-testid="button-manage-users">
                  Manage All Users
                </Button>
              </CardContent>
            </Card>

            {/* Leave Request Management */}
            <Card data-testid="card-leave-management">
              <CardHeader>
                <CardTitle>Leave Request Overview</CardTitle>
                <CardDescription>
                  Recent leave requests and their status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {leaveRequests?.slice(0, 5).map((request: LeaveRequest) => (
                    <div key={request.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1">
                        <div className="font-medium" data-testid={`text-reason-${request.id}`}>
                          {request.reason}
                        </div>
                        <div className="text-sm text-muted-foreground" data-testid={`text-dates-${request.id}`}>
                          {new Date(request.fromDate).toLocaleDateString()} - {new Date(request.toDate).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge 
                        variant={request.status === 'approved' ? 'default' : 
                                request.status === 'rejected' ? 'destructive' : 'secondary'}
                        data-testid={`badge-status-${request.id}`}
                      >
                        {request.status}
                      </Badge>
                    </div>
                  ))}
                </div>
                {leaveRequests && leaveRequests.length > 5 && (
                  <p className="text-sm text-muted-foreground">
                    And {leaveRequests.length - 5} more requests...
                  </p>
                )}
                <Button variant="outline" className="w-full" data-testid="button-manage-requests">
                  View All Requests
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* System Management */}
          <Card data-testid="card-system-management">
            <CardHeader>
              <CardTitle>System Management</CardTitle>
              <CardDescription>
                Administrative tools and system configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <Button variant="outline" className="h-auto p-4" data-testid="button-manage-roles">
                  <div className="text-center">
                    <Users className="h-6 w-6 mx-auto mb-2" />
                    <div className="font-medium">Manage Roles</div>
                    <div className="text-sm text-muted-foreground">User permissions</div>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4" data-testid="button-system-settings">
                  <div className="text-center">
                    <Settings className="h-6 w-6 mx-auto mb-2" />
                    <div className="font-medium">System Settings</div>
                    <div className="text-sm text-muted-foreground">Configuration</div>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4" data-testid="button-reports">
                  <div className="text-center">
                    <BarChart3 className="h-6 w-6 mx-auto mb-2" />
                    <div className="font-medium">Reports</div>
                    <div className="text-sm text-muted-foreground">Analytics & insights</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}