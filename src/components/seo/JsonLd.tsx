import { headers } from "next/headers";

/**
 * Structured data. `<` is escaped so user-controlled strings (product names etc.)
 * can never close the script tag — the documented XSS-safe pattern.
 */
export async function JsonLd({ data }: { data: Record<string, unknown> }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
