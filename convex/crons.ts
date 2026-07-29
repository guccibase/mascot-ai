import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Deferred holds earmark capacity (not wallet debit). Abandoned rows are swept
// after TTL + settle grace (~10m + 30m) so late settle can still capture.
crons.interval(
  "release expired token reservations",
  { minutes: 2 },
  internal.maintenance.sweepExpiredReservations,
  {}
);

crons.daily(
  "prune processed billing events",
  { hourUTC: 4, minuteUTC: 0 },
  internal.maintenance.pruneBillingEvents,
  {}
);

crons.daily(
  "purge expired reference uploads",
  { hourUTC: 5, minuteUTC: 0 },
  internal.referenceAssets.purgeExpiredReferences,
  {}
);

crons.daily(
  "purge stale app asset sample packs",
  { hourUTC: 6, minuteUTC: 0 },
  internal.mascotAppAssets.purgeStaleSamplePacks,
  {}
);

crons.daily(
  "purge orphan app asset uploads",
  { hourUTC: 6, minuteUTC: 30 },
  internal.mascotAppAssets.purgeOrphanUploads,
  {}
);

crons.interval(
  "release expired marketplace reservations",
  { minutes: 5 },
  internal.marketplace.sweepExpiredReservations,
  {}
);

crons.daily(
  "prune processed stripe events",
  { hourUTC: 4, minuteUTC: 30 },
  internal.marketplace.pruneStripeEvents,
  {}
);

export default crons;
