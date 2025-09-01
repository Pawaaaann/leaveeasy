import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Clock, ArrowLeft } from "lucide-react";
import WorkflowSteps from "@/components/WorkflowSteps";
import type { LeaveRequest } from "@shared/schema";

export default function WorkflowTracker() {
  const { requestId } = useParams();
  const [, navigate] = useLocation();

  const { data: request, isLoading } = useQuery<LeaveRequest & { approvals?: any[] }>({
    queryKey: ["/api/leave-requests", requestId],
    enabled: !!requestId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading workflow...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive">Leave request not found</p>
            <Button 
              onClick={() => navigate("/")} 
              className="mt-4"
              data-testid="button-back-home"
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Leave Request Progress</h2>
            <p className="text-muted-foreground">
              Track your request through the approval process
            </p>
          </div>

          <WorkflowSteps 
            request={request} 
            approvals={request.approvals || []} 
          />

          <div className="mt-8 flex justify-center">
            <Button 
              onClick={() => navigate("/")}
              data-testid="button-back-dashboard"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
