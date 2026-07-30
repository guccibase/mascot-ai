"use client";

import dynamic from "next/dynamic";
import { PreviewContentGuard } from "@/components/preview-content-guard";
import type { MascotSlug } from "@/lib/mascots";
import { EXAMPLE_PREVIEW_CAPABILITIES } from "@/lib/studio-capabilities";
import type { GeneratedMascot } from "@/lib/types";

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
const GeneratedStudio = dynamic(() =>
  import("@/components/generated-studio").then(
    (module) => module.GeneratedStudio
  )
);
const ByteStudio = dynamic(() => import("@/components/mascots/byte-mascot"));
const NumiStudio = dynamic(() => import("@/components/mascots/numi-mascot"));
const LexaStudio = dynamic(() => import("@/components/mascots/lexa-mascot"));
const CodaStudio = dynamic(() => import("@/components/mascots/coda-mascot"));
const KelpStudio = dynamic(() => import("@/components/mascots/kelp-mascot"));
const NoriStudio = dynamic(() => import("@/components/mascots/nori-mascot"));
const HayStudio = dynamic(() => import("@/components/mascots/hay-mascot"));

/** Same shell as create / library / marketplace — pack-driven GeneratedStudio. */
function ExampleGeneratedStudio({
  initialMascot,
}: {
  initialMascot: GeneratedMascot;
}) {
  return (
    <GeneratedStudio
      mascot={initialMascot}
      fullPage
      capabilities={EXAMPLE_PREVIEW_CAPABILITIES}
    />
  );
}

export function StudioClient({
  slug,
  initialMascot,
}: {
  slug: MascotSlug;
  initialMascot?: GeneratedMascot;
}) {
  const studio = (() => {
  switch (slug) {
    case "lyra":
      return <LyraStudio />;
    case "sol":
      return <SolStudio />;
    case "bud":
      return <BudStudio />;
    case "fanous":
      return <FanousStudio />;
    case "granary":
    case "nox":
    case "zest":
    case "quill":
    case "pip":
    case "bolt":
    case "relay":
    case "orbit":
    case "brew":
    case "shade":
    case "watt":
    case "arc":
    case "aura":
    case "glint":
    case "trove":
    case "zephyr":
      return initialMascot ? (
        <ExampleGeneratedStudio
          key={slug}
          initialMascot={initialMascot}
        />
      ) : (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center text-white/80">
          <p className="text-lg font-semibold text-white">Studio pack unavailable</p>
          <p className="max-w-md text-sm text-white/55">
            This example couldn&apos;t load its pose pack. Refresh, or open another studio from home.
          </p>
        </div>
      );
    case "byte":
      return <ByteStudio />;
    case "numi":
      return <NumiStudio />;
    case "lexa":
      return <LexaStudio />;
    case "coda":
      return <CodaStudio />;
    case "kelp":
      return <KelpStudio />;
    case "nori":
      return <NoriStudio />;
    case "hay":
      return <HayStudio />;
    default:
      return null;
  }
  })();

  return <PreviewContentGuard>{studio}</PreviewContentGuard>;
}
