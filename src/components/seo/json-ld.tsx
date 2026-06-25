// Dati strutturati schema.org (JSON-LD). Server-safe, riutilizzabile.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
