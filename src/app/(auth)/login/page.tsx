import type { Metadata } from "next";

import { AuthMarketingPanel } from "@/components/Auth/AuthMarketingPanel";
import { LoginForm } from "@/components/Auth/LoginForm";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to NordFlow CRM with email and password (Neon-backed when configured).",
};

type LoginPageProps = {
  searchParams?: Promise<{ redirect?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const q = searchParams ? await searchParams : {};
  const redirectTo = safeRedirectPath(q.redirect);

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(360px,460px)] xl:grid-cols-[1.05fr_minmax(380px,440px)]">
      <AuthMarketingPanel variant="login" />
      <div className="flex flex-col justify-center px-6 py-16 sm:px-12 lg:min-h-dvh lg:px-14 lg:py-12 xl:px-20">
        <LoginForm redirectTo={redirectTo} />
      </div>
    </div>
  );
}
