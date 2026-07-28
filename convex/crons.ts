import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Holds are taken up front and only released on settle. A request that dies
// mid-flight would otherwise leave a customer's tokens locked away for good,
// so they are swept on a cadence well inside the 5 minute hold TTL.
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
