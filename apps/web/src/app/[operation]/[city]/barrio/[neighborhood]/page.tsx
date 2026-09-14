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
import { resolveCity, resolveNeighborhood } from "@/lib/listings";
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
  params: Promise<{ operation: string; city: string; neighborhood: string }>;
}): Promise<Metadata> {
  const { operation, city, neighborhood } = await params;
  if (!(VALID_OPS as readonly string[]).includes(operation)) return {};
  const supabase = getServerSupabase();
  const cityName = await resolveCity(supabase, city);
  if (!cityName) return {};
  const barrio = await resolveNeighborhood(supabase, cityName, neighborhood);
  if (!barrio) return {};
  const title = `Inmuebles ${opWord(operation)} en ${barrio}, ${cityName}`;
  const description = `Apartamentos, casas y más ${opWord(operation)} en ${barrio} (${cityName}). Precios, fotos y contacto directo con el anunciante.`;
  const url = `/${operation}/${city}/barrio/${neighborhood}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url: `${SITE_URL}${url}` },
  };
}

export default async function NeighborhoodListingPage({
  params,
}: {
  params: Promise<{ operation: string; city: string; neighborhood: string }>;
}) {
  const { operation, city, neighborhood } = await params;
  if (!(VALID_OPS as readonly string[]).includes(operation)) notFound();

  const supabase = getServerSupabase();
  const cityName = await resolveCity(supabase, city);
  if (!cityName) notFound();
  const barrio = await resolveNeighborhood(supabase, cityName, neighborhood);
  if (!barrio) notFound();

  const { data: results } = await searchProperties(supabase, {
    operation: operation as OperationType,
    city: cityName,
    neighborhood: barrio,
    pageSize: 50,
  });

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Inmuebles ${opWord(operation)} en ${barrio}, ${cityName}`,
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
            {
              name: barrio,
              href: `/${operation}/${city}/barrio/${neighborhood}`,
            },
          ]}
        />

        <h1 className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Inmuebles {opWord(operation)} en {barrio}, {cityName}
        </h1>
        <p className="mt-2 max-w-3xl text-zinc-500">
          Explora {results.length} inmuebles {opWord(operation)} en {barrio},
          uno de los sectores de {cityName}. Compara precios, mira fotos y
          contacta directamente al anunciante, sin intermediarios. Actualizamos
          los avisos a diario para que encuentres tu próximo hogar en {barrio}.
        </p>

        {/* Enlaces internos por tipo dentro del barrio */}
        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(TYPE_LABELS) as PropertyType[]).map((t) => (
            <Link
              key={t}
              href={`/${operation}/${slugify(cityName)}/${t}`}
              className="rounded-full border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:border-emerald-700 dark:border-zinc-700 dark:text-zinc-300"
            >
              {TYPE_LABELS[t]} {opWord(operation)}
            </Link>
          ))}
        </div>

        {results.length === 0 ? (
          <p className="mt-10 text-center text-zinc-500">
            Aún no hay inmuebles {opWord(operation)} en {barrio}.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
