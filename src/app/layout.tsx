import type { Metadata } from "next";
import { Outfit, Manrope } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const display = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const sans = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MascotAI — Animated SVG mascot studios",
  description:
    "Build animated SVG mascots for web and mobile apps. Explore Lyra, Sol, Bud, and Fanous, then generate your own gesture studio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans text-[var(--brand-ink)]">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
