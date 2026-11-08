import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSupabase, SITE_URL } from "@/lib/supabase-server";
import { getPublishedPost } from "@/lib/posts";
import { renderMarkdown } from "@/lib/markdown";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { Breadcrumbs } from "@/components/Seo";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = getServerSupabase();
  const post = await getPublishedPost(supabase, slug).catch(() => null);
  if (!post) return { title: "Artículo no encontrado" };

  const description =
    post.excerpt?.slice(0, 160) || post.content.slice(0, 160);
  return {
    title: post.title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description,
      url: `${SITE_URL}/blog/${post.slug}`,
      type: "article",
      publishedTime: post.published_at ?? undefined,
      images: post.cover_url ? [{ url: post.cover_url }] : undefined,
    },
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = getServerSupabase();
  const post = await getPublishedPost(supabase, slug).catch(() => null);
  if (!post) notFound();

  const html = renderMarkdown(post.content);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: post.cover_url ? [post.cover_url] : undefined,
    datePublished: post.published_at ?? undefined,
    dateModified: post.updated_at,
    url: `${SITE_URL}/blog/${post.slug}`,
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    publisher: {
      "@type": "Organization",
      name: "Ercada",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/opengraph-image`,
      },
    },
  };

  return (
    <div className="flex min-h-full flex-col bg-zinc-50 dark:bg-black">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Blog", href: "/blog" },
            { name: post.title, href: `/blog/${post.slug}` },
          ]}
        />

        <article className="mt-4">
          <h1 className="text-3xl font-bold leading-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            {post.title}
          </h1>
          {post.published_at && (
            <p className="mt-3 text-sm text-zinc-400">
              Publicado el {formatDate(post.published_at)}
            </p>
          )}

          {post.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.cover_url}
              alt={post.title}
              className="mt-6 w-full rounded-2xl object-cover"
            />
          )}

          <div
            className="mt-8 leading-relaxed text-zinc-700 dark:text-zinc-300 [&_h2]:text-zinc-900 [&_h3]:text-zinc-900 dark:[&_h2]:text-zinc-50 dark:[&_h3]:text-zinc-50 [&_p]:mt-4"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
