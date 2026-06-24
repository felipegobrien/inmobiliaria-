"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getMyProperties, type PropertyWithImages } from "@inmo/shared";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { PropertyCard } from "@/components/PropertyCard";

export default function MisInmueblesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<PropertyWithImages[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
    if (user) {
      getMyProperties(supabase, user.id)
        .then(setItems)
        .finally(() => setLoading(false));
    }
  }, [authLoading, user, router]);

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Mis inmuebles
          </h1>
          <Link
            href="/publicar"
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            + Publicar
          </Link>
        </div>

        {loading ? (
          <p className="text-zinc-500">Cargando…</p>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center text-zinc-500 dark:border-zinc-700">
            Aún no has publicado inmuebles.{" "}
            <Link href="/publicar" className="font-semibold text-emerald-800">
              Publica el primero
            </Link>
            .
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <div key={p.id} className="relative">
                <span className="absolute right-2 top-2 z-10 rounded-full bg-zinc-900/70 px-2 py-1 text-xs font-medium text-white">
                  {p.status}
                </span>
                <PropertyCard property={p} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
