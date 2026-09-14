"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

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
            <>
              <Link
                href="/favoritos"
                className="font-medium text-zinc-700 dark:text-zinc-300"
              >
                Favoritos
              </Link>
              <Link
                href="/mis-inmuebles"
                className="font-medium text-zinc-700 dark:text-zinc-300"
              >
                Mis inmuebles
              </Link>
              <button
                onClick={() => signOut()}
                className="font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                Salir
              </button>
            </>
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

      {/* Botón Mapa — fila propia, debajo del logo y "Publicar inmueble" */}
      <div className="mx-auto max-w-6xl px-4 pb-4">
        <Link
          href="/mapa"
          className="group inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-700 hover:text-white hover:shadow-md dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-600 dark:hover:text-white"
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
          Ver en el mapa
        </Link>
      </div>
    </header>
  );
}
