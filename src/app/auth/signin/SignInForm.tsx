// File: src/app/auth/signin/SignInForm.tsx
"use client";

import { useEffect, useState } from "react";
import { signIn, getProviders, type ClientSafeProvider } from "next-auth/react";

export default function SignInForm() {
  const [providers, setProviders] = useState<Record<
    string,
    ClientSafeProvider
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const providersData = await getProviders();
        setProviders(providersData);
      } catch (err) {
        console.error("Failed to fetch providers:", err);
        setError("Failed to load authentication providers");
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-col w-full max-w-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <p className="mt-2 text-gray-600">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center flex-col w-full max-w-sm">
        <p className="text-red-600 text-center">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-gray-600 hover:bg-gray-800 text-white rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!providers || Object.keys(providers).length === 0) {
    return (
      <div className="flex items-center justify-center flex-col w-full max-w-sm">
        <p className="text-gray-600 text-center">
          No authentication providers configured.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center flex-col w-full max-w-sm">
      {Object.values(providers).map((provider) => (
        <button
          key={provider.id}
          type="button"
          onClick={() =>
            signIn(provider.id, {
              callbackUrl: "/onboarding/select-organization"
            })
          }
          className="px-4 py-2 mb-2 w-[70%] bg-purple-600 hover:bg-purple-800 text-white rounded"
        >
          Sign in with {provider.name}
        </button>
      ))}
    </div>
  );
}
