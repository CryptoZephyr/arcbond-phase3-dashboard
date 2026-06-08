// src/app/layout.tsx
// Global layout with premium fintech-focused typography and smooth rendering

import type { Metadata } from "next";
import { Plus_Jakarta_Sans, DM_Mono } from "next/font/google";
import "./globals.css";

const sansFont = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const monoFont = DM_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "ArcBond Coordination Hub",
  description: "Sovereign Agentic Settlement & Coordination System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sansFont.variable} ${monoFont.variable}`}>
      <body className="font-sans antialiased selection:bg-teal-200 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
