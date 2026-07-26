import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Sign up",
  description:
    "Create a MascotAI account and generate animated SVG mascots for your app.",
  path: "/sign-up",
  index: false,
});

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
