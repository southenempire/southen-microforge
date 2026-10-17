import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MicroForge — Autonomous Developer Agent for Monetized Micro-Tools",
  description: "Spec-to-Monetization agent that synthesizes code, verifies in CreateOS Firecracker micro-VMs with self-healing feedback, provisions Stripe payment rails, and enforces a Two-Phase Commit ledger.",
  keywords: ["CreateOS", "Stripe Projects", "AI Agent", "Firecracker Micro-VM", "Two-Phase Commit", "Micro-Tools", "SouthenEmpire"],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
