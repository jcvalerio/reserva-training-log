import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { defaultLocale } from "@/i18n/locales";

import { viewport as appViewport } from "./viewport-config";

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
  title: "Entrenador Personal",
  description: "Crea tu plan, registra cada serie y progresa con RIR.",
};

// Defined in its own module so it stays unit-testable — see viewport-config.ts
// for why zoom must not be constrained here.
export const viewport: Viewport = appViewport;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={defaultLocale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-950 text-zinc-50">{children}</body>
    </html>
  );
}
