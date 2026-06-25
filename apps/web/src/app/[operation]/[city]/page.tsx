import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  searchProperties,
  TYPE_LABELS,
  type OperationType,
  type PropertyType,
} from "@inmo/shared";
import { getServerSupabase, SITE_URL } from "@/lib/supabase-server";
import { resolveCity } from "@/lib/listings";
import { slugify } from "@/lib/slug";
import { Header } from "@/components/Header";
import { PropertyCard } from "@/components/PropertyCard";

export const revalidate = 60;

const VALID_OPS = ["venta", "arriendo"] as const;
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

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Inmuebles {opWord(operation)} en {cityName}
        </h1>
        <p className="mt-1 text-zinc-500">
          {results.length} inmuebles disponibles {opWord(operation)} en {cityName}.
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
