"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { NordflowLogo } from "@/components/Crm/NordflowLogo";
import { Button } from "@/components/Ui/Button";
import { Input } from "@/components/Ui/Input";
import { cn } from "@/lib/utils";

/** Legible on dark UI: tinted surface, visible rim, bright placeholders. */
const fieldClass = cn(
  "h-12 w-full rounded-none px-4 text-[15px] font-normal normal-case tracking-normal text-foreground",
  "border border-white/[0.12] bg-[color-mix(in_oklab,var(--secondary)_72%,transparent)]",
  "shadow-[inset_0_1px_0_0_rgb(255_255_255/0.05)]",
  "[&::placeholder]:text-foreground/55 [&::placeholder]:opacity-100",
  "transition-[border-color,box-shadow,background-color]",
  "focus-visible:border-primary/55 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-0 focus-visible:outline-none",
  "dark:bg-[color-mix(in_oklab,var(--secondary)_65%,transparent)]",
);

type LoginFormProps = {
  className?: string;
  redirectTo?: string;
};

export function LoginForm({
  className,
  redirectTo = "/dashboard",
}: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      setLoading(true);

      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        });

        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
        };

        if (!res.ok || !data.ok) {
          setError(data.error ?? "Sign-in failed.");
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
    [email, password, redirectTo, router],
  );

  return (
    <div className={cn("mx-auto w-full max-w-[340px]", className)}>
      {/* Mobile: logo only */}
      <div className="mb-12 flex justify-center lg:hidden">
        <Link
          href="/dashboard"
          className="focus-visible:ring-primary rounded-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          aria-label="NordFlow · Dashboard"
        >
          <NordflowLogo priority className="max-h-8" />
        </Link>
      </div>

      <div className="space-y-1 lg:pt-4">
        <p className="text-muted-foreground font-mono text-[10px] tracking-[0.28em] uppercase">
          Sign in
        </p>
        <h1 className="text-foreground text-[1.65rem] font-medium tracking-[-0.03em] sm:text-3xl">
          Welcome back
        </h1>
        <p className="text-muted-foreground pt-2 text-[13px] leading-relaxed">
          {credentialAuthEnabled
            ? "Sign in with the email and password you registered."
            : "Demo mode: add DATABASE_URL and AUTH_SECRET (32+ chars), run db/auth-schema.sql in Neon, then sign in."}
        </p>
      </div>

      <form className="mt-12 space-y-8" onSubmit={handleSubmit}>
        {error ? (
          <p
            className="border border-rose-400/25 bg-rose-500/[0.08] px-3 py-2 text-[13px] leading-snug text-rose-100"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="login-email" className="sr-only">
              Email
            </label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="Email"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              disabled={loading}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="login-password" className="sr-only">
              Password
            </label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              required
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              disabled={loading}
              className={fieldClass}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 text-[13px]">
          <label className="text-muted-foreground flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              className="border-white/15 accent-primary size-3.5 rounded-none border bg-transparent"
            />
            <span>Remember</span>
          </label>
          <span className="text-muted-foreground">Forgot password?</span>
        </div>

        <Button
          type="submit"
          variant="solid"
          size="lg"
          className="h-12 w-full text-[13px]"
          disabled={loading}
        >
          {loading ? "Signing in…" : "Continue"}
        </Button>

        <div className="flex items-center gap-4 pt-2">
          <span className="bg-white/[0.06] h-px flex-1" />
          <span className="text-muted-foreground text-[11px] tracking-[0.2em] uppercase">
            Or
          </span>
          <span className="bg-white/[0.06] h-px flex-1" />
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled
            title="Google sign-in is not configured in this build."
            className="text-muted-foreground h-11 flex-1 cursor-not-allowed border-white/[0.12] bg-transparent text-[13px] font-normal normal-case tracking-normal opacity-60"
          >
            Google
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled
            title="Microsoft sign-in is not configured in this build."
            className="text-muted-foreground h-11 flex-1 cursor-not-allowed border-white/[0.12] bg-transparent text-[13px] font-normal normal-case tracking-normal opacity-60"
          >
            Microsoft
          </Button>
        </div>
      </form>

      <p className="text-muted-foreground mt-14 text-center text-[13px]">
        <Link
          href="/pricing"
          className="text-primary hover:text-primary/85 font-medium underline-offset-4 transition-colors hover:underline"
        >
          Pricing
        </Link>
        <span className="text-muted-foreground/80 px-2">·</span>
        New here?{" "}
        <Link
          href="/register"
          className="text-foreground hover:text-primary font-medium underline-offset-4 transition-colors hover:underline"
        >
          Create account
        </Link>
      </p>

      {!credentialAuthEnabled ? (
        <p className="text-muted-foreground/70 mt-8 text-center text-[11px]">
          <Link
            href="/dashboard"
            className="transition-colors hover:text-foreground"
          >
            Skip setup → Dashboard (demo)
          </Link>
        </p>
      ) : (
        <p className="text-muted-foreground/70 mt-8 text-center text-[11px]">
          Workspace routes require an account once auth env vars are set.
        </p>
      )}
    </div>
  );
}
