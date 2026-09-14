"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getPlans,
  getSetting,
  getProfile,
  isAgencyPromoActive,
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
import { PropertyForm } from "@/components/PropertyForm";

type Step = "intro" | "plan" | "pago" | "form";

export default function PublicarPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [bancolombia, setBancolombia] = useState("");
  const [step, setStep] = useState<Step>("intro");
  const [chosen, setChosen] = useState<Plan | null>(null);

  useEffect(() => {
    getPlans(supabase).then(setPlans).catch(console.error);
    getSetting(supabase, "bancolombia_info")
      .then((v) => setBancolombia(v ?? ""))
      .catch(console.error);
    // Inmobiliaria con promo activa: publica gratis y destacado.
    if (user) {
      getProfile(supabase, user.id)
        .then((p) => {
          if (
            p?.role === "inmobiliaria" &&
            isAgencyPromoActive(p.agency_promo_until)
          ) {
            setChosen(AGENCY_PLAN);
            setStep("form");
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

  const pickPlan = (p: Plan) => {
    setChosen(p);
    setStep(p.price > 0 ? "pago" : "form");
  };

  // Al pulsar "Publicar" en el instructivo: si no hay sesión, pide login
  // (y vuelve aquí); si ya hay sesión, pasa a elegir plan.
  const startPublishing = () => {
    if (!user) {
      router.push("/login?redirect=/publicar");
    } else {
      setStep("plan");
    }
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
                  t: "Elige un plan",
                  d: "Publica gratis o destaca tu inmueble para llegar a más personas.",
                },
                {
                  t: "Completa los datos",
                  d: "Tipo, precio, ubicación, habitaciones, baños y características.",
                },
                {
                  t: "Sube fotos",
                  d: "Agrega buenas fotos: son lo que más atrae a los interesados.",
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
                ? "Continúa para elegir tu plan."
                : "Te pediremos iniciar sesión para continuar."}
            </p>
          </div>
        )}

        {step === "plan" && (
          <>
            <h1 className="mb-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Elige cómo publicar
            </h1>
            <p className="mb-6 text-zinc-500">
              Selecciona un plan para tu inmueble.
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
                    className={`mt-4 w-full rounded-lg py-3 font-medium text-white ${
                      p.is_featured
                        ? "bg-amber-600 hover:bg-amber-700"
                        : "bg-emerald-700 hover:bg-emerald-800"
                    }`}
                  >
                    {p.price === 0 ? "Publicar gratis" : `Elegir ${p.name}`}
                  </button>
                </div>
              ))}
            </div>
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
              onClick={() => setStep("form")}
              className="mt-5 w-full rounded-lg bg-emerald-700 py-3 font-medium text-white hover:bg-emerald-800"
            >
              Ya hice la transferencia, continuar
            </button>
            <button
              onClick={() => setStep("plan")}
              className="mt-2 w-full py-2 text-center text-sm text-zinc-500"
            >
              ← Volver a planes
            </button>
            <p className="mt-2 text-center text-xs text-zinc-400">
              Guarda el comprobante por si el administrador lo solicita.
            </p>
          </>
        )}

        {step === "form" && chosen && user && (
          <>
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
              <span>{chosen.is_featured ? "⭐" : "✓"}</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                Plan {chosen.name} · {chosen.duration_days} días
              </span>
              <button
                onClick={() => setStep("plan")}
                className="ml-auto text-emerald-700 hover:underline"
              >
                Cambiar
              </button>
            </div>
            <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Publicar inmueble
            </h1>
            <PropertyForm userId={user.id} plan={chosen} />
          </>
        )}
      </main>
    </div>
  );
}
