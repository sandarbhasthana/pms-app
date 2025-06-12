// File: src/app/auth/signin/SignInForm.tsx
"use client";

import { signIn } from "next-auth/react";

interface SignInFormProps {
  providers: Record<
    string,
    { id: string; name: string; type: string; signinUrl: string }
  > | null;
}

export default function SignInForm({ providers }: SignInFormProps) {
  if (!providers) return <p>No authentication providers configured.</p>;

  return (
    <div className="flex items-center justify-center flex-col w-full max-w-sm">
      {Object.values(providers).map((provider) => (
        <button
          key={provider.id}
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
