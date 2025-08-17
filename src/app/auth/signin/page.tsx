// File: src/app/auth/signin/page.tsx
import SignInForm from "./SignInForm";

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl mb-4">Sign In</h1>
      <SignInForm />
    </div>
  );
}
