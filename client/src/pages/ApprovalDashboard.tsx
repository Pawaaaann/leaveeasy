import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, CheckSquare, BarChart3, Clock, CheckCircle, Calendar, AlertTriangle, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import ApprovalCard from "@/components/ApprovalCard";
import StatsCard from "@/components/StatsCard";
import type { LeaveRequest } from "@shared/schema";

export default function ApprovalDashboard() {
  const { user, logout } = useAuth();
  const [selectedView, setSelectedView] = useState("pending");
  const { toast } = useToast();

  const { data: stats = {} } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: pendingRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests/pending"],
  });

  const getRoleTitle = (role: string) => {
    const titles = {
      mentor: "Department Mentor Portal",
      hod: "Head of Department Portal",
      principal: "Principal Portal",
      warden: "Hostel Warden Portal",
      parent: "Parent Portal",
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
              variant="secondary"
              className="w-full justify-start"
              data-testid="nav-pending"
            >
              <Clock className="h-4 w-4 mr-3" />
              Pending Approvals
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              data-testid="nav-approved"
            >
              <CheckSquare className="h-4 w-4 mr-3" />
              Approved Requests
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
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

            {/* Pending Requests */}
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
          </div>
        </main>
      </div>
    </div>
  );
}
