"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { type PropertyWithImages } from "@inmo/shared";
import { supabase } from "@/lib/supabase";
import { getPropertyBySlug } from "@/lib/listings";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { PropertyForm } from "@/components/PropertyForm";

export default function EditarInmueblePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [property, setProperty] = useState<PropertyWithImages | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
    if (user) {
      getPropertyBySlug(supabase, slug)
        .then(setProperty)
        .finally(() => setLoading(false));
    }
  }, [authLoading, user, slug, router]);

  if (loading || authLoading) {
    return (
      <div className="min-h-full bg-zinc-50 dark:bg-black">
        <Header />
        <p className="p-10 text-center text-zinc-500">Cargando…</p>
      </div>
    );
  }

  // Solo el dueño puede editar.
  if (!property || property.owner_id !== user?.id) {
    return (
      <div className="min-h-full bg-zinc-50 dark:bg-black">
        <Header />
        <p className="p-10 text-center text-zinc-500">
          No tienes permiso para editar este inmueble.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Editar inmueble
        </h1>
        <PropertyForm userId={user!.id} initial={property} />
      </main>
    </div>
  );
}
