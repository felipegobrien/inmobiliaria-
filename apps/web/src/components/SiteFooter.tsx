import Link from "next/link";
import { TYPE_LABELS } from "@inmo/shared";
import { TOP_CITIES, TOP_TYPES } from "@/lib/seo-links";

/**
 * Pie de página global con enlaces internos (SEO).
 * Da a Google rutas rastreables hacia las páginas de aterrizaje
 * por ciudad y por tipo de inmueble.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Venta por ciudad */}
          <nav aria-label="Venta por ciudad">
            <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Venta por ciudad
            </h2>
            <ul className="flex flex-col gap-1.5 text-sm text-zinc-500">
              {TOP_CITIES.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/venta/${c.slug}`}
                    className="hover:text-emerald-700 dark:hover:text-emerald-400"
                  >
                    Venta en {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Arriendo por ciudad */}
          <nav aria-label="Arriendo por ciudad">
            <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Arriendo por ciudad
            </h2>
            <ul className="flex flex-col gap-1.5 text-sm text-zinc-500">
              {TOP_CITIES.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/arriendo/${c.slug}`}
                    className="hover:text-emerald-700 dark:hover:text-emerald-400"
                  >
                    Arriendo en {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Tipos en las dos ciudades principales */}
          <nav aria-label="Inmuebles por tipo">
            <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Por tipo en Bogotá
            </h2>
            <ul className="flex flex-col gap-1.5 text-sm text-zinc-500">
              {TOP_TYPES.map((t) => (
                <li key={t}>
                  <Link
                    href={`/venta/bogota/${t}`}
                    className="hover:text-emerald-700 dark:hover:text-emerald-400"
                  >
                    {TYPE_LABELS[t]} en venta
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Inmuebles por tipo en Medellín">
            <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Por tipo en Medellín
            </h2>
            <ul className="flex flex-col gap-1.5 text-sm text-zinc-500">
              {TOP_TYPES.map((t) => (
                <li key={t}>
                  <Link
                    href={`/arriendo/medellin/${t}`}
                    className="hover:text-emerald-700 dark:hover:text-emerald-400"
                  >
                    {TYPE_LABELS[t]} en arriendo
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-zinc-100 pt-6 text-sm text-zinc-500 dark:border-zinc-800/60 sm:flex-row">
          <div className="flex items-center gap-5">
            <Link href="/" className="text-base font-extrabold tracking-tight">
              <span className="text-emerald-700 dark:text-emerald-400">Erca</span>
              <span className="text-zinc-900 dark:text-white">da</span>
            </Link>
            <Link
              href="/blog"
              className="font-medium hover:text-emerald-700 dark:hover:text-emerald-400"
            >
              Blog
            </Link>
          </div>
          <span>
            Diseñado y desarrollado por{" "}
            <a
              href="https://deconmadigital.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
            >
              Deconma
            </a>{" "}
            · {year}
          </span>
        </div>
      </div>
    </footer>
  );
}
