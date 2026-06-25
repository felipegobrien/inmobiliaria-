import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/supabase-server";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/publicar",
        "/mis-inmuebles",
        "/favoritos",
        "/login",
        "/registro",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
