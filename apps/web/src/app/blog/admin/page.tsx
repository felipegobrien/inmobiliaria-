"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProfile } from "@inmo/shared";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import type { PostSummary } from "@/lib/posts";

export default function BlogAdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [posts, setPosts] = useState<PostSummary[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    getProfile(supabase, user.id)
      .then((p) => setIsAdmin(p?.role === "admin"))
      .catch(() => setIsAdmin(false));
  }, [user, loading, router]);

  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("posts")
      .select(
        "id, slug, title, excerpt, cover_url, status, author_id, published_at, created_at, updated_at",
      )
      .order("updated_at", { ascending: false })
      .then(({ data }) => setPosts((data ?? []) as PostSummary[]));
  }, [isAdmin]);

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-full bg-zinc-50 dark:bg-black">
        <Header />
        <p className="mx-auto max-w-5xl px-4 py-16 text-center text-zinc-500">
          Cargando…
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-full bg-zinc-50 dark:bg-black">
        <Header />
        <p className="mx-auto max-w-5xl px-4 py-16 text-center text-zinc-500">
          No tienes permiso para administrar el blog.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Blog — administración
          </h1>
          <Link
            href="/blog/admin/nuevo"
            className="rounded-xl bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800"
          >
            Nuevo artículo
          </Link>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {posts.length === 0 ? (
            <p className="p-8 text-center text-zinc-500">
              Aún no hay artículos. Crea el primero.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {posts.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                      {p.title}
                    </p>
                    <p className="truncate text-xs text-zinc-400">/{p.slug}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        p.status === "publicado"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {p.status}
                    </span>
                    <Link
                      href={`/blog/admin/${p.id}`}
                      className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                    >
                      Editar
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
