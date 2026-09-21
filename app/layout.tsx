import type { ReactNode } from "react";
import { IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import "@/styles/globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-sans",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-serif",
});

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Law firm management",
  description: "Work visibility for the managing partner.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-US" className={`${ibmPlexSans.variable} ${sourceSerif.variable}`}>
      <body className={ibmPlexSans.className} style={{ fontFamily: "var(--font-sans)" }}>
        {children}
      </body>
    </html>
  );
}
