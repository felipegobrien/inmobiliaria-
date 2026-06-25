"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getMyPropertiesWithStats,
  getInquiries,
  type Inquiry,
  type PropertyWithImages,
} from "@inmo/shared";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { PropertyCard } from "@/components/PropertyCard";

export default function MisInmueblesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<
    (PropertyWithImages & { contacts: number })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [leadsFor, setLeadsFor] = useState<string | null>(null);
  const [leads, setLeads] = useState<Inquiry[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);

  const totalViews = items.reduce((s, p) => s + (p.views_count ?? 0), 0);
  const totalContacts = items.reduce((s, p) => s + p.contacts, 0);

  const openLeads = async (propertyId: string) => {
    setLeadsFor(propertyId);
    setLeadsLoading(true);
    try {
      setLeads(await getInquiries(supabase, propertyId));
    } catch {
      setLeads([]);
    } finally {
      setLeadsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
    if (user) {
      getMyPropertiesWithStats(supabase, user.id)
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

        {!loading && items.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Metric label="Inmuebles" value={items.length} />
            <Metric label="Vistas totales" value={totalViews} />
            <Metric label="Contactos recibidos" value={totalContacts} />
          </div>
        )}

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
                <div className="mt-1 flex items-center gap-4 px-1 text-xs text-zinc-500">
                  <span>👁 {p.views_count ?? 0} vistas</span>
                  <span>✉ {p.contacts} contactos</span>
                  <button
                    onClick={() => openLeads(p.id)}
                    className="ml-auto font-medium text-emerald-700 hover:underline"
                  >
                    Ver contactos
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {leadsFor && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setLeadsFor(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-t-2xl bg-white p-5 dark:bg-zinc-900 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Contactos recibidos
              </h2>
              <button
                onClick={() => setLeadsFor(null)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                ✕
              </button>
            </div>
            {leadsLoading ? (
              <p className="text-zinc-500">Cargando…</p>
            ) : leads.length === 0 ? (
              <p className="py-8 text-center text-zinc-500">
                Aún no tienes contactos en este inmueble.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {leads.map((l) => (
                  <div
                    key={l.id}
                    className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
                  >
                    <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {l.name}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-4 text-sm text-zinc-600 dark:text-zinc-400">
                      {l.phone && (
                        <a href={`tel:${l.phone}`} className="hover:underline">
                          📞 {l.phone}
                        </a>
                      )}
                      {l.email && (
                        <a
                          href={`mailto:${l.email}`}
                          className="hover:underline"
                        >
                          ✉️ {l.email}
                        </a>
                      )}
                    </div>
                    {l.message && (
                      <p className="mt-1 text-sm text-zinc-500">{l.message}</p>
                    )}
                    <p className="mt-1 text-xs text-zinc-400">
                      {new Date(l.created_at).toLocaleString("es-CO")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-400">
        {value}
      </p>
      <p className="text-sm text-zinc-500">{label}</p>
    </div>
  );
}
