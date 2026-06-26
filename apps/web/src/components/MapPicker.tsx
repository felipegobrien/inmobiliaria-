"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Lee el centro del mapa cada vez que se mueve (paradigma "pin fijo en el centro").
function CenterWatcher({
  onChange,
}: {
  onChange: (lat: number, lng: number, fromUser: boolean) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      const c = map.getCenter();
      onChange(c.lat, c.lng, true);
    },
  });
  useEffect(() => {
    const c = map.getCenter();
    onChange(c.lat, c.lng, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// Recentra el mapa cuando cambian las coordenadas externas (p. ej. al geocodificar).
function Recenter({ center }: { center: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView([center.lat, center.lng], 16);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.lat, center?.lng]);
  return null;
}

export default function MapPicker({
  recenter,
  onChange,
}: {
  recenter: { lat: number; lng: number } | null;
  onChange: (lat: number, lng: number, fromUser: boolean) => void;
}) {
  const start = recenter ?? { lat: 4.711, lng: -74.0721 };
  return (
    <div className="relative h-64 w-full overflow-hidden rounded-xl border border-zinc-300 dark:border-zinc-700">
      <MapContainer
        center={[start.lat, start.lng]}
        zoom={16}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap"
        />
        <CenterWatcher onChange={onChange} />
        <Recenter center={recenter} />
      </MapContainer>

      {/* Pin fijo en el centro */}
      <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center">
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="#047857"
          style={{ transform: "translateY(-14px)" }}
        >
          <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1112 6a2.5 2.5 0 010 5.5z" />
        </svg>
      </div>
    </div>
  );
}
