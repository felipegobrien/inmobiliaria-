"use client";

import { useEffect, useState } from "react";
import {
  searchProperties,
  propertySlug,
  type OperationType,
  type PropertyFilters,
  type PropertyWithImages,
} from "@inmo/shared";
import { supabase } from "@/lib/supabase";
import { Filters } from "./Filters";
import { PropertyCard } from "./PropertyCard";

// Catálogo con buscador y filtros para el sitio de marca blanca de una
// inmobiliaria. Todas las búsquedas quedan limitadas a SUS inmuebles
// (ownerId fijo) — el visitante nunca ve propiedades de otros.
export function AgencyCatalog({
  agencyId,
  base,
}: {
  /** id del perfil de la inmobiliaria dueña del sitio */
  agencyId: string;
  /** prefijo de los enlaces internos ("" en dominio propio, /sitio/<slug> si no) */
  base: string;
}) {
  const [filters, setFilters] = useState<PropertyFilters>({});
  const [results, setResults] = useState<PropertyWithImages[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const t = setTimeout(() => {
      searchProperties(supabase, { ...filters, ownerId: agencyId })
        .then(({ data, count }) => {
          if (!active) return;
          setResults(data);
          setCount(count);
        })
        .catch((e) => console.error(e))
        .finally(() => active && setLoading(false));
    }, 300);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [filters, agencyId]);

  const set = (patch: Partial<PropertyFilters>) =>
    setFilters((f) => ({ ...f, ...patch, page: 0 }));

  return (
    <div>
      {/* Buscador */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
          {(["venta", "arriendo"] as OperationType[]).map((op) => {
            const active = filters.operation === op;
            return (
              <button
                key={op}
                onClick={() => set({ operation: active ? undefined : op })}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${
                  active
                    ? "bg-emerald-700 text-white shadow"
                    : "text-zinc-600 dark:text-zinc-300"
                }`}
              >
                {op}
              </button>
            );
          })}
        </div>

        <input
          type="text"
          placeholder="Busca por barrio, ciudad o palabra clave…"
          value={filters.search ?? ""}
          onChange={(e) => set({ search: e.target.value || undefined })}
          className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />

        <button
          onClick={() => setShowFilters((v) => !v)}
          className="rounded-xl bg-emerald-700 px-6 py-3 font-semibold text-white transition hover:bg-emerald-800"
        >
          {showFilters ? "Ocultar filtros" : "Más filtros"}
        </button>
      </div>

      {showFilters && (
        <div className="mt-4">
          <Filters filters={filters} onChange={setFilters} />
        </div>
      )}

      <p className="mt-4 text-sm text-zinc-500">
        {loading
          ? "Buscando…"
          : `${count} inmueble${count === 1 ? "" : "s"} disponible${count === 1 ? "" : "s"}`}
      </p>

      {!loading && results.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 p-16 text-center text-zinc-500 dark:border-zinc-700">
          <p className="text-lg font-medium">No encontramos inmuebles</p>
          <p className="mt-1 text-sm">
            Prueba ajustar o quitar algunos filtros.
          </p>
        </div>
      ) : loading ? (
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800"
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((p) => (
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
    </div>
  );
}
