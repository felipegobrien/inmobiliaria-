import type { SupabaseClient } from "@supabase/supabase-js";

export type PostStatus = "borrador" | "publicado";

export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_url: string | null;
  status: PostStatus;
  author_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Resumen para el índice del blog (sin el cuerpo completo). */
export type PostSummary = Omit<Post, "content">;

const SUMMARY_COLS =
  "id, slug, title, excerpt, cover_url, status, author_id, published_at, created_at, updated_at";

/** Lista los artículos publicados, más recientes primero. */
export async function listPublishedPosts(
  supabase: SupabaseClient,
): Promise<PostSummary[]> {
  const { data } = await supabase
    .from("posts")
    .select(SUMMARY_COLS)
    .eq("status", "publicado")
    .order("published_at", { ascending: false });
  return (data ?? []) as PostSummary[];
}

/** Trae un artículo publicado por su slug (null si no existe o es borrador). */
export async function getPublishedPost(
  supabase: SupabaseClient,
  slug: string,
): Promise<Post | null> {
  const { data } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "publicado")
    .maybeSingle();
  return (data as Post) ?? null;
}
