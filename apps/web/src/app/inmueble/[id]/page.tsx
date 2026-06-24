"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getProperty,
  deleteProperty,
  formatPrice,
  OPERATION_LABELS,
  TYPE_LABELS,
  type PropertyWithImages,
} from "@inmo/shared";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { FavoriteButton } from "@/components/FavoriteButton";

export default function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [property, setProperty] = useState<PropertyWithImages | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImg, setActiveImg] = useState(0);

  const handleDelete = async () => {
    if (!confirm("¿Seguro que quieres eliminar este inmueble? No se puede deshacer.")) {
      return;
    }
    try {
      await deleteProperty(supabase, id);
      router.push("/mis-inmuebles");
    } catch (e: any) {
      alert(e?.message ?? "No se pudo eliminar.");
    }
  };

  useEffect(() => {
    getProperty(supabase, id)
      .then(setProperty)
      .catch((e) => setError(e?.message ?? "No se pudo cargar el inmueble."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-full bg-zinc-50 dark:bg-black">
        <Header />
        <p className="p-10 text-center text-zinc-500">Cargando…</p>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-full bg-zinc-50 dark:bg-black">
        <Header />
        <p className="p-10 text-center text-zinc-500">
          {error ?? "Este inmueble no existe o no está disponible."}
        </p>
      </div>
    );
  }

  const images = property.property_images ?? [];
  const cover = images[activeImg]?.url ?? images[0]?.url;
  const owner = property.owner;
  const isOwner = user?.id === property.owner_id;
  const wppNumber = owner?.whatsapp ?? owner?.phone;
  const wppMsg = encodeURIComponent(
    `Hola, estoy interesado en tu inmueble "${property.title}" publicado en el portal.`,
  );

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Controles del dueño */}
        {isOwner && (
          <div className="mb-4 flex gap-2">
            <Link
              href={`/inmueble/${id}/editar`}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Editar
            </Link>
            <button
              onClick={handleDelete}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
            >
              Eliminar
            </button>
          </div>
        )}

        {/* Galería */}
        <div className="overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={property.title}
              className="aspect-video w-full object-cover"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center text-zinc-400">
              Sin fotos
            </div>
          )}
        </div>
        {images.length > 1 && (
          <div className="mt-2 flex gap-2 overflow-x-auto">
            {images.map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                src={img.url}
                alt={`foto ${i + 1}`}
                onClick={() => setActiveImg(i)}
                className={`h-20 w-28 cursor-pointer rounded-lg object-cover ${
                  i === activeImg ? "ring-2 ring-emerald-700" : ""
                }`}
              />
            ))}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold text-white">
                {OPERATION_LABELS[property.operation]}
              </span>
              <FavoriteButton propertyId={property.id} />
            </div>
            <h1 className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {property.title}
            </h1>
            <p className="text-zinc-500">
              {[property.neighborhood, property.city, property.department]
                .filter(Boolean)
                .join(", ")}
            </p>

            <p className="mt-4 text-3xl font-bold text-emerald-800 dark:text-emerald-400">
              {formatPrice(property.price)}
              {property.operation !== "venta" && (
                <span className="text-base font-normal text-zinc-500">/mes</span>
              )}
            </p>
            {!!property.admon_fee && (
              <p className="text-sm text-zinc-500">
                + Administración {formatPrice(property.admon_fee)}/mes
              </p>
            )}

            {/* Características */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Tipo" value={TYPE_LABELS[property.type]} />
              <Stat label="Habitaciones" value={property.bedrooms} />
              <Stat label="Baños" value={property.bathrooms} />
              <Stat label="Parqueaderos" value={property.parking_spots} />
              {property.area_m2 != null && (
                <Stat label="Área" value={`${property.area_m2} m²`} />
              )}
              {property.estrato != null && (
                <Stat label="Estrato" value={property.estrato} />
              )}
            </div>

            {property.description && (
              <div className="mt-6">
                <h2 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">
                  Descripción
                </h2>
                <p className="whitespace-pre-line text-zinc-600 dark:text-zinc-400">
                  {property.description}
                </p>
              </div>
            )}
          </div>

          {/* Contacto */}
          <aside className="h-fit rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
              Contactar al anunciante
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              {owner?.full_name ?? "Anunciante"}
              {owner?.company ? ` · ${owner.company}` : ""}
            </p>

            {wppNumber ? (
              <a
                href={`https://wa.me/57${wppNumber.replace(/\D/g, "")}?text=${wppMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block rounded-lg bg-emerald-700 py-3 text-center font-medium text-white hover:bg-emerald-800"
              >
                Escribir por WhatsApp
              </a>
            ) : (
              <p className="mt-4 text-sm text-zinc-400">
                El anunciante no registró teléfono de contacto.
              </p>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="font-semibold text-zinc-900 dark:text-zinc-50">{value}</p>
    </div>
  );
}
