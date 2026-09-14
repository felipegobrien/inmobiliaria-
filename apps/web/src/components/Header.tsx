"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";

function AccountMenu({
  email,
  onSignOut,
}: {
  email: string;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = (email?.[0] ?? "U").toUpperCase();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Mi cuenta"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white ring-2 ring-transparent transition hover:bg-emerald-800 focus:outline-none focus:ring-emerald-300"
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-400">Sesión iniciada como</p>
            <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {email}
            </p>
          </div>

          <Link
            href="/mis-inmuebles"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-zinc-400" aria-hidden="true">
              <path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
            </svg>
            Mis inmuebles
          </Link>

          <Link
            href="/favoritos"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-zinc-400" aria-hidden="true">
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
            </svg>
            Favoritos
          </Link>

          <button
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            role="menuitem"
            className="flex w-full items-center gap-3 border-t border-zinc-100 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:border-zinc-800 dark:hover:bg-red-950/30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const { user, loading, signOut } = useAuth();

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          aria-label="Ercada — inicio"
          className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white"
        >
          <span className="text-emerald-700 dark:text-emerald-400">Erca</span>da
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/publicar"
            className="rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800"
          >
            Publicar inmueble
          </Link>

          {loading ? null : user ? (
            <AccountMenu email={user.email ?? ""} onSignOut={signOut} />
          ) : (
            <Link
              href="/login"
              className="font-medium text-zinc-700 dark:text-zinc-300"
            >
              Ingresar
            </Link>
          )}
        </nav>
      </div>

      {/* Frase + botón Mapa — fila propia, debajo del logo y "Publicar inmueble" */}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pb-4">
        <p className="text-sm font-medium leading-snug text-zinc-600 sm:text-base dark:text-zinc-400">
          Tu próximo hogar está en{" "}
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
            Ercada
          </span>
        </p>
        <Link
          href="/mapa"
          className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-700 hover:text-white hover:shadow-md sm:px-5 sm:py-2.5 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-600 dark:hover:text-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3z" />
            <path d="M9 3v15M15 6v15" />
          </svg>
          <span className="sm:hidden">Mapa</span>
          <span className="hidden sm:inline">Ver en el mapa</span>
        </Link>
      </div>
    </header>
  );
}
