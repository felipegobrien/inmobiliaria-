"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getMyPropertiesWithStats,
  getInquiries,
  getPlans,
  getSetting,
  republishProperty,
  setPropertyStatus,
  formatPrice,
  type Inquiry,
  type Plan,
  type PropertyWithImages,
} from "@inmo/shared";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { PropertyCard } from "@/components/PropertyCard";

type Item = PropertyWithImages & { contacts: number };

export default function MisInmueblesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [bancolombia, setBancolombia] = useState("");

  // Leads
  const [leadsFor, setLeadsFor] = useState<string | null>(null);
  const [leads, setLeads] = useState<Inquiry[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);

  // Republicar
  const [repProp, setRepProp] = useState<Item | null>(null);
  const [repPlan, setRepPlan] = useState<Plan | null>(null);
  const [repBusy, setRepBusy] = useState(false);

  const totalViews = items.reduce((s, p) => s + (p.views_count ?? 0), 0);
  const totalContacts = items.reduce((s, p) => s + p.contacts, 0);

  const reload = () => {
    if (!user) return;
    getMyPropertiesWithStats(supabase, user.id)
      .then(setItems)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
    if (user) {
      reload();
      getPlans(supabase).then(setPlans).catch(() => {});
      getSetting(supabase, "bancolombia_info")
        .then((v) => setBancolombia(v ?? ""))
        .catch(() => {});
    }
  }, [authLoading, user, router]); // eslint-disable-line

  const openLeads = async (id: string) => {
    setLeadsFor(id);
    setLeadsLoading(true);
    try {
      setLeads(await getInquiries(supabase, id));
    } catch {
      setLeads([]);
    } finally {
      setLeadsLoading(false);
    }
  };

  const startRepublish = (p: Item) => {
    setRepProp(p);
    setRepPlan(null);
  };

  const choosePlan = async (plan: Plan) => {
    if (plan.price > 0) {
      setRepPlan(plan); // pasa a paso de pago
      return;
    }
    await confirmRepublish(plan);
  };

  const confirmRepublish = async (plan: Plan) => {
    if (!repProp) return;
    setRepBusy(true);
    try {
      await republishProperty(supabase, repProp.id, plan);
      setRepProp(null);
      setRepPlan(null);
      reload();
    } catch (e: any) {
      alert(e?.message ?? "No se pudo republicar.");
    } finally {
      setRepBusy(false);
    }
  };

  const markClosed = async (p: Item) => {
    const isRent = p.operation === "arriendo";
    const status = isRent ? "arrendado" : "vendido";
    if (
      !confirm(
        `¿Marcar como ${isRent ? "arrendado" : "vendido"}? Dejará de mostrarse en las búsquedas.`,
      )
    )
      return;
    try {
      await setPropertyStatus(supabase, p.id, status);
      reload();
    } catch (e: any) {
      alert(e?.message ?? "Error");
    }
  };

  const reactivate = async (p: Item) => {
    try {
      await setPropertyStatus(supabase, p.id, "activo");
      reload();
    } catch (e: any) {
      alert(e?.message ?? "Error");
    }
  };

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
            {items.map((p) => {
              const exp = expiryInfo(p);
              const closed =
                p.status === "vendido" || p.status === "arrendado";
              return (
                <div
                  key={p.id}
                  className="flex flex-col rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <PropertyCard property={p} />
                  <div className="flex flex-col gap-2 border-t border-zinc-100 p-3 dark:border-zinc-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">
                        👁 {p.views_count ?? 0} · ✉ {p.contacts}
                      </span>
                      <span className={exp.cls}>{exp.text}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openLeads(p.id)}
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
                      >
                        Ver contactos
                      </button>
                      <button
                        onClick={() => startRepublish(p)}
                        className="rounded-lg border border-emerald-700 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                      >
                        Republicar
                      </button>
                      {closed ? (
                        <button
                          onClick={() => reactivate(p)}
                          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
                        >
                          Reactivar
                        </button>
                      ) : (
                        <button
                          onClick={() => markClosed(p)}
                          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800"
                        >
                          {p.operation === "arriendo"
                            ? "Marcar arrendado"
                            : "Marcar vendido"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal de leads */}
      {leadsFor && (
        <Modal onClose={() => setLeadsFor(null)} title="Contactos recibidos">
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
                      <a href={`mailto:${l.email}`} className="hover:underline">
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
        </Modal>
      )}

      {/* Modal de republicar */}
      {repProp && (
        <Modal
          onClose={() => {
            setRepProp(null);
            setRepPlan(null);
          }}
          title={repPlan ? `Pago · Plan ${repPlan.name}` : "Republicar inmueble"}
        >
          {!repPlan ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-zinc-500">
                Elige cómo republicar “{repProp.title}”:
              </p>
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  disabled={repBusy}
                  onClick={() => choosePlan(plan)}
                  className={`flex items-center justify-between rounded-xl border p-4 text-left disabled:opacity-50 ${
                    plan.is_featured
                      ? "border-amber-300"
                      : "border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  <span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {plan.is_featured ? "⭐ " : ""}
                      {plan.name}
                    </span>
                    <span className="block text-xs text-zinc-500">
                      {plan.duration_days} días
                    </span>
                  </span>
                  <span className="font-bold text-emerald-800 dark:text-emerald-400">
                    {plan.price === 0 ? "Gratis" : formatPrice(plan.price)}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:bg-amber-950/30">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  Plan {repPlan.name}
                </p>
                <p className="text-2xl font-extrabold text-amber-700">
                  {formatPrice(repPlan.price)}
                </p>
              </div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                Transferencia Bancolombia
              </p>
              <pre className="whitespace-pre-wrap rounded-xl border border-zinc-200 bg-white p-3 font-sans text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                {bancolombia || "Datos de pago no configurados."}
              </pre>
              <button
                disabled={repBusy}
                onClick={() => confirmRepublish(repPlan)}
                className="rounded-lg bg-emerald-700 py-3 font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {repBusy ? "Republicando…" : "Ya hice la transferencia, republicar"}
              </button>
              <button
                onClick={() => setRepPlan(null)}
                className="text-center text-sm text-zinc-500"
              >
                ← Volver a planes
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function expiryInfo(p: PropertyWithImages): { text: string; cls: string } {
  if (p.status === "vendido") return { text: "Vendido", cls: "text-emerald-700" };
  if (p.status === "arrendado")
    return { text: "Arrendado", cls: "text-emerald-700" };
  if (!p.expires_at) return { text: "Sin vencimiento", cls: "text-zinc-500" };
  const days = Math.ceil(
    (new Date(p.expires_at).getTime() - Date.now()) / 86400000,
  );
  if (days < 0) return { text: "Vencida", cls: "text-red-600" };
  if (days === 0) return { text: "Vence hoy", cls: "text-red-600" };
  return {
    text: `Vence en ${days} día${days === 1 ? "" : "s"}`,
    cls: days <= 5 ? "text-amber-600" : "text-zinc-500",
  };
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

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-t-2xl bg-white p-5 dark:bg-zinc-900 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
