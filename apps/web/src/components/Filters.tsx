"use client";

import {
  OPERATION_LABELS,
  TYPE_LABELS,
  type OperationType,
  type PropertyFilters,
  type PropertyType,
} from "@inmo/shared";

interface Props {
  filters: PropertyFilters;
  onChange: (next: PropertyFilters) => void;
}

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function Filters({ filters, onChange }: Props) {
  const set = (patch: Partial<PropertyFilters>) =>
    onChange({ ...filters, ...patch, page: 0 });

  const toggleEstrato = (e: number) => {
    const current = filters.estrato ?? [];
    set({
      estrato: current.includes(e)
        ? current.filter((x) => x !== e)
        : [...current, e],
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Texto */}
      <input
        type="text"
        placeholder="Buscar por título o barrio…"
        value={filters.search ?? ""}
        onChange={(e) => set({ search: e.target.value || undefined })}
        className={`${inputClass} w-full`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Operación */}
        <select
          value={filters.operation ?? ""}
          onChange={(e) =>
            set({ operation: (e.target.value || undefined) as OperationType })
          }
          className={inputClass}
        >
          <option value="">Operación</option>
          {(["venta", "arriendo"] as OperationType[]).map((o) => (
            <option key={o} value={o}>
              {OPERATION_LABELS[o]}
            </option>
          ))}
        </select>

        {/* Tipo */}
        <select
          value={filters.type ?? ""}
          onChange={(e) =>
            set({ type: (e.target.value || undefined) as PropertyType })
          }
          className={inputClass}
        >
          <option value="">Tipo</option>
          {(Object.keys(TYPE_LABELS) as PropertyType[]).map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>

        {/* Ciudad */}
        <input
          type="text"
          placeholder="Ciudad"
          value={filters.city ?? ""}
          onChange={(e) => set({ city: e.target.value || undefined })}
          className={inputClass}
        />

        {/* Orden */}
        <select
          value={filters.sortBy ?? "recientes"}
          onChange={(e) =>
            set({ sortBy: e.target.value as PropertyFilters["sortBy"] })
          }
          className={inputClass}
        >
          <option value="recientes">Más recientes</option>
          <option value="precio_asc">Menor precio</option>
          <option value="precio_desc">Mayor precio</option>
          <option value="area_desc">Mayor área</option>
        </select>
      </div>

      {/* Precio */}
      <div className="grid grid-cols-2 gap-3">
        <input
          type="number"
          placeholder="Precio mín."
          value={filters.minPrice ?? ""}
          onChange={(e) =>
            set({ minPrice: e.target.value ? Number(e.target.value) : undefined })
          }
          className={inputClass}
        />
        <input
          type="number"
          placeholder="Precio máx."
          value={filters.maxPrice ?? ""}
          onChange={(e) =>
            set({ maxPrice: e.target.value ? Number(e.target.value) : undefined })
          }
          className={inputClass}
        />
      </div>

      {/* Habitaciones / baños / parqueadero */}
      <div className="grid grid-cols-3 gap-3">
        <select
          value={filters.minBedrooms ?? ""}
          onChange={(e) =>
            set({ minBedrooms: e.target.value ? Number(e.target.value) : undefined })
          }
          className={inputClass}
        >
          <option value="">Habitaciones</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}+ hab
            </option>
          ))}
        </select>
        <select
          value={filters.minBathrooms ?? ""}
          onChange={(e) =>
            set({ minBathrooms: e.target.value ? Number(e.target.value) : undefined })
          }
          className={inputClass}
        >
          <option value="">Baños</option>
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n}+ baños
            </option>
          ))}
        </select>
        <select
          value={filters.minParking ?? ""}
          onChange={(e) =>
            set({ minParking: e.target.value ? Number(e.target.value) : undefined })
          }
          className={inputClass}
        >
          <option value="">Parqueadero</option>
          {[1, 2, 3].map((n) => (
            <option key={n} value={n}>
              {n}+ parq.
            </option>
          ))}
        </select>
      </div>

      {/* Estrato */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-zinc-500">Estrato:</span>
        {[1, 2, 3, 4, 5, 6].map((e) => {
          const active = filters.estrato?.includes(e);
          return (
            <button
              key={e}
              type="button"
              onClick={() => toggleEstrato(e)}
              className={`h-8 w-8 rounded-full border text-sm font-medium transition ${
                active
                  ? "border-emerald-700 bg-emerald-700 text-white"
                  : "border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
              }`}
            >
              {e}
            </button>
          );
        })}
      </div>
    </div>
  );
}
