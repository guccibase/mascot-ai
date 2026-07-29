"use client";

import { useRef, useState } from "react";
import {
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import { ConvexError } from "convex/values";
import {
  ArrowLeft,
  Coins,
  Loader2,
  Search,
  Shield,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trackEvent } from "@/lib/analytics";
import { formatTokens } from "@/lib/token-pricing";
import { balanceClock } from "@/lib/use-token-balance";
import { cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const QUICK_GRANTS = [
  { label: "240K", amount: 240_000 },
  { label: "600K", amount: 600_000 },
  { label: "1.65M", amount: 1_650_000 },
] as const;

/** Confirm large grants in-app (never `window.confirm`). */
const CONFIRM_GRANT_THRESHOLD = 600_000;

type PendingGrant = {
  amount: number;
  idempotencyKey: string;
};

function grantSizeBucket(amount: number): string {
  if (amount <= 250_000) return "starter";
  if (amount <= 700_000) return "studio";
  if (amount <= 2_000_000) return "pro";
  return "custom";
}

function grantErrorMessage(err: unknown): string {
  if (err instanceof ConvexError && typeof err.data === "object" && err.data) {
    const data = err.data as { message?: unknown };
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }
  }
  return err instanceof Error ? err.message : "Grant failed";
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function PlanBadge({
  planId,
  status,
}: {
  planId: string | null;
  status: string | null;
}) {
  if (!planId) {
    return (
      <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-muted)]">
        Free
      </span>
    );
  }
  return (
    <span className="rounded-full border border-[var(--brand-accent)]/30 bg-[var(--brand-accent)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-accent)]">
      {planId}
      {status && status !== "active" ? ` · ${status}` : ""}
    </span>
  );
}

