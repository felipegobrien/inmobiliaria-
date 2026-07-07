import type { SupabaseClient } from "@supabase/supabase-js";

/** Perfil público de una inmobiliaria para su sitio de marca blanca. */
export type AgencySite = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  whatsapp: string | null;
  avatar_url: string | null;
  verified: boolean;
  agency_domain: string | null;
};

const SELECT =
  "id, full_name, company, phone, whatsapp, avatar_url, verified, agency_slug, agency_domain";

function toAgencySite(data: Record<string, unknown> | null): AgencySite | null {
  if (!data || !data.agency_slug) return null;
  return {
    id: data.id as string,
    name:
      (data.company as string | null) ??
      (data.full_name as string | null) ??
      "Inmobiliaria",
    slug: data.agency_slug as string,
    phone: (data.phone as string | null) ?? null,
    whatsapp: (data.whatsapp as string | null) ?? null,
    avatar_url: (data.avatar_url as string | null) ?? null,
    verified: !!data.verified,
    agency_domain: (data.agency_domain as string | null) ?? null,
  };
}

export async function getAgencySiteBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<AgencySite | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(SELECT)
    .eq("agency_slug", slug)
    .eq("role", "inmobiliaria")
    .maybeSingle();
  if (error) throw error;
  return toAgencySite(data);
}

/** Número de contacto de la inmobiliaria (WhatsApp o teléfono). */
export function agencyContactNumber(a: AgencySite): string | null {
  const n = a.whatsapp || a.phone;
  return n && n.trim() ? n : null;
}

/**
 * Base de los enlaces internos del sitio de la inmobiliaria.
 * - En el dominio principal:  /sitio/<slug>/inmueble/...
 * - En su dominio propio:     /inmueble/...   (el proxy reescribe)
 */
export function agencyBasePath(agency: AgencySite, host: string | null): string {
  const h = (host ?? "").split(":")[0].toLowerCase();
  if (agency.agency_domain && h === agency.agency_domain.toLowerCase()) {
    return "";
  }
  return `/sitio/${agency.slug}`;
}

/** URL pública canónica del sitio de la inmobiliaria. */
export function agencySiteUrl(agency: AgencySite, mainSiteUrl: string): string {
  return agency.agency_domain
    ? `https://${agency.agency_domain}`
    : `${mainSiteUrl}/sitio/${agency.slug}`;
}
