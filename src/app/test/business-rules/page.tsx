"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Play,
  Settings,
  TrendingUp,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface TestResult {
  scenario: string;
  basePrice: number;
  enhancedPrice: number;
  change: number;
  changePercentage: number;
  appliedRules: Array<{ name: string; executed: boolean; success: boolean }>;
  expectedResult: string;
}

interface RuleSummary {
  id: string;
  name: string;
  description?: string;
  category: string;
  priority: number;
  isActive: boolean;
  isAIGenerated: boolean;
  conditionsCount: number;
  actionsCount: number;
}

interface TodayPricing {
  basePrice: number;
  enhancedPrice: number;
  appliedRules: Array<{ name: string; executed: boolean; success: boolean }>;
  executionTime: number;
}

interface TestResultsData {
  message: string;
  roomType: {
    id: string;
    name: string;
    basePrice: number;
  };
  todayPricing: TodayPricing;
  scenarioTests: TestResult[];
  summary: {
    totalScenarios: number;
    rulesApplied: number;
    avgPriceChange: number;
  };
}

interface RulePerformanceData {
  ruleId: string;
  ruleName: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  avgExecutionTimeMs: number;
  totalRevenueImpact: number;
  avgRevenueImpactPerExecution: number;
  lastExecutedAt?: string;
  performanceTrend: "improving" | "declining" | "stable";
}

interface PerformanceData {
  message: string;
  summary: {
    totalRules: number;
    totalExecutions: number;
    overallSuccessRate: number;
    totalRevenueImpact: number;
  };
  performance: RulePerformanceData[];
}

