import Link from "next/link";
import {
  formatPrice,
  OPERATION_LABELS,
  TYPE_LABELS,
  type PropertyWithImages,
} from "@inmo/shared";
import { FavoriteButton } from "./FavoriteButton";

export function PropertyCard({ property }: { property: PropertyWithImages }) {
  const cover =
    property.property_images?.find((i) => i.is_cover)?.url ??
    property.property_images?.[0]?.url;

  return (
    <Link
      href={`/inmueble/${property.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="relative aspect-[4/3] w-full bg-zinc-100 dark:bg-zinc-800">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={property.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-400">
            Sin foto
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold text-white">
          {OPERATION_LABELS[property.operation]}
        </span>
        <FavoriteButton
          propertyId={property.id}
          className="absolute right-3 top-3"
        />
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-lg font-bold text-emerald-800 dark:text-emerald-400">
          {formatPrice(property.price)}
          {property.operation !== "venta" && (
            <span className="text-sm font-normal text-zinc-500">/mes</span>
          )}
        </p>
        <h3 className="line-clamp-1 font-semibold text-zinc-900 dark:text-zinc-50">
          {property.title}
        </h3>
        <p className="line-clamp-1 text-sm text-zinc-500">
          {[property.neighborhood, property.city].filter(Boolean).join(", ")}
        </p>

        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
          <span>{TYPE_LABELS[property.type]}</span>
          <span>· {property.bedrooms} hab</span>
          <span>· {property.bathrooms} baños</span>
          {property.area_m2 != null && <span>· {property.area_m2} m²</span>}
          {property.estrato != null && <span>· Estrato {property.estrato}</span>}
        </div>
      </div>
    </Link>
  );
}
