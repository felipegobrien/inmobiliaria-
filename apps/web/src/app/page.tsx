"use client";

import { useEffect, useState } from "react";
import {
  searchProperties,
  TYPE_LABELS,
  type OperationType,
  type PropertyFilters,
  type PropertyType,
  type PropertyWithImages,
} from "@inmo/shared";
import { supabase } from "@/lib/supabase";
import { geocodeSuggestions, type PlaceSuggestion } from "@inmo/shared";
import { Filters } from "@/components/Filters";
import { PropertyCard } from "@/components/PropertyCard";
import { Header } from "@/components/Header";

const QUICK_TYPES: PropertyType[] = [
  "apartamento",
  "casa",
  "apartaestudio",
  "local",
  "oficina",
  "finca",
];

export default function Home() {
  const [filters, setFilters] = useState<PropertyFilters>({});
  const [results, setResults] = useState<PropertyWithImages[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [placeSug, setPlaceSug] = useState<PlaceSuggestion[]>([]);

  useEffect(() => {
    const q = filters.search ?? "";
    if (q.length < 3) {
      setPlaceSug([]);
      return;
    }
    let active = true;
    const t = setTimeout(() => {
      geocodeSuggestions(q)
        .then((s) => active && setPlaceSug(s))
        .catch(() => {});
    }, 350);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [filters.search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const t = setTimeout(() => {
      searchProperties(supabase, filters)
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
  }, [filters]);

  const set = (patch: Partial<PropertyFilters>) =>
    setFilters((f) => ({ ...f, ...patch, page: 0 }));

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800">
        {/* Blobs decorativos */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_40%)]" />

        <div className="relative mx-auto max-w-5xl px-4 py-16 text-center sm:py-24">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Encuentra el lugar <br className="hidden sm:block" /> que llamarás{" "}
            <span className="text-amber-300">hogar</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-emerald-50/90">
            Miles de apartamentos, casas y locales en venta y arriendo en toda
            Colombia. Busca, filtra y contacta al instante.
          </p>

          {/* Buscador protagonista */}
          <div className="mx-auto mt-8 max-w-3xl rounded-2xl bg-white p-3 shadow-2xl shadow-emerald-900/30 dark:bg-zinc-900">
            <div className="flex flex-col gap-2 sm:flex-row">
              {/* Toggle venta/arriendo */}
              <div className="flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
                {(["venta", "arriendo"] as OperationType[]).map((op) => {
                  const active = filters.operation === op;
                  return (
                    <button
                      key={op}
                      onClick={() =>
                        set({ operation: active ? undefined : op })
                      }
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

              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Ciudad, barrio o palabra clave…"
                  value={filters.search ?? ""}
                  onChange={(e) =>
                    set({ search: e.target.value || undefined })
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
                {placeSug.length > 0 && (
                  <ul className="absolute left-0 right-0 z-30 mt-1 max-h-60 overflow-auto rounded-xl border border-zinc-200 bg-white text-left shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                    {placeSug.map((s, i) => (
                      <li key={`${s.lat},${s.lng},${i}`}>
                        <button
                          type="button"
                          onClick={() => {
                            set({ search: s.label.split(",")[0] });
                            setPlaceSug([]);
                          }}
                          className="block w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          {s.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button
                onClick={() => setShowFilters((v) => !v)}
                className="rounded-xl bg-emerald-700 px-6 py-3 font-semibold text-white transition hover:bg-emerald-800"
              >
                {showFilters ? "Ocultar filtros" : "Más filtros"}
              </button>
            </div>
          </div>

          {/* Chips de categorías */}
          <div className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2">
            <button
              onClick={() => set({ type: undefined })}
              className={`rounded-full px-4 py-1.5 text-sm font-medium backdrop-blur transition ${
                !filters.type
                  ? "bg-white text-emerald-800"
                  : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              Todos
            </button>
            {QUICK_TYPES.map((t) => {
              const active = filters.type === t;
              return (
                <button
                  key={t}
                  onClick={() => set({ type: active ? undefined : t })}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium backdrop-blur transition ${
                    active
                      ? "bg-white text-emerald-800"
                      : "bg-white/15 text-white hover:bg-white/25"
                  }`}
                >
                  {TYPE_LABELS[t]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Curva inferior */}
        <div className="h-8 rounded-t-[2rem] bg-zinc-50 dark:bg-black" />
      </section>

      {/* RESULTADOS */}
      <main className="mx-auto max-w-6xl px-4 pb-16">
        {showFilters && (
          <div className="-mt-2 mb-6">
            <Filters filters={filters} onChange={setFilters} />
          </div>
        )}

        <div className="mb-5 mt-2 flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            {filters.operation === "arriendo"
              ? "En arriendo"
              : filters.operation === "venta"
                ? "En venta"
                : "Inmuebles destacados"}
          </h2>
          <div className="flex items-center gap-3">
            <a
              href="/mapa"
              className="flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
            >
              🗺️ Ver en mapa
            </a>
            <span className="text-sm text-zinc-500">
              {loading ? "Buscando…" : `${count} resultados`}
            </span>
          </div>
        </div>

        {!loading && results.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-16 text-center text-zinc-500 dark:border-zinc-700">
            <p className="text-lg font-medium">No encontramos inmuebles</p>
            <p className="mt-1 text-sm">Prueba ajustar o quitar algunos filtros.</p>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-zinc-500 sm:flex-row">
          <span className="font-bold text-emerald-800 dark:text-emerald-400">
            🏠 Inmobiliaria
          </span>
          <span>Hecho en Colombia · {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