function UserDetailPanel({
  userId,
  onBack,
}: {
  userId: Id<"users">;
  onBack: () => void;
}) {
  const now = balanceClock();
  const detail = useQuery(api.adminUsers.getUserDetail, { userId, now });
  const ledger = usePaginatedQuery(
    api.adminUsers.userLedger,
    { userId },
    { initialNumItems: 15 }
  );
  const grant = useMutation(api.adminUsers.grantTokens);

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [bucket, setBucket] = useState<"topup" | "subscription">("topup");
  const [granting, setGranting] = useState(false);
  const [pendingGrant, setPendingGrant] = useState<PendingGrant | null>(null);
  /** Stable per attempt so retries / double-submit dedupe on the server. */
  const grantAttemptKeyRef = useRef<string | null>(null);

  const clearGrantAttempt = () => {
    grantAttemptKeyRef.current = null;
  };

  const beginGrantAttempt = (): string => {
    if (!grantAttemptKeyRef.current) {
      grantAttemptKeyRef.current = crypto.randomUUID();
    }
    return grantAttemptKeyRef.current;
  };

  if (detail === undefined) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-[var(--brand-muted)]" />
      </div>
    );
  }

  if (detail === null) {
    return (
      <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-8 text-center">
        <p className="text-[var(--brand-muted)]">User not found.</p>
        <Button type="button" variant="ghost" className="mt-4" onClick={onBack}>
          Back to list
        </Button>
      </div>
    );
  }

  const hasActivePlan = detail.planId !== null;
  const effectiveBucket = bucket === "subscription" && !hasActivePlan
    ? "topup"
    : bucket;

  const executeGrant = async (
    grantAmount: number,
    idempotencyKey: string
  ) => {
    setGranting(true);
    try {
      const result = await grant({
        userId,
        amount: grantAmount,
        bucket: effectiveBucket,
        note: note.trim() || undefined,
        idempotencyKey,
      });
      clearGrantAttempt();
      if (result.duplicate) {
        toast.message("Grant already applied (duplicate request)");
        return;
      }
      trackEvent("admin_grant", {
        bucket: result.bucket,
        size: grantSizeBucket(result.amount),
      });
      toast.success(
        `Granted ${formatTokens(result.amount)} tokens (${result.bucket})`
      );
      setAmount("");
    } catch (err) {
      toast.error(grantErrorMessage(err));
    } finally {
      setGranting(false);
    }
  };

  const requestGrant = (grantAmount: number) => {
    if (grantAmount <= 0) {
      toast.error("Enter a positive token amount");
      return;
    }
    if (effectiveBucket === "subscription" && !hasActivePlan) {
      toast.error("Subscription grants require an active plan");
      return;
    }
    if (grantAmount >= CONFIRM_GRANT_THRESHOLD) {
      setPendingGrant({
        amount: grantAmount,
        idempotencyKey: beginGrantAttempt(),
      });
      return;
    }
    void executeGrant(grantAmount, beginGrantAttempt());
  };

  const confirmPendingGrant = () => {
    if (!pendingGrant) return;
    const { amount: grantAmount, idempotencyKey } = pendingGrant;
    setPendingGrant(null);
    void executeGrant(grantAmount, idempotencyKey);
  };

  const cancelPendingGrant = () => {
    setPendingGrant(null);
    clearGrantAttempt();
  };

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-[var(--brand-muted)] transition hover:text-white"
      >
        <ArrowLeft className="size-4" />
        All users
      </button>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
          {detail.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={detail.imageUrl}
              alt=""
              className="size-14 rounded-2xl object-cover"
            />
          ) : (
            <UserRound className="size-7 text-[var(--brand-muted)]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-tight sm:text-3xl">
              {detail.name}
            </h2>
            <PlanBadge planId={detail.planId} status={detail.planStatus} />
          </div>
          <p className="mt-1 truncate text-sm text-[var(--brand-muted)]">
            {detail.email}
          </p>
          <p className="mt-1 text-xs text-[var(--brand-muted)]">
            Joined {formatDate(detail.createdAt)} · {detail.mascotCount}
            {detail.mascotCountCapped ? "+" : ""} mascots
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Available",
            value: formatTokens(detail.available),
            accent: true,
          },
          {
            label: "Wallet total",
            value: formatTokens(detail.totalTokens),
          },
          {
            label: "Held",
            value: formatTokens(detail.held),
          },
          {
            label: "Ledger (recent 200)",
            value: `${formatTokens(detail.ledgerSummary.net)} net`,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-muted)]">
              {stat.label}
            </p>
            <p
              className={cn(
                "mt-2 font-[family-name:var(--font-display)] text-xl tabular-nums",
                stat.accent && "text-[var(--brand-accent)]"
              )}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-muted)]">
            Subscription
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-lg tabular-nums">
            {formatTokens(detail.subscriptionTokens)}
          </p>
        </div>
        <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-muted)]">
            Top-up
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-lg tabular-nums">
            {formatTokens(detail.topupTokens)}
          </p>
        </div>
      </div>

      {detail.onboarding ? (
        <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-muted)]">
            Onboarding
          </p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {[
              ["Use case", detail.onboarding.useCase],
              ["Stack", detail.onboarding.stack ?? "—"],
              ["Referral", detail.onboarding.referral ?? "—"],
              ["Paid before", detail.onboarding.paidBefore ?? "—"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[var(--brand-muted)]">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Coins className="size-4 text-[var(--brand-accent)]" />
          <h3 className="font-[family-name:var(--font-display)] text-lg">
            Grant tokens
          </h3>
        </div>
        <p className="mt-2 text-sm text-[var(--brand-muted)]">
          Credits are logged in the token ledger with your admin id. Top-up
          tokens roll over; subscription credits must fit under the plan cap.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {(["topup", "subscription"] as const).map((value) => {
            const disabled = value === "subscription" && !hasActivePlan;
            return (
              <button
                key={value}
                type="button"
                disabled={disabled}
                onClick={() => setBucket(value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition",
                  disabled && "cursor-not-allowed opacity-40",
                  effectiveBucket === value
                    ? "border-[var(--brand-accent)] bg-[var(--brand-accent)]/15 text-[var(--brand-accent)]"
                    : "border-white/15 text-[var(--brand-muted)] hover:border-white/30"
                )}
                title={
                  disabled
                    ? "Requires an active subscription"
                    : undefined
                }
              >
                {value}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_GRANTS.map((preset) => (
            <Button
              key={preset.amount}
              type="button"
              size="sm"
              variant="outline"
              disabled={granting}
              className="border-white/15 bg-transparent"
              onClick={() => requestGrant(preset.amount)}
            >
              +{preset.label}
            </Button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="grant-amount">Custom amount</Label>
            <Input
              id="grant-amount"
              inputMode="numeric"
              placeholder="e.g. 50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
              className="border-white/15 bg-white/[0.04]"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="grant-note">Internal note (optional)</Label>
            <Textarea
              id="grant-note"
              rows={2}
              maxLength={120}
              placeholder="Support ticket, promo, etc."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="border-white/15 bg-white/[0.04]"
            />
          </div>
        </div>

        <Button
          type="button"
          disabled={granting || !amount}
          className="mt-4 bg-[var(--brand-accent)] text-[#12141c] hover:bg-[var(--brand-accent)]/90"
          onClick={() => requestGrant(Number(amount))}
        >
          {granting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Granting…
            </>
          ) : (
            "Grant custom amount"
          )}
        </Button>
      </div>

      <div>
        <h3 className="font-[family-name:var(--font-display)] text-lg">
          Token ledger
        </h3>
        <div className="mt-3 overflow-x-auto rounded-[1.25rem] border border-white/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-[11px] uppercase tracking-[0.14em] text-[var(--brand-muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">Kind</th>
                <th className="px-4 py-3 font-semibold">Bucket</th>
                <th className="px-4 py-3 font-semibold text-right">Amount</th>
                <th className="px-4 py-3 font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody>
              {ledger.results.map((row) => (
                <tr
                  key={row._id}
                  className="border-b border-white/5 last:border-0"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-[var(--brand-muted)]">
                    {formatDate(row.createdAt)}
                  </td>
                  <td className="px-4 py-3 capitalize">{row.kind}</td>
                  <td className="px-4 py-3 capitalize">{row.bucket}</td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right tabular-nums",
                      row.amount > 0
                        ? "text-emerald-300"
                        : "text-red-300/90"
                    )}
                  >
                    {row.amount > 0 ? "+" : ""}
                    {formatTokens(Math.abs(row.amount))}
                  </td>
                  <td className="max-w-[240px] truncate px-4 py-3 text-[var(--brand-muted)]">
                    {row.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {ledger.results.length === 0 && ledger.status !== "LoadingFirstPage" ? (
            <p className="px-4 py-8 text-center text-sm text-[var(--brand-muted)]">
              No ledger entries yet.
            </p>
          ) : null}
        </div>
        {ledger.status === "CanLoadMore" ? (
          <div className="mt-4 flex justify-center">
            <Button
              type="button"
              variant="outline"
              className="border-white/15 bg-transparent"
              onClick={() => ledger.loadMore(15)}
            >
              Load more
            </Button>
          </div>
        ) : null}
      </div>

      <Dialog
        open={pendingGrant !== null}
        onOpenChange={(open) => {
          if (!open) cancelPendingGrant();
        }}
      >
        <DialogContent
          showCloseButton
          overlayClassName="bg-black/80 supports-backdrop-filter:backdrop-blur-sm"
          className="border-white/10 bg-[#121722] text-[#F5EDE0] sm:max-w-md [&_[data-slot=dialog-close]]:text-[#F5EDE0] [&_[data-slot=dialog-close]]:hover:bg-white/10"
        >
          <DialogHeader>
            <DialogTitle>Confirm token grant</DialogTitle>
            <DialogDescription className="text-[#8D8472]">
              {pendingGrant
                ? `Grant ${formatTokens(pendingGrant.amount)} ${effectiveBucket} tokens to ${detail.email}? This is recorded in the token ledger.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-white/10 bg-transparent">
            <Button
              type="button"
              variant="outline"
              className="border-white/15 bg-transparent"
              disabled={granting}
              onClick={cancelPendingGrant}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={granting || !pendingGrant}
              className="bg-[var(--brand-accent)] text-[#12141c] hover:bg-[var(--brand-accent)]/90"
              onClick={confirmPendingGrant}
            >
              {granting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Granting…
                </>
              ) : (
                "Grant tokens"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AdminUsersPanel() {
  const isAdmin = useQuery(api.marketplace.isAdmin);
  const [emailQuery, setEmailQuery] = useState("");
  const [appliedEmail, setAppliedEmail] = useState<string | undefined>();
  const [selectedId, setSelectedId] = useState<Id<"users"> | null>(null);
  const now = balanceClock();

  const users = usePaginatedQuery(
    api.adminUsers.listUsers,
    isAdmin
      ? { email: appliedEmail, now }
      : "skip",
    { initialNumItems: 20 }
  );

  if (isAdmin === undefined) return null;
  if (!isAdmin) return null;

  if (selectedId) {
    return (
      <UserDetailPanel userId={selectedId} onBack={() => setSelectedId(null)} />
    );
  }

  const onSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = emailQuery.trim().toLowerCase();
    setAppliedEmail(trimmed || undefined);
  };

  return (
    <section className="mt-16 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-accent)]">
            Admin
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-tight sm:text-4xl">
            Users
          </h2>
          <p className="mt-2 max-w-xl text-sm text-[var(--brand-muted)]">
            Browse accounts, review token usage, and grant credits. Every grant
            is recorded in the token ledger.
          </p>
        </div>
        <Shield className="hidden size-8 text-[var(--brand-accent)]/60 sm:block" />
      </div>

      <form
        onSubmit={onSearch}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="admin-user-search">Search by email</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--brand-muted)]" />
            <Input
              id="admin-user-search"
              type="email"
              placeholder="Exact email match"
              value={emailQuery}
              onChange={(e) => setEmailQuery(e.target.value)}
              className="border-white/15 bg-white/[0.04] pl-9"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            type="submit"
            className="bg-[var(--brand-accent)] text-[#12141c] hover:bg-[var(--brand-accent)]/90"
          >
            Search
          </Button>
          {appliedEmail ? (
            <Button
              type="button"
              variant="outline"
              className="border-white/15 bg-transparent"
              onClick={() => {
                setEmailQuery("");
                setAppliedEmail(undefined);
              }}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </form>

      <div className="hidden overflow-x-auto rounded-[1.25rem] border border-white/10 lg:block">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.03] text-[11px] uppercase tracking-[0.14em] text-[var(--brand-muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Plan</th>
              <th className="px-4 py-3 font-semibold text-right">Balance</th>
              <th className="px-4 py-3 font-semibold">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.results.map((user) => (
              <tr
                key={user._id}
                className="cursor-pointer border-b border-white/5 transition hover:bg-white/[0.04] last:border-0"
                onClick={() => setSelectedId(user._id)}
              >
                <td className="px-4 py-3">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-[var(--brand-muted)]">{user.email}</p>
                </td>
                <td className="px-4 py-3">
                  <PlanBadge planId={user.planId} status={user.planStatus} />
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatTokens(user.totalTokens)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-[var(--brand-muted)]">
                  {formatDate(user.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 lg:hidden">
        {users.results.map((user) => (
          <button
            key={user._id}
            type="button"
            onClick={() => setSelectedId(user._id)}
            className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-white/25"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{user.name}</p>
                <p className="truncate text-xs text-[var(--brand-muted)]">
                  {user.email}
                </p>
              </div>
              <PlanBadge planId={user.planId} status={user.planStatus} />
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="tabular-nums text-[var(--brand-accent)]">
                {formatTokens(user.totalTokens)}
              </span>
              <span className="text-xs text-[var(--brand-muted)]">
                {formatDate(user.createdAt)}
              </span>
            </div>
          </button>
        ))}
      </div>

      {users.status === "LoadingFirstPage" ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-[var(--brand-muted)]" />
        </div>
      ) : null}

      {users.status !== "LoadingFirstPage" && users.results.length === 0 ? (
        <p className="rounded-[1.25rem] border border-dashed border-white/15 py-12 text-center text-sm text-[var(--brand-muted)]">
          {appliedEmail ? "No user with that email." : "No users yet."}
        </p>
      ) : null}

      {users.status === "CanLoadMore" ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            className="border-white/15 bg-transparent"
            onClick={() => users.loadMore(20)}
          >
            Load more
          </Button>
        </div>
      ) : null}
    </section>
  );
}
