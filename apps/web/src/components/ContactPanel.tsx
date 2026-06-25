"use client";

import { useState } from "react";
import { createInquiry } from "@inmo/shared";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export function ContactPanel({
  propertyId,
  title,
  ownerName,
  company,
  contactNumber,
}: {
  propertyId: string;
  title: string;
  ownerName: string;
  company?: string | null;
  contactNumber?: string | null;
}) {
  const { user } = useAuth();
  const [name, setName] = useState(
    (user?.user_metadata?.full_name as string) ?? "",
  );
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [message, setMessage] = useState(
    `Hola, vi este inmueble "${title}" y me interesa recibir más información.`,
  );
  const [revealed, setRevealed] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      setError("Por favor ingresa tu nombre y teléfono.");
      return;
    }
    setError(null);
    setSending(true);
    try {
      await createInquiry(supabase, {
        property_id: propertyId,
        sender_id: user?.id ?? null,
        name,
        email: email || null,
        phone,
        message,
      });
      setRevealed(true);
    } catch (err: any) {
      setError(err?.message ?? "No se pudo enviar.");
    } finally {
      setSending(false);
    }
  };

  const num = contactNumber?.replace(/\D/g, "");
  const wppMsg = encodeURIComponent(message);

  return (
    <aside className="h-fit rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
        Contactar al anunciante
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        {ownerName}
        {company ? ` · ${company}` : ""}
      </p>

      {!revealed ? (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <p className="text-sm text-zinc-500">
            Completa tus datos para ver el contacto.
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Tu teléfono / WhatsApp"
            inputMode="tel"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Tu correo (opcional)"
            type="email"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={sending}
            className="rounded-lg bg-emerald-700 py-3 font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {sending ? "Enviando…" : "Ver datos de contacto"}
          </button>
        </form>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            ¡Listo! Estos son los datos de contacto:
          </p>
          {num ? (
            <>
              <a
                href={`https://wa.me/57${num}?text=${wppMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg bg-emerald-700 py-3 text-center font-medium text-white hover:bg-emerald-800"
              >
                Escribir por WhatsApp
              </a>
              <a
                href={`tel:+57${num}`}
                className="block rounded-lg border border-zinc-300 py-3 text-center font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
              >
                Llamar: {contactNumber}
              </a>
            </>
          ) : (
            <p className="text-sm text-zinc-400">
              El anunciante no registró teléfono de contacto.
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
