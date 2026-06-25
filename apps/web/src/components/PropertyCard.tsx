import Link from "next/link";
import {
  formatPrice,
  propertyPath,
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
      href={propertyPath(property)}
      className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="relative aspect-[4/3] w-full bg-zinc-100 dark:bg-zinc-800">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={property.title}
            className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-400">
            Sin foto
          </div>
        )}
        {property.featured ? (
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-amber-800 shadow">
            <StarIcon /> Destacado
          </span>
        ) : (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-emerald-800 shadow">
            {OPERATION_LABELS[property.operation]}
          </span>
        )}
        <FavoriteButton
          propertyId={property.id}
          className="absolute right-3 top-3"
        />
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          {formatPrice(property.price)}
          {property.operation !== "venta" && (
            <span className="text-sm font-normal text-zinc-500">/mes</span>
          )}
        </p>
        <p className="line-clamp-1 text-sm text-zinc-500">
          {[property.neighborhood, property.city].filter(Boolean).join(", ")}
        </p>

        {/* Specs con iconos */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-700 dark:text-zinc-300">
          <Spec icon={<BedIcon />} text={`${property.bedrooms} Habs.`} />
          <Spec
            icon={<BathIcon />}
            text={`${property.bathrooms} Baño${property.bathrooms === 1 ? "" : "s"}`}
          />
          {property.area_m2 != null && (
            <Spec icon={<AreaIcon />} text={`${property.area_m2} m²`} />
          )}
        </div>

        <h3 className="mt-2 line-clamp-2 font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
          {property.title}
        </h3>
        {property.description && (
          <p className="line-clamp-2 text-sm text-zinc-500">
            {property.description}
          </p>
        )}
      </div>
    </Link>
  );
}

function Spec({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-zinc-400">{icon}</span>
      {text}
    </span>
  );
}

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function BedIcon() {
  return (
    <svg {...iconProps}>
      <path d="M2 9v11M2 13h20a2 2 0 0 1 2 2v5M22 20v-5" />
      <path d="M6 13V9a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4" />
    </svg>
  );
}

function BathIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 12V6a2 2 0 0 1 3.4-1.4l.6.6" />
      <path d="M3 12h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3z" />
      <path d="M7 19l-1 2M18 19l1 2" />
      <circle cx="8" cy="7" r="1.2" />
    </svg>
  );
}

function AreaIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 5h18v14H3z" />
      <path d="M7 5v3M11 5v5M15 5v3M19 5v5" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="#d97706">
      <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.8 20.9l1.6-6.8L2.2 8.9l6.9-.6z" />
    </svg>
  );
}
