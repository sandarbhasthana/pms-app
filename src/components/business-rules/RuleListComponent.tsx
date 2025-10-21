"use client";

import { useState, useMemo } from "react";
import { BusinessRuleDefinition } from "@/types/business-rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Edit2, Trash2, MoreVertical, Search, Power } from "lucide-react";

interface RuleListComponentProps {
  rules: BusinessRuleDefinition[];
  onEdit: (rule: BusinessRuleDefinition) => void;
  onDelete: (ruleId: string) => void;
  onToggle: (ruleId: string, isActive: boolean) => void;
  isLoading?: boolean;
}

export function RuleListComponent({
  rules,
  onEdit,
  onDelete,
  onToggle,
  isLoading = false
}: RuleListComponentProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [sortBy, setSortBy] = useState<"name" | "priority" | "created">("name");

  // Filter and sort rules
  const filteredRules = useMemo(() => {
    const filtered = rules
      .filter((rule) => {
        // Search filter
        if (
          searchTerm &&
          !rule.name.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          return false;
        }

        // Status filter
        if (filterStatus === "active" && !rule.isActive) return false;
        if (filterStatus === "inactive" && rule.isActive) return false;

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "name":
            return a.name.localeCompare(b.name);
          case "priority":
            return b.priority - a.priority;
          case "created":
            return new Date(b.metadata?.createdAt as string).getTime() -
              new Date(a.metadata?.createdAt as string).getTime()
              ? -1
              : 1;
          default:
            return 0;
        }
      });

    return filtered;
  }, [rules, searchTerm, filterStatus, sortBy]);

  const handleDelete = (ruleId: string, ruleName: string) => {
    if (confirm(`Are you sure you want to delete "${ruleName}"?`)) {
      onDelete(ruleId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading rules...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search rules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as "all" | "active" | "inactive")
            }
            className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1e1e1e] text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "name" | "priority" | "created")
            }
            className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1e1e1e] text-sm"
          >
            <option value="name">Sort by Name</option>
            <option value="priority">Sort by Priority</option>
            <option value="created">Sort by Created</option>
          </select>
        </div>
      </div>

      {/* Rules Table */}
      <div className="rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-white dark:bg-[#1e1e1e] border-b border-gray-300 dark:border-gray-700">
              <TableHead className="font-semibold text-gray-900 dark:!text-gray-100 px-3 py-3 relative">
                Name
                <div className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-px bg-gray-300 dark:bg-gray-700" />
              </TableHead>
              <TableHead className="font-semibold text-gray-900 dark:!text-gray-100 px-3 py-3 relative">
                Type
                <div className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-px bg-gray-300 dark:bg-gray-700" />
              </TableHead>
              <TableHead className="font-semibold text-gray-900 dark:!text-gray-100 px-3 py-3 relative">
                Status
                <div className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-px bg-gray-300 dark:bg-gray-700" />
              </TableHead>
              <TableHead className="font-semibold text-gray-900 dark:!text-gray-100 text-right px-3 py-3 relative">
                Priority
                <div className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-px bg-gray-300 dark:bg-gray-700" />
              </TableHead>
              <TableHead className="font-semibold text-gray-900 dark:!text-gray-100 text-right px-3 py-3">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRules.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  No rules found
                </TableCell>
              </TableRow>
            ) : (
              filteredRules.map((rule) => (
                <TableRow
                  key={rule.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-900/30"
                >
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {rule.category.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={rule.isActive ? "default" : "secondary"}
                      className={
                        rule.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
                          : "bg-gray-200 !text-gray-700 dark:!bg-gray-700 dark:!text-gray-100"
                      }
                    >
                      {rule.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{rule.priority}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(rule)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onToggle(rule.id!, !rule.isActive)}
                        >
                          <Power className="h-4 w-4 mr-2" />
                          {rule.isActive ? "Disable" : "Enable"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(rule.id!, rule.name)}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredRules.length} of {rules.length} rules
      </div>
    </div>
  );
}
