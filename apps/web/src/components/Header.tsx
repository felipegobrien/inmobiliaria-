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
          className="text-xl font-bold text-emerald-800 dark:text-emerald-400"
        >
          🏠 Inmobiliaria
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/mapa"
            className="flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300"
          >
            🗺️ Mapa
          </Link>
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
    </header>
  );
}
