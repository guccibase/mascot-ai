import type { Metadata, Viewport } from "next";
import { Outfit, Manrope } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { Analytics } from "@vercel/analytics/next";
import { GoogleAdsTag } from "@/components/google-ads-tag";
import { Toaster } from "@/components/ui/sonner";
import { AppProviders } from "@/components/providers/app-providers";
import {
  DEFAULT_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  getSiteUrl,
} from "@/lib/seo";
import "./globals.css";

const display = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const sans = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0B1020" },
    { media: "(prefers-color-scheme: light)", color: "#0B1020" },
  ],
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `Animated SVG mascot studios | ${SITE_NAME}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "technology",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: SITE_NAME,
    description: SITE_TAGLINE,
    siteName: SITE_NAME,
    locale: "en_US",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_TAGLINE,
  },
  appleWebApp: {
    title: SITE_NAME,
    capable: true,
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{ theme: shadcn }}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/"
    >
      <html
        lang="en"
        className={`${display.variable} ${sans.variable} h-full antialiased`}
        suppressHydrationWarning
      >
        {/*
          suppressHydrationWarning: browser extensions (e.g. Grammarly) inject
          attributes on <body> before React hydrates, which is harmless noise.
        */}
        <body
          className="min-h-full font-sans text-[var(--brand-ink)]"
          suppressHydrationWarning
        >
          <AppProviders>
            {children}
            <Toaster />
          </AppProviders>
          <GoogleAdsTag />
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
