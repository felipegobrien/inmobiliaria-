"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  getPropertiesInBounds,
  propertyPath,
  type MapPin,
} from "@inmo/shared";
import { supabase } from "@/lib/supabase";

// Precio abreviado para el pin: $1.5M, $850K…
function shortPrice(v: number): string {
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return `$${m >= 10 ? Math.round(m) : m.toFixed(1)}M`;
  }
  if (v >= 1_000) return `$${Math.round(v / 1000)}K`;
  return `$${v}`;
}

function pinIcon(p: MapPin): L.DivIcon {
  let bg = "#ffffff";
  let fg = "#18181b";
  let border = "#00000022";
  if (p.plan === "premium") {
    bg = "#33333A";
    fg = "#E8C66A";
    border = "#33333A";
  } else if (p.featured) {
    bg = "#F97316";
    fg = "#ffffff";
    border = "#F97316";
  }
  const html = `<div style="
    background:${bg};color:${fg};border:1px solid ${border};
    padding:4px 9px;border-radius:999px;font-weight:800;font-size:12px;
    white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.3);
    font-family:system-ui,sans-serif;">${shortPrice(p.price)}</div>`;
  return L.divIcon({
    html,
    className: "",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function BoundsWatcher({
  onChange,
}: {
  onChange: (b: L.LatLngBounds) => void;
}) {
  const map = useMapEvents({
    moveend: () => onChange(map.getBounds()),
  });
  const did = useRef(false);
  useEffect(() => {
    if (!did.current) {
      did.current = true;
      onChange(map.getBounds());
    }
  }, [map, onChange]);
  return null;
}

// Centra el mapa en la ubicación del usuario al abrir, y expone el botón.
function LocateControl({ initial }: { initial: boolean }) {
  const map = useMap();
  const tried = useRef(false);

  const locate = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 14),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [map]);

  useEffect(() => {
    if (initial && !tried.current) {
      tried.current = true;
      locate();
    }
  }, [initial, locate]);

  return (
    <button
      onClick={locate}
      title="Mi ubicación"
      className="absolute right-3 top-3 z-[1000] flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl shadow-lg hover:bg-zinc-100"
    >
      📍
    </button>
  );
}

export default function SearchMap() {
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<MapPin | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = useCallback((b: L.LatLngBounds) => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await getPropertiesInBounds(supabase, {
          minLng: b.getWest(),
          minLat: b.getSouth(),
          maxLng: b.getEast(),
          maxLat: b.getNorth(),
        });
        setPins(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 450);
  }, []);

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full">
      <MapContainer
        center={[4.711, -74.0721]}
        zoom={12}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />
        <BoundsWatcher onChange={query} />
        <LocateControl initial />
        {pins.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={pinIcon(p)}
            eventHandlers={{ click: () => setSelected(p) }}
          />
        ))}
      </MapContainer>

      {/* Contador / estado */}
      <div className="pointer-events-none absolute left-0 right-0 top-3 z-[1000] flex justify-center">
        <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-lg">
          {loading
            ? "Buscando en esta zona…"
            : `${pins.length} inmuebles en esta zona`}
        </span>
      </div>

      {/* Tarjeta del inmueble seleccionado */}
      {selected && (
        <div className="absolute bottom-4 left-1/2 z-[1000] w-[92%] max-w-md -translate-x-1/2">
          <a
            href={propertyPath(selected)}
            className="flex overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="h-28 w-32 shrink-0 bg-zinc-100">
              {selected.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.cover_url}
                  alt={selected.title}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="flex flex-1 flex-col justify-center p-3">
              <p className="truncate text-sm font-bold text-zinc-900">
                {selected.title}
              </p>
              <p className="text-lg font-extrabold text-zinc-900">
                {new Intl.NumberFormat("es-CO", {
                  style: "currency",
                  currency: "COP",
                  maximumFractionDigits: 0,
                }).format(selected.price)}
                {selected.operation !== "venta" && (
                  <span className="text-sm font-medium text-zinc-500">
                    {" "}
                    / mes
                  </span>
                )}
              </p>
              <p className="truncate text-sm text-zinc-500">
                {[selected.neighborhood, selected.city]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {selected.bedrooms} hab · {selected.bathrooms} baños
                {selected.area_m2 ? ` · ${selected.area_m2} m²` : ""}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                setSelected(null);
              }}
              className="px-2 text-zinc-400 hover:text-zinc-700"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </a>
        </div>
      )}
    </div>
  );
}
