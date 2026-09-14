import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  searchProperties,
  propertyPath,
  TYPE_LABELS,
  type OperationType,
  type PropertyType,
} from "@inmo/shared";
import { getServerSupabase, SITE_URL } from "@/lib/supabase-server";
import { resolveCity, neighborhoodsInCity } from "@/lib/listings";
import { slugify } from "@/lib/slug";
import { Header } from "@/components/Header";
import { PropertyCard } from "@/components/PropertyCard";
import { Breadcrumbs, JsonLd } from "@/components/Seo";

export const revalidate = 60;

const VALID_OPS = ["venta", "arriendo"] as const;
const opCap = (op: string) => (op === "arriendo" ? "Arriendo" : "Venta");
const opWord = (op: string) => (op === "arriendo" ? "en arriendo" : "en venta");

export async function generateMetadata({
  params,
}: {
  params: Promise<{ operation: string; city: string }>;
}): Promise<Metadata> {
  const { operation, city } = await params;
  if (!(VALID_OPS as readonly string[]).includes(operation)) return {};
  const supabase = getServerSupabase();
  const cityName = await resolveCity(supabase, city);
  if (!cityName) return {};
  const title = `Inmuebles ${opWord(operation)} en ${cityName}`;
  const description = `Encuentra apartamentos, casas y más ${opWord(operation)} en ${cityName}. Filtra por precio, estrato, habitaciones y baños.`;
  return {
    title,
    description,
    alternates: { canonical: `/${operation}/${city}` },
    openGraph: { title, description, url: `${SITE_URL}/${operation}/${city}` },
  };
}

export default async function CityListingPage({
  params,
}: {
  params: Promise<{ operation: string; city: string }>;
}) {
  const { operation, city } = await params;
  if (!(VALID_OPS as readonly string[]).includes(operation)) notFound();

  const supabase = getServerSupabase();
  const cityName = await resolveCity(supabase, city);
  if (!cityName) notFound();

  const { data: results } = await searchProperties(supabase, {
    operation: operation as OperationType,
    city: cityName,
    pageSize: 50,
  });

  const barrios = await neighborhoodsInCity(supabase, cityName);

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Inmuebles ${opWord(operation)} en ${cityName}`,
    numberOfItems: results.length,
    itemListElement: results.slice(0, 25).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}${propertyPath(p)}`,
    })),
  };

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <Header />
      <JsonLd data={itemList} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: opCap(operation), href: `/${operation}/${city}` },
            { name: cityName, href: `/${operation}/${city}` },
          ]}
        />
        <h1 className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Inmuebles {opWord(operation)} en {cityName}
        </h1>
        <p className="mt-2 max-w-3xl text-zinc-500">
          Encuentra {results.length} inmuebles {opWord(operation)} en {cityName}:
          apartamentos, casas, apartaestudios y locales. Filtra por precio,
          estrato, habitaciones y baños, compara opciones y contacta directo al
          anunciante. Publicamos avisos nuevos a diario en {cityName}.
        </p>

        {/* Enlaces internos por tipo (SEO) */}
        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(TYPE_LABELS) as PropertyType[]).map((t) => (
            <Link
              key={t}
              href={`/${operation}/${city}/${t}`}
              className="rounded-full border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:border-emerald-700 dark:border-zinc-700 dark:text-zinc-300"
            >
              {TYPE_LABELS[t]} {opWord(operation)}
            </Link>
          ))}
        </div>

        {/* Enlaces internos por barrio (SEO local) */}
        {barrios.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Busca por sector en {cityName}:
            </p>
            <div className="flex flex-wrap gap-2">
              {barrios.map((b) => (
                <Link
                  key={b}
                  href={`/${operation}/${city}/barrio/${slugify(b)}`}
                  className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                  {b}
                </Link>
              ))}
            </div>
          </div>
        )}

        {results.length === 0 ? (
          <p className="mt-10 text-center text-zinc-500">
            Aún no hay inmuebles {opWord(operation)} en {cityName}.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        )}

        <p className="mt-8 text-sm text-zinc-400">
          {slugify(cityName)} · {operation}
        </p>
      </main>
    </div>
  );
}
