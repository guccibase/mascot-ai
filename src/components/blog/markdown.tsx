import Image from "next/image";
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import type { Components, ExtraProps } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkUnwrapImages from "remark-unwrap-images";
import { isSvgAsset } from "@/lib/blog-utils";
import { cn } from "@/lib/utils";

type MarkdownImageProps = ComponentPropsWithoutRef<"img"> & ExtraProps;

/**
 * Images are unwrapped from paragraphs at the markdown AST layer
 * (`remark-unwrap-images`) so we never emit invalid <p><figure> HTML.
 */
function BlogImage({ src, alt }: MarkdownImageProps) {
  if (!src || typeof src !== "string") return null;

  if (!src.startsWith("/") || isSvgAsset(src)) {
    return (
      <figure className="mt-8">
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG/remote figures */}
        <img
          src={src}
          alt={alt ?? ""}
          className="h-auto w-full rounded-2xl border border-white/10 bg-black/20"
          loading="lazy"
        />
        {alt ? (
          <figcaption className="mt-3 text-center text-sm text-white/45">
            {alt}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  return (
    <figure className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
      <Image
        src={src}
        alt={alt ?? ""}
        width={1200}
        height={675}
        className="h-auto w-full object-cover"
        sizes="(max-width: 768px) 100vw, 720px"
      />
      {alt ? (
        <figcaption className="border-t border-white/10 bg-[var(--brand-bg)] px-3 py-3 text-center text-sm text-white/45">
          {alt}
        </figcaption>
      ) : null}
    </figure>
  );
}

const components: Components = {
  h2: ({ children }) => (
    <h2 className="mt-12 scroll-mt-24 border-t border-white/10 pt-10 font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--brand-ink)] sm:text-3xl">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-8 scroll-mt-24 font-[family-name:var(--font-display)] text-xl tracking-tight text-[var(--brand-ink)] sm:text-2xl">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mt-5 text-base leading-relaxed text-white/80 sm:text-[1.05rem] sm:leading-8">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="mt-5 list-disc space-y-2 pl-5 text-white/80 marker:text-[var(--brand-accent)]">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-5 list-decimal space-y-2 pl-5 text-white/80 marker:text-[var(--brand-accent)]">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed pl-1">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  a: ({ href, children }) => {
    const url = href ?? "#";
    const external = /^https?:\/\//.test(url);
    if (external) {
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[var(--brand-accent)] underline decoration-[var(--brand-accent)]/35 underline-offset-4 transition hover:decoration-[var(--brand-accent)]"
        >
          {children}
        </a>
      );
    }
    return (
      <Link
        href={url}
        className="font-medium text-[var(--brand-accent)] underline decoration-[var(--brand-accent)]/35 underline-offset-4 transition hover:decoration-[var(--brand-accent)]"
      >
        {children}
      </Link>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="mt-6 border-l-2 border-[var(--brand-accent)]/70 bg-white/[0.03] px-5 py-4 text-white/75 italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-10 border-white/10" />,
  code: ({ className, children }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return (
        <code
          className={cn(
            "block overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/85",
            className
          )}
        >
          {children}
        </code>
      );
    }
    return (
      <code className="rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[0.9em] text-[var(--brand-accent-deep)]">
        {children}
      </code>
    );
  },
  pre: ({ children }) => <pre className="mt-6 overflow-x-auto">{children}</pre>,
  img: BlogImage,
  table: ({ children }) => (
    <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[28rem] border-collapse text-left text-sm text-white/80">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-white/[0.04] text-white/90">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border-b border-white/10 px-3 py-2.5 font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-white/5 px-3 py-2.5 align-top">{children}</td>
  ),
};

export function BlogMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkUnwrapImages]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  );
}
