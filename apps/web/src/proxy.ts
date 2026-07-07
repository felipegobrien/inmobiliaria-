import { NextRequest, NextResponse } from "next/server";

// Dominios propios de inmobiliarias (marca blanca):
// si la petición llega por un dominio que no es el principal, se busca a qué
// inmobiliaria pertenece (profiles.agency_domain) y todo el sitio se
// reescribe a /sitio/<slug>/... — así en su dominio solo existe su catálogo.

function mainHosts(): Set<string> {
  const hosts = new Set(["localhost", "127.0.0.1"]);
  try {
    const url = process.env.NEXT_PUBLIC_SITE_URL;
    if (url) hosts.add(new URL(url).hostname.toLowerCase());
  } catch {
    /* URL inválida en el env: se ignora */
  }
  if (process.env.VERCEL_URL) hosts.add(process.env.VERCEL_URL.toLowerCase());
  return hosts;
}

async function agencySlugForDomain(host: string): Promise<string | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) return null;
  try {
    const res = await fetch(
      `${base}/rest/v1/profiles?select=agency_slug&agency_domain=ilike.${encodeURIComponent(host)}&limit=1`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        // Cachea el mapeo dominio→slug 5 minutos para no consultar en cada página.
        next: { revalidate: 300 },
      },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { agency_slug: string | null }[];
    return rows[0]?.agency_slug ?? null;
  } catch {
    return null;
  }
}

export default async function proxy(request: NextRequest) {
  const host = request.nextUrl.hostname.toLowerCase();
  if (mainHosts().has(host) || host.endsWith(".vercel.app")) {
    return NextResponse.next();
  }

  const slug = await agencySlugForDomain(host);
  if (!slug) return NextResponse.next();

  const { pathname } = request.nextUrl;
  // Ya apunta al sitio de la inmobiliaria: no reescribir de nuevo.
  if (pathname.startsWith("/sitio/")) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/sitio/${slug}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Todo menos archivos estáticos e internos de Next.
  matcher: ["/((?!_next/|api/|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.).*)"],
};
