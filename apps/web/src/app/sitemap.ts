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

  return urls;
}
