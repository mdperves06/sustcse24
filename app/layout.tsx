import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const sans = Inter({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "CSE 24 — Batch Digital Community", template: "%s · CSE 24" },
  description: "A private digital community built for the CSE 24 batch.",
  applicationName: "CSE 24 Community",
  // Only the landing page is indexable; private pages also send X-Robots-Tag: noindex.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f9fc" },
    { media: "(prefers-color-scheme: dark)", color: "#12131c" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
