"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/Header";

// Pide el correo y envía el enlace de recuperación de contraseña.
export default function RecoverPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/restablecer`,
    });

    setLoading(false);
    if (error) {
      setError(
        error.message.includes("rate limit") ||
          error.message.includes("security purposes")
          ? "Espera un momento antes de pedir otro correo."
          : "No se pudo enviar el correo. Inténtalo de nuevo.",
      );
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <Header />
      <main className="mx-auto flex max-w-md flex-col px-4 py-10">
        <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Recuperar contraseña
        </h1>

        {sent ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
            <p className="font-medium">Revisa tu correo 📬</p>
            <p className="mt-1 text-sm">
              Si <strong>{email}</strong> está registrado, te enviamos un enlace
              para crear una contraseña nueva. Revisa también la carpeta de
              spam.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-zinc-500">
              Escribe el correo con el que te registraste y te enviaremos un
              enlace para crear una contraseña nueva.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-700 dark:text-zinc-300">
                  Correo electrónico
                </span>
                <input
                  type="email"
                  value={email}
                  required
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-emerald-700 py-3 font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {loading ? "Enviando…" : "Enviarme el enlace"}
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-zinc-500">
          <Link href="/login" className="font-semibold text-emerald-800">
            ← Volver a iniciar sesión
          </Link>
        </p>
      </main>
    </div>
  );
}
