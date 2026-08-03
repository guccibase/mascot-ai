import { BlogCard } from "@/components/blog/blog-card";
import { BlogShell } from "@/components/blog/blog-shell";
import { JsonLd } from "@/components/json-ld";
import { getAllPosts } from "@/lib/blog";
import { blogIndexJsonLd } from "@/lib/blog-seo";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Blog",
  description:
    "App mascot reviews and guides: how characters like Duo, Freddie, and Wumpus help products earn downloads, retention, and revenue — plus how to build your own.",
  path: "/blog",
});

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <BlogShell>
      <JsonLd data={blogIndexJsonLd(posts)} />
      <header className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-accent)]">
          Blog
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight sm:text-6xl">
          Why mascots win apps
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-white/75">
          Reviews of high-traction apps that treat characters as product
          infrastructure — plus practical guides for shipping your own gesture
          system.
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="mt-14 text-white/60">No posts yet. Check back soon.</p>
      ) : (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </BlogShell>
  );
}
