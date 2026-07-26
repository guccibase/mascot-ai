import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Library",
  description: "Your saved MascotAI studios.",
  path: "/library",
  index: false,
});

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
