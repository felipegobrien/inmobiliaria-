import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase-server";
import { getAgencySiteBySlug, agencyBasePath } from "@/lib/agency-site";
import { AgencyCatalog } from "@/components/AgencyCatalog";

// Portada del sitio de marca blanca: catálogo con buscador y filtros,
// siempre limitado a los inmuebles de esta inmobiliaria.

export default async function AgencyCatalogPage({
  params,
}: {
  params: Promise<{ agencia: string }>;
}) {
  const { agencia } = await params;
  const supabase = getServerSupabase();
  const agency = await getAgencySiteBySlug(supabase, agencia).catch(() => null);
  if (!agency) notFound();

  const host = (await headers()).get("host");
  const base = agencyBasePath(agency, host);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-50">
        Nuestros inmuebles
      </h1>
      <AgencyCatalog agencyId={agency.id} base={base} />
    </main>
  );
}
