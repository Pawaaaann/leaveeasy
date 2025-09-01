import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, Camera, CheckCircle, AlertCircle, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getAuthHeaders } from "@/lib/authUtils";
import type { LeaveRequest } from "@shared/firebaseSchema";

export default function QRScanner() {
  const [qrData, setQrData] = useState("");
  const [scanResult, setScanResult] = useState<any>(null);
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const scanMutation = useMutation({
    mutationFn: async (qrCode: string) => {
      const response = await apiRequest(
        "POST", 
        "/api/qr-codes/scan", 
        { qrData: qrCode }
      );
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setScanResult(data);
        toast({
          title: "Valid QR Code",
          description: "Student is authorized to exit campus",
        });
      } else {
        toast({
          title: "Invalid QR Code",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error("Scan error:", error);
      toast({
        title: "Scan Failed",
        description: "Failed to validate QR code",
        variant: "destructive",
      });
    },
  });

  const handleScan = () => {
    if (!qrData.trim()) {
      toast({
        title: "No QR Code",
        description: "Please enter or scan a QR code",
        variant: "destructive",
      });
      return;
    }
    
    scanMutation.mutate(qrData);
  };

  const confirmExit = () => {
    toast({
      title: "Exit Confirmed",
      description: "Student exit has been recorded",
    });
    setScanResult(null);
    setQrData("");
  };

  const scanAnother = () => {
    setScanResult(null);
    setQrData("");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-primary">Security Gate Scanner</h1>
            <span className="text-sm text-muted-foreground">Main Gate</span>
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

      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          {/* Scanner Interface */}
          {!scanResult && (
            <Card className="mb-8">
              <CardContent className="p-8 text-center">
                <div className="mb-6">
                  <QrCode className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Scan Student QR Code</h2>
                  <p className="text-muted-foreground">
                    Enter the QR code data from the student's leave pass
                  </p>
                </div>

                <div className="space-y-4 max-w-md mx-auto">
                  <div>
                    <Label htmlFor="qrInput">QR Code Data</Label>
                    <Input
                      id="qrInput"
                      placeholder="Enter QR code data (e.g., LEAVE-ABC123...)"
                      value={qrData}
                      onChange={(e) => setQrData(e.target.value)}
                      data-testid="input-qr-data"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleScan} 
                    disabled={scanMutation.isPending}
                    className="w-full"
                    data-testid="button-scan-qr"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {scanMutation.isPending ? "Validating..." : "Validate QR Code"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scan Results */}
          {scanResult && (
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Valid Leave Pass</h3>
                  <p className="text-muted-foreground">
                    Student is authorized to exit campus
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Student Name</p>
                    <p className="font-medium">
                      {scanResult.leaveRequest?.student?.firstName} {scanResult.leaveRequest?.student?.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Student ID</p>
                    <p className="font-medium">{scanResult.leaveRequest?.student?.studentId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Leave Type</p>
                    <p className="font-medium capitalize">{scanResult.leaveRequest?.leaveType} Leave</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valid Until</p>
                    <p className="font-medium">
                      {new Date(scanResult.leaveRequest?.toDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-green-800 font-medium">
                      QR Code Status: Valid (One-time use)
                    </span>
                  </div>
                  <p className="text-green-700 text-sm mt-1">
                    This QR code will be automatically invalidated after this scan.
                  </p>
                </div>

                <div className="flex space-x-4">
                  <Button 
                    onClick={confirmExit} 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    data-testid="button-confirm-exit"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm Exit
                  </Button>
                  <Button 
                    onClick={scanAnother} 
                    variant="secondary" 
                    className="flex-1"
                    data-testid="button-scan-another"
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Scan Another
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Scans */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Scans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Mock data - in real app, this would come from API */}
                <div className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                  <div>
                    <p className="font-medium">Sarah Johnson</p>
                    <p className="text-sm text-muted-foreground">10:45 AM - Medical Leave</p>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Exited
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                  <div>
                    <p className="font-medium">Mike Chen</p>
                    <p className="text-sm text-muted-foreground">09:30 AM - Personal Leave</p>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Exited
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
