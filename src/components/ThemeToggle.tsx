// File: src/components/ThemeToggle.tsx
"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Laptop } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // Map Next-Theme values to icon and label
  const items = [
    { value: "light", label: "Light", icon: <Sun className="mr-2 h-4 w-4" /> },
    { value: "dark", label: "Dark", icon: <Moon className="mr-2 h-4 w-4" /> },
    {
      value: "system",
      label: "Auto",
      icon: <Laptop className="mr-2 h-4 w-4" />
    }
  ];

  const current = items.find((i) => i.value === theme) || items[2];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="Toggle theme"
          className="pl-2 cursor-pointer"
        >
          {current.icon}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((i) => (
          <DropdownMenuItem key={i.value} onSelect={() => setTheme(i.value)}>
            {i.icon}
            {i.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
