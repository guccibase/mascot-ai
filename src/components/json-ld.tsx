/** Server-safe JSON-LD script. Escapes `<` per Next.js JSON-LD guidance. */
export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | unknown[];
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
