"use client";

import { toast as sonnerToast } from "sonner";

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

function toast({ title, description, variant }: ToastOptions) {
  if (variant === "destructive") {
    return sonnerToast.error(title || "Error", {
      description
    });
  }

  return sonnerToast.success(title || "Success", {
    description
  });
}

export function useToast() {
  return {
    toast,
    dismiss: sonnerToast.dismiss
  };
}
