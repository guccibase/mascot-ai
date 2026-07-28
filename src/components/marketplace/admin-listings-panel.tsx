"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { Loader2, Plus, Upload } from "lucide-react";
import { AdminListingRowsSkeleton } from "@/components/skeletons";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  EXAMPLE_MARKETPLACE_OPTIONS,
  loadExampleMarketplacePack,
  parseMarketplaceUpload,
} from "@/lib/marketplace/example-packs";
import {
  MARKETPLACE_CATEGORY_LABELS,
  type MarketplaceCategoryKey,
} from "@/lib/marketplace/format";
import { cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { GeneratedMascot } from "@/lib/types";
import { MASCOTS, type MascotSlug } from "@/lib/mascots";
import { sanitizeSvg } from "@/lib/sanitize-svg";

const CATEGORIES = Object.keys(
  MARKETPLACE_CATEGORY_LABELS
) as MarketplaceCategoryKey[];

function exampleSlugForListingName(name: string): MascotSlug | null {
  const hit = MASCOTS.find(
    (m) => m.name.toLowerCase() === name.trim().toLowerCase()
  );
  return hit?.slug ?? null;
}

export function AdminListingsPanel() {
  const isAdmin = useQuery(api.marketplace.isAdmin);
  const [listStatus, setListStatus] = useState<
    "draft" | "available" | "reserved" | "sold" | "archived"
  >("available");
  const listings = usePaginatedQuery(
    api.marketplace.adminList,
    isAdmin ? { status: listStatus } : "skip",
    { initialNumItems: 20 }
  );
  const library = usePaginatedQuery(
    api.mascots.listMine,
    isAdmin ? {} : "skip",
    { initialNumItems: 50 }
  );
  const upsert = useMutation(api.marketplace.adminUpsert);
  const refreshPack = useMutation(api.marketplace.adminRefreshPack);
  const setStatus = useMutation(api.marketplace.adminSetStatus);
  const [refreshingId, setRefreshingId] = useState<Id<"marketplaceListings"> | null>(
    null
  );

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] =
    useState<MarketplaceCategoryKey>("entertainment");
  const [status, setStatusField] = useState<"draft" | "available" | "archived">(
    "draft"
  );
  const [pack, setPack] = useState<GeneratedMascot | null>(null);
  const [sourceMascotId, setSourceMascotId] = useState<Id<"mascots"> | "">("");

  if (isAdmin === undefined) return null;
  if (!isAdmin) return null;

  const resetForm = () => {
    setName("");
    setTagline("");
    setDescription("");
    setCategory("entertainment");
    setStatusField("draft");
    setPack(null);
    setSourceMascotId("");
  };

  const applyPack = (parsed: GeneratedMascot) => {
    setPack(parsed);
    setSourceMascotId("");
    if (!name.trim()) setName(parsed.name);
    if (!tagline.trim()) setTagline(parsed.tagline);
    if (!description.trim() && parsed.product) {
      setDescription(`${parsed.tagline} — built for ${parsed.product}.`);
    }
  };

  const onFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = await parseMarketplaceUpload(text, file.name);
      applyPack(parsed);
      toast.success(`Loaded pack “${parsed.name}”`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid pack file");
    }
  };

  const onImportExample = async (slug: MascotSlug) => {
    try {
      const parsed = await loadExampleMarketplacePack(slug);
      applyPack(parsed);
      toast.success(`Loaded ${parsed.name} — preview plays this exact pack`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    }
  };

  const onRefreshPack = async (
    listingId: Id<"marketplaceListings">,
    listingName: string
  ) => {
    const slug = exampleSlugForListingName(listingName);
    if (!slug) {
      toast.error(
        "No matching studio export for this name. Upload pose-pack JSON via New listing instead."
      );
      return;
    }
    setRefreshingId(listingId);
    try {
      const pack = await loadExampleMarketplacePack(slug);
      await refreshPack({ listingId, pack });
      toast.success(`Refreshed ${pack.name} pack (${pack.gestures.length} poses)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setRefreshingId(null);
    }
  };

  const onSubmit = async () => {
    if (!pack && !sourceMascotId) {
      toast.error("Upload a pack/JSX file or pick a library mascot");
      return;
    }
    if (!name.trim() || !tagline.trim()) {
      toast.error("Name and tagline are required");
      return;
    }
    setSaving(true);
    try {
      // pack required by validator even when sourcing from library — send a
      // placeholder that adminUpsert replaces when sourceMascotId is set.
      const packArg =
        pack ??
        ({
          name: name.trim(),
          tagline: tagline.trim(),
          accent: "#F5B34F",
          themes: {
            primary: {
              name: "Primary",
              top: "#F5B34F",
              mid: "#E09A3A",
              base: "#C47E28",
              core: "#8A5414",
              stage: "#1a1f2e",
            },
          },
          instrument: {
            label: "Signal",
            description: "",
            lowLabel: "Low",
            midLabel: "Mid",
            highLabel: "High",
            defaultValue: 50,
            ramp: ["#F5B34F", "#E09A3A", "#C47E28", "#A8661C", "#8A5414"],
          },
          gestures: [
            {
              key: "idle",
              label: "Idle",
              cat: "Core",
              tip: "",
              use: "",
              svg: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'></svg>",
            },
          ],
          parts: [],
        } satisfies GeneratedMascot);

      const id = await upsert({
        name: name.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        category,
        status,
        pack: packArg,
        sourceMascotId: sourceMascotId || undefined,
      });
      toast.success("Listing saved");
      resetForm();
      setOpen(false);
      void id;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-16 border-t border-white/10 pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-accent)]">
            Admin
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-tight">
            Mascots for sale
          </h2>
          <p className="mt-2 max-w-xl text-sm text-[var(--brand-muted)]">
            Add a studio JSX file under{" "}
            <code className="text-white/80">src/components/mascots/</code>, run{" "}
            <code className="text-white/80">npm run mascot:export -- &lt;name&gt;</code>
            , then upload the generated JSON below. Quick-import still works for
            Bud / Lyra / Sol / Fanous. Only{" "}
            <strong>available</strong> listings appear on the marketplace.
          </p>
        </div>
        <Button
          onClick={() => setOpen((v) => !v)}
          className="bg-[var(--brand-accent)] text-[#12141c] hover:bg-[var(--brand-accent)]/90"
        >
          <Plus className="size-4" />
          {open ? "Close" : "New listing"}
        </Button>
      </div>

      {open && (
        <div className="mt-6 grid gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="group/field space-y-2">
              <Label htmlFor="listing-name">Name</Label>
              <Input
                id="listing-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="group/field space-y-2">
              <Label htmlFor="listing-tagline">Tagline</Label>
              <Input
                id="listing-tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
              />
            </div>
          </div>
          <div className="group/field space-y-2">
            <Label htmlFor="listing-desc">Description</Label>
            <Textarea
              id="listing-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as MarketplaceCategoryKey)
                }
                className="h-10 w-full rounded-md border border-white/15 bg-transparent px-3 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {MARKETPLACE_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                value={status}
                onChange={(e) =>
                  setStatusField(e.target.value as typeof status)
                }
                className="h-10 w-full rounded-md border border-white/15 bg-transparent px-3 text-sm"
              >
                <option value="draft">Draft</option>
                <option value="available">Available</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Quick import examples</Label>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_MARKETPLACE_OPTIONS.map((opt) => (
                <button
                  key={opt.slug}
                  type="button"
                  onClick={() => void onImportExample(opt.slug)}
                  className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-[var(--brand-accent)] hover:text-[var(--brand-accent)]"
                >
                  {opt.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 px-4 py-8 text-center hover:border-[var(--brand-accent)]/50">
              <Upload className="size-5 text-[var(--brand-accent)]" />
              <span className="text-sm font-medium">Upload pose-pack JSON</span>
              <span className="text-xs text-[var(--brand-muted)]">
                {pack
                  ? `Loaded: ${pack.name} (${pack.gestures.length} poses)`
                  : "From npm run mascot:export — e.g. src/lib/marketplace/packs/bud.json"}
              </span>
              <input
                type="file"
                accept=".json,application/json"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onFile(file);
                }}
              />
            </label>
            <div className="space-y-2">
              <Label>Or list from your library</Label>
              <select
                value={sourceMascotId}
                onChange={(e) => {
                  setSourceMascotId(e.target.value as Id<"mascots"> | "");
                  if (e.target.value) setPack(null);
                }}
                className="h-10 w-full rounded-md border border-white/15 bg-transparent px-3 text-sm"
              >
                <option value="">Select a mascot…</option>
                {(library.results ?? []).map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={saving}
              onClick={() => void onSubmit()}
              className="bg-[var(--brand-accent)] text-[#12141c]"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : "Save listing"}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-2">
        {(
          ["available", "draft", "reserved", "sold", "archived"] as const
        ).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setListStatus(s)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold capitalize",
              listStatus === s
                ? "border-[var(--brand-accent)] text-[var(--brand-accent)]"
                : "border-white/15 text-white/60"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {listings.status === "LoadingFirstPage" && <AdminListingRowsSkeleton />}

      <div className="mt-6 grid gap-3">
        {(listings.results ?? []).map((row) => {
          const categoryLabel =
            MARKETPLACE_CATEGORY_LABELS[
              row.category as MarketplaceCategoryKey
            ] ?? row.category;
          return (
          <div
            key={row._id}
            className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div
              className="size-14 shrink-0 overflow-hidden rounded-xl bg-[#0b1020]"
              dangerouslySetInnerHTML={{
                __html: sanitizeSvg(row.previewSvg),
              }}
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{row.name}</p>
              <p className="text-xs text-[var(--brand-muted)]">
                {row.status} · {categoryLabel} · /{row.slug}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {row.status !== "sold" && row.status !== "reserved" && (
                <>
                  {exampleSlugForListingName(row.name) && (
                    <button
                      type="button"
                      disabled={refreshingId === row._id}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      onClick={() => void onRefreshPack(row._id, row.name)}
                    >
                      {refreshingId === row._id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        "Refresh pack"
                      )}
                    </button>
                  )}
                  {row.status !== "available" && (
                    <button
                      type="button"
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      onClick={() =>
                        void setStatus({
                          listingId: row._id,
                          status: "available",
                        }).then(
                          () => toast.success("Published"),
                          (e) =>
                            toast.error(
                              e instanceof Error ? e.message : "Failed"
                            )
                        )
                      }
                    >
                      Publish
                    </button>
                  )}
                  {row.status === "available" && (
                    <button
                      type="button"
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      onClick={() =>
                        void setStatus({
                          listingId: row._id,
                          status: "archived",
                        }).then(
                          () => toast.success("Archived"),
                          (e) =>
                            toast.error(
                              e instanceof Error ? e.message : "Failed"
                            )
                        )
                      }
                    >
                      Archive
                    </button>
                  )}
                </>
              )}
              {row.status === "available" && (
                <Link
                  href={`/marketplace/${row.slug}`}
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                >
                  View
                </Link>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </section>
  );
}
