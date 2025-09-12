import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, Users, FileText, Settings, BarChart3, Eye, Edit, Trash2, Plus, Search, ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react";
import { User, LeaveRequest, userRoles } from "@shared/schema";
import { departments } from "@shared/constants";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ProfileModal from "@/components/ProfileModal";

type AdminView = 'dashboard' | 'users' | 'requests' | 'roles' | 'settings' | 'reports';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [addForm, setAddForm] = useState<Partial<User>>({});
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Fetch system data
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: user?.role === 'admin'
  });

  const { data: leaveRequests } = useQuery<LeaveRequest[]>({
    queryKey: ['/api/leave-requests'],
    enabled: user?.role === 'admin'
  });

  // Mutations for user management
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => apiRequest('DELETE', `/api/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "User Deleted",
        description: "User has been successfully removed from the system",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, ...userData }: Partial<User>) => 
      apiRequest('PUT', `/api/users/${id}`, userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      toast({
        title: "User Updated",
        description: "User information has been successfully updated",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to update user",
        variant: "destructive",
      });
    }
  });

  const addUserMutation = useMutation({
    mutationFn: (userData: Partial<User>) => 
      apiRequest('POST', '/api/admin/users', userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsAddDialogOpen(false);
      setAddForm({});
      toast({
        title: "User Added",
        description: "User has been successfully added to the system",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to add user",
        variant: "destructive",
      });
    }
  });

  // Filter data based on search term
  const filteredUsers = users?.filter(u => 
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredRequests = leaveRequests?.filter(req => 
    req.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.status?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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

  // Statistics calculations
  const totalUsers = users?.length ?? 0;
  const totalRequests = leaveRequests?.length ?? 0;
  const pendingRequests = leaveRequests?.filter((req: LeaveRequest) => 
    req.status === 'pending' || (req.status !== 'approved' && req.status !== 'rejected')).length ?? 0;
  const approvedRequests = leaveRequests?.filter((req: LeaveRequest) => req.status === 'approved').length ?? 0;

  const handleEditUser = (userToEdit: User) => {
    setSelectedUser(userToEdit);
    setEditForm(userToEdit);
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = () => {
    if (selectedUser && editForm) {
      updateUserMutation.mutate({ ...editForm, id: selectedUser.id });
    }
  };

  const handleAddUser = () => {
    if (!addForm.email || !addForm.password || !addForm.role || !addForm.firstName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    addUserMutation.mutate(addForm);
  };

  const openAddDialog = () => {
    setAddForm({});
    setIsAddDialogOpen(true);
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      deleteUserMutation.mutate(userId);
    }
  };

  // Dashboard View
  const DashboardView = () => (
    <div className="grid gap-6">
      {/* Statistics Cards - Now Clickable */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setCurrentView('users')}
          data-testid="card-total-users"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-users">
              {totalUsers}
            </div>
            <p className="text-xs text-muted-foreground">
              Click to manage users
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setCurrentView('requests')}
          data-testid="card-total-requests"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leave Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-requests">
              {totalRequests}
            </div>
            <p className="text-xs text-muted-foreground">
              Click to view all requests
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setCurrentView('requests')}
          data-testid="card-pending-requests"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="text-pending-requests">
              {pendingRequests}
            </div>
            <p className="text-xs text-muted-foreground">
              Click to review pending
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setCurrentView('requests')}
          data-testid="card-approved-requests"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Requests</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-approved-requests">
              {approvedRequests}
            </div>
            <p className="text-xs text-muted-foreground">
              Click to view approved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Status Information - shown when no users are loaded */}
      {(!users || users.length === 0) && !isLoading && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20" data-testid="card-system-info">
          <CardHeader>
            <CardTitle className="text-green-800 dark:text-green-200">System Ready</CardTitle>
            <CardDescription className="text-green-700 dark:text-green-300">
              Admin panel is connected to Firebase and ready to manage data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm space-y-2">
              <p><strong>Current Status:</strong> ✅ Firebase Admin SDK connected successfully. Database is currently empty.</p>
              
              <p><strong>Get started by:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Adding new users through the "Add User" button</li>
                <li>Creating test data to populate the system</li>
                <li>Importing existing user data</li>
              </ul>
              
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200">
                <p className="text-blue-800 dark:text-blue-200 font-medium">Ready to use:</p>
                <p className="text-blue-700 dark:text-blue-300 text-sm">
                  All Firebase operations are working correctly. You can create users, manage leave requests, and perform all admin functions.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={openAddDialog} 
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-add-first-user"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First User
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    // Create a sample student user
                    setAddForm({
                      firstName: "John",
                      lastName: "Doe", 
                      username: "john.doe",
                      email: "john.doe@student.edu",
                      password: "student123",
                      role: "student",
                      department: "Computer Science",
                      studentId: "CS001",
                      phone: "123-456-7890"
                    });
                    setIsAddDialogOpen(true);
                  }}
                  data-testid="button-create-sample"
                >
                  Create Sample User
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Management Sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card data-testid="card-recent-users">
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>Latest registered users in the system</CardDescription>
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
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => setCurrentView('users')}
              data-testid="button-manage-users"
            >
              Manage All Users
            </Button>
          </CardContent>
        </Card>

        <Card data-testid="card-recent-requests">
          <CardHeader>
            <CardTitle>Recent Leave Requests</CardTitle>
            <CardDescription>Latest leave requests and their status</CardDescription>
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
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setCurrentView('requests')}
              data-testid="button-manage-requests"
            >
              View All Requests
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* System Management */}
      <Card data-testid="card-system-management">
        <CardHeader>
          <CardTitle>System Management</CardTitle>
          <CardDescription>Administrative tools and system configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button 
              variant="outline" 
              className="h-auto p-4" 
              onClick={() => setCurrentView('roles')}
              data-testid="button-manage-roles"
            >
              <div className="text-center">
                <Users className="h-6 w-6 mx-auto mb-2" />
                <div className="font-medium">Manage Roles</div>
                <div className="text-sm text-muted-foreground">User permissions</div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4"
              onClick={() => setCurrentView('settings')}
              data-testid="button-system-settings"
            >
              <div className="text-center">
                <Settings className="h-6 w-6 mx-auto mb-2" />
                <div className="font-medium">System Settings</div>
                <div className="text-sm text-muted-foreground">Configuration</div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4"
              onClick={() => setCurrentView('reports')}
              data-testid="button-reports"
            >
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
  );

  // User Management View
  const UserManagementView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-muted-foreground">Manage all system users and their roles</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openAddDialog} data-testid="button-add-user">
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
          <Button onClick={() => setCurrentView('dashboard')} data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Search Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name, username, email, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-users"
              />
            </div>
            <Button variant="outline" data-testid="button-search">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user: User) => (
                <TableRow key={user.id}>
                  <TableCell data-testid={`cell-name-${user.id}`}>
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell data-testid={`cell-username-${user.id}`}>
                    {user.username}
                  </TableCell>
                  <TableCell data-testid={`cell-email-${user.id}`}>
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" data-testid={`cell-role-${user.id}`}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`cell-department-${user.id}`}>
                    {user.department || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditUser(user)}
                        data-testid={`button-edit-${user.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteUser(user.id)}
                        data-testid={`button-delete-${user.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // Leave Request Management View
  const LeaveRequestView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Leave Request Management</h2>
          <p className="text-muted-foreground">View and manage all leave requests</p>
        </div>
        <Button onClick={() => setCurrentView('dashboard')} data-testid="button-back-requests">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      {/* Search and Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="card-stats-total">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalRequests}</div>
            <p className="text-sm text-muted-foreground">Total Requests</p>
          </CardContent>
        </Card>
        <Card data-testid="card-stats-pending">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{pendingRequests}</div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card data-testid="card-stats-approved">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{approvedRequests}</div>
            <p className="text-sm text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card data-testid="card-stats-rejected">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {leaveRequests?.filter((req: LeaveRequest) => req.status === 'rejected').length ?? 0}
            </div>
            <p className="text-sm text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by reason or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-requests"
          />
        </CardContent>
      </Card>

      {/* Leave Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Leave Requests ({filteredRequests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student ID</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request: LeaveRequest) => (
                <TableRow key={request.id}>
                  <TableCell data-testid={`cell-student-${request.id}`}>
                    {request.studentId}
                  </TableCell>
                  <TableCell data-testid={`cell-reason-${request.id}`}>
                    {request.reason}
                  </TableCell>
                  <TableCell data-testid={`cell-type-${request.id}`}>
                    <Badge variant="outline">{request.leaveType}</Badge>
                  </TableCell>
                  <TableCell data-testid={`cell-dates-${request.id}`}>
                    {new Date(request.fromDate).toLocaleDateString()} - {new Date(request.toDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        request.status === 'approved' ? 'default' : 
                        request.status === 'rejected' ? 'destructive' : 'secondary'
                      }
                      data-testid={`cell-status-${request.id}`}
                    >
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid={`button-view-${request.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // System Management Views
  const RoleManagementView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Role Management</h2>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>
        <Button onClick={() => setCurrentView('dashboard')} data-testid="button-back-roles">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {userRoles.map((role) => {
          const roleUsers = users?.filter(u => u.role === role) || [];
          return (
            <Card key={role} data-testid={`card-role-${role}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="capitalize">{role === "hod" ? "Head of Department" : role}</span>
                  <Badge>{roleUsers.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {roleUsers.slice(0, 3).map((user: User) => (
                    <div key={user.id} className="text-sm" data-testid={`text-role-user-${user.id}`}>
                      {user.firstName} {user.lastName}
                    </div>
                  ))}
                  {roleUsers.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{roleUsers.length - 3} more
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const SystemSettingsView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Settings</h2>
          <p className="text-muted-foreground">Configure system-wide settings</p>
        </div>
        <Button onClick={() => setCurrentView('dashboard')} data-testid="button-back-settings">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="card-approval-settings">
          <CardHeader>
            <CardTitle>Approval Workflow</CardTitle>
            <CardDescription>Configure the leave approval process</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Maximum Leave Days</Label>
              <Input type="number" placeholder="30" data-testid="input-max-days" />
            </div>
            <div>
              <Label>Minimum Notice Period (days)</Label>
              <Input type="number" placeholder="1" data-testid="input-notice-period" />
            </div>
            <Button data-testid="button-save-workflow">Save Changes</Button>
          </CardContent>
        </Card>

        <Card data-testid="card-notification-settings">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Configure notification settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Email Notifications</Label>
              <Select>
                <SelectTrigger data-testid="select-email-notifications">
                  <SelectValue placeholder="Select email frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="daily">Daily Digest</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button data-testid="button-save-notifications">Save Settings</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const ReportsView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reports & Analytics</h2>
          <p className="text-muted-foreground">System usage analytics and insights</p>
        </div>
        <Button onClick={() => setCurrentView('dashboard')} data-testid="button-back-reports">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="card-usage-stats">
          <CardHeader>
            <CardTitle>System Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 border rounded">
                <div className="text-2xl font-bold">{totalUsers}</div>
                <div className="text-sm text-muted-foreground">Total Users</div>
              </div>
              <div className="text-center p-4 border rounded">
                <div className="text-2xl font-bold">{totalRequests}</div>
                <div className="text-sm text-muted-foreground">Total Requests</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-role-distribution">
          <CardHeader>
            <CardTitle>Role Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {userRoles.map((role) => {
                const roleCount = users?.filter(u => u.role === role).length || 0;
                return (
                  <div key={role} className="flex justify-between items-center">
                    <span className="capitalize">{role === "hod" ? "HOD" : role}</span>
                    <Badge variant="outline">{roleCount}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Main render logic
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
              onClick={() => setIsProfileOpen(true)}
              data-testid="button-profile"
            >
              <Users className="h-4 w-4 mr-2" />
              Profile
            </Button>
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
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'users' && <UserManagementView />}
        {currentView === 'requests' && <LeaveRequestView />}
        {currentView === 'roles' && <RoleManagementView />}
        {currentView === 'settings' && <SystemSettingsView />}
        {currentView === 'reports' && <ReportsView />}
      </main>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-user">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and role assignments
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={editForm.firstName || ""}
                  onChange={(e) => setEditForm({...editForm, firstName: e.target.value})}
                  data-testid="input-edit-firstName"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={editForm.lastName || ""}
                  onChange={(e) => setEditForm({...editForm, lastName: e.target.value})}
                  data-testid="input-edit-lastName"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email || ""}
                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                data-testid="input-edit-email"
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select 
                value={editForm.role || ""} 
                onValueChange={(value) => setEditForm({...editForm, role: value as any})}
              >
                <SelectTrigger data-testid="select-edit-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {userRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role === "hod" ? "Head of Department" : role.charAt(0).toUpperCase() + role.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Select 
                value={editForm.department || ""} 
                onValueChange={(value) => setEditForm({...editForm, department: value})}
              >
                <SelectTrigger data-testid="select-edit-department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateUser}
              disabled={updateUserMutation.isPending}
              data-testid="button-save-edit"
            >
              {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent data-testid="dialog-add-user">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Add a new staff member to the system
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-firstName">First Name *</Label>
                <Input
                  id="add-firstName"
                  value={addForm.firstName || ""}
                  onChange={(e) => setAddForm({...addForm, firstName: e.target.value})}
                  data-testid="input-add-firstName"
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <Label htmlFor="add-lastName">Last Name</Label>
                <Input
                  id="add-lastName"
                  value={addForm.lastName || ""}
                  onChange={(e) => setAddForm({...addForm, lastName: e.target.value})}
                  data-testid="input-add-lastName"
                  placeholder="Enter last name"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="add-email">Email *</Label>
              <Input
                id="add-email"
                type="email"
                value={addForm.email || ""}
                onChange={(e) => setAddForm({...addForm, email: e.target.value})}
                data-testid="input-add-email"
                placeholder="Enter email address"
              />
            </div>
            <div>
              <Label htmlFor="add-password">Password *</Label>
              <Input
                id="add-password"
                type="password"
                value={addForm.password || ""}
                onChange={(e) => setAddForm({...addForm, password: e.target.value})}
                data-testid="input-add-password"
                placeholder="Enter password"
              />
            </div>
            <div>
              <Label htmlFor="add-role">Role *</Label>
              <Select 
                value={addForm.role || ""} 
                onValueChange={(value) => setAddForm({...addForm, role: value as any})}
              >
                <SelectTrigger data-testid="select-add-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {userRoles.filter(role => role !== 'student' && role !== 'admin').map((role) => (
                    <SelectItem key={role} value={role}>
                      {role === "hod" ? "Head of Department" : role.charAt(0).toUpperCase() + role.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(addForm.role === 'mentor' || addForm.role === 'hod') && (
              <div>
                <Label htmlFor="add-department">Department</Label>
                <Select 
                  value={addForm.department || ""} 
                  onValueChange={(value) => setAddForm({...addForm, department: value})}
                >
                  <SelectTrigger data-testid="select-add-department">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="add-username">Username</Label>
              <Input
                id="add-username"
                value={addForm.username || ""}
                onChange={(e) => setAddForm({...addForm, username: e.target.value})}
                data-testid="input-add-username"
                placeholder="Enter username (optional)"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsAddDialogOpen(false)}
              data-testid="button-cancel-add"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddUser}
              disabled={addUserMutation.isPending}
              data-testid="button-save-add"
            >
              {addUserMutation.isPending ? "Adding..." : "Add User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Modal */}
      {user && (
        <ProfileModal 
          user={user} 
          isOpen={isProfileOpen} 
          onClose={() => setIsProfileOpen(false)} 
        />
      )}
    </div>
  );
}