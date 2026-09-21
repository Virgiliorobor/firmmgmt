"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QuietButton } from "./ui";

function DestructiveOutlineButtonLocal(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`destructive-outline ${props.className ?? ""}`} />;
}

export function SessionRow({
  sessionId,
  current,
  started,
  idle,
  device,
  userName,
}: {
  sessionId: string;
  current: boolean;
  started: string;
  idle: string;
  device: string;
  userName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  async function revoke() {
    setPending(true);
    const response = await fetch(`/api/sessions/${sessionId}/revoke`, { method: "POST" });
    if (response.status === 401) {
      router.push("/sign-in");
      return;
    }
    router.refresh();
    setPending(false);
    setConfirming(false);
  }

  return (
    <div className="mail-row flex flex-col gap-2">
      <p>
        Started <span className="tabular">{started}</span>
        {current ? <span className="ml-3 text-label font-medium">Current session</span> : null}
      </p>
      <p className="text-caption text-ink-faint">
        Last active <span className="tabular">{idle}</span>
      </p>
      <p className="text-caption text-ink-muted break-all">{device || "Unknown device"}</p>
      {confirming ? (
        <div className="flex gap-3">
          <button type="button" className="destructive-confirm" disabled={pending} onClick={() => void revoke()}>
            {pending ? "Revoking" : `Revoke this session for ${userName}?`}
          </button>
          <QuietButton type="button" onClick={() => setConfirming(false)}>
            Cancel
          </QuietButton>
        </div>
      ) : (
        <DestructiveOutlineButtonLocal type="button" onClick={() => setConfirming(true)}>
          Revoke
        </DestructiveOutlineButtonLocal>
      )}
    </div>
  );
}
