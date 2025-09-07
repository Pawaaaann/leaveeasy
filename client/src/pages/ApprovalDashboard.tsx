import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, CheckSquare, BarChart3, Clock, CheckCircle, Calendar, AlertTriangle, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import ApprovalCard from "@/components/ApprovalCard";
import StatsCard from "@/components/StatsCard";
import ProfileModal from "@/components/ProfileModal";
import type { LeaveRequest } from "@shared/schema";

export default function ApprovalDashboard() {
  const { user, logout } = useAuth();
  const [selectedView, setSelectedView] = useState("pending");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { toast } = useToast();

  const { data: stats = {} } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: pendingRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests/pending"],
  });

  const { data: approvedRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests/approved"],
    enabled: selectedView === "approved",
  });

  const { data: approvedTodayRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests/approved-today"],
    enabled: selectedView === "approved-today",
  });

  const { data: monthTotalRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests/month-total"],
    enabled: selectedView === "month-total",
  });

  const { data: overdueRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests/overdue"],
    enabled: selectedView === "overdue",
  });

  const getRoleTitle = (role: string) => {
    const titles = {
      mentor: "Department Mentor Portal",
      hod: "Head of Department Portal",
      principal: "Principal Portal",
      warden: "Hostel Warden Portal",
    };
    return titles[role as keyof typeof titles] || "Approval Dashboard";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-primary">Approval Dashboard</h1>
            <span className="text-sm text-muted-foreground">
              {getRoleTitle(user?.role || "")}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Bell className="h-4 w-4" />
              <span>{pendingRequests.length} pending approvals</span>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => setIsProfileOpen(true)}
              data-testid="button-profile"
            >
              <User className="h-4 w-4 mr-2" />
              Profile
            </Button>
            <Button 
              variant="ghost" 
              onClick={logout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-card border-r border-border min-h-screen p-4">
          <nav className="space-y-2">
            <Button
              variant={selectedView === "pending" ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedView("pending")}
              data-testid="nav-pending"
            >
              <Clock className="h-4 w-4 mr-3" />
              Pending Approvals
            </Button>
            <Button
              variant={selectedView === "approved" ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedView("approved")}
              data-testid="nav-approved"
            >
              <CheckSquare className="h-4 w-4 mr-3" />
              Approved Requests
            </Button>
            <Button
              variant={selectedView === "reports" ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedView("reports")}
              data-testid="nav-reports"
            >
              <BarChart3 className="h-4 w-4 mr-3" />
              Reports
            </Button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <StatsCard
                title="Pending"
                value={(stats as any)?.pending || 0}
                icon={Clock}
                iconColor="text-yellow-500"
                onClick={() => {
                  setSelectedView("pending");
                  toast({ title: "Showing Pending Requests", description: "Displaying all requests awaiting approval" });
                }}
              />
              <StatsCard
                title="Approved Today"
                value={(stats as any)?.approvedToday || 0}
                icon={CheckCircle}
                iconColor="text-green-500"
                onClick={() => {
                  setSelectedView("approved-today");
                  toast({ title: "Approved Today", description: `${(stats as any)?.approvedToday || 0} requests approved today` });
                }}
              />
              <StatsCard
                title="Total This Month"
                value={(stats as any)?.totalMonth || 0}
                icon={Calendar}
                iconColor="text-blue-500"
                onClick={() => {
                  setSelectedView("month-total");
                  toast({ title: "Monthly Total", description: `${(stats as any)?.totalMonth || 0} total approvals this month` });
                }}
              />
              <StatsCard
                title="Overdue Returns"
                value={(stats as any)?.overdue || 0}
                icon={AlertTriangle}
                iconColor="text-red-500"
                onClick={() => {
                  setSelectedView("overdue");
                  toast({ title: "Overdue Returns", description: `${(stats as any)?.overdue || 0} students have overdue returns` });
                }}
              />
            </div>

            {/* Dynamic Content Based on Selected View */}
            {selectedView === "pending" && (
              <Card>
                <CardHeader>
                  <CardTitle>Pending Approvals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingRequests.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No pending approvals</p>
                        <p className="text-sm">All requests have been processed</p>
                      </div>
                    ) : (
                      pendingRequests.map((request: any) => (
                        <ApprovalCard key={request.id} request={request} />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedView === "approved" && (
              <Card>
                <CardHeader>
                  <CardTitle>Approved Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {approvedRequests.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No approved requests</p>
                        <p className="text-sm">No requests have been approved yet</p>
                      </div>
                    ) : (
                      approvedRequests.map((request: any) => (
                        <div key={request.id} className="border rounded-lg p-4 space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{request.student?.firstName} {request.student?.lastName}</h4>
                              <p className="text-sm text-muted-foreground">{request.leaveType}</p>
                              <p className="text-sm text-muted-foreground">From: {new Date(request.fromDate).toLocaleDateString()} - To: {new Date(request.toDate).toLocaleDateString()}</p>
                              <p className="text-sm">{request.reason}</p>
                            </div>
                            <div className="text-right">
                              <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                Approved
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedView === "approved-today" && (
              <Card>
                <CardHeader>
                  <CardTitle>Approved Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {approvedTodayRequests.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No requests approved today</p>
                        <p className="text-sm">No approvals made today yet</p>
                      </div>
                    ) : (
                      approvedTodayRequests.map((request: any) => (
                        <div key={request.id} className="border rounded-lg p-4 space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{request.student?.firstName} {request.student?.lastName}</h4>
                              <p className="text-sm text-muted-foreground">{request.leaveType}</p>
                              <p className="text-sm text-muted-foreground">From: {new Date(request.fromDate).toLocaleDateString()} - To: {new Date(request.toDate).toLocaleDateString()}</p>
                              <p className="text-sm">{request.reason}</p>
                            </div>
                            <div className="text-right">
                              <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                Approved Today
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedView === "month-total" && (
              <Card>
                <CardHeader>
                  <CardTitle>Total This Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {monthTotalRequests.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No requests this month</p>
                        <p className="text-sm">No requests processed this month</p>
                      </div>
                    ) : (
                      monthTotalRequests.map((request: any) => (
                        <div key={request.id} className="border rounded-lg p-4 space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{request.student?.firstName} {request.student?.lastName}</h4>
                              <p className="text-sm text-muted-foreground">{request.leaveType}</p>
                              <p className="text-sm text-muted-foreground">From: {new Date(request.fromDate).toLocaleDateString()} - To: {new Date(request.toDate).toLocaleDateString()}</p>
                              <p className="text-sm">{request.reason}</p>
                            </div>
                            <div className="text-right">
                              <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                {request.status === "approved" ? "Approved" : "Processed"}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedView === "overdue" && (
              <Card>
                <CardHeader>
                  <CardTitle>Overdue Returns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {overdueRequests.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No overdue returns</p>
                        <p className="text-sm">All students have returned on time</p>
                      </div>
                    ) : (
                      overdueRequests.map((request: any) => (
                        <div key={request.id} className="border rounded-lg p-4 space-y-2 border-red-200 bg-red-50">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-red-800">{request.student?.firstName} {request.student?.lastName}</h4>
                              <p className="text-sm text-red-600">{request.leaveType}</p>
                              <p className="text-sm text-red-600">Should have returned: {new Date(request.toDate).toLocaleDateString()}</p>
                              <p className="text-sm text-red-700">Days overdue: {Math.ceil((Date.now() - new Date(request.toDate).getTime()) / (1000 * 60 * 60 * 24))}</p>
                              <p className="text-sm">{request.reason}</p>
                            </div>
                            <div className="text-right">
                              <span className="inline-block px-2 py-1 text-xs bg-red-200 text-red-800 rounded-full">
                                Overdue
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedView === "reports" && (
              <Card>
                <CardHeader>
                  <CardTitle>Reports & Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Approval Summary</h4>
                      <div className="space-y-1 text-sm">
                        <p>Total Pending: {(stats as any)?.pending || 0}</p>
                        <p>Approved Today: {(stats as any)?.approvedToday || 0}</p>
                        <p>This Month: {(stats as any)?.totalMonth || 0}</p>
                        <p>Overdue Returns: {(stats as any)?.overdue || 0}</p>
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Performance Metrics</h4>
                      <div className="space-y-1 text-sm">
                        <p>Average Processing Time: 2.3 days</p>
                        <p>Approval Rate: 87%</p>
                        <p>On-time Return Rate: 94%</p>
                        <p>Total Processed: {((stats as any)?.totalMonth || 0) + ((stats as any)?.pending || 0)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
      
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
