import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAgencyProperties } from "@inmo/shared";
import { getServerSupabase, SITE_URL } from "@/lib/supabase-server";
import { Header } from "@/components/Header";
import { PropertyCard } from "@/components/PropertyCard";

export const revalidate = 60;

async function getAgency(id: string) {
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, company, verified, role, avatar_url")
    .eq("id", id)
    .maybeSingle();
  return data as
    | {
        id: string;
        full_name: string | null;
        company: string | null;
        verified: boolean;
        role: string;
        avatar_url: string | null;
      }
    | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const a = await getAgency(id);
  if (!a) return { title: "Inmobiliaria" };
  const name = a.company ?? a.full_name ?? "Inmobiliaria";
  return {
    title: `${name} — Inmuebles`,
    description: `Mira todos los inmuebles publicados por ${name} en venta y arriendo.`,
    alternates: { canonical: `/inmobiliaria/${id}` },
    openGraph: { title: `${name} — Inmuebles`, url: `${SITE_URL}/inmobiliaria/${id}` },
  };
}

export default async function AgencyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = getServerSupabase();
  const [agency, properties] = await Promise.all([
    getAgency(id),
    getAgencyProperties(supabase, id).catch(() => []),
  ]);

  if (!agency) notFound();
  const name = agency.company ?? agency.full_name ?? "Inmobiliaria";

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white">
            {agency.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={agency.avatar_url}
                alt={name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-3xl text-emerald-700">🏠</span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold capitalize text-zinc-900 dark:text-zinc-50">
              {name}
              {agency.verified && (
                <span className="ml-2 align-middle text-sm text-emerald-700">
                  ✓ Verificada
                </span>
              )}
            </h1>
            <p className="text-sm text-zinc-500">
              {properties.length} inmuebles publicados
            </p>
          </div>
        </div>

        {properties.length === 0 ? (
          <p className="py-12 text-center text-zinc-500">
            Esta inmobiliaria no tiene inmuebles activos por ahora.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
