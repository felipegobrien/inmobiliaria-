"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/Header";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(traducirError(error.message));
      setLoading(false);
      return;
    }
    router.push("/");
  };

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <Header />
      <main className="mx-auto flex max-w-md flex-col px-4 py-10">
        <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Iniciar sesión
        </h1>

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
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">Contraseña</span>
            <input
              type="password"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>

          <p className="-mt-2 text-right text-sm">
            <Link href="/recuperar" className="font-medium text-emerald-800">
              ¿Olvidaste tu contraseña?
            </Link>
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-emerald-700 py-3 font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {loading ? "Ingresando…" : "Ingresar"}
          </button>

          <p className="text-center text-sm text-zinc-500">
            ¿No tienes cuenta?{" "}
            <Link href="/registro" className="font-semibold text-emerald-800">
              Regístrate
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}

function traducirError(msg: string): string {
  if (msg.includes("Invalid login credentials"))
    return "Correo o contraseña incorrectos.";
  if (msg.includes("Email not confirmed"))
    return "Debes confirmar tu correo antes de ingresar. Revisa tu bandeja de entrada.";
  return msg;
}
