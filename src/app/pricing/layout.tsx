import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Mascot Generator Pricing & Plans",
  description:
    "Compare MascotAI weekly, monthly, and yearly plans and token top-ups for creating and editing animated SVG mascots.",
  path: "/pricing",
});

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
