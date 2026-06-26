import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAmenities,
  propertyPath,
  formatPrice,
  OPERATION_LABELS,
  TYPE_LABELS,
  AMENITY_CATEGORY_LABELS,
  type Amenity,
  type AmenityCategory,
  type PropertyWithImages,
} from "@inmo/shared";
import { getServerSupabase, SITE_URL } from "@/lib/supabase-server";
import { getPropertyBySlug } from "@/lib/listings";
import { Header } from "@/components/Header";
import { Gallery } from "@/components/Gallery";
import { FavoriteButton } from "@/components/FavoriteButton";
import { OwnerActions } from "@/components/OwnerActions";
import { ContactPanel } from "@/components/ContactPanel";
import { ReportButton } from "@/components/ReportButton";
import { ShareButton } from "@/components/ShareButton";

export const revalidate = 60; // re-genera cada minuto

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = getServerSupabase();
  const p = await getPropertyBySlug(supabase, slug).catch(() => null);
  if (!p) return { title: "Inmueble no encontrado" };

  const op =
    p.operation === "arriendo" ? "en arriendo" : "en venta";
  const ubic = [p.neighborhood, p.city].filter(Boolean).join(", ");
  const title = `${TYPE_LABELS[p.type]} ${op} en ${p.city} · ${formatPrice(p.price)}`;
  const description =
    p.description?.slice(0, 155) ||
    `${TYPE_LABELS[p.type]} ${op} en ${ubic}. ${p.bedrooms} habitaciones, ${p.bathrooms} baños${p.area_m2 ? `, ${p.area_m2} m²` : ""}.`;
  const cover =
    p.property_images?.find((i) => i.is_cover)?.url ??
    p.property_images?.[0]?.url;
  const path = propertyPath(p);

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${path}`,
      type: "website",
      images: cover ? [{ url: cover }] : undefined,
    },
  };
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = getServerSupabase();
  const [property, amenities] = await Promise.all([
    getPropertyBySlug(supabase, slug).catch(() => null),
    getAmenities(supabase).catch(() => [] as Amenity[]),
  ]);

  if (!property) notFound();

  const owner = property.owner;
  const wppNumber = owner?.whatsapp ?? owner?.phone;
  const path = propertyPath(property);
  const cover =
    property.property_images?.find((i) => i.is_cover)?.url ??
    property.property_images?.[0]?.url;

  // Datos estructurados para Google
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.title,
    description: property.description ?? undefined,
    url: `${SITE_URL}${path}`,
    image: cover ? [cover] : undefined,
    datePosted: property.published_at ?? undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: property.city,
      addressRegion: property.department,
      streetAddress: property.neighborhood ?? undefined,
      addressCountry: "CO",
    },
    offers: {
      "@type": "Offer",
      price: property.price,
      priceCurrency: "COP",
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <OwnerActions
          id={property.id}
          ownerId={property.owner_id}
          editHref={`${path}/editar`}
        />

        <Gallery images={property.property_images ?? []} title={property.title} />

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {property.featured && (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                    ★ Destacado
                  </span>
                )}
                <span className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold text-white">
                  {OPERATION_LABELS[property.operation]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ShareButton title={property.title} />
                <FavoriteButton propertyId={property.id} />
              </div>
            </div>

            <h1 className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {property.title}
            </h1>
            <p className="text-zinc-500">
              {[property.neighborhood, property.city, property.department]
                .filter(Boolean)
                .join(", ")}
            </p>
            {property.published_at && (
              <p className="mt-1 text-xs text-zinc-400">
                Publicado el{" "}
                {new Date(property.published_at).toLocaleDateString("es-CO", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}{" "}
                · Cód. {property.code ?? property.ref}
              </p>
            )}
            {owner?.role === "inmobiliaria" && owner.company && (
              <a
                href={`/inmobiliaria/${owner.agency_slug ?? owner.id}`}
                className="mt-3 flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/40"
              >
                <span className="flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-white">
                  {owner.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={owner.avatar_url}
                      alt={owner.company ?? ""}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-emerald-700">🏠</span>
                  )}
                </span>
                <span className="flex-1 text-base font-semibold capitalize text-emerald-800">
                  {owner.company}
                </span>
                <span className="text-xs text-emerald-700">Ver →</span>
              </a>
            )}

            <p className="mt-4 text-3xl font-bold text-emerald-800 dark:text-emerald-400">
              {formatPrice(property.price)}
              {property.operation !== "venta" && (
                <span className="text-base font-normal text-zinc-500">{" / mes"}</span>
              )}
            </p>
            {!!property.admon_fee && (
              <p className="text-sm text-zinc-500">
                + Administración {formatPrice(property.admon_fee)}/mes
              </p>
            )}

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

            <CharacteristicsView property={property} amenities={amenities} />

            {property.nearby_places?.length > 0 && (
              <div className="mt-6">
                <h2 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">
                  Lugares cercanos
                </h2>
                <div className="flex flex-wrap gap-2">
                  {property.nearby_places.map((p) => (
                    <span
                      key={p}
                      className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      📍 {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <ReportButton propertyId={property.id} />
          </div>

          <ContactPanel
            propertyId={property.id}
            title={property.title}
            ownerName={owner?.full_name ?? "Anunciante"}
            company={owner?.company}
            contactNumber={wppNumber}
          />
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

const CAT_ORDER: AmenityCategory[] = [
  "interiores",
  "zonas_comunes",
  "sector",
  "general",
];

function CharacteristicsView({
  property,
  amenities,
}: {
  property: PropertyWithImages;
  amenities: Amenity[];
}) {
  const selectedIds = new Set(
    property.property_amenities?.map((a) => a.amenity_id) ?? [],
  );
  const selected = amenities.filter((a) => selectedIds.has(a.id));
  if (selected.length === 0) return null;

  return (
    <div className="mt-6">
      <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-50">
        Características del inmueble
      </h2>
      <div className="flex flex-col gap-4">
        {CAT_ORDER.map((cat) => {
          const items = selected.filter((a) => a.category === cat);
          if (!items.length) return null;
          return (
            <div key={cat}>
              <p className="mb-2 text-sm font-medium text-zinc-500">
                {AMENITY_CATEGORY_LABELS[cat]}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {items.map((a) => (
                  <span
                    key={a.id}
                    className="flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  >
                    ✓ {a.name}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
