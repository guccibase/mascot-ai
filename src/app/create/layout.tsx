import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Create a mascot",
  description: "Describe your product and generate an animated SVG mascot studio.",
  path: "/create",
  index: false,
});

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
