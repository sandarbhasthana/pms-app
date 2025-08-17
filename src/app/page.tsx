"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import SignInForm from "@/app/auth/signin/SignInForm";

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      // Redirect authenticated users to dashboard
      router.replace("/dashboard");
    }
  }, [session, status, router]);

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Show sign-in page for unauthenticated users
  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Property Management System
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Sign in to manage your properties
            </p>
          </div>

          {/* Sign-in Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Welcome Back
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Please sign in to continue
              </p>
            </div>

            <SignInForm />
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Need access? Contact your administrator for an invitation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // This should not be reached, but just in case
  return null;
}
