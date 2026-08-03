import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BlogCta } from "@/components/blog/blog-cta";
import { BlogCoverImage } from "@/components/blog/cover-image";
import { BlogMarkdown } from "@/components/blog/markdown";
import { BlogShell } from "@/components/blog/blog-shell";
import { JsonLd } from "@/components/json-ld";
import {
  blogPath,
  categoryLabel,
  formatBlogDate,
  getPostBySlug,
  getPostSlugs,
} from "@/lib/blog";
import { blogPostingJsonLd, blogPostMetadata } from "@/lib/blog-seo";

type Props = {
  params: Promise<{ slug: string }>;
};

/** Only published slugs are valid — unknown paths 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return blogPostMetadata(post);
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <BlogShell>
      <JsonLd data={blogPostingJsonLd(post)} />
      <article className="mx-auto max-w-3xl">
        <Link
          href={blogPath()}
          className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
        >
          <ArrowLeft className="size-4" />
          All posts
        </Link>

        <header className="mt-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
            <span className="text-[var(--brand-accent)]">
              {categoryLabel(post.category)}
            </span>
            <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
            {post.updated && post.updated !== post.date ? (
              <span>Updated {formatBlogDate(post.updated)}</span>
            ) : null}
          </div>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl tracking-tight sm:text-5xl">
            {post.title}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-white/75">
            {post.description}
          </p>
          {post.category === "review" &&
          (post.app || post.mascot || post.metrics?.length) ? (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <dl className="grid gap-4 sm:grid-cols-2">
                {post.app ? (
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
                      App
                    </dt>
                    <dd className="mt-1 text-white/90">{post.app}</dd>
                  </div>
                ) : null}
                {post.mascot ? (
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
                      Mascot
                    </dt>
                    <dd className="mt-1 text-white/90">{post.mascot}</dd>
                  </div>
                ) : null}
              </dl>
              {post.metrics?.length ? (
                <dl className="mt-5 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
                  {post.metrics.map((metric) => (
                    <div key={metric.label}>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                        {metric.label}
                      </dt>
                      <dd className="mt-1 font-[family-name:var(--font-display)] text-lg text-[var(--brand-accent-deep)]">
                        {metric.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          ) : null}
        </header>

        {post.cover ? (
          <div className="relative mt-10 aspect-[16/9] overflow-hidden rounded-2xl border border-white/10 bg-black/20">
            <BlogCoverImage
              src={post.cover}
              alt={post.coverAlt ?? post.title}
              priority
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        ) : null}

        <div className="mt-4">
          <BlogMarkdown content={post.content} />
        </div>

        <BlogCta />
      </article>
    </BlogShell>
  );
}
