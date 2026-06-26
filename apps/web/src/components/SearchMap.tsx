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
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import {
  getPropertiesInBounds,
  propertyPath,
  TYPE_LABELS,
  type MapPin,
  type PropertyType,
} from "@inmo/shared";
import { supabase } from "@/lib/supabase";

// Etiqueta tipo "Arriendo casa en El Poblado" / "Venta apartamento en Laureles".
function pinLabel(p: MapPin): string {
  const op =
    p.operation === "arriendo"
      ? "Arriendo"
      : p.operation === "venta_arriendo"
        ? "Venta y arriendo"
        : "Venta";
  const t = (TYPE_LABELS[p.type as PropertyType] ?? p.type).toLowerCase();
  const place = p.neighborhood && p.neighborhood.length ? p.neighborhood : p.city;
  return `${op} ${t} en ${place}`;
}

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
  const star =
    p.plan === "premium"
      ? `<span style="color:#E8C66A;margin-right:3px;">★</span>`
      : "";
  const html = `<div style="
    background:${bg};color:${fg};border:1px solid ${border};
    padding:4px 9px;border-radius:999px;font-weight:800;font-size:12px;
    white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.3);
    font-family:system-ui,sans-serif;display:flex;align-items:center;
    justify-content:center;text-align:center;">${star}${shortPrice(p.price)}</div>`;
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
function LocateControl({
  initial,
  onUser,
}: {
  initial: boolean;
  onUser: (pos: [number, number]) => void;
}) {
  const map = useMap();
  const tried = useRef(false);

  const locate = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ll: [number, number] = [
          pos.coords.latitude,
          pos.coords.longitude,
        ];
        map.setView(ll, 16);
        onUser(ll);
      },
      () => {},
      // rápido: permite posición en caché y no fuerza GPS de alta precisión
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  }, [map, onUser]);

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

// Capa con agrupación de pines (clusters) usando leaflet.markercluster.
function ClusterLayer({
  pins,
  onSelect,
}: {
  pins: MapPin[];
  onSelect: (p: MapPin) => void;
}) {
  const map = useMap();
  const groupRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    const group = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 55,
      iconCreateFunction: (cluster) =>
        L.divIcon({
          html: `<div style="
            background:#047857;color:#fff;border:2px solid #fff;
            width:40px;height:40px;border-radius:999px;
            display:flex;align-items:center;justify-content:center;
            font-weight:800;font-size:14px;font-family:system-ui,sans-serif;
            box-shadow:0 2px 6px rgba(0,0,0,.3);">${cluster.getChildCount()}</div>`,
          className: "",
          iconSize: [40, 40],
        }),
    });
    groupRef.current = group;
    map.addLayer(group);
    return () => {
      map.removeLayer(group);
      groupRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.clearLayers();
    for (const p of pins) {
      const m = L.marker([p.lat, p.lng], { icon: pinIcon(p) });
      m.on("click", () => onSelect(p));
      group.addLayer(m);
    }
  }, [pins, onSelect]);

  return null;
}

export default function SearchMap() {
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<MapPin | null>(null);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userIcon = L.divIcon({
    html: `<div style="width:18px;height:18px;border-radius:999px;
      background:#1A73E8;border:3px solid #fff;
      box-shadow:0 0 0 1px rgba(0,0,0,.2),0 2px 4px rgba(0,0,0,.3);"></div>`,
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

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
          limit: 300,
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
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap &copy; CARTO"
        />
        <BoundsWatcher onChange={query} />
        <LocateControl initial onUser={setUserPos} />
        <ClusterLayer pins={pins} onSelect={setSelected} />
        {userPos && <Marker position={userPos} icon={userIcon} />}
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
                {pinLabel(selected)}
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
