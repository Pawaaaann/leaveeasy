import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, Eye, Phone, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getAuthHeaders } from "@/lib/authUtils";
import type { LeaveRequest } from "@shared/schema";

interface ApprovalCardProps {
  request: any;
}

export default function ApprovalCard({ request }: ApprovalCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [comments, setComments] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [parentNotified, setParentNotified] = useState("not_contacted");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST", 
        `/api/approvals/${request.id}/approve`,
        { comments }
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Request Approved",
        description: "The leave request has been approved and forwarded",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error) => {
      console.error("Approve error:", error);
      toast({
        title: "Approval Failed",
        description: "Failed to approve request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!comments.trim()) {
        throw new Error("Comments required for rejection");
      }
      const response = await apiRequest(
        "POST", 
        `/api/approvals/${request.id}/reject`,
        { comments }
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Request Rejected",
        description: "The leave request has been rejected. Student and parents will be notified.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error) => {
      console.error("Reject error:", error);
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleApprove = () => {
    approveMutation.mutate();
  };

  const handleReject = () => {
    if (!comments.trim()) {
      setShowComments(true);
      toast({
        title: "Comments Required",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }
    rejectMutation.mutate();
  };

  const contactParent = async () => {
    try {
      // Send SMS notification to parent
      const response = await apiRequest(
        "POST",
        `/api/notifications/parent/${request.id}`,
        { 
          phoneNumber: request.parentPhone,
          studentName: `${request.student?.firstName} ${request.student?.lastName}`,
          leaveDetails: `${request.leaveType} leave from ${new Date(request.fromDate).toLocaleDateString()} to ${new Date(request.toDate).toLocaleDateString()}`
        }
      );
      
      setParentNotified("contacted");
      toast({
        title: "Message Sent!",
        description: `SMS sent to ${request.parentPhone} for leave confirmation`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Failed to send parent notification:", error);
      toast({
        title: "Message Failed",
        description: "Failed to send SMS to parent. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getParentContactStatus = () => {
    if (request.status === "pending") {
      return "Waiting for confirmation";
    } else if (request.status === "parent_confirmed") {
      return "Confirmed";
    }
    return "Pending";
  };

  const getParentContactStatusColor = () => {
    if (request.status === "parent_confirmed") {
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    }
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-2">
              <h3 className="font-medium">
                {request.student?.firstName} {request.student?.lastName}
              </h3>
              <span className="text-sm text-muted-foreground">
                ID: {request.student?.studentId}
              </span>
              <span className="text-sm text-muted-foreground">
                {request.student?.department}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
              <div>
                <p className="text-sm text-muted-foreground">Leave Type</p>
                <p className="text-sm font-medium capitalize">{request.leaveType} Leave</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="text-sm font-medium">
                  {new Date(request.fromDate).toLocaleDateString()} - {new Date(request.toDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Submitted</p>
                <p className="text-sm font-medium">
                  {new Date(request.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <p className="text-sm mb-3">{request.reason}</p>

            {/* Parent Contact Status */}
            {user?.role === "mentor" && (
              <div className="space-y-3 mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Parent Contact:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getParentContactStatusColor()}`}>
                    {getParentContactStatus()}
                  </span>
                  {request.status === "pending" && (
                    <Button 
                      size="sm" 
                      variant="link" 
                      onClick={contactParent}
                      data-testid={`button-contact-parent-${request.id}`}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Message Now
                    </Button>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Parent Informed:</span>
                  <Select value={parentNotified} onValueChange={setParentNotified}>
                    <SelectTrigger className="w-40 h-8">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_contacted">Not Contacted</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                  {request.parentPhone && (
                    <span className="text-xs text-muted-foreground">
                      Phone: {request.parentPhone}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Additional Details */}
            {showDetails && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Additional Information</h4>
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">Student Type:</span> {request.studentType}</p>
                  <p><span className="font-medium">Current Status:</span> {request.status}</p>
                  <p><span className="font-medium">Approval Step:</span> {request.currentApprovalStep}</p>
                </div>
              </div>
            )}

            {/* Comments Section */}
            {showComments && (
              <div className="mt-4">
                <Textarea
                  placeholder="Enter comments (required for rejection)..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                  data-testid={`textarea-comments-${request.id}`}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col space-y-2 ml-4">
            <Button 
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1"
              data-testid={`button-approve-${request.id}`}
            >
              <Check className="h-3 w-3 mr-1" />
              Approve
            </Button>
            <Button 
              onClick={() => setShowComments(!showComments)}
              disabled={rejectMutation.isPending}
              variant="destructive"
              className="text-sm px-3 py-1"
              data-testid={`button-reject-${request.id}`}
            >
              <X className="h-3 w-3 mr-1" />
              Reject
            </Button>
            <Button 
              onClick={() => setShowDetails(!showDetails)}
              variant="outline"
              className="text-sm px-3 py-1"
              data-testid={`button-details-${request.id}`}
            >
              <Eye className="h-3 w-3 mr-1" />
              Details
            </Button>
            
            {showComments && (
              <Button 
                onClick={handleReject}
                disabled={rejectMutation.isPending || !comments.trim()}
                variant="destructive"
                className="text-sm px-3 py-1"
                data-testid={`button-confirm-reject-${request.id}`}
              >
                Confirm Reject
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
