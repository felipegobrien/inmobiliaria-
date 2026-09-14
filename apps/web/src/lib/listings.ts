import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getProperty,
  getPropertyByRef,
  type PropertyWithImages,
} from "@inmo/shared";
import { slugify } from "./slug";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Resuelve el parámetro de la URL a un inmueble.
// Acepta: slug con referencia al final ("...-1042"), una referencia sola, o un UUID.
export async function getPropertyBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<PropertyWithImages | null> {
  if (UUID_RE.test(slug)) return getProperty(supabase, slug);
  if (/^\d+$/.test(slug)) return getPropertyByRef(supabase, Number(slug));
  const m = slug.match(/-(\d+)$/);
  if (m) return getPropertyByRef(supabase, Number(m[1]));
  return null;
}

// Resuelve el slug de ciudad (p.ej. "medellin") al nombre real ("Medellín").
export async function resolveCity(
  supabase: SupabaseClient,
  citySlug: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("properties")
    .select("city")
    .eq("status", "activo");
  const cities = Array.from(
    new Set(((data ?? []) as { city: string }[]).map((r) => r.city)),
  );
  return cities.find((c) => slugify(c) === citySlug) ?? null;
}

// Lista los barrios (nombres reales) que existen en una ciudad con inmuebles activos.
export async function neighborhoodsInCity(
  supabase: SupabaseClient,
  cityName: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("properties")
    .select("neighborhood")
    .eq("status", "activo")
    .ilike("city", cityName)
    .not("neighborhood", "is", null);
  const set = new Set(
    ((data ?? []) as { neighborhood: string | null }[])
      .map((r) => r.neighborhood?.trim())
      .filter((n): n is string => !!n),
  );
  return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
}

// Resuelve el slug de barrio dentro de una ciudad al nombre real.
export async function resolveNeighborhood(
  supabase: SupabaseClient,
  cityName: string,
  neighborhoodSlug: string,
): Promise<string | null> {
  const list = await neighborhoodsInCity(supabase, cityName);
  return list.find((n) => slugify(n) === neighborhoodSlug) ?? null;
}
