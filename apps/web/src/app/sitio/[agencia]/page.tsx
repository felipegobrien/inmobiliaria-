import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAgencyProperties,
  propertySlug,
  TYPE_LABELS,
  type PropertyType,
} from "@inmo/shared";
import { getServerSupabase } from "@/lib/supabase-server";
import { getAgencySiteBySlug, agencyBasePath } from "@/lib/agency-site";
import { PropertyCard } from "@/components/PropertyCard";

// Catálogo de la inmobiliaria (portada de su sitio de marca blanca).

export default async function AgencyCatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ agencia: string }>;
  searchParams: Promise<{ op?: string; tipo?: string }>;
}) {
  const [{ agencia }, { op, tipo }] = await Promise.all([params, searchParams]);
  const supabase = getServerSupabase();
  const agency = await getAgencySiteBySlug(supabase, agencia).catch(() => null);
  if (!agency) notFound();

  const host = (await headers()).get("host");
  const base = agencyBasePath(agency, host);
  const home = base || "/";

  const all = await getAgencyProperties(supabase, agency.id).catch(() => []);

  // Filtros simples por enlaces (?op=venta&tipo=casa)
  let properties = all;
  if (op === "venta" || op === "arriendo") {
    properties = properties.filter(
      (p) => p.operation === op || p.operation === "venta_arriendo",
    );
  }
  if (tipo) properties = properties.filter((p) => p.type === tipo);

  const typesPresent = Array.from(new Set(all.map((p) => p.type)));

  const filterHref = (nextOp?: string, nextTipo?: string) => {
    const q = new URLSearchParams();
    if (nextOp) q.set("op", nextOp);
    if (nextTipo) q.set("tipo", nextTipo);
    const qs = q.toString();
    return qs ? `${home}?${qs}` : home;
  };

  const chip = (active: boolean) =>
    `rounded-full border px-4 py-1.5 text-sm font-medium transition ${
      active
        ? "border-emerald-700 bg-emerald-700 text-white"
        : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
    }`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
        Nuestros inmuebles
      </h1>
      <p className="text-sm text-zinc-500">
        {properties.length} inmueble{properties.length === 1 ? "" : "s"}{" "}
        disponible{properties.length === 1 ? "" : "s"}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={filterHref(undefined, tipo)} className={chip(!op)}>
          Todos
        </Link>
        <Link href={filterHref("venta", tipo)} className={chip(op === "venta")}>
          En venta
        </Link>
        <Link
          href={filterHref("arriendo", tipo)}
          className={chip(op === "arriendo")}
        >
          En arriendo
        </Link>
      </div>

      {typesPresent.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-2">
          <Link href={filterHref(op, undefined)} className={chip(!tipo)}>
            Todo tipo
          </Link>
          {typesPresent.map((t) => (
            <Link
              key={t}
              href={filterHref(op, t)}
              className={chip(tipo === t)}
            >
              {TYPE_LABELS[t as PropertyType] ?? t}
            </Link>
          ))}
        </div>
      )}

      {properties.length === 0 ? (
        <p className="py-16 text-center text-zinc-500">
          No hay inmuebles con ese filtro por ahora.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <PropertyCard
              key={p.id}
              property={p}
              href={`${base}/inmueble/${propertySlug(p)}`}
              hideFavorite
              hideAgency
            />
          ))}
        </div>
      )}
    </main>
  );
}
