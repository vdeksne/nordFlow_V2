"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, UserRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { NordflowLogo } from "@/components/Crm/NordflowLogo";
import { Button } from "@/components/Ui/Button";
import { Input } from "@/components/Ui/Input";
import { cn } from "@/lib/utils";

type RegisterFormProps = {
  className?: string;
  redirectTo?: string;
};

export function RegisterForm({
  className,
  redirectTo = "/dashboard",
}: RegisterFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [credentialAuthEnabled, setCredentialAuthEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((data: { credentialAuthEnabled?: boolean }) => {
        if (!cancelled) setCredentialAuthEnabled(Boolean(data.credentialAuthEnabled));
      })
      .catch(() => {
        if (!cancelled) setCredentialAuthEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);

      if (password !== confirm) {
        setError("Passwords do not match.");
        return;
      }

      if (password.length < 8) {
        setError("Use at least 8 characters for your password.");
        return;
      }

      if (!terms) {
        setError("Accept the terms to continue.");
        return;
      }

      setLoading(true);

      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: email.trim(),
            password,
            fullName: fullName.trim(),
          }),
        });

        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
        };

        if (!res.ok || !data.ok) {
          setError(data.error ?? "Could not create account.");
          return;
        }

        router.push(redirectTo);
        router.refresh();
      } catch {
        setError("Network error. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [
      confirm,
      email,
      fullName,
      password,
      redirectTo,
      router,
      terms,
    ],
  );

  return (
    <div className={cn("mx-auto w-full max-w-[400px]", className)}>
      <div className="mb-8 lg:hidden">
        <Link
          href="/dashboard"
          className="focus-visible:ring-primary inline-block rounded-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
        >
          <NordflowLogo priority />
        </Link>
      </div>

      <div className="rounded-none border border-white/[0.08] bg-[color-mix(in_oklab,var(--card)_88%,transparent)] p-8 shadow-[0_32px_90px_-52px_color-mix(in_oklab,var(--primary)_45%,transparent)] backdrop-blur-xl sm:p-9">
        <p className="text-primary mb-2 text-[11px] font-bold tracking-[0.2em] uppercase">
          {credentialAuthEnabled ? "Account" : "Preview"}
        </p>
        <h2 className="text-foreground text-2xl font-semibold tracking-tight">
          Create an account
        </h2>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          {credentialAuthEnabled
            ? "Your credentials are stored in Neon (hashed password). You will be signed in immediately."
            : "Demo mode: configure DATABASE_URL + AUTH_SECRET and apply db/auth-schema.sql to enable registration."}
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          {error ? (
            <p
              className="border border-rose-400/25 bg-rose-500/[0.08] px-3 py-2 text-[13px] leading-snug text-rose-100"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="space-y-2">
            <label
              htmlFor="register-name"
              className="text-foreground text-xs font-semibold"
            >
              Full name
            </label>
            <div className="relative">
              <UserRound
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id="register-name"
                autoComplete="name"
                placeholder="Alex Nordstrom"
                required
                value={fullName}
                onChange={(ev) => setFullName(ev.target.value)}
                disabled={loading}
                className="h-11 rounded-none border-white/[0.1] bg-[color-mix(in_oklab,var(--card)_40%,transparent)] pl-10 text-base md:text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="register-email"
              className="text-foreground text-xs font-semibold"
            >
              Work email
            </label>
            <div className="relative">
              <Mail
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id="register-email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                required
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                disabled={loading}
                className="h-11 rounded-none border-white/[0.1] bg-[color-mix(in_oklab,var(--card)_40%,transparent)] pl-10 text-base md:text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="register-password"
              className="text-foreground text-xs font-semibold"
            >
              Password
            </label>
            <div className="relative">
              <Lock
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id="register-password"
                type="password"
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                required
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                disabled={loading}
                className="h-11 rounded-none border-white/[0.1] bg-[color-mix(in_oklab,var(--card)_40%,transparent)] pl-10 text-base md:text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="register-confirm"
              className="text-foreground text-xs font-semibold"
            >
              Confirm password
            </label>
            <div className="relative">
              <Lock
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id="register-confirm"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat password"
                required
                value={confirm}
                onChange={(ev) => setConfirm(ev.target.value)}
                disabled={loading}
                className="h-11 rounded-none border-white/[0.1] bg-[color-mix(in_oklab,var(--card)_40%,transparent)] pl-10 text-base md:text-sm"
              />
            </div>
          </div>

          <label className="text-muted-foreground flex cursor-pointer items-start gap-2.5 text-sm leading-snug">
            <input
              type="checkbox"
              checked={terms}
              onChange={(ev) => setTerms(ev.target.checked)}
              disabled={loading}
              className="border-input bg-background accent-primary mt-0.5 size-4 shrink-0 rounded-none border"
            />
            I agree to the Terms and Privacy policy.
          </label>

          <Button
            type="submit"
            variant="solid"
            size="lg"
            className="h-11 w-full text-[13px]"
            disabled={loading}
          >
            {loading ? "Creating…" : "Create account"}
          </Button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="border-sidebar-border w-full border-t border-white/[0.06]" />
            </div>
            <div className="relative flex justify-center text-xs font-medium">
              <span className="bg-[color-mix(in_oklab,var(--card)_88%,transparent)] text-muted-foreground px-3">
                Or sign up with
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled
              title="Google sign-in is not configured in this build."
              className="h-11 cursor-not-allowed border-white/[0.1] text-[13px] font-normal tracking-normal opacity-60 normal-case"
            >
              Google
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled
              title="Microsoft sign-in is not configured in this build."
              className="h-11 cursor-not-allowed border-white/[0.1] text-[13px] font-normal tracking-normal opacity-60 normal-case"
            >
              Microsoft
            </Button>
          </div>
        </form>

        <p className="text-muted-foreground mt-8 text-center text-sm">
          <Link
            href="/pricing"
            className="text-primary hover:text-primary/85 font-semibold transition-colors"
          >
            Pricing
          </Link>
          <span className="text-muted-foreground/70 px-2">·</span>
          Already have access?{" "}
          <Link
            href="/login"
            className="text-primary hover:text-primary/85 font-semibold transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>

      {!credentialAuthEnabled ? (
        <p className="text-muted-foreground mt-8 text-center text-xs">
          <Link href="/dashboard" className="underline-offset-4 hover:underline">
            Skip preview → Dashboard (demo)
          </Link>
        </p>
      ) : null}
    </div>
  );
}
