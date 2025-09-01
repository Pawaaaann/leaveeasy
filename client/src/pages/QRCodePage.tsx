import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Download, Share, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function QRCodePage() {
  const { requestId } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: qrData, isLoading } = useQuery({
    queryKey: ["/api/qr-codes", requestId],
    enabled: !!requestId,
  });

  const downloadQR = () => {
    // In a real implementation, this would generate and download the QR code image
    toast({
      title: "QR Code Downloaded",
      description: "QR code has been saved to your device",
    });
  };

  const shareQR = () => {
    // In a real implementation, this would open WhatsApp sharing
    toast({
      title: "Sharing QR Code",
      description: "Opening WhatsApp to share QR code...",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading QR code...</p>
        </div>
      </div>
    );
  }

  if (!qrData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive">QR code not found or not yet available</p>
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

  const { request } = qrData;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Leave Approved!</h2>
            <p className="text-muted-foreground">
              Your leave request has been approved by all authorities.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            {/* QR Code Placeholder - In real implementation, use a QR code library */}
            <div className="w-48 h-48 mx-auto mb-4 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl font-mono font-bold mb-2">QR</div>
                <div className="text-xs text-gray-500">
                  {qrData.qrData}
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-2">Gate Pass QR Code</p>
            <p className="text-xs text-muted-foreground">
              Show this to security at the gate
            </p>
          </div>

          <div className="text-left space-y-2 mb-6 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Student:</span>
              <span>{request.student?.firstName} {request.student?.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration:</span>
              <span>
                {new Date(request.fromDate).toLocaleDateString()} - {new Date(request.toDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span className="capitalize">{request.leaveType} Leave</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valid Until:</span>
              <span>{new Date(request.toDate).toLocaleDateString()} 11:59 PM</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={downloadQR} 
              className="w-full"
              data-testid="button-download-qr"
            >
              <Download className="h-4 w-4 mr-2" />
              Download QR Code
            </Button>
            <Button 
              onClick={shareQR} 
              variant="secondary" 
              className="w-full"
              data-testid="button-share-qr"
            >
              <Share className="h-4 w-4 mr-2" />
              Share via WhatsApp
            </Button>
            <Button 
              onClick={() => navigate("/")} 
              variant="ghost" 
              className="w-full"
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
