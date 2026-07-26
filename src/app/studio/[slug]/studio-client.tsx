"use client";

import dynamic from "next/dynamic";
import type { MascotSlug } from "@/lib/mascots";

/**
 * One chunk per studio. No `loading` UI — a loading fallback was previously
 * SSR'd into the HTML as "Loading studio…", which polluted crawler text.
 */
const LyraStudio = dynamic(() => import("@/components/mascots/lyra-mascot"));
const SolStudio = dynamic(() => import("@/components/mascots/sol-mascot"));
const BudStudio = dynamic(() => import("@/components/mascots/bud-mascot"));
const FanousStudio = dynamic(
  () => import("@/components/mascots/fanous-mascot")
);

export function StudioClient({ slug }: { slug: MascotSlug }) {
  switch (slug) {
    case "lyra":
      return <LyraStudio />;
    case "sol":
      return <SolStudio />;
    case "bud":
      return <BudStudio />;
    case "fanous":
      return <FanousStudio />;
    default:
      return null;
  }
}
