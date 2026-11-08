import type { MetadataRoute } from "next";
import { propertyPath } from "@inmo/shared";
import { getServerSupabase, SITE_URL } from "@/lib/supabase-server";
import { slugify } from "@/lib/slug";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from("properties")
    .select("id, ref, city, neighborhood, type, operation, updated_at")
    .eq("status", "activo");

  const props =
    (data ?? []) as {
      id: string;
      ref: number;
      city: string;
      neighborhood: string | null;
      type: string;
      operation: string;
      updated_at: string;
    }[];

  const urls: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
  ];

  // Ficha de cada inmueble (URL amigable con referencia)
  for (const p of props) {
    urls.push({
      url: `${SITE_URL}${propertyPath(p)}`,
      lastModified: p.updated_at,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  // Páginas de aterrizaje (operación / ciudad / tipo)
  const combos = new Set<string>();
  for (const p of props) {
    const citySlug = slugify(p.city);
    const ops =
      p.operation === "venta_arriendo" ? ["venta", "arriendo"] : [p.operation];
    for (const op of ops) {
      combos.add(`${op}/${citySlug}`);
      combos.add(`${op}/${citySlug}/${p.type}`);
      if (p.neighborhood?.trim()) {
        combos.add(`${op}/${citySlug}/barrio/${slugify(p.neighborhood)}`);
      }
    }
  }
  for (const c of combos) {
    urls.push({
      url: `${SITE_URL}/${c}`,
      changeFrequency: "daily",
      priority: 0.6,
    });
  }

  // Páginas de cada inmobiliaria (slug amigable)
  const { data: agencies } = await supabase
    .from("profiles")
    .select("agency_slug, updated_at")
    .eq("role", "inmobiliaria")
    .not("agency_slug", "is", null);
  for (const a of (agencies ?? []) as {
    agency_slug: string;
    updated_at: string;
  }[]) {
    urls.push({
      url: `${SITE_URL}/inmobiliaria/${a.agency_slug}`,
      lastModified: a.updated_at,
      changeFrequency: "weekly",
      priority: 0.5,
    });
  }

  // Blog: índice + artículos publicados
  urls.push({
    url: `${SITE_URL}/blog`,
    changeFrequency: "weekly",
    priority: 0.6,
  });
  const { data: posts } = await supabase
    .from("posts")
    .select("slug, updated_at, published_at")
    .eq("status", "publicado");
  for (const p of (posts ?? []) as {
    slug: string;
    updated_at: string;
    published_at: string | null;
  }[]) {
    urls.push({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: p.updated_at,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  return urls;
}
