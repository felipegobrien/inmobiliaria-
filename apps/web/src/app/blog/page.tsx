import type { Metadata } from "next";
import Link from "next/link";
import { getServerSupabase, SITE_URL } from "@/lib/supabase-server";
import { listPublishedPosts } from "@/lib/posts";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { Breadcrumbs } from "@/components/Seo";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Blog — Guías de compra, venta y arriendo en Colombia",
  description:
    "Consejos y guías sobre el mercado inmobiliario en Colombia: cómo comprar, vender o arrendar, estratos, trámites, precios por zona y más.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog de Ercada",
    description:
      "Guías prácticas sobre comprar, vender y arrendar vivienda en Colombia.",
    url: `${SITE_URL}/blog`,
  },
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function BlogIndexPage() {
  const supabase = getServerSupabase();
  const posts = await listPublishedPosts(supabase);

  const listJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Blog de Ercada",
    url: `${SITE_URL}/blog`,
    blogPost: posts.slice(0, 25).map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `${SITE_URL}/blog/${p.slug}`,
      datePublished: p.published_at ?? undefined,
    })),
  };

  return (
    <div className="flex min-h-full flex-col bg-zinc-50 dark:bg-black">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listJsonLd) }}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Blog", href: "/blog" },
          ]}
        />
        <h1 className="mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Blog inmobiliario
        </h1>
        <p className="mt-2 max-w-2xl text-zinc-500">
          Guías y consejos prácticos para comprar, vender y arrendar vivienda en
          Colombia: estratos, trámites, precios por zona y todo lo que necesitas
          saber antes de decidir.
        </p>

        {posts.length === 0 ? (
          <p className="mt-12 text-center text-zinc-500">
            Pronto publicaremos nuestros primeros artículos.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <Link
                key={p.id}
                href={`/blog/${p.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
              >
                {p.cover_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.cover_url}
                    alt={p.title}
                    className="h-44 w-full object-cover"
                  />
                )}
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="text-lg font-semibold text-zinc-900 group-hover:text-emerald-700 dark:text-zinc-50 dark:group-hover:text-emerald-400">
                    {p.title}
                  </h2>
                  {p.excerpt && (
                    <p className="mt-2 line-clamp-3 text-sm text-zinc-500">
                      {p.excerpt}
                    </p>
                  )}
                  <span className="mt-4 text-xs text-zinc-400">
                    {formatDate(p.published_at)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
