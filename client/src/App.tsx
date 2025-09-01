import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Login from "@/pages/Login";
import StudentDashboard from "@/pages/StudentDashboard";
import ApprovalDashboard from "@/pages/ApprovalDashboard";
import QRCodePage from "@/pages/QRCodePage";
import QRScanner from "@/pages/QRScanner";
import WorkflowTracker from "@/pages/WorkflowTracker";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();


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

  if (!isAuthenticated || !user) {
    return <Login />;
  }

  // Render based on user role
  if (user.role === "student") {
    return <StudentDashboard />;
  }
  
  if (["mentor", "hod", "principal", "warden", "parent"].includes(user.role)) {
    return <ApprovalDashboard />;
  }
  
  if (user.role === "security") {
    return <QRScanner />;
  }

  // Fallback for unknown roles
  return (
    <Switch>
      <Route path="/qr/:requestId" component={QRCodePage} />
      <Route path="/workflow/:requestId" component={WorkflowTracker} />
      <Route component={NotFound} />
    </Switch>
  );
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
