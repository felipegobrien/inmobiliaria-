"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";

type ProfileForm = {
  full_name: string;
  phone: string;
  whatsapp: string;
  bio: string;
  company: string;
  role: string;
};

const EMPTY: ProfileForm = {
  full_name: "",
  phone: "",
  whatsapp: "",
  bio: "",
  company: "",
  role: "usuario",
};

export default function PerfilPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?redirect=/perfil");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, phone, whatsapp, bio, company, role")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setForm({
            full_name: data.full_name ?? "",
            phone: data.phone ?? "",
            whatsapp: data.whatsapp ?? "",
            bio: data.bio ?? "",
            company: data.company ?? "",
            role: data.role ?? "usuario",
          });
        }
        setLoadingData(false);
      });
  }, [user]);

  const set = (patch: Partial<ProfileForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setSaved(false);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name || null,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        bio: form.bio || null,
        ...(form.role === "inmobiliaria" ? { company: form.company || null } : {}),
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      setError("No se pudo guardar. Intenta de nuevo.");
      return;
    }
    setSaved(true);
  };

  if (loading || !user || loadingData) {
    return (
      <div className="min-h-full bg-zinc-50 dark:bg-black">
        <Header />
        <p className="p-10 text-center text-zinc-500">Cargando…</p>
      </div>
    );
  }

  const isAgency = form.role === "inmobiliaria";
  const initial = (user.email?.[0] ?? "U").toUpperCase();

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Mi perfil
        </h1>
        <p className="mt-1 text-zinc-500">
          Edita tus datos. Aparecen cuando alguien se interesa en tus inmuebles.
        </p>

        <form onSubmit={save} className="mt-6 flex flex-col gap-5">
          {/* Box: identidad */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xl font-bold text-white">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-zinc-900 dark:text-zinc-50">
                  {form.full_name || "Sin nombre"}
                </p>
                <p className="truncate text-sm text-zinc-500">{user.email}</p>
              </div>
              {isAgency && (
                <span className="ml-auto rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  Inmobiliaria
                </span>
              )}
            </div>
          </section>

          {/* Box: datos personales */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Datos personales
            </h2>
            <div className="flex flex-col gap-4">
              <Field label="Nombre completo">
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => set({ full_name: e.target.value })}
                  placeholder="Tu nombre"
                  className={inputClass}
                />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Teléfono">
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set({ phone: e.target.value })}
                    placeholder="300 000 0000"
                    className={inputClass}
                  />
                </Field>
                <Field label="WhatsApp">
                  <input
                    type="tel"
                    value={form.whatsapp}
                    onChange={(e) => set({ whatsapp: e.target.value })}
                    placeholder="300 000 0000"
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          </section>

          {/* Box: inmobiliaria (solo si aplica) */}
          {isAgency && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                Datos de la inmobiliaria
              </h2>
              <Field label="Nombre de la empresa">
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => set({ company: e.target.value })}
                  placeholder="Nombre comercial"
                  className={inputClass}
                />
              </Field>
            </section>
          )}

          {/* Box: presentación */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Presentación
            </h2>
            <Field label="Sobre ti">
              <textarea
                value={form.bio}
                onChange={(e) => set({ bio: e.target.value })}
                rows={4}
                placeholder="Cuéntale a los interesados quién eres…"
                className={`${inputClass} resize-none`}
              />
            </Field>
          </section>

          {/* Guardar */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-emerald-700 px-6 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
            {saved && (
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                ✓ Guardado
              </span>
            )}
            {error && (
              <span className="text-sm font-medium text-red-600">{error}</span>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 outline-none transition focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      {children}
    </label>
  );
}
