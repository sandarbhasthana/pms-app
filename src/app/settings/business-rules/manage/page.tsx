"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Zap } from "lucide-react";
import { RuleListComponent } from "@/components/business-rules/RuleListComponent";
import { RuleEditorSheet } from "@/components/business-rules/RuleEditorSheet";
import { RuleTemplatesModal } from "@/components/business-rules/RuleTemplatesModal";
import PriorityLegendModal from "@/components/business-rules/PriorityLegendModal";
import { BusinessRuleDefinition } from "@/types/business-rules";
import { getCookie } from "cookies-next";

interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: "PRICING" | "AVAILABILITY" | "RESTRICTIONS";
  rule: Omit<
    BusinessRuleDefinition,
    "id" | "propertyId" | "organizationId" | "createdBy"
  >;
}

export default function RuleManagementPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<BusinessRuleDefinition[]>([]);
  const [selectedRule, setSelectedRule] = useState<
    BusinessRuleDefinition | undefined
  >();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const propertyId = getCookie("propertyId") as string;

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/business-rules?propertyId=${propertyId}`
      );

      if (!response.ok) throw new Error("Failed to fetch rules");

      const data = await response.json();
      setRules(data.rules || []);
    } catch (error) {
      console.error("Error fetching rules:", error);
      toast.error("Failed to load business rules");
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (!session?.user?.id) {
      router.push("/signin");
      return;
    }

    fetchRules();
  }, [session?.user?.id, fetchRules, router]);

  const handleCreateNew = () => {
    setSelectedRule(undefined);
    setIsEditorOpen(true);
  };

  const handleEdit = (rule: BusinessRuleDefinition) => {
    setSelectedRule(rule);
    setIsEditorOpen(true);
  };

  const handleSaveRule = async (rule: BusinessRuleDefinition) => {
    try {
      setIsSaving(true);
      const method = rule.id ? "PATCH" : "POST";
      const url = rule.id
        ? `/api/business-rules/${rule.id}`
        : "/api/business-rules";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...rule,
          propertyId,
          organizationId: session?.user?.orgId
        })
      });

      if (!response.ok) throw new Error("Failed to save rule");

      toast.success(rule.id ? "Rule updated" : "Rule created");
      setIsEditorOpen(false);
      await fetchRules();
    } catch (error) {
      console.error("Error saving rule:", error);
      toast.error("Failed to save rule");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const response = await fetch(`/api/business-rules/${ruleId}`, {
        method: "DELETE"
      });

      if (!response.ok) throw new Error("Failed to delete rule");

      toast.success("Rule deleted");
      await fetchRules();
    } catch (error) {
      console.error("Error deleting rule:", error);
      toast.error("Failed to delete rule");
    }
  };

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/business-rules/${ruleId}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive })
      });

      if (!response.ok) throw new Error("Failed to toggle rule");

      toast.success(isActive ? "Rule enabled" : "Rule disabled");
      await fetchRules();
    } catch (error) {
      console.error("Error toggling rule:", error);
      toast.error("Failed to toggle rule");
    }
  };

  const handleApplyTemplate = (template: RuleTemplate) => {
    setSelectedRule({
      ...template.rule,
      propertyId,
      organizationId: session?.user?.orgId || "",
      createdBy: session?.user?.id || ""
    });
    setIsTemplatesOpen(false);
    setIsEditorOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-1 max-w-6xl mx-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Business Rules Management</h1>
            <p className="text-muted-foreground mt-2">
              Create and manage dynamic pricing rules for your property
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsTemplatesOpen(true)} variant="outline">
              <Zap className="w-4 h-4 mr-2" />
              Templates
            </Button>
            <Button
              onClick={handleCreateNew}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Rule
            </Button>
          </div>
        </div>

        {/* Rules List */}
        <RuleListComponent
          rules={rules}
          onEdit={handleEdit}
          onDelete={handleDeleteRule}
          onToggle={handleToggleRule}
          isLoading={loading}
        />

        {/* Legend Link */}
        <div className="mt-4 text-left text-md">
          <button
            type="button"
            onClick={() => setIsLegendOpen(true)}
            className="underline text-gray-900 dark:text-white font-bold hover:text-purple-600 cursor-pointer"
          >
            Legend
          </button>
        </div>

        {/* Empty State */}
        {rules.length === 0 && !loading && (
          <div className="text-center py-12">
            <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No rules yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first rule to start dynamic pricing
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                onClick={() => setIsTemplatesOpen(true)}
                variant="outline"
              >
                Browse Templates
              </Button>
              <Button
                onClick={handleCreateNew}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Create Rule
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Editor Sheet */}
      <RuleEditorSheet
        isOpen={isEditorOpen}
        rule={selectedRule}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveRule}
        isLoading={isSaving}
      />

      {/* Templates Modal */}
      <RuleTemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onApply={handleApplyTemplate}
        isLoading={isSaving}
      />

      {/* Priority Legend Modal */}
      <PriorityLegendModal
        open={isLegendOpen}
        onClose={() => setIsLegendOpen(false)}
      />
    </div>
  );
}
