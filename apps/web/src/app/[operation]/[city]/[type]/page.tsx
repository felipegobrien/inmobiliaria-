import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  searchProperties,
  TYPE_LABELS,
  type OperationType,
  type PropertyType,
} from "@inmo/shared";
import { getServerSupabase, SITE_URL } from "@/lib/supabase-server";
import { resolveCity } from "@/lib/listings";
import { Header } from "@/components/Header";
import { PropertyCard } from "@/components/PropertyCard";

export const revalidate = 60;

const VALID_OPS = ["venta", "arriendo"] as const;
const opWord = (op: string) => (op === "arriendo" ? "en arriendo" : "en venta");

export async function generateMetadata({
  params,
}: {
  params: Promise<{ operation: string; city: string; type: string }>;
}): Promise<Metadata> {
  const { operation, city, type } = await params;
  if (
    !(VALID_OPS as readonly string[]).includes(operation) ||
    !(type in TYPE_LABELS)
  )
    return {};
  const supabase = getServerSupabase();
  const cityName = await resolveCity(supabase, city);
  if (!cityName) return {};
  const plural = TYPE_LABELS[type as PropertyType];
  const title = `${plural} ${opWord(operation)} en ${cityName}`;
  const description = `${plural} ${opWord(operation)} en ${cityName}. Mira fotos, precios y contacta directamente al anunciante.`;
  return {
    title,
    description,
    alternates: { canonical: `/${operation}/${city}/${type}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${operation}/${city}/${type}`,
    },
  };
}

export default async function TypeListingPage({
  params,
}: {
  params: Promise<{ operation: string; city: string; type: string }>;
}) {
  const { operation, city, type } = await params;
  if (
    !(VALID_OPS as readonly string[]).includes(operation) ||
    !(type in TYPE_LABELS)
  )
    notFound();

  const supabase = getServerSupabase();
  const cityName = await resolveCity(supabase, city);
  if (!cityName) notFound();

  const { data: results } = await searchProperties(supabase, {
    operation: operation as OperationType,
    city: cityName,
    type: type as PropertyType,
    pageSize: 50,
  });

  const plural = TYPE_LABELS[type as PropertyType];

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {plural} {opWord(operation)} en {cityName}
        </h1>
        <p className="mt-1 text-zinc-500">
          {results.length} {plural.toLowerCase()} {opWord(operation)} en{" "}
          {cityName}.
        </p>

        {results.length === 0 ? (
          <p className="mt-10 text-center text-zinc-500">
            Aún no hay {plural.toLowerCase()} {opWord(operation)} en {cityName}.
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
