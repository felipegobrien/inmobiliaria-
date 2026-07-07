"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/Header";

// Página a la que llega el enlace del correo de recuperación.
// Supabase abre sesión automáticamente con el token del enlace y aquí
// el usuario escribe su contraseña nueva.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // ¿El enlace venía con error? (vencido o ya usado)
    if (
      typeof window !== "undefined" &&
      window.location.hash.includes("error=")
    ) {
      setReady("invalid");
      return;
    }

    // Esperar a que supabase-js procese el token del enlace (#access_token).
    let resolved = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        resolved = true;
        setReady("ok");
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        resolved = true;
        setReady("ok");
      }
    });
    const timer = setTimeout(() => {
      if (!resolved) setReady("invalid");
    }, 4000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      setError(
        error.message.includes("different from the old")
          ? "La contraseña nueva debe ser distinta a la anterior."
          : "No se pudo guardar. El enlace pudo haber vencido; pide uno nuevo.",
      );
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/"), 2000);
  };

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <Header />
      <main className="mx-auto flex max-w-md flex-col px-4 py-10">
        <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Nueva contraseña
        </h1>

        {ready === "checking" && (
          <p className="mt-4 text-sm text-zinc-500">Verificando enlace…</p>
        )}

        {ready === "invalid" && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
            <p className="font-medium">El enlace no es válido o ya venció.</p>
            <p className="mt-1 text-sm">
              Pide uno nuevo desde{" "}
              <Link href="/recuperar" className="font-semibold underline">
                recuperar contraseña
              </Link>
              .
            </p>
          </div>
        )}

        {ready === "ok" && done && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
            <p className="font-medium">¡Contraseña actualizada! ✅</p>
            <p className="mt-1 text-sm">Ya quedaste dentro de tu cuenta…</p>
          </div>
        )}

        {ready === "ok" && !done && (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-700 dark:text-zinc-300">
                Contraseña nueva
              </span>
              <input
                type="password"
                value={password}
                required
                minLength={6}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-700 dark:text-zinc-300">
                Repite la contraseña
              </span>
              <input
                type="password"
                value={confirm}
                required
                minLength={6}
                onChange={(e) => setConfirm(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-emerald-700 py-3 font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar contraseña"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
