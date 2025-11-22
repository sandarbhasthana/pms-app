"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

interface SendEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  userEmail: string;
}

export function SendEmailDialog({
  open,
  onOpenChange,
  reportId,
  userEmail
}: SendEmailDialogProps) {
  const [emailOption, setEmailOption] = useState<"logged-in" | "custom">(
    "logged-in"
  );
  const [customEmail, setCustomEmail] = useState("");
  const [sending, setSending] = useState(false);

  // Cleanup effect - force remove overlays
  useEffect(() => {
    if (!open) {
      // Reset form
      setEmailOption("logged-in");
      setCustomEmail("");
      setSending(false);

      // Force cleanup after animation
      const cleanup = setTimeout(() => {
        // Remove any lingering overlays
        document
          .querySelectorAll("[data-radix-dialog-overlay]")
          .forEach((el) => {
            el.remove();
          });
        // Reset body styles
        document.body.style.pointerEvents = "";
        document.body.style.overflow = "";
      }, 300);

      return () => clearTimeout(cleanup);
    }
  }, [open]);

  // Reset form when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form state when closing
      setEmailOption("logged-in");
      setCustomEmail("");
      setSending(false);
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async () => {
    // Validate custom email if selected
    if (emailOption === "custom") {
      if (!customEmail.trim()) {
        toast.error("Please enter an email address");
        return;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customEmail)) {
        toast.error("Please enter a valid email address");
        return;
      }
    }

    setSending(true);
    try {
      const requestBody = {
        emailOption,
        customEmail: emailOption === "custom" ? customEmail : undefined
      };

      console.log("📧 Sending email request:", requestBody);

      const response = await fetch(`/api/reports/${reportId}/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          `Report sent successfully to ${
            emailOption === "custom" ? customEmail : "your email"
          }`
        );
        handleOpenChange(false);
      } else {
        toast.error(data.error || "Failed to send report via email");
      }
    } catch (error) {
      console.error("Email error:", error);
      toast.error("Failed to send report via email");
    } finally {
      setSending(false);
    }
  };

  // Don't render the dialog at all if reportId is empty
  if (!reportId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={true}>
      <DialogContent
        className="sm:max-w-[425px]"
        onPointerDownOutside={(e) => {
          // Allow closing by clicking outside
          handleOpenChange(false);
        }}
        onEscapeKeyDown={(e) => {
          // Allow closing with Escape key
          handleOpenChange(false);
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-purple-600" />
            Send Report via Email
          </DialogTitle>
          <DialogDescription>
            Choose where to send the report. The email will contain a download
            link valid for 7 days.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup
            value={emailOption}
            onValueChange={(value) =>
              setEmailOption(value as "logged-in" | "custom")
            }
          >
            {/* Option 1: Send to logged-in user's email */}
            <div className="flex items-start space-x-3 space-y-0">
              <RadioGroupItem value="logged-in" id="logged-in" />
              <div className="flex-1">
                <Label
                  htmlFor="logged-in"
                  className="font-medium cursor-pointer"
                >
                  Send to my email
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {userEmail}
                </p>
              </div>
            </div>

            {/* Option 2: Send to custom email */}
            <div className="flex items-start space-x-3 space-y-0">
              <RadioGroupItem value="custom" id="custom" />
              <div className="flex-1">
                <Label htmlFor="custom" className="font-medium cursor-pointer">
                  Send to custom email
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Specify a different email address
                </p>
              </div>
            </div>
          </RadioGroup>

          {/* Custom email input - only show when custom option is selected */}
          {emailOption === "custom" && (
            <div className="space-y-2 pl-7 animate-in slide-in-from-top-2">
              <Label htmlFor="custom-email">Email Address</Label>
              <Input
                id="custom-email"
                type="email"
                placeholder="recipient@example.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                className="w-full"
                autoFocus
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={sending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
