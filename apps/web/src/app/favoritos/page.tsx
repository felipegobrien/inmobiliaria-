"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getFavorites, type PropertyWithImages } from "@inmo/shared";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useFavorites } from "@/lib/favorites";
import { Header } from "@/components/Header";
import { PropertyCard } from "@/components/PropertyCard";

export default function FavoritosPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { ids } = useFavorites();
  const [items, setItems] = useState<PropertyWithImages[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
    if (user) {
      getFavorites(supabase, user.id)
        .then(setItems)
        .finally(() => setLoading(false));
    }
    // Recargar cuando cambien los ids (al quitar un favorito).
  }, [authLoading, user, router, ids]);

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Mis favoritos
        </h1>

        {loading ? (
          <p className="text-zinc-500">Cargando…</p>
        ) : items.filter((p) => ids.has(p.id)).length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center text-zinc-500 dark:border-zinc-700">
            Aún no tienes favoritos. Explora inmuebles y toca el corazón ♥ para
            guardarlos.{" "}
            <Link href="/" className="font-semibold text-emerald-800">
              Ver inmuebles
            </Link>
            .
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items
              .filter((p) => ids.has(p.id))
              .map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
          </div>
        )}
      </main>
    </div>
  );
}
