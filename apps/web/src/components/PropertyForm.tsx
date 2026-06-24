"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createProperty,
  updateProperty,
  uploadPropertyImage,
  deletePropertyImage,
  OPERATION_LABELS,
  TYPE_LABELS,
  type OperationType,
  type PropertyType,
  type PropertyInput,
  type PropertyWithImages,
} from "@inmo/shared";
import { supabase } from "@/lib/supabase";

const input =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function PropertyForm({
  userId,
  initial,
}: {
  userId: string;
  initial?: PropertyWithImages;
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
  });
  const [existingImages, setExistingImages] = useState(
    initial?.property_images ?? [],
  );
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

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
      };

      let id: string;
      if (isEdit) {
        await updateProperty(supabase, initial!.id, payload, urls);
        id = initial!.id;
      } else {
        id = await createProperty(supabase, userId, payload, urls);
      }
      router.push(`/inmueble/${id}`);
    } catch (err: any) {
      setError(err.message ?? "Ocurrió un error al guardar.");
      setSaving(false);
    }
  };

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

      <Labeled label="Área (m²)">
        <input
          type="number"
          value={form.area_m2}
          onChange={(e) => set("area_m2", e.target.value)}
          className={input}
        />
      </Labeled>

      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Departamento">
          <input
            required
            value={form.department}
            onChange={(e) => set("department", e.target.value)}
            placeholder="Antioquia"
            className={input}
          />
        </Labeled>
        <Labeled label="Ciudad">
          <input
            required
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
            placeholder="Medellín"
            className={input}
          />
        </Labeled>
        <Labeled label="Barrio">
          <input
            value={form.neighborhood}
            onChange={(e) => set("neighborhood", e.target.value)}
            placeholder="El Poblado"
            className={input}
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
