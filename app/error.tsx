"use client";

import { Banner, QuietButton } from "@/modules/web-app/ui";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="px-5 py-8">
      <Banner kind="error" title="This page could not load. Try again.">
        <QuietButton type="button" onClick={() => reset()}>
          Try again
        </QuietButton>
      </Banner>
    </main>
  );
}
