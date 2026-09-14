"use client";

import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Marcador verde (SVG) para no depender de los assets por defecto de Leaflet.
const pinIcon = L.divIcon({
  className: "",
  html: `<svg width="34" height="34" viewBox="0 0 24 24" fill="#047857" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1112 6a2.5 2.5 0 010 5.5z"/>
  </svg>`,
  iconSize: [34, 34],
  iconAnchor: [17, 32],
});

export default function PropertyMap({
  lat,
  lng,
}: {
  lat: number;
  lng: number;
}) {
  return (
    <div className="h-64 w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <MapContainer
        center={[lat, lng]}
        zoom={16}
        className="h-full w-full"
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap &copy; CARTO"
        />
        <Marker position={[lat, lng]} icon={pinIcon} />
      </MapContainer>
    </div>
  );
}
