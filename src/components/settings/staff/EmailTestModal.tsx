// File: src/components/settings/staff/EmailTestModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Mail, Settings, AlertCircle } from "lucide-react";

interface EmailTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EmailStatus {
  configured: boolean;
  emailFrom: string;
  emailReplyTo: string;
  baseUrl: string;
  serviceStatus: string;
  error?: string;
}

export function EmailTestModal({ isOpen, onClose }: EmailTestModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // Fetch email service status when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchEmailStatus();
    }
  }, [isOpen]);

  const fetchEmailStatus = async () => {
    setStatusLoading(true);
    try {
      const response = await fetch("/api/admin/test-email");
      if (response.ok) {
        const status = await response.json();
        setEmailStatus(status);
      } else {
        console.error("Failed to fetch email status");
      }
    } catch (error) {
      console.error("Error fetching email status:", error);
    } finally {
      setStatusLoading(false);
    }
  };

  const testConfiguration = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ testType: "config" }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Configuration Valid",
          description: "Email service is properly configured and ready to use.",
        });
      } else {
        toast({
          title: "Configuration Error",
          description: result.error || "Email service configuration is invalid.",
          variant: "destructive",
        });
      }

      // Refresh status after test
      await fetchEmailStatus();
    } catch (error) {
      console.error("Error testing configuration:", error);
      toast({
        title: "Test Failed",
        description: "An error occurred while testing the configuration.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast({
        title: "Email Required",
        description: "Please enter an email address to send the test email.",
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          testType: "send", 
          testEmail: testEmail 
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Test Email Sent",
          description: `Test invitation email sent successfully to ${testEmail}`,
        });
        setTestEmail(""); // Clear the input
      } else {
        toast({
          title: "Send Failed",
          description: result.error || "Failed to send test email.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      toast({
        title: "Send Failed",
        description: "An error occurred while sending the test email.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Ready":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            Ready
          </Badge>
        );
      case "Error":
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="mr-1 h-3 w-3" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <AlertCircle className="mr-1 h-3 w-3" />
            Unknown
          </Badge>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Email Service Testing</span>
          </DialogTitle>
          <DialogDescription>
            Test your email service configuration and send test invitation emails.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Email Service Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Service Status</CardTitle>
              <CardDescription>
                Current email service configuration and status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statusLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading status...</span>
                </div>
              ) : emailStatus ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Service Status:</span>
                    {getStatusBadge(emailStatus.serviceStatus)}
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Configured:</span>
                      <span className={emailStatus.configured ? "text-green-600" : "text-red-600"}>
                        {emailStatus.configured ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">From Address:</span>
                      <span className="font-mono text-xs">{emailStatus.emailFrom}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reply To:</span>
                      <span className="font-mono text-xs">{emailStatus.emailReplyTo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base URL:</span>
                      <span className="font-mono text-xs">{emailStatus.baseUrl}</span>
                    </div>
                  </div>

                  {emailStatus.error && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800">
                        <strong>Error:</strong> {emailStatus.error}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Failed to load status</p>
              )}
            </CardContent>
          </Card>

          {/* Configuration Test */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Configuration Test</CardTitle>
              <CardDescription>
                Test if your email service is properly configured
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={testConfiguration}
                disabled={loading}
                className="w-full"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Test Configuration
              </Button>
            </CardContent>
          </Card>

          {/* Send Test Email */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Send Test Email</CardTitle>
              <CardDescription>
                Send a test invitation email to verify the complete flow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testEmail">Test Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="testEmail"
                    type="email"
                    placeholder="your.email@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  A test invitation email will be sent to this address with sample data.
                </p>
              </div>

              <Button 
                onClick={sendTestEmail}
                disabled={loading || !emailStatus?.configured}
                className="w-full"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Test Email
              </Button>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
