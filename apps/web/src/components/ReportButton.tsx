"use client";

import { useState } from "react";
import { createReport } from "@inmo/shared";
import { supabase } from "@/lib/supabase";

const REASONS = [
  "Información falsa o engañosa",
  "Precio incorrecto",
  "Ya no está disponible / vendido",
  "Las fotos no corresponden",
  "Posible estafa o fraude",
  "Publicación duplicada",
  "Contenido ofensivo o inapropiado",
  "Datos de contacto incorrectos",
];

export function ReportButton({ propertyId }: { propertyId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const send = async () => {
    if (!reason) return;
    setSending(true);
    try {
      await createReport(supabase, propertyId, reason);
      setDone(true);
    } catch {
      setDone(true); // no bloqueamos al usuario; quedó registrado o no
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-6 text-center">
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-red-600"
      >
        <FlagIcon /> Denunciar publicación
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-5 text-left shadow-2xl dark:bg-zinc-900"
          >
            {done ? (
              <div className="py-4 text-center">
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  ¡Gracias!
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  Recibimos tu denuncia y la revisaremos.
                </p>
                <button
                  onClick={() => setOpen(false)}
                  className="mt-4 w-full rounded-lg bg-emerald-700 py-2.5 font-medium text-white hover:bg-emerald-800"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  Denunciar publicación
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  ¿Por qué quieres denunciar este aviso?
                </p>
                <div className="mt-3 flex flex-col gap-1">
                  {REASONS.map((r) => (
                    <label
                      key={r}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <input
                        type="radio"
                        name="reason"
                        checked={reason === r}
                        onChange={() => setReason(r)}
                        className="h-4 w-4 accent-emerald-700"
                      />
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {r}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-lg border border-zinc-300 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={send}
                    disabled={!reason || sending}
                    className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {sending ? "Enviando…" : "Enviar denuncia"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FlagIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}
