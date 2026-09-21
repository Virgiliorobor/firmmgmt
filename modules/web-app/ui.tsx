"use client";

import { useEffect, useState, type ReactNode } from "react";

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`primary-button ${props.className ?? ""}`} />;
}

export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`secondary-button ${props.className ?? ""}`} />;
}

export function QuietButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`quiet-button ${props.className ?? ""}`} />;
}

export function Banner({
  kind,
  title,
  children,
}: {
  kind: "error" | "success" | "warning" | "info";
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className={`banner banner-${kind}`} role={kind === "error" ? "alert" : "status"}>
      <p className="font-medium">{title}</p>
      {children}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="text-body text-ink py-6">{children}</div>;
}

export function StaticSkeleton({ className }: { className?: string }) {
  return <div className={`static-skeleton ${className ?? "h-12 w-full"}`} aria-hidden />;
}

export function UnassignedMark() {
  return (
    <span className="unassigned-mark">
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden className="inline-block align-middle mr-1">
        <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.75" />
      </svg>
      Unassigned
    </span>
  );
}

export function FormField({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1 ${error ? "field-error" : ""}`}>
      <label htmlFor={htmlFor} className="text-label font-medium">
        {label}
        {required ? <span aria-hidden="true"> (required)</span> : null}
      </label>
      {children}
      {hint ? <p className="text-caption text-ink-faint">{hint}</p> : null}
      {error ? (
        <p className="text-caption text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function CopyIntakeAddress({ address }: { address: string | null }) {
  const value = address || "Set DEDICATED_INTAKE_ADDRESS to show the dedicated intake address.";
  return (
    <div className="flex flex-col gap-1">
      <p className="text-caption text-ink-faint">Forward client email from Outlook to this address.</p>
      <QuietButton
        type="button"
        onClick={() => {
          if (address) void navigator.clipboard.writeText(address);
        }}
      >
        Copy dedicated intake address
      </QuietButton>
      <p className="text-caption text-ink-muted">{value}</p>
    </div>
  );
}

export function NetworkBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    setOffline(!navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  if (!offline) return null;
  return <div className="network-banner">Not saved. Check the connection and try again.</div>;
}
