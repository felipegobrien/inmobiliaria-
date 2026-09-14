import Link from "next/link";
import { SITE_URL } from "@/lib/supabase-server";

/** Inserta un bloque JSON-LD (datos estructurados de schema.org). */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // El contenido lo generamos nosotros (no viene del usuario).
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export type Crumb = { name: string; href: string };

/**
 * Migas de pan visibles + su marcado BreadcrumbList para Google.
 * Ej: Inicio › Arriendo › Bogotá › Chapinero
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${SITE_URL}${c.href}`,
    })),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <nav aria-label="Migas de pan" className="text-sm text-zinc-500">
        <ol className="flex flex-wrap items-center gap-1">
          {items.map((c, i) => {
            const last = i === items.length - 1;
            return (
              <li key={c.href} className="flex items-center gap-1">
                {last ? (
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {c.name}
                  </span>
                ) : (
                  <>
                    <Link
                      href={c.href}
                      className="hover:text-emerald-700 dark:hover:text-emerald-400"
                    >
                      {c.name}
                    </Link>
                    <span aria-hidden="true">›</span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
