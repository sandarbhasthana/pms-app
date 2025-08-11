"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/spinner";
import { toast } from "sonner";

interface ProfileData {
  name: string;
  email: string;
  role: string;
  image?: string;
}

export default function ProfileSettingsForm() {
  const { data: session, status, update } = useSession();
  const [profileData, setProfileData] = useState<ProfileData>({
    name: "",
    email: "",
    role: "",
    image: ""
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setProfileData({
        name: session.user.name || "",
        email: session.user.email || "",
        role: session.user.role || "",
        image: session.user.image || ""
      });
    }
  }, [session]);

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!session?.user?.id) {
      toast.error("User session not found");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: profileData.name,
          image: profileData.image
        })
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      // Update the session with new data
      await update({
        ...session,
        user: {
          ...session.user,
          name: profileData.name,
          image: profileData.image
        }
      });

      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="text-center text-red-600">
        You must be logged in to view this page.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Name Field */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={profileData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="w-full px-3 py-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              placeholder="Enter your full name"
            />
          </div>

          {/* Email Field (Read-only) */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={profileData.email}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 cursor-not-allowed"
              placeholder="Email address"
            />
            <p className="text-xs text-gray-500 mt-1">
              Email cannot be changed
            </p>
          </div>

          {/* Role Field (Read-only) */}
          <div>
            <label
              htmlFor="role"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Role
            </label>
            <input
              id="role"
              type="text"
              value={
                profileData.role
                  ?.replace("_", " ")
                  .toLowerCase()
                  .replace(/\b\w/g, (l) => l.toUpperCase()) || ""
              }
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 cursor-not-allowed"
              placeholder="User role"
            />
            <p className="text-xs text-gray-500 mt-1">
              Role is managed by administrators
            </p>
          </div>

          {/* Profile Image URL */}
          <div>
            <label
              htmlFor="image"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Profile Image URL
            </label>
            <input
              id="image"
              type="url"
              value={profileData.image}
              onChange={(e) => handleInputChange("image", e.target.value)}
              className="w-full px-3 py-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              placeholder="https://example.com/profile-image.jpg"
            />
          </div>

          {/* Current Profile Image Preview */}
          {profileData.image && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Profile Image
              </label>
              <Image
                src={profileData.image}
                alt="Profile preview"
                width={80}
                height={80}
                className="rounded-full object-cover border-2 border-gray-300 dark:border-gray-600"
                onError={() => {
                  // Handle error by hiding the image container
                  setProfileData((prev) => ({ ...prev, image: "" }));
                }}
              />
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isSaving ? (
                <>
                  <LoadingSpinner />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
