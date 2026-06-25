"use client";

import { useState } from "react";

export function ShareButton({ title }: { title: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = typeof window !== "undefined" ? window.location.href : "";
  const text = `${title} — ${url}`;

  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        // Incluimos el enlace dentro del texto para que WhatsApp genere
        // la vista previa (foto + descripción), no solo el link pelado.
        await navigator.share({ title, text: `${title}\n${url}` });
        return;
      } catch {
        /* cancelado */
      }
    }
    setOpen((o) => !o);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* nada */
    }
  };

  const opt =
    "flex items-center gap-2 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800";

  return (
    <div className="relative">
      <button
        onClick={nativeShare}
        className="flex h-9 items-center gap-1.5 rounded-full border border-zinc-300 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
      >
        <ShareIcon /> Compartir
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(text)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={opt}
            onClick={() => setOpen(false)}
          >
            🟢 WhatsApp
          </a>
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={opt}
            onClick={() => setOpen(false)}
          >
            ✈️ Telegram
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={opt}
            onClick={() => setOpen(false)}
          >
            📘 Facebook
          </a>
          <a
            href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`}
            className={opt}
            onClick={() => setOpen(false)}
          >
            ✉️ Correo
          </a>
          <button onClick={copy} className={`${opt} w-full text-left`}>
            🔗 {copied ? "¡Copiado!" : "Copiar enlace"}
          </button>
        </div>
      )}
    </div>
  );
}

function ShareIcon() {
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
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}
