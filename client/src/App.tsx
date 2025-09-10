import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Login from "@/pages/Login";
import StudentDashboard from "@/pages/StudentDashboard";
import ApprovalDashboard from "@/pages/ApprovalDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import QRCodePage from "@/pages/QRCodePage";
import QRScanner from "@/pages/QRScanner";
import WorkflowTracker from "@/pages/WorkflowTracker";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Debug logging
  console.log("Router render - isAuthenticated:", isAuthenticated, "isLoading:", isLoading, "user:", user?.username);

  // Show loading state only when explicitly loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated or no user data, show login
  if (!isAuthenticated || !user) {
    return <Login />;
  }

  // Render appropriate dashboard based on user role
  switch (user.role) {
    case "student":
      return <StudentDashboard />;
    case "admin":
      return <AdminDashboard />;
    case "mentor":
    case "hod":
    case "principal":
    case "warden":
    case "parent":
      return <ApprovalDashboard />;
    case "security":
      return <QRScanner />;
    default:
      // Fallback for unknown roles or special routes
      return (
        <Switch>
          <Route path="/qr/:requestId" component={QRCodePage} />
          <Route path="/workflow/:requestId" component={WorkflowTracker} />
          <Route component={NotFound} />
        </Switch>
      );
  }
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
