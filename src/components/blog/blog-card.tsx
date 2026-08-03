import Link from "next/link";
import { BlogCoverImage } from "@/components/blog/cover-image";
import {
  blogPath,
  categoryLabel,
  formatBlogDate,
  type BlogPostMeta,
} from "@/lib/blog";

export function BlogCard({ post }: { post: BlogPostMeta }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-white/20 hover:bg-white/[0.05]">
      <Link href={blogPath(post.slug)} className="flex h-full flex-col">
        <div className="relative aspect-[16/9] overflow-hidden bg-black/30">
          {post.cover ? (
            <BlogCoverImage
              src={post.cover}
              alt={post.coverAlt ?? post.title}
              className="transition duration-500 group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-end bg-[radial-gradient(420px_220px_at_20%_20%,rgba(245,179,79,0.22),transparent_60%),linear-gradient(160deg,#121a2c,#0b1020)] p-5">
              <p className="font-[family-name:var(--font-display)] text-lg text-white/90">
                {post.category === "review" && post.app
                  ? post.app
                  : categoryLabel(post.category)}
              </p>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
            <span className="text-[var(--brand-accent)]">
              {categoryLabel(post.category)}
            </span>
            <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-xl tracking-tight text-white transition group-hover:text-[var(--brand-accent-deep)] sm:text-2xl">
            {post.title}
          </h2>
          <p className="line-clamp-3 text-sm leading-relaxed text-white/65">
            {post.description}
          </p>
          {post.category === "review" && (post.app || post.mascot) ? (
            <p className="mt-auto pt-2 text-xs text-white/45">
              {[post.app, post.mascot ? `Mascot: ${post.mascot}` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : (
            <span className="mt-auto pt-2 text-sm font-medium text-[var(--brand-accent)]">
              Read article →
            </span>
          )}
        </div>
      </Link>
    </article>
  );
}
