"use client";

import dynamic from "next/dynamic";

// Leaflet usa window: cargar solo en cliente.
const PropertyMap = dynamic(() => import("@/components/PropertyMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 w-full items-center justify-center rounded-xl border border-zinc-200 text-sm text-zinc-500 dark:border-zinc-800">
      Cargando mapa…
    </div>
  ),
});

export default function PropertyMapClient(props: { lat: number; lng: number }) {
  return <PropertyMap {...props} />;
}
