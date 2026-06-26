"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  createProperty,
  updateProperty,
  uploadPropertyImage,
  deletePropertyImage,
  getAmenities,
  searchCities,
  searchNeighborhoods,
  geocodeAddress,
  OPERATION_LABELS,
  TYPE_LABELS,
  AMENITY_CATEGORY_LABELS,
  COLOMBIA_DEPARTMENTS,
  type Amenity,
  type AmenityCategory,
  type OperationType,
  type Plan,
  type PropertyType,
  type PropertyInput,
  type PropertyWithImages,
} from "@inmo/shared";
import { supabase } from "@/lib/supabase";

// Leaflet usa window: solo en cliente.
const MapPicker = dynamic(() => import("@/components/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-xl border border-zinc-300 text-sm text-zinc-500 dark:border-zinc-700">
      Cargando mapa…
    </div>
  ),
});

const input =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

const CATEGORY_ORDER: AmenityCategory[] = [
  "interiores",
  "zonas_comunes",
  "sector",
  "general",
];

export function PropertyForm({
  userId,
  initial,
  plan,
}: {
  userId: string;
  initial?: PropertyWithImages;
  plan?: Plan;
}) {
  const router = useRouter();
  const isEdit = !!initial;

  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    operation: (initial?.operation ?? "venta") as OperationType,
    type: (initial?.type ?? "apartamento") as PropertyType,
    price: initial ? String(initial.price) : "",
    admon_fee: initial?.admon_fee ? String(initial.admon_fee) : "",
    estrato: initial?.estrato ? String(initial.estrato) : "",
    bedrooms: initial ? String(initial.bedrooms) : "",
    bathrooms: initial ? String(initial.bathrooms) : "",
    parking_spots: initial ? String(initial.parking_spots) : "",
    area_m2: initial?.area_m2 ? String(initial.area_m2) : "",
    department: initial?.department ?? "",
    city: initial?.city ?? "",
    neighborhood: initial?.neighborhood ?? "",
    address: initial?.address ?? "",
    code: initial?.code ?? "",
  });
  const [existingImages, setExistingImages] = useState(
    initial?.property_images ?? [],
  );
  const [files, setFiles] = useState<File[]>([]);

  // Características
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<Set<number>>(
    new Set(initial?.property_amenities?.map((a) => a.amenity_id) ?? []),
  );

  // Lugares cercanos
  const [nearbyPlaces, setNearbyPlaces] = useState<string[]>(
    initial?.nearby_places ?? [],
  );
  const [nearbyInput, setNearbyInput] = useState("");

  // Ubicación en el mapa
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [placed, setPlaced] = useState(false);
  const [recenter, setRecenter] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const centerOnAddress = async () => {
    const q = [form.address, form.neighborhood, form.city]
      .filter(Boolean)
      .join(", ");
    const c = await geocodeAddress(q);
    if (c) {
      setRecenter(c);
      setCoords(c);
      setPlaced(true);
    } else {
      setError("No pudimos ubicar esa dirección. Mueve el mapa manualmente.");
    }
  };

  useEffect(() => {
    getAmenities(supabase)
      .then(setAmenities)
      .catch((e) => console.error(e));
  }, []);

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleAmenity = (id: number) =>
    setSelectedAmenities((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const addNearby = () => {
    const v = nearbyInput.trim();
    if (v && !nearbyPlaces.includes(v)) {
      setNearbyPlaces((p) => [...p, v]);
    }
    setNearbyInput("");
  };

  const removeExisting = async (imageId: string) => {
    try {
      await deletePropertyImage(supabase, imageId);
      setExistingImages((imgs) => imgs.filter((i) => i.id !== imageId));
    } catch (e: any) {
      setError(e.message ?? "No se pudo borrar la imagen.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const urls: string[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop() ?? "jpg";
        urls.push(await uploadPropertyImage(supabase, userId, file, ext));
      }

      const payload: PropertyInput = {
        title: form.title,
        description: form.description || null,
        operation: form.operation,
        type: form.type,
        status: "activo",
        price: Number(form.price),
        admon_fee: form.admon_fee ? Number(form.admon_fee) : 0,
        price_negotiable: false,
        estrato: form.estrato ? Number(form.estrato) : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : 0,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : 0,
        parking_spots: form.parking_spots ? Number(form.parking_spots) : 0,
        area_m2: form.area_m2 ? Number(form.area_m2) : null,
        built_area_m2: null,
        floor: null,
        age_years: null,
        department: form.department,
        city: form.city,
        neighborhood: form.neighborhood || null,
        address: form.address || null,
        nearby_places: nearbyPlaces,
        // Solo si el usuario lo escribió (si no, lo asigna la base).
        code: form.code.trim() || undefined,
      };

      // Ubicación en el mapa.
      if (placed && coords) {
        payload.latitude = coords.lat;
        payload.longitude = coords.lng;
      } else if (!isEdit) {
        // Sin pin: geocodificamos para que igual aparezca en el mapa.
        const c = await geocodeAddress(
          [form.address, form.neighborhood, form.city]
            .filter(Boolean)
            .join(", "),
        );
        if (c) {
          payload.latitude = c.lat;
          payload.longitude = c.lng;
        }
      }

      // Plan elegido (solo al crear): define destacado y vencimiento.
      if (!isEdit && plan) {
        const now = new Date();
        payload.plan = plan.id;
        payload.featured = plan.is_featured;
        payload.featured_at = plan.is_featured ? now.toISOString() : null;
        payload.expires_at = new Date(
          now.getTime() + plan.duration_days * 86400000,
        ).toISOString();
      }

      const amenityIds = Array.from(selectedAmenities);
      let id: string;
      if (isEdit) {
        await updateProperty(supabase, initial!.id, payload, urls, amenityIds);
        id = initial!.id;
      } else {
        id = await createProperty(supabase, userId, payload, urls, amenityIds);
      }
      router.push(`/inmueble/${id}`);
    } catch (err: any) {
      setError(err.message ?? "Ocurrió un error al guardar.");
      setSaving(false);
    }
  };

  const byCategory = (cat: AmenityCategory) =>
    amenities.filter((a) => a.category === cat);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Operación">
          <select
            value={form.operation}
            onChange={(e) => set("operation", e.target.value)}
            className={input}
          >
            {(["venta", "arriendo", "venta_arriendo"] as OperationType[]).map(
              (o) => (
                <option key={o} value={o}>
                  {OPERATION_LABELS[o]}
                </option>
              ),
            )}
          </select>
        </Labeled>
        <Labeled label="Tipo de inmueble">
          <select
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
            className={input}
          >
            {(Object.keys(TYPE_LABELS) as PropertyType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Labeled>
      </div>

      <Labeled label="Título del anuncio">
        <input
          required
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Ej. Apartamento amplio con vista en El Poblado"
          className={input}
        />
      </Labeled>

      <Labeled label="Descripción">
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={4}
          placeholder="Describe el inmueble, acabados, alrededores…"
          className={input}
        />
      </Labeled>

      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Precio (COP)">
          <input
            required
            type="number"
            value={form.price}
            onChange={(e) => set("price", e.target.value)}
            placeholder="350000000"
            className={input}
          />
        </Labeled>
        <Labeled label="Administración / mes (COP)">
          <input
            type="number"
            value={form.admon_fee}
            onChange={(e) => set("admon_fee", e.target.value)}
            placeholder="0"
            className={input}
          />
        </Labeled>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Labeled label="Estrato">
          <select
            value={form.estrato}
            onChange={(e) => set("estrato", e.target.value)}
            className={input}
          >
            <option value="">—</option>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Labeled>
        <Labeled label="Habitaciones">
          <input
            type="number"
            value={form.bedrooms}
            onChange={(e) => set("bedrooms", e.target.value)}
            className={input}
          />
        </Labeled>
        <Labeled label="Baños">
          <input
            type="number"
            value={form.bathrooms}
            onChange={(e) => set("bathrooms", e.target.value)}
            className={input}
          />
        </Labeled>
        <Labeled label="Parqueaderos">
          <input
            type="number"
            value={form.parking_spots}
            onChange={(e) => set("parking_spots", e.target.value)}
            className={input}
          />
        </Labeled>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Área (m²)">
          <input
            type="number"
            value={form.area_m2}
            onChange={(e) => set("area_m2", e.target.value)}
            className={input}
          />
        </Labeled>
        <Labeled label="Código (opcional)">
          <input
            value={form.code}
            onChange={(e) => set("code", e.target.value)}
            placeholder="Se asigna uno si lo dejas vacío"
            className={input}
          />
        </Labeled>
      </div>

      {/* Ubicación */}
      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Departamento">
          <select
            required
            value={form.department}
            onChange={(e) => set("department", e.target.value)}
            className={input}
          >
            <option value="">Selecciona…</option>
            {COLOMBIA_DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Labeled>
        <Labeled label="Ciudad">
          <Autocomplete
            value={form.city}
            onChange={(v) => set("city", v)}
            placeholder="Medellín"
            fetcher={(q) => searchCities(supabase, q)}
          />
        </Labeled>
        <Labeled label="Barrio">
          <Autocomplete
            value={form.neighborhood}
            onChange={(v) => set("neighborhood", v)}
            placeholder="El Poblado"
            fetcher={(q) => searchNeighborhoods(supabase, q, form.city)}
          />
        </Labeled>
        <Labeled label="Dirección">
          <input
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            className={input}
          />
        </Labeled>
      </div>

      {/* Ubicación en el mapa */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            Ubicación en el mapa
          </span>
          <button
            type="button"
            onClick={centerOnAddress}
            className="rounded-lg border border-emerald-700 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          >
            Centrar en mi dirección
          </button>
        </div>
        <MapPicker
          recenter={recenter}
          onChange={(lat, lng, fromUser) => {
            setCoords({ lat, lng });
            if (fromUser) setPlaced(true);
          }}
        />
        <p className="text-xs text-zinc-500">
          Mueve el mapa para que el pin verde quede sobre tu propiedad.
          {coords && placed
            ? " ✓ Ubicación marcada."
            : " (Aún sin marcar)"}
        </p>
      </div>

      {/* Características */}
      <div className="flex flex-col gap-3">
        <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Características del inmueble
        </p>
        {CATEGORY_ORDER.map((cat) => {
          const items = byCategory(cat);
          if (!items.length) return null;
          return (
            <div
              key={cat}
              className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <p className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {AMENITY_CATEGORY_LABELS[cat]}
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
                {items.map((a) => (
                  <label
                    key={a.id}
                    className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAmenities.has(a.id)}
                      onChange={() => toggleAmenity(a.id)}
                      className="h-4 w-4 shrink-0 accent-emerald-700"
                    />
                    <span>{a.name}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lugares cercanos */}
      <Labeled label="Lugares cercanos (centros comerciales, colegios, etc.)">
        <div className="flex gap-2">
          <input
            value={nearbyInput}
            onChange={(e) => setNearbyInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addNearby();
              }
            }}
            placeholder="Ej. Centro Comercial Santafé"
            className={`${input} flex-1`}
          />
          <button
            type="button"
            onClick={addNearby}
            className="rounded-lg bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Agregar
          </button>
        </div>
      </Labeled>
      {nearbyPlaces.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {nearbyPlaces.map((p) => (
            <span
              key={p}
              className="flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-sm dark:bg-zinc-800"
            >
              📍 {p}
              <button
                type="button"
                onClick={() =>
                  setNearbyPlaces((list) => list.filter((x) => x !== p))
                }
                className="text-zinc-400 hover:text-red-600"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Fotos existentes (en edición) */}
      {existingImages.length > 0 && (
        <div>
          <p className="mb-1 text-sm text-zinc-700 dark:text-zinc-300">
            Fotos actuales
          </p>
          <div className="flex flex-wrap gap-2">
            {existingImages.map((img) => (
              <div key={img.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt="foto"
                  className="h-20 w-20 rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeExisting(img.id)}
                  className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-red-600 text-xs text-white"
                  title="Eliminar foto"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Labeled
        label={
          isEdit ? "Agregar más fotos" : "Fotos (la primera será la portada)"
        }
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className={input}
        />
      </Labeled>
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={URL.createObjectURL(f)}
              alt={`foto ${i + 1}`}
              className="h-20 w-20 rounded-lg object-cover"
            />
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-emerald-700 py-3 font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
      >
        {saving
          ? "Guardando…"
          : isEdit
            ? "Guardar cambios"
            : "Publicar inmueble"}
      </button>
    </form>
  );
}

function Labeled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-700 dark:text-zinc-300">{label}</span>
      {children}
    </label>
  );
}

// Campo de texto con sugerencias (autocompletado).
function Autocomplete({
  value,
  onChange,
  placeholder,
  fetcher,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  fetcher: (q: string) => Promise<string[]>;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!value || value.length < 2) {
      setSuggestions([]);
      return;
    }
    let active = true;
    const t = setTimeout(() => {
      fetcher(value)
        .then((s) => active && setSuggestions(s.filter((x) => x !== value)))
        .catch(() => {});
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative">
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={`${input} w-full`}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {suggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => {
                  onChange(s);
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
