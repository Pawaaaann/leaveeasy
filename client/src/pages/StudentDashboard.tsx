import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar, CheckCircle, Clock, Home, Plus, History, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import LeaveRequestForm from "@/components/LeaveRequestForm";
import StatsCard from "@/components/StatsCard";
import { Link } from "wouter";
import type { LeaveRequest } from "@shared/schema";

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();

  const { data: stats = {} } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: leaveRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests/student", user?.id],
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending":
      case "mentor_approved":
      case "parent_confirmed":
      case "hod_approved":
      case "principal_approved":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-primary">Student Portal</h1>
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.firstName || user?.username}
            </span>
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
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-card border-r border-border min-h-screen p-4">
          <nav className="space-y-2">
            <Button
              variant="secondary"
              className="w-full justify-start"
              data-testid="nav-dashboard"
            >
              <Home className="h-4 w-4 mr-3" />
              Dashboard
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => setShowForm(true)}
              data-testid="nav-new-request"
            >
              <Plus className="h-4 w-4 mr-3" />
              New Request
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => setShowHistory(!showHistory)}
              data-testid="nav-history"
            >
              <History className="h-4 w-4 mr-3" />
              Leave History
            </Button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatsCard
                title="Pending Requests"
                value={(stats as any)?.pendingRequests || 0}
                icon={Clock}
                iconColor="text-yellow-500"
                onClick={() => {
                  setShowHistory(true);
                  toast({ title: "Pending Requests", description: `You have ${(stats as any)?.pendingRequests || 0} requests pending approval` });
                }}
              />
              <StatsCard
                title="Approved This Month"
                value={(stats as any)?.approvedThisMonth || 0}
                icon={CheckCircle}
                iconColor="text-green-500"
                onClick={() => {
                  setShowHistory(true);
                  toast({ title: "Approved This Month", description: `${(stats as any)?.approvedThisMonth || 0} requests approved this month` });
                }}
              />
              <StatsCard
                title="Days Remaining"
                value={15}
                icon={Calendar}
                iconColor="text-blue-500"
                onClick={() => {
                  toast({ title: "Days Remaining", description: "You have 15 days of leave remaining this term" });
                }}
              />
            </div>

            {/* Leave Request Form */}
            {showForm && (
              <div className="mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Submit Leave Request</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LeaveRequestForm 
                      onSuccess={() => setShowForm(false)}
                      onCancel={() => setShowForm(false)}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Recent Requests */}
            <Card>
              <CardHeader>
                <CardTitle>{showHistory ? "Leave History" : "Recent Requests"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leaveRequests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No leave requests found</p>
                      <Button 
                        onClick={() => setShowForm(true)}
                        className="mt-4"
                        data-testid="button-create-first-request"
                      >
                        Create Your First Request
                      </Button>
                    </div>
                  ) : (
                    leaveRequests.map((request: any) => (
                      <div key={request.id} className="border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium capitalize">{request.leaveType} Leave</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(request.status)}`}>
                            {request.status.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {new Date(request.fromDate).toLocaleDateString()} - {new Date(request.toDate).toLocaleDateString()}
                        </p>
                        <p className="text-sm mb-3">{request.reason}</p>
                        <div className="flex items-center space-x-4">
                          <Link href={`/workflow/${request.id}`}>
                            <Button variant="link" size="sm" data-testid={`button-track-${request.id}`}>
                              Track Progress
                            </Button>
                          </Link>
                          {request.status === "approved" && (
                            <Link href={`/qr/${request.id}`}>
                              <Button variant="link" size="sm" data-testid={`button-qr-${request.id}`}>
                                View QR Code
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
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
