"use client";

import dynamic from "next/dynamic";
import type { MascotSlug } from "@/lib/mascots";

const LyraStudio = dynamic(() => import("@/components/mascots/lyra-mascot"), {
  ssr: false,
  loading: () => <StudioLoading />,
});
const SolStudio = dynamic(() => import("@/components/mascots/sol-mascot"), {
  ssr: false,
  loading: () => <StudioLoading />,
});
const BudStudio = dynamic(() => import("@/components/mascots/bud-mascot"), {
  ssr: false,
  loading: () => <StudioLoading />,
});
const FanousStudio = dynamic(
  () => import("@/components/mascots/fanous-mascot"),
  { ssr: false, loading: () => <StudioLoading /> }
);

function StudioLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#101526] text-sm text-white/50">
      Loading studio…
    </div>
  );
}

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
