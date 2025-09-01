import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { getAuthHeaders } from "@/lib/authUtils";
import { leaveTypes, studentTypes } from "@shared/schema";

const formSchema = z.object({
  leaveType: z.enum(leaveTypes),
  studentType: z.enum(studentTypes),
  fromDate: z.string().min(1, "From date is required"),
  toDate: z.string().min(1, "To date is required"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

type FormData = z.infer<typeof formSchema>;

interface LeaveRequestFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function LeaveRequestForm({ onSuccess, onCancel }: LeaveRequestFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      leaveType: "personal",
      studentType: "day_scholar",
      fromDate: "",
      toDate: "",
      reason: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest(
        "POST", 
        "/api/leave-requests", 
        {
          ...data,
          fromDate: new Date(data.fromDate).toISOString(),
          toDate: new Date(data.toDate).toISOString(),
        }
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Request Submitted",
        description: "Your leave request has been submitted for approval",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests/student"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      onSuccess?.();
    },
    onError: (error) => {
      console.error("Submit error:", error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit leave request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    // Validate dates
    const fromDate = new Date(data.fromDate);
    const toDate = new Date(data.toDate);
    const today = new Date();
    
    if (fromDate < today) {
      toast({
        title: "Invalid Date",
        description: "From date cannot be in the past",
        variant: "destructive",
      });
      return;
    }
    
    if (toDate < fromDate) {
      toast({
        title: "Invalid Date",
        description: "To date must be after from date",
        variant: "destructive",
      });
      return;
    }
    
    submitMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="leaveType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Leave Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-leave-type">
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="medical">Medical Leave</SelectItem>
                    <SelectItem value="personal">Personal Leave</SelectItem>
                    <SelectItem value="family_emergency">Family Emergency</SelectItem>
                    <SelectItem value="academic">Academic Purpose</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="studentType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Student Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-student-type">
                      <SelectValue placeholder="Select student type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="day_scholar">Day Scholar</SelectItem>
                    <SelectItem value="hostel">Hostel Student</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fromDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>From Date</FormLabel>
                <FormControl>
                  <Input 
                    type="date" 
                    {...field} 
                    data-testid="input-from-date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="toDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>To Date</FormLabel>
                <FormControl>
                  <Input 
                    type="date" 
                    {...field} 
                    data-testid="input-to-date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason</FormLabel>
              <FormControl>
                <Textarea 
                  rows={3}
                  placeholder="Detailed reason for leave..."
                  {...field}
                  data-testid="textarea-reason"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={submitMutation.isPending}
            data-testid="button-submit-request"
          >
            {submitMutation.isPending ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
