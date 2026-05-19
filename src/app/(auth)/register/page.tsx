import type { Metadata } from "next";

import { AuthMarketingPanel } from "@/components/Auth/AuthMarketingPanel";
import { RegisterForm } from "@/components/Auth/RegisterForm";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";

export const metadata: Metadata = {
  title: "Register",
  description:
    "Create a NordFlow CRM account stored in Neon when DATABASE_URL and AUTH_SECRET are set.",
};

type RegisterPageProps = {
  searchParams?: Promise<{ redirect?: string }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const q = searchParams ? await searchParams : {};
  const redirectTo = safeRedirectPath(q.redirect);

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(280px,1fr)_minmax(0,460px)] xl:grid-cols-[1fr_minmax(0,480px)]">
      <AuthMarketingPanel variant="register" />
      <div className="flex flex-col justify-center px-5 py-12 sm:px-10 lg:py-16 xl:px-14">
        <RegisterForm redirectTo={redirectTo} />
      </div>
    </div>
  );
}
