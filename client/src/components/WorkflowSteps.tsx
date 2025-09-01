import { CheckCircle, Clock, User, Users, Shield, Crown, Home } from "lucide-react";

interface WorkflowStepsProps {
  request: any;
  approvals: any[];
}

export default function WorkflowSteps({ request, approvals }: WorkflowStepsProps) {
  const steps = [
    {
      id: 1,
      title: "Request Submitted",
      description: "Student submitted leave request",
      icon: User,
      status: "completed",
      timestamp: request.createdAt,
    },
    {
      id: 2,
      title: "Department Mentor",
      description: "Awaiting mentor approval",
      icon: Users,
      status: request.currentApprovalStep >= 2 ? "completed" : 
              request.currentApprovalStep === 1 ? "pending" : "waiting",
      timestamp: approvals.find(a => a.approverRole === "mentor")?.approvedAt,
    },
    {
      id: 3,
      title: "Parent Confirmation",
      description: "Parent confirmation required",
      icon: Home,
      status: request.status === "parent_confirmed" || request.currentApprovalStep >= 3 ? "completed" :
              request.currentApprovalStep === 2 ? "pending" : "waiting",
      timestamp: null, // Would come from parent confirmation record
    },
    {
      id: 4,
      title: "Head of Department",
      description: "HOD approval required",
      icon: Shield,
      status: request.currentApprovalStep >= 4 ? "completed" :
              request.currentApprovalStep === 3 ? "pending" : "waiting",
      timestamp: approvals.find(a => a.approverRole === "hod")?.approvedAt,
    },
    {
      id: 5,
      title: "Principal Approval",
      description: "Principal approval required",
      icon: Crown,
      status: request.currentApprovalStep >= 5 ? "completed" :
              request.currentApprovalStep === 4 ? "pending" : "waiting",
      timestamp: approvals.find(a => a.approverRole === "principal")?.approvedAt,
    },
    {
      id: 6,
      title: "Hostel Warden",
      description: request.studentType === "hostel" ? "Final approval step" : "Not required for day scholars",
      icon: Home,
      status: request.studentType === "day_scholar" ? "skipped" :
              request.status === "approved" ? "completed" :
              request.currentApprovalStep === 5 ? "pending" : "waiting",
      timestamp: approvals.find(a => a.approverRole === "warden")?.approvedAt,
    },
  ];

  const getStepIcon = (step: any) => {
    const IconComponent = step.icon;
    
    if (step.status === "completed") {
      return (
        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
          <CheckCircle className="h-4 w-4" />
        </div>
      );
    } else if (step.status === "pending") {
      return (
        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white">
          <Clock className="h-4 w-4" />
        </div>
      );
    } else if (step.status === "skipped") {
      return (
        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600">
          <span className="text-xs">N/A</span>
        </div>
      );
    } else {
      return (
        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600">
          <IconComponent className="h-4 w-4" />
        </div>
      );
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600";
      case "pending":
        return "text-yellow-600";
      case "skipped":
        return "text-gray-400";
      default:
        return "text-gray-500";
    }
  };

  const getConnectorColor = (currentStatus: string, nextStatus: string) => {
    if (currentStatus === "completed") {
      return "bg-green-500";
    }
    return "bg-gray-300";
  };

  return (
    <div className="space-y-8">
      {steps.map((step, index) => (
        <div key={step.id} className="relative">
          <div className="flex items-center space-x-4">
            {getStepIcon(step)}
            <div className="flex-1">
              <h4 className={`font-medium ${getStepColor(step.status)}`}>
                {step.title}
              </h4>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
              {step.timestamp && (
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(step.timestamp).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          
          {/* Connector line */}
          {index < steps.length - 1 && (
            <div 
              className={`absolute left-4 top-8 w-0.5 h-8 ${getConnectorColor(step.status, steps[index + 1].status)}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
