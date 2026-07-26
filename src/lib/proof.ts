/**
 * Independently published findings on brand characters, shown in onboarding
 * and on the landing page. These are other people's numbers, not our claims,
 * so every entry names its source and stays checkable.
 */
export type ProofPoint = {
  stat: string;
  claim: string;
  detail: string;
  source: string;
};

export const PROOF_POINTS: readonly ProofPoint[] = [
  {
    stat: "+5%",
    claim: "daily active users",
    detail:
      "Duolingo saw daily active usage rise about 5% just from putting Duo in push notifications.",
    source: "Duolingo growth reporting",
  },
  {
    stat: "30%",
    claim: "more likely to grow profit",
    detail:
      "Across 400 long-term campaigns in the IPA database, the ones led by a character beat the ones without on profit, market share (+37%) and new customers (+27%).",
    source: "System1 / IPA DataMINE",
  },
  {
    stat: "4%",
    claim: "of brands actually do it",
    detail:
      "Character-led work is proven and rare, which is why a mascot still feels distinctive instead of generic.",
    source: "System1 Ad Ratings",
  },
] as const;

export const PROOF_QUOTE = {
  text: "Smart brands should be looking to fluent devices to generate growth and gain a competitive edge.",
  attribution: "Tom Ewing, System1",
} as const;
