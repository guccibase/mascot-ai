import { BlogCard } from "@/components/blog/blog-card";
import { BlogShell } from "@/components/blog/blog-shell";
import { JsonLd } from "@/components/json-ld";
import { getAllPosts } from "@/lib/blog";
import { blogIndexJsonLd } from "@/lib/blog-seo";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "App Mascot Design Guides & Examples",
  description:
    "Explore how apps use mascots like Duo, Freddie, and Wumpus, then learn to design and integrate animated SVG characters in your own app.",
  path: "/blog",
});

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <BlogShell>
      <JsonLd data={blogIndexJsonLd(posts)} />
      <header className="max-w-3xl">
        <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight sm:text-6xl">
          App mascot design guides and examples
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-white/75">
          See how real apps use mascots in onboarding, notifications, and empty
          states. Then build an animated character for your own product.
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
