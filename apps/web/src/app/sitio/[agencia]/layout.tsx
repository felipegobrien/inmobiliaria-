import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase-server";
import {
  getAgencySiteBySlug,
  agencyBasePath,
  agencyContactNumber,
} from "@/lib/agency-site";

// Sitio de marca blanca de una inmobiliaria: solo su catálogo, su logo y su
// contacto. Sin enlaces al portal general (ni publicar, ni otras agencias).

export async function generateMetadata({
  params,
}: {
  params: Promise<{ agencia: string }>;
}): Promise<Metadata> {
  const { agencia } = await params;
  const supabase = getServerSupabase();
  const a = await getAgencySiteBySlug(supabase, agencia).catch(() => null);
  if (!a) return { title: "Inmobiliaria" };
  return {
    title: {
      default: `${a.name} — Inmuebles en venta y arriendo`,
      template: `%s | ${a.name}`,
    },
    description: `Catálogo de inmuebles de ${a.name}.`,
  };
}

export default async function AgencySiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ agencia: string }>;
}) {
  const { agencia } = await params;
  const supabase = getServerSupabase();
  const agency = await getAgencySiteBySlug(supabase, agencia).catch(() => null);
  if (!agency) notFound();

  const host = (await headers()).get("host");
  const base = agencyBasePath(agency, host);
  const contact = agencyContactNumber(agency);
  const wpp = contact?.replace(/\D/g, "");

  return (
    <div className="flex min-h-full flex-col bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href={base || "/"} className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-[70px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-white">
              {agency.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={agency.avatar_url}
                  alt={agency.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xl text-emerald-700">🏠</span>
              )}
            </span>
            <span className="truncate text-lg font-bold capitalize text-zinc-900 dark:text-zinc-50">
              {agency.name}
              {agency.verified && (
                <span className="ml-1.5 align-middle text-xs font-medium text-emerald-700">
                  ✓
                </span>
              )}
            </span>
          </Link>

          {wpp && (
            <a
              href={`https://wa.me/57${wpp}?text=${encodeURIComponent(
                `Hola, los contacto desde su página de inmuebles.`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              WhatsApp
            </a>
          )}
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-zinc-200 bg-white py-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-zinc-500">
          <p className="font-medium capitalize text-zinc-700 dark:text-zinc-300">
            {agency.name}
          </p>
          {contact && <p className="mt-1">Tel: {contact}</p>}
        </div>
      </footer>
    </div>
  );
}
