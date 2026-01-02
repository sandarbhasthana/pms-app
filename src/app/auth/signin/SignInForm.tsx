// File: src/app/auth/signin/SignInForm.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { useGlobalLoader } from "@/contexts/LoadingContext";

import {
  devLoginSchema,
  loginWithPasswordSchema
} from "@/lib/validations/password";

type DevLoginData = {
  email: string;
};

type PasswordLoginData = {
  email: string;
  password: string;
};

export default function SignInForm() {
  const [isDevLoading, setIsDevLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { showLoader } = useGlobalLoader();

  // Determine default tab based on environment
  const defaultTab =
    process.env.NODE_ENV === "development" ? "dev" : "standard";

  // Dev login form
  const devForm = useForm<DevLoginData>({
    resolver: zodResolver(devLoginSchema),
    defaultValues: {
      email: ""
    }
  });

  // Password login form
  const passwordForm = useForm<PasswordLoginData>({
    resolver: zodResolver(loginWithPasswordSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  // Dev login handler
  const handleDevLogin = async (data: DevLoginData) => {
    setIsDevLoading(true);
    try {
      const result = await signIn("dev-login", {
        email: data.email,
        redirect: false
      });

      if (result?.error) {
        toast.error("Login failed. Please check your email and try again.");
        setIsDevLoading(false);
      } else {
        toast.success("Login successful!");
        // Show full-page loader during redirect
        showLoader("Redirecting to dashboard...");
        // Redirect based on user role will be handled by middleware
        window.location.href = "/dashboard";
      }
    } catch (error) {
      console.error("Dev login error:", error);
      toast.error("An unexpected error occurred. Please try again.");
      setIsDevLoading(false);
    }
  };

  // Password login handler
  const handlePasswordLogin = async (data: PasswordLoginData) => {
    setIsPasswordLoading(true);
    try {
      const result = await signIn("password-login", {
        email: data.email,
        password: data.password,
        redirect: false
      });

      if (result?.error) {
        toast.error("Invalid email or password. Please try again.");
        setIsPasswordLoading(false);
      } else {
        toast.success("Login successful!");
        // Show full-page loader during redirect
        showLoader("Redirecting to dashboard...");
        // Redirect based on user role will be handled by middleware
        window.location.href = "/dashboard";
      }
    } catch (error) {
      console.error("Password login error:", error);
      toast.error("An unexpected error occurred. Please try again.");
      setIsPasswordLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dev">Dev Login</TabsTrigger>
          <TabsTrigger value="standard">Standard Login</TabsTrigger>
        </TabsList>

        {/* Dev Login Tab */}
        <TabsContent value="dev">
          <Card>
            <CardHeader>
              <CardTitle>Developer Login</CardTitle>
              <CardDescription>
                Quick email-only login for development and existing users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={devForm.handleSubmit(handleDevLogin)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="dev-email">Email</Label>
                  <Input
                    id="dev-email"
                    type="email"
                    placeholder="org_admin@example.com"
                    {...devForm.register("email")}
                    className={
                      devForm.formState.errors.email ? "border-red-500" : ""
                    }
                  />
                  {devForm.formState.errors.email && (
                    <p className="text-sm text-red-600">
                      {devForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full cursor-pointer bg-purple-700 hover:bg-purple-800 text-white border-none shadow-lg shadow-purple-700/25"
                  disabled={isDevLoading}
                >
                  {isDevLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Standard Login Tab */}
        <TabsContent value="standard">
          <Card>
            <CardHeader>
              <CardTitle>Standard Login</CardTitle>
              <CardDescription>
                Login with your email and password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={passwordForm.handleSubmit(handlePasswordLogin)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="standard-email">Email</Label>
                  <Input
                    id="standard-email"
                    type="email"
                    placeholder="admin@example.com"
                    {...passwordForm.register("email")}
                    className={
                      passwordForm.formState.errors.email
                        ? "border-red-500"
                        : ""
                    }
                  />
                  {passwordForm.formState.errors.email && (
                    <p className="text-sm text-red-600">
                      {passwordForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="standard-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="standard-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      {...passwordForm.register("password")}
                      className={`pr-10 ${
                        passwordForm.formState.errors.password
                          ? "border-red-500"
                          : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {passwordForm.formState.errors.password && (
                    <p className="text-sm text-red-600">
                      {passwordForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full cursor-pointer bg-purple-700 hover:bg-purple-800 text-white border-none shadow-lg shadow-purple-700/25"
                  disabled={isPasswordLoading}
                >
                  {isPasswordLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
