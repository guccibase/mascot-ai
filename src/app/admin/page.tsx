"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { SiteHeader } from "@/components/site-header";
import { AdminUsersPanel } from "@/components/admin/admin-users-panel";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";

export default function AdminPage() {
  const isAdmin = useQuery(api.marketplace.isAdmin);

  return (
    <div className="min-h-screen bg-[var(--brand-bg)] text-[var(--brand-ink)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_480px_at_20%_-10%,rgba(245,179,79,0.14),transparent_55%),radial-gradient(700px_420px_at_90%_0%,rgba(88,140,255,0.1),transparent_50%)]" />
      <div className="relative">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-5 pb-24 pt-6 sm:px-8 lg:px-12">
          {isAdmin === undefined ? null : isAdmin ? (
            <AdminUsersPanel />
          ) : (
            <div className="mt-24 rounded-[1.75rem] border border-white/10 bg-white/[0.03] px-8 py-16 text-center">
              <p className="font-[family-name:var(--font-display)] text-2xl">
                Admin access required
              </p>
              <p className="mt-3 text-[var(--brand-muted)]">
                This area is restricted to team admins.
              </p>
              <Link
                href="/library"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "mt-8 border-white/15 bg-transparent"
                )}
              >
                Back to library
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