export default function BusinessRulesTestPage() {
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResultsData | null>(null);
  const [rules, setRules] = useState<RuleSummary[]>([]);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mock organization and property IDs (in real app, get from session/context)
  const organizationId = "cmgcitcig0000njowznpnhzp8"; // Grand Palace Hotel
  const propertyId = "cmgcitcij0002njowu85dqocx"; // Main Property

  const setupSampleRules = async () => {
    setSetupLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/business-rules/test?action=setup&organizationId=${organizationId}&propertyId=${propertyId}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to setup rules");
      }

      console.log("✅ Sample rules setup:", data);
      await loadRules(); // Refresh rules list
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSetupLoading(false);
    }
  };

  const runTests = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/business-rules/test?action=test&organizationId=${organizationId}&propertyId=${propertyId}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to run tests");
      }

      setTestResults(data);
      console.log("✅ Test results:", data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadRules = async () => {
    try {
      const response = await fetch(
        `/api/business-rules/test?action=rules&organizationId=${organizationId}&propertyId=${propertyId}`
      );
      const data = await response.json();

      if (response.ok) {
        setRules(data.rules || []);
      } else {
        console.error("Failed to load rules:", data.error);
      }
    } catch (err) {
      console.error("Failed to load rules:", err);
      setError("Failed to load business rules");
    }
  };

  const loadPerformance = async () => {
    try {
      const response = await fetch(
        `/api/business-rules/test?action=performance&organizationId=${organizationId}`
      );
      const data = await response.json();

      if (response.ok) {
        setPerformance(data);
      }
    } catch (err) {
      console.error("Failed to load performance:", err);
    }
  };

  useEffect(() => {
    loadRules();
    loadPerformance();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Business Rules Engine Test</h1>
          <p className="text-muted-foreground">
            Test and demonstrate the dynamic pricing business rules engine
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={setupSampleRules}
            disabled={setupLoading}
            variant="outline"
          >
            {setupLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Settings className="w-4 h-4 mr-2" />
            )}
            Setup Sample Rules
          </Button>

          <Button onClick={runTests} disabled={loading || rules.length === 0}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Run Tests
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rules">Rules ({rules.length})</TabsTrigger>
          <TabsTrigger value="tests">Test Results</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Rules
                </CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{rules.length}</div>
                <p className="text-xs text-muted-foreground">
                  {rules.filter((r) => r.isActive).length} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Test Scenarios
                </CardTitle>
                <Play className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {testResults?.scenarioTests?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Pricing scenarios tested
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Price Change
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {testResults?.summary?.avgPriceChange
                    ? formatPercentage(testResults.summary.avgPriceChange)
                    : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all scenarios
                </p>
              </CardContent>
            </Card>
          </div>

          {testResults?.todayPricing && (
            <Card>
              <CardHeader>
                <CardTitle>Today&apos;s Pricing</CardTitle>
                <CardDescription>
                  Current pricing for {testResults.roomType?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Base Price</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(testResults.todayPricing.basePrice)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Enhanced Price
                    </p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(testResults.todayPricing.enhancedPrice)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Change</p>
                    <p
                      className={`text-2xl font-bold ${
                        testResults.todayPricing.enhancedPrice >
                        testResults.todayPricing.basePrice
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatCurrency(
                        testResults.todayPricing.enhancedPrice -
                          testResults.todayPricing.basePrice
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Rules Applied
                    </p>
                    <p className="text-2xl font-bold">
                      {testResults.todayPricing.appliedRules?.length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="grid gap-4">
            {rules.map((rule) => (
              <Card key={rule.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{rule.name}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant={rule.isActive ? "default" : "secondary"}>
                        {rule.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline">Priority {rule.priority}</Badge>
                      {rule.isAIGenerated && (
                        <Badge variant="secondary">AI Generated</Badge>
                      )}
                    </div>
                  </div>
                  {rule.description && (
                    <CardDescription>{rule.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>Category: {rule.category}</span>
                    <span>Conditions: {rule.conditionsCount}</span>
                    <span>Actions: {rule.actionsCount}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tests" className="space-y-4">
          {testResults?.scenarioTests && (
            <div className="grid gap-4">
              {testResults.scenarioTests.map(
                (test: TestResult, index: number) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          {test.scenario}
                        </CardTitle>
                        <Badge
                          variant={
                            test.change > 0
                              ? "default"
                              : test.change < 0
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {formatPercentage(test.changePercentage)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Base Price
                          </p>
                          <p className="text-xl font-semibold">
                            {formatCurrency(test.basePrice)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Enhanced Price
                          </p>
                          <p className="text-xl font-semibold">
                            {formatCurrency(test.enhancedPrice)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Change
                          </p>
                          <p
                            className={`text-xl font-semibold ${
                              test.change > 0
                                ? "text-green-600"
                                : test.change < 0
                                ? "text-red-600"
                                : "text-gray-600"
                            }`}
                          >
                            {formatCurrency(test.change)}
                          </p>
                        </div>
                      </div>

                      {test.appliedRules.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Applied Rules:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {test.appliedRules.map((rule, ruleIndex) => (
                              <Badge
                                key={ruleIndex}
                                variant={
                                  rule.success ? "default" : "destructive"
                                }
                                className="text-xs"
                              >
                                {rule.success ? (
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                ) : (
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                )}
                                {rule.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {performance && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Performance Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Executions
                      </p>
                      <p className="text-2xl font-bold">
                        {performance.summary.totalExecutions}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Success Rate
                      </p>
                      <p className="text-2xl font-bold">
                        {performance.summary.overallSuccessRate}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Revenue Impact
                      </p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(performance.summary.totalRevenueImpact)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Active Rules
                      </p>
                      <p className="text-2xl font-bold">
                        {performance.summary.totalRules}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4">
                {performance.performance.map(
                  (perf: RulePerformanceData, index: number) => (
                    <Card key={index}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">
                            {perf.ruleName}
                          </CardTitle>
                          <Badge variant="outline">
                            {perf.successRate.toFixed(1)}% success
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Executions</p>
                            <p className="font-semibold">
                              {perf.totalExecutions}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Avg Time</p>
                            <p className="font-semibold">
                              {perf.avgExecutionTimeMs.toFixed(1)}ms
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">
                              Revenue Impact
                            </p>
                            <p className="font-semibold">
                              {formatCurrency(perf.totalRevenueImpact)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">
                              Last Executed
                            </p>
                            <p className="font-semibold">
                              {perf.lastExecutedAt
                                ? new Date(
                                    perf.lastExecutedAt
                                  ).toLocaleDateString()
                                : "Never"}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
