import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpila el paquete compartido del monorepo.
  transpilePackages: ["@inmo/shared"],
  images: {
    // Permite servir imágenes desde Supabase Storage.
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

export default nextConfig;
