import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthCard, AuthErrorAlert, LoginForm } from "@/components/auth";
import { getCurrentUser } from "@/services/auth";

interface LoginPageProps {
  searchParams: Promise<{ error?: string; message?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  return (
    <AuthCard
      title="Sign in"
      description="Welcome back. Sign in to your Posterly account."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-foreground hover:underline"
          >
            Sign up
          </Link>
        </>
      }
    >
      <AuthErrorAlert error={params.error} message={params.message} />
      <LoginForm />
    </AuthCard>
  );
}
