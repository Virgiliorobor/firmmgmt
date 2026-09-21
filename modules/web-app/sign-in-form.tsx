"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Banner, FormField, PrimaryButton, SecondaryButton, StaticSkeleton } from "@/modules/web-app/ui";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (challengeId) {
        await finish({ challenge_id: challengeId, code });
        return;
      }
      if (showCode && code) {
        await finish({ email, password, code });
        return;
      }
      const response = await fetch("/api/auth/totp/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = (await response.json()) as { error?: string; challenge_id?: string };
      if (!response.ok) {
        setError(body.error ?? "Sign in could not complete. Try again.");
        return;
      }
      setChallengeId(body.challenge_id ?? null);
      setShowCode(true);
    } finally {
      setPending(false);
    }
  }

  async function finish(payload: Record<string, string>) {
    setLoading(true);
    const response = await fetch("/api/auth/totp/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json()) as { error?: string; home?: string };
    if (!response.ok) {
      setError(body.error ?? "Authenticator code failed. Try again.");
      setLoading(false);
      return;
    }
    router.push(body.home ?? "/");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <StaticSkeleton className="h-12 w-full" />
        <StaticSkeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-sm">
      {error ? <Banner kind="error" title={error} /> : null}
      <form onSubmit={onSubmit} className="flex flex-col gap-4" data-hydrated={hydrated ? "true" : "false"}>
        <FormField label="Work email" htmlFor="email" required>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            className="text-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormField>
        <FormField label="Password" htmlFor="password" required hint="Use your work email and authenticator.">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={12}
            className="text-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>
        {showCode || challengeId ? (
          <FormField label="Authenticator code" htmlFor="code" required>
            <input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              className="text-field"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </FormField>
        ) : null}
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? "Signing in" : "Sign in"}
        </PrimaryButton>
        {!showCode && !challengeId ? (
          <SecondaryButton type="button" onClick={() => setShowCode(true)}>
            Use authenticator code
          </SecondaryButton>
        ) : null}
      </form>
    </div>
  );
}
