"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/Header";

export default function RegistroPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      setError(traducirError(error.message));
      setLoading(false);
      return;
    }

    // Guardar teléfono en el perfil (el trigger ya creó la fila)
    if (data.user && phone) {
      await supabase.from("profiles").update({ phone }).eq("id", data.user.id);
    }

    // Si el proyecto exige confirmar email, no habrá sesión inmediata.
    if (data.session) {
      router.push("/");
    } else {
      setDone(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <Header />
      <main className="mx-auto flex max-w-md flex-col px-4 py-10">
        <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Crear cuenta
        </h1>

        {done ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            ¡Listo! Te enviamos un correo para confirmar tu cuenta. Revisa tu
            bandeja de entrada y luego{" "}
            <Link href="/login" className="font-semibold underline">
              inicia sesión
            </Link>
            .
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field
              label="Nombre completo"
              value={fullName}
              onChange={setFullName}
              required
            />
            <Field
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={setEmail}
              required
            />
            <Field
              label="Teléfono / WhatsApp"
              type="tel"
              value={phone}
              onChange={setPhone}
            />
            <Field
              label="Contraseña (mínimo 6 caracteres)"
              type="password"
              value={password}
              onChange={setPassword}
              required
            />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-emerald-700 py-3 font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {loading ? "Creando…" : "Crear cuenta"}
            </button>

            <p className="text-center text-sm text-zinc-500">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="font-semibold text-emerald-800">
                Inicia sesión
              </Link>
            </p>
          </form>
        )}
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-700 dark:text-zinc-300">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
      />
    </label>
  );
}

function traducirError(msg: string): string {
  if (msg.includes("already registered")) return "Ese correo ya está registrado.";
  if (msg.includes("Password should be")) return "La contraseña debe tener al menos 6 caracteres.";
  if (msg.includes("valid email")) return "Ingresa un correo válido.";
  return msg;
}
