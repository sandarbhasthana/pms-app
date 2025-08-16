// File: src/app/auth/signin/page.tsx
import { getProviders } from "next-auth/react";
import SignInForm from "./SignInForm";

export default async function SignInPage() {
  // Handle build-time gracefully when no server is running
  let providers = null;

  try {
    // runs on the server; will always resolve if your [...nextauth] handler is wired
    providers = await getProviders();
  } catch (error) {
    // During build time, getProviders() might fail - that's okay
    console.warn("Could not fetch providers during build:", error);
    providers = null;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl mb-4">Sign In</h1>
      <SignInForm providers={providers} />
    </div>
  );
}
