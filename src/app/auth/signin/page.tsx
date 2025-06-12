// File: src/app/auth/signin/page.tsx
import { getProviders } from "next-auth/react";
import SignInForm from "./SignInForm";

export default async function SignInPage() {
  // runs on the server; will always resolve if your [...nextauth] handler is wired
  const providers = await getProviders();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl mb-4">Sign In</h1>
      <SignInForm providers={providers} />
    </div>
  );
}
