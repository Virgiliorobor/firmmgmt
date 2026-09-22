import type { ReactNode } from "react";
import "@/styles/globals.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Law firm management",
  description: "Work visibility for the managing partner.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-US">
      <body>{children}</body>
    </html>
  );
}
