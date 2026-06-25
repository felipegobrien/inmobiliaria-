import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "./slug";

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
