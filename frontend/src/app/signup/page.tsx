import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthCard, AuthErrorAlert, SignupForm } from "@/components/auth";
import { getCurrentUser } from "@/services/auth";

interface SignupPageProps {
  searchParams: Promise<{ error?: string; message?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  return (
    <AuthCard
      title="Create your account"
      description="Start designing AI posters in minutes."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <AuthErrorAlert error={params.error} message={params.message} />
      <SignupForm />
    </AuthCard>
  );
}
