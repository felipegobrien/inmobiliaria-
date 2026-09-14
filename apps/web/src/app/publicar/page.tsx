"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getPlans,
  getSetting,
  getProfile,
  isAgencyPromoActive,
  createProperty,
  uploadPropertyImage,
  formatPrice,
  type Plan,
} from "@inmo/shared";

const AGENCY_PLAN: Plan = {
  id: "destacado",
  name: "Inmobiliaria (gratis)",
  description: "Promo inmobiliaria: gratis y destacado.",
  price: 0,
  duration_days: 30,
  is_featured: true,
  sort: 0,
};
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { PropertyForm, type CollectedProperty } from "@/components/PropertyForm";

// Orden: intro → formulario → plan → pago → publicar
type Step = "intro" | "form" | "plan" | "pago";

export default function PublicarPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [bancolombia, setBancolombia] = useState("");
  const [step, setStep] = useState<Step>("intro");
  const [chosen, setChosen] = useState<Plan | null>(null);
  const [collected, setCollected] = useState<CollectedProperty | null>(null);
  const [agencyPromo, setAgencyPromo] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Evita doble publicación (doble clic): el estado no se actualiza a tiempo
  // entre clics, así que usamos una bandera inmediata.
  const publishingRef = useRef(false);

  useEffect(() => {
    // Ocultamos el plan premium por ahora (se puede reactivar luego).
    getPlans(supabase)
      .then((ps) => setPlans(ps.filter((p) => p.id !== "premium")))
      .catch(console.error);
    getSetting(supabase, "bancolombia_info")
      .then((v) => setBancolombia(v ?? ""))
      .catch(console.error);
    // Inmobiliaria con promo activa: publica gratis y destacado (sin elegir plan).
    if (user) {
      getProfile(supabase, user.id)
        .then((p) => {
          if (
            p?.role === "inmobiliaria" &&
            isAgencyPromoActive(p.agency_promo_until)
          ) {
            setAgencyPromo(true);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-full bg-zinc-50 dark:bg-black">
        <Header />
        <p className="p-10 text-center text-zinc-500">Cargando…</p>
      </div>
    );
  }

  // Al pulsar "Publicar" en el instructivo: si no hay sesión, pide login
  // (y vuelve aquí); si ya hay sesión, pasa a llenar el formulario.
  const startPublishing = () => {
    if (!user) {
      router.push("/login?redirect=/publicar");
    } else {
      setStep("form");
    }
  };

  // Publica de verdad: sube fotos, aplica el plan y crea el inmueble.
  const finalize = async (plan: Plan, data: CollectedProperty | null = collected) => {
    if (!data || !user) return;
    if (publishingRef.current) return; // ya se está publicando
    publishingRef.current = true;
    setPublishing(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (const file of data.files) {
        const ext = file.name.split(".").pop() ?? "jpg";
        urls.push(await uploadPropertyImage(supabase, user.id, file, ext));
      }
      const now = new Date();
      const payload = {
        ...data.payload,
        plan: plan.id,
        featured: plan.is_featured,
        featured_at: plan.is_featured ? now.toISOString() : null,
        expires_at: new Date(
          now.getTime() + plan.duration_days * 86400000,
        ).toISOString(),
      };
      const id = await createProperty(
        supabase,
        user.id,
        payload,
        urls,
        data.amenityIds,
      );
      router.push(`/inmueble/${id}`);
    } catch (err: any) {
      setError(err?.message ?? "No se pudo publicar. Intenta de nuevo.");
      setPublishing(false);
      publishingRef.current = false; // permite reintentar tras un error
    }
  };

  // Cuando el formulario entrega los datos: si es inmobiliaria con promo,
  // publica directo; si no, pasa a elegir plan.
  const handleCollected = (data: CollectedProperty) => {
    setCollected(data);
    if (agencyPromo) {
      finalize(AGENCY_PLAN, data);
    } else {
      setStep("plan");
    }
  };

  // Al elegir un plan: si es pago, va a la pantalla de pago; si es gratis, publica.
  const pickPlan = (p: Plan) => {
    setChosen(p);
    if (p.price > 0) setStep("pago");
    else finalize(p);
  };

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-8">
        {step === "intro" && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
            <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl dark:text-zinc-50">
              Publica tu inmueble en minutos
            </h1>
            <p className="mt-2 text-zinc-500">
              Así de fácil es publicar en{" "}
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                Ercada
              </span>
              :
            </p>

            <ol className="mt-6 flex flex-col gap-4">
              {[
                {
                  t: "Completa los datos",
                  d: "Tipo, precio, ubicación, habitaciones, baños y características.",
                },
                {
                  t: "Sube fotos",
                  d: "Agrega buenas fotos: son lo que más atrae a los interesados.",
                },
                {
                  t: "Elige cómo publicar",
                  d: "Al final eliges tu plan: publica gratis o destaca tu inmueble.",
                },
                {
                  t: "¡Publica!",
                  d: "Tu inmueble queda visible y los interesados te contactan directo.",
                },
              ].map((s, i) => (
                <li key={i} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {s.t}
                    </p>
                    <p className="text-sm text-zinc-500">{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>

            <button
              onClick={startPublishing}
              className="mt-8 w-full rounded-xl bg-emerald-700 py-4 text-lg font-semibold text-white transition hover:bg-emerald-800"
            >
              Publicar inmueble
            </button>
            <p className="mt-3 text-center text-xs text-zinc-400">
              {user
                ? "Primero completas los datos; al final eliges el plan."
                : "Te pediremos iniciar sesión para continuar."}
            </p>
          </div>
        )}

        {step === "form" && user && (
          <>
            <h1 className="mb-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Datos del inmueble
            </h1>
            <p className="mb-6 text-zinc-500">
              Completa la información y las fotos. Al final eliges cómo publicar.
            </p>
            <PropertyForm
              userId={user.id}
              collectMode
              onCollect={handleCollected}
              submitLabel={
                agencyPromo ? "Publicar (gratis)" : "Continuar a elegir plan"
              }
            />
            {publishing && (
              <p className="mt-4 text-center text-sm text-zinc-500">
                Publicando…
              </p>
            )}
            {error && (
              <p className="mt-4 text-center text-sm text-red-600">{error}</p>
            )}
          </>
        )}

        {step === "plan" && (
          <>
            <button
              onClick={() => setStep("form")}
              className="mb-3 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              ← Volver a los datos
            </button>
            <h1 className="mb-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Elige cómo publicar
            </h1>
            <p className="mb-6 text-zinc-500">
              Selecciona un plan para publicar tu inmueble.
            </p>
            <div className="flex flex-col gap-4">
              {plans.map((p) => (
                <div
                  key={p.id}
                  className={`rounded-2xl border bg-white p-6 dark:bg-zinc-900 ${
                    p.is_featured
                      ? "border-2 border-amber-300"
                      : "border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {p.is_featured ? "⭐" : "✓"}
                    </span>
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                      {p.name}
                    </h2>
                  </div>
                  <p
                    className={`mt-2 text-2xl font-extrabold ${
                      p.is_featured
                        ? "text-amber-700"
                        : "text-emerald-800 dark:text-emerald-400"
                    }`}
                  >
                    {p.price === 0 ? "Gratis" : formatPrice(p.price)}
                  </p>
                  <p className="text-sm text-zinc-500">
                    por {p.duration_days} días
                  </p>
                  {p.description && (
                    <p className="mt-2 text-sm text-zinc-500">{p.description}</p>
                  )}
                  <button
                    onClick={() => pickPlan(p)}
                    disabled={publishing}
                    className={`mt-4 w-full rounded-lg py-3 font-medium text-white disabled:opacity-50 ${
                      p.is_featured
                        ? "bg-amber-600 hover:bg-amber-700"
                        : "bg-emerald-700 hover:bg-emerald-800"
                    }`}
                  >
                    {publishing
                      ? "Publicando…"
                      : p.price === 0
                        ? "Publicar gratis"
                        : `Elegir ${p.name}`}
                  </button>
                </div>
              ))}
            </div>
            {publishing && (
              <p className="mt-4 text-center text-sm text-zinc-500">
                Publicando…
              </p>
            )}
            {error && (
              <p className="mt-4 text-center text-sm text-red-600">{error}</p>
            )}
          </>
        )}

        {step === "pago" && chosen && (
          <>
            <h1 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Pago del plan {chosen.name}
            </h1>
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 dark:bg-amber-950/30">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                Plan {chosen.name}
              </p>
              <p className="text-3xl font-extrabold text-amber-700">
                {formatPrice(chosen.price)}
              </p>
            </div>
            <h2 className="mt-6 mb-2 font-semibold text-zinc-900 dark:text-zinc-50">
              Transferencia Bancolombia
            </h2>
            <pre className="whitespace-pre-wrap rounded-xl border border-zinc-200 bg-white p-4 font-sans text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              {bancolombia || "Datos de pago no configurados."}
            </pre>
            <button
              onClick={() => finalize(chosen)}
              disabled={publishing}
              className="mt-5 w-full rounded-lg bg-emerald-700 py-3 font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {publishing ? "Publicando…" : "Ya hice la transferencia, publicar"}
            </button>
            <button
              onClick={() => setStep("plan")}
              className="mt-2 w-full py-2 text-center text-sm text-zinc-500"
            >
              ← Volver a planes
            </button>
            {error && (
              <p className="mt-2 text-center text-sm text-red-600">{error}</p>
            )}
            <p className="mt-2 text-center text-xs text-zinc-400">
              Guarda el comprobante por si el administrador lo solicita.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
