// File: src/app/test-email/page.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TestResult = {
  success?: boolean;
  message?: string;
  error?: string;
  config?: Record<string, unknown>;
  [key: string]: unknown;
} | null;

export default function TestEmailPage() {
  const [result, setResult] = useState<TestResult>(null);
  const [loading, setLoading] = useState(false);

  const testConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testType: "config" })
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        error:
          error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async () => {
    const email = prompt("Enter your email address:");
    if (!email) return;

    setLoading(true);
    try {
      const response = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testType: "send", testEmail: email })
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        error:
          error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Email Service Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-4">
            <Button onClick={testConfig} disabled={loading}>
              Test Configuration
            </Button>
            <Button onClick={sendTestEmail} disabled={loading}>
              Send Test Email
            </Button>
          </div>

          {result && (
            <div className="mt-4 p-4 bg-gray-100 rounded">
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
