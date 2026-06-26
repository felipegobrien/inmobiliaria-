"use client";

import dynamic from "next/dynamic";
import { Header } from "@/components/Header";

// Leaflet usa window: solo en cliente.
const SearchMap = dynamic(() => import("@/components/SearchMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center text-zinc-500">
      Cargando mapa…
    </div>
  ),
});

export default function MapaPage() {
  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <Header />
      <SearchMap />
    </div>
  );
}
