"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Calendar,
  Users,
  Settings,
  Bell,
  Search,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Moon,
  Sun,
  Palette
} from "lucide-react";

// Purple-first theme definition
const purpleTheme = {
  name: "Purple Theme",
  primary: { light: "#6D28D9", dark: "#8B5CF6" },
  primaryHover: { light: "#5B21B6", dark: "#7C3AED" },
  accent: { light: "#A78BFA", dark: "#C4B5FD" },
  success: { light: "#16A34A", dark: "#22C55E" },
  warning: { light: "#F59E0B", dark: "#FACC15" },
  error: { light: "#DC2626", dark: "#F87171" },
  background: { light: "#FAFAFB", dark: "#0F1115" },
  surface: { light: "#FFFFFF", dark: "#151821" },
  surfaceSecondary: { light: "#F3F4F6", dark: "#151821" },
  text: { light: "#111827", dark: "#E5E7EB" },
  textMuted: { light: "#6B7280", dark: "#9CA3AF" },
  border: { light: "#E9D5FF", dark: "#262A36" },
  gradient: "linear-gradient(12deg, #7C3AED, #6D28D9)"
};

export default function ThemeDemo() {
  const [activeTab, setActiveTab] = useState("themes");
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Apply purple theme to document
  useEffect(() => {
    const mode = isDarkMode ? "dark" : "light";

    document.documentElement.style.setProperty(
      "--theme-primary",
      purpleTheme.primary[mode]
    );
    document.documentElement.style.setProperty(
      "--theme-primary-hover",
      purpleTheme.primaryHover[mode]
    );
    document.documentElement.style.setProperty(
      "--theme-accent",
      purpleTheme.accent[mode]
    );
    document.documentElement.style.setProperty(
      "--theme-success",
      purpleTheme.success[mode]
    );
    document.documentElement.style.setProperty(
      "--theme-warning",
      purpleTheme.warning[mode]
    );
    document.documentElement.style.setProperty(
      "--theme-error",
      purpleTheme.error[mode]
    );
    document.documentElement.style.setProperty(
      "--theme-background",
      purpleTheme.background[mode]
    );
    document.documentElement.style.setProperty(
      "--theme-surface",
      purpleTheme.surface[mode]
    );
    document.documentElement.style.setProperty(
      "--theme-surface-secondary",
      purpleTheme.surfaceSecondary[mode]
    );
    document.documentElement.style.setProperty(
      "--theme-text",
      purpleTheme.text[mode]
    );
    document.documentElement.style.setProperty(
      "--theme-text-muted",
      purpleTheme.textMuted[mode]
    );
    document.documentElement.style.setProperty(
      "--theme-border",
      purpleTheme.border[mode]
    );
    document.documentElement.style.setProperty(
      "--theme-gradient",
      purpleTheme.gradient
    );
  }, [isDarkMode]);

  const getThemeClasses = () => {
    return {
      background: "bg-[var(--theme-background)]",
      header: "bg-[var(--theme-primary)] text-white",
      card: "bg-[var(--theme-surface)] border-[var(--theme-border)]",
      text: "text-[var(--theme-text)]",
      muted: "text-[var(--theme-text-muted)]",
      primary:
        "bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)]",
      accent: "bg-[var(--theme-accent)]",
      success: "bg-[var(--theme-success)]",
      warning: "bg-[var(--theme-warning)]",
      error: "bg-[var(--theme-error)]",
      gradient: "bg-gradient-to-r from-[#7C3AED] to-[#6D28D9]"
    };
  };

  const classes = getThemeClasses();

  return (
    <div className={`min-h-screen ${classes.background}`}>
      {/* Header */}
      <header className={`${classes.header} shadow-lg`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold">{purpleTheme.name} Demo</h1>
              <Badge className={`${classes.accent} text-white`}>
                PMS System
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-black/20"
                onClick={() => setIsDarkMode(!isDarkMode)}
              >
                {isDarkMode ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-black/20"
              >
                <Bell className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-black/20"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Color Palette Display */}
        <Card className={classes.card}>
          <CardHeader>
            <CardTitle className={classes.text}>
              {purpleTheme.name} Color Palette
            </CardTitle>
            <CardDescription className={classes.muted}>
              Purple-first design system with light and dark mode variants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div
                  className="w-full h-20 rounded-lg mb-2"
                  style={{
                    backgroundColor:
                      purpleTheme.primary[isDarkMode ? "dark" : "light"]
                  }}
                ></div>
                <p className={`text-sm font-medium ${classes.text}`}>Primary</p>
                <p className={`text-xs ${classes.muted}`}>
                  {purpleTheme.primary[isDarkMode ? "dark" : "light"]}
                </p>
                <p className={`text-xs ${classes.muted}`}>
                  Buttons, Active States
                </p>
              </div>
              <div className="text-center">
                <div
                  className="w-full h-20 rounded-lg mb-2"
                  style={{
                    backgroundColor:
                      purpleTheme.accent[isDarkMode ? "dark" : "light"]
                  }}
                ></div>
                <p className={`text-sm font-medium ${classes.text}`}>Accent</p>
                <p className={`text-xs ${classes.muted}`}>
                  {purpleTheme.accent[isDarkMode ? "dark" : "light"]}
                </p>
                <p className={`text-xs ${classes.muted}`}>Chips, Badges</p>
              </div>
              <div className="text-center">
                <div
                  className="w-full h-20 rounded-lg mb-2"
                  style={{
                    backgroundColor:
                      purpleTheme.success[isDarkMode ? "dark" : "light"]
                  }}
                ></div>
                <p className={`text-sm font-medium ${classes.text}`}>Success</p>
                <p className={`text-xs ${classes.muted}`}>
                  {purpleTheme.success[isDarkMode ? "dark" : "light"]}
                </p>
                <p className={`text-xs ${classes.muted}`}>Success States</p>
              </div>
              <div className="text-center">
                <div
                  className="w-full h-20 rounded-lg mb-2"
                  style={{
                    backgroundColor:
                      purpleTheme.warning[isDarkMode ? "dark" : "light"]
                  }}
                ></div>
                <p className={`text-sm font-medium ${classes.text}`}>Warning</p>
                <p className={`text-xs ${classes.muted}`}>
                  {purpleTheme.warning[isDarkMode ? "dark" : "light"]}
                </p>
                <p className={`text-xs ${classes.muted}`}>Warnings, Alerts</p>
              </div>
              <div className="text-center">
                <div
                  className="w-full h-20 rounded-lg mb-2"
                  style={{
                    backgroundColor:
                      purpleTheme.error[isDarkMode ? "dark" : "light"]
                  }}
                ></div>
                <p className={`text-sm font-medium ${classes.text}`}>Error</p>
                <p className={`text-xs ${classes.muted}`}>
                  {purpleTheme.error[isDarkMode ? "dark" : "light"]}
                </p>
                <p className={`text-xs ${classes.muted}`}>Error States</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[var(--theme-surface-secondary)]">
            <TabsTrigger
              value="themes"
              className={`data-[state=active]:bg-[var(--theme-primary)] data-[state=active]:text-white ${classes.text}`}
            >
              <Palette className="h-4 w-4 mr-2" />
              Theme Demo
            </TabsTrigger>
            <TabsTrigger
              value="overview"
              className={`data-[state=active]:bg-[var(--theme-primary)] data-[state=active]:text-white ${classes.text}`}
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="components"
              className={`data-[state=active]:bg-[var(--theme-primary)] data-[state=active]:text-white ${classes.text}`}
            >
              Components
            </TabsTrigger>
            <TabsTrigger
              value="forms"
              className={`data-[state=active]:bg-[var(--theme-primary)] data-[state=active]:text-white ${classes.text}`}
            >
              Forms
            </TabsTrigger>
            <TabsTrigger
              value="data"
              className={`data-[state=active]:bg-[var(--theme-primary)] data-[state=active]:text-white ${classes.text}`}
            >
              Data Tables
            </TabsTrigger>
          </TabsList>

          <TabsContent value="themes" className="space-y-6">
            {/* Theme Mode Selector */}
            <Card className={classes.card}>
              <CardHeader>
                <CardTitle className={classes.text}>
                  Purple Theme Modes
                </CardTitle>
                <CardDescription className={classes.muted}>
                  Toggle between light and dark modes to see how the purple
                  theme adapts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Light Mode Preview */}
                  <div
                    className={`p-4 rounded-lg border-2 transition-all ${
                      !isDarkMode
                        ? "border-[var(--theme-primary)] bg-[var(--theme-primary)]/10"
                        : "border-[var(--theme-border)] hover:border-[var(--theme-primary)]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`font-semibold ${classes.text}`}>
                        Light Mode
                      </h3>
                      {!isDarkMode && (
                        <Badge className={`${classes.primary} text-white`}>
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-2 mb-3">
                      <div
                        className="h-8 rounded"
                        style={{ backgroundColor: purpleTheme.primary.light }}
                        title={`Primary: ${purpleTheme.primary.light}`}
                      ></div>
                      <div
                        className="h-8 rounded"
                        style={{ backgroundColor: purpleTheme.accent.light }}
                        title={`Accent: ${purpleTheme.accent.light}`}
                      ></div>
                      <div
                        className="h-8 rounded"
                        style={{ backgroundColor: purpleTheme.success.light }}
                        title={`Success: ${purpleTheme.success.light}`}
                      ></div>
                      <div
                        className="h-8 rounded"
                        style={{ backgroundColor: purpleTheme.warning.light }}
                        title={`Warning: ${purpleTheme.warning.light}`}
                      ></div>
                      <div
                        className="h-8 rounded"
                        style={{ backgroundColor: purpleTheme.error.light }}
                        title={`Error: ${purpleTheme.error.light}`}
                      ></div>
                    </div>
                    <p className={`text-xs ${classes.muted}`}>
                      Background: {purpleTheme.background.light}
                    </p>
                  </div>

                  {/* Dark Mode Preview */}
                  <div
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isDarkMode
                        ? "border-[var(--theme-primary)] bg-[var(--theme-primary)]/10"
                        : "border-[var(--theme-border)] hover:border-[var(--theme-primary)]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`font-semibold ${classes.text}`}>
                        Dark Mode
                      </h3>
                      {isDarkMode && (
                        <Badge className={`${classes.primary} text-white`}>
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-2 mb-3">
                      <div
                        className="h-8 rounded"
                        style={{ backgroundColor: purpleTheme.primary.dark }}
                        title={`Primary: ${purpleTheme.primary.dark}`}
                      ></div>
                      <div
                        className="h-8 rounded"
                        style={{ backgroundColor: purpleTheme.accent.dark }}
                        title={`Accent: ${purpleTheme.accent.dark}`}
                      ></div>
                      <div
                        className="h-8 rounded"
                        style={{ backgroundColor: purpleTheme.success.dark }}
                        title={`Success: ${purpleTheme.success.dark}`}
                      ></div>
                      <div
                        className="h-8 rounded"
                        style={{ backgroundColor: purpleTheme.warning.dark }}
                        title={`Warning: ${purpleTheme.warning.dark}`}
                      ></div>
                      <div
                        className="h-8 rounded"
                        style={{ backgroundColor: purpleTheme.error.dark }}
                        title={`Error: ${purpleTheme.error.dark}`}
                      ></div>
                    </div>
                    <p className={`text-xs ${classes.muted}`}>
                      Background: {purpleTheme.background.dark}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CSS Variables Implementation */}
            <Card className={classes.card}>
              <CardHeader>
                <CardTitle className={classes.text}>
                  CSS Variables Implementation
                </CardTitle>
                <CardDescription className={classes.muted}>
                  The CSS variables that power this theme system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-[var(--theme-surface-secondary)] p-4 rounded-lg">
                  <pre className={`text-sm ${classes.text} overflow-x-auto`}>
                    {`:root {
  --bg: #FAFAFB;
  --surface: #FFFFFF;
  --border-subtle: #E9D5FF;
  --text: #111827;
  --text-muted: #6B7280;
  --primary: #6D28D9;
  --primary-hover: #5B21B6;
  --accent: #A78BFA;
  --success: #16A34A;
  --warning: #F59E0B;
  --danger: #DC2626;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0F1115;
    --surface: #151821;
    --border-subtle: #262A36;
    --text: #E5E7EB;
    --text-muted: #9CA3AF;
    --primary: #8B5CF6;
    --primary-hover: #7C3AED;
    --accent: #C4B5FD;
    --success: #22C55E;
    --warning: #FACC15;
    --danger: #F87171;
  }
}`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card
                className={`${classes.card} border-l-4`}
                style={{ borderLeftColor: "var(--theme-accent)" }}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm ${classes.muted}`}>
                        Total Bookings
                      </p>
                      <p className={`text-3xl font-bold ${classes.text}`}>
                        1,234
                      </p>
                    </div>
                    <Calendar
                      className="h-8 w-8"
                      style={{ color: "var(--theme-accent)" }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`${classes.card} border-l-4`}
                style={{ borderLeftColor: "var(--theme-success)" }}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm ${classes.muted}`}>
                        Active Guests
                      </p>
                      <p className={`text-3xl font-bold ${classes.text}`}>89</p>
                    </div>
                    <Users
                      className="h-8 w-8"
                      style={{ color: "var(--theme-success)" }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`${classes.card} border-l-4`}
                style={{ borderLeftColor: "var(--theme-warning)" }}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm ${classes.muted}`}>
                        Pending Tasks
                      </p>
                      <p className={`text-3xl font-bold ${classes.text}`}>12</p>
                    </div>
                    <AlertTriangle
                      className="h-8 w-8"
                      style={{ color: "var(--theme-warning)" }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`${classes.card} border-l-4`}
                style={{ borderLeftColor: "var(--theme-primary)" }}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm ${classes.muted}`}>Revenue</p>
                      <p className={`text-3xl font-bold ${classes.text}`}>
                        $45.2K
                      </p>
                    </div>
                    <CheckCircle
                      className="h-8 w-8"
                      style={{ color: "var(--theme-primary)" }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="components" className="space-y-6">
            {/* Buttons */}
            <Card className={classes.card}>
              <CardHeader>
                <CardTitle className={classes.text}>
                  Buttons & Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <Button className={classes.primary}>Primary Action</Button>
                  <Button
                    variant="outline"
                    className="border-[var(--theme-primary)] text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/10"
                  >
                    Secondary
                  </Button>
                  <Button
                    variant="ghost"
                    className={`${classes.muted} hover:bg-[var(--theme-accent)]/20`}
                  >
                    Ghost
                  </Button>
                  <Button className={classes.success}>
                    <Plus className="h-4 w-4 mr-2" />
                    Success Action
                  </Button>
                  <Button className={classes.warning}>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Warning
                  </Button>
                  <Button className={classes.error}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Badges */}
            <Card className={classes.card}>
              <CardHeader>
                <CardTitle className={classes.text}>Status Badges</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Badge className={classes.accent}>Active</Badge>
                  <Badge className={classes.success}>Confirmed</Badge>
                  <Badge className={classes.warning}>Pending</Badge>
                  <Badge className={classes.error}>Cancelled</Badge>
                  <Badge className="bg-[var(--theme-text-muted)] text-[var(--theme-surface)]">
                    Draft
                  </Badge>
                  <Badge className={classes.primary}>VIP</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="forms" className="space-y-6">
            <Card className={classes.card}>
              <CardHeader>
                <CardTitle className={classes.text}>Form Elements</CardTitle>
                <CardDescription className={classes.muted}>
                  Input fields and form controls with Purple theme styling
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className={classes.text}>
                      Guest Name
                    </Label>
                    <Input
                      id="name"
                      placeholder="Enter guest name"
                      className="border-[var(--theme-border)] focus:border-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className={classes.text}>
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="guest@example.com"
                      className="border-[var(--theme-border)] focus:border-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button className={classes.primary}>Save Changes</Button>
                  <Button
                    variant="outline"
                    className="border-[var(--theme-border)] text-[var(--theme-text-muted)]"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <Card className={classes.card}>
              <CardHeader>
                <CardTitle className={classes.text}>Recent Bookings</CardTitle>
                <CardDescription className={classes.muted}>
                  Sample data table with Purple theme styling
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-[var(--theme-border)]">
                      <TableHead className={classes.muted}>Guest</TableHead>
                      <TableHead className={classes.muted}>Room</TableHead>
                      <TableHead className={classes.muted}>Status</TableHead>
                      <TableHead className={classes.muted}>Amount</TableHead>
                      <TableHead className={classes.muted}>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="border-[var(--theme-border)]">
                      <TableCell className={`font-medium ${classes.text}`}>
                        John Doe
                      </TableCell>
                      <TableCell className={classes.text}>
                        Purple Suite
                      </TableCell>
                      <TableCell>
                        <Badge className={classes.success}>Confirmed</Badge>
                      </TableCell>
                      <TableCell className={classes.text}>$299</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={classes.muted}
                            >
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-[var(--theme-error)]">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Cancel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    <TableRow className="border-[var(--theme-border)]">
                      <TableCell className={`font-medium ${classes.text}`}>
                        Jane Smith
                      </TableCell>
                      <TableCell className={classes.text}>
                        Standard Room
                      </TableCell>
                      <TableCell>
                        <Badge className={classes.warning}>Pending</Badge>
                      </TableCell>
                      <TableCell className={classes.text}>$199</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[var(--theme-primary)]"
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
