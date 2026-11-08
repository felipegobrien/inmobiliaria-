"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getProfile } from "@inmo/shared";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import { Header } from "@/components/Header";
import type { Post, PostStatus } from "@/lib/posts";

export default function BlogEditorPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const isNew = params.id === "nuevo";
  const { user, loading } = useAuth();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<PostStatus>("borrador");
  const [publishedAt, setPublishedAt] = useState<string | null>(null);

  // Permiso de admin.
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

  // Cargar artículo existente.
  useEffect(() => {
    if (!isAdmin || isNew) return;
    supabase
      .from("posts")
      .select("*")
      .eq("id", params.id)
      .maybeSingle()
      .then(({ data }) => {
        const p = data as Post | null;
        if (p) {
          setTitle(p.title);
          setSlug(p.slug);
          setSlugEdited(true);
          setExcerpt(p.excerpt ?? "");
          setCoverUrl(p.cover_url ?? "");
          setContent(p.content ?? "");
          setStatus(p.status);
          setPublishedAt(p.published_at);
        }
        setLoaded(true);
      });
  }, [isAdmin, isNew, params.id]);

  // Slug automático desde el título (hasta que el usuario lo edite).
  useEffect(() => {
    if (!slugEdited) setSlug(slugify(title));
  }, [title, slugEdited]);

  const canSave = useMemo(
    () => title.trim().length > 2 && slug.trim().length > 2,
    [title, slug],
  );

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);

    const nowPublished =
      status === "publicado" ? (publishedAt ?? new Date().toISOString()) : null;

    const payload = {
      slug: slug.trim(),
      title: title.trim(),
      excerpt: excerpt.trim() || null,
      cover_url: coverUrl.trim() || null,
      content,
      status,
      published_at: nowPublished,
      author_id: user?.id ?? null,
    };

    const res = isNew
      ? await supabase.from("posts").insert(payload).select("id").single()
      : await supabase
          .from("posts")
          .update(payload)
          .eq("id", params.id)
          .select("id")
          .single();

    setSaving(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    router.push("/blog/admin");
  }

  async function remove() {
    if (isNew) return;
    if (!confirm("¿Eliminar este artículo? No se puede deshacer.")) return;
    setSaving(true);
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", params.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/blog/admin");
  }

  if (loading || isAdmin === null || !loaded) {
    return (
      <div className="min-h-full bg-zinc-50 dark:bg-black">
        <Header />
        <p className="mx-auto max-w-3xl px-4 py-16 text-center text-zinc-500">
          Cargando…
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-full bg-zinc-50 dark:bg-black">
        <Header />
        <p className="mx-auto max-w-3xl px-4 py-16 text-center text-zinc-500">
          No tienes permiso para administrar el blog.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {isNew ? "Nuevo artículo" : "Editar artículo"}
        </h1>

        <div className="mt-6 flex flex-col gap-4">
          <Field label="Título">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={input}
              placeholder="Cómo arrendar en Bogotá: guía paso a paso"
            />
          </Field>

          <Field label="Slug (URL)">
            <input
              value={slug}
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(slugify(e.target.value));
              }}
              className={input}
              placeholder="como-arrendar-en-bogota"
            />
            <p className="mt-1 text-xs text-zinc-400">/blog/{slug || "…"}</p>
          </Field>

          <Field label="Resumen (para listados y Google)">
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              className={input}
              placeholder="Una o dos frases que resuman el artículo."
            />
          </Field>

          <Field label="Imagen de portada (URL)">
            <input
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              className={input}
              placeholder="https://…"
            />
          </Field>

          <Field label="Contenido (Markdown)">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={18}
              className={`${input} font-mono text-sm`}
              placeholder={"## Subtítulo\n\nTexto del artículo. Usa **negrita**, *cursiva*, listas con - y enlaces [así](https://…)."}
            />
          </Field>

          <Field label="Estado">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PostStatus)}
              className={input}
            >
              <option value="borrador">Borrador (no visible)</option>
              <option value="publicado">Publicado</option>
            </select>
          </Field>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="mt-2 flex items-center justify-between gap-3">
            <button
              onClick={save}
              disabled={!canSave || saving}
              className="rounded-xl bg-emerald-700 px-5 py-2.5 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
            {!isNew && (
              <button
                onClick={remove}
                disabled={saving}
                className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
              >
                Eliminar
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const input =
  "w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      {children}
    </label>
  );
}
