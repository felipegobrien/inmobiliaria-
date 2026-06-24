"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useFavorites } from "@/lib/favorites";

export function FavoriteButton({
  propertyId,
  className = "",
}: {
  propertyId: string;
  className?: string;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(propertyId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push("/login");
      return;
    }
    toggle(propertyId);
  };

  return (
    <button
      onClick={handleClick}
      title={fav ? "Quitar de favoritos" : "Guardar en favoritos"}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg shadow transition hover:scale-110 dark:bg-zinc-900/90 ${className}`}
    >
      <span className={fav ? "text-red-500" : "text-zinc-400"}>
        {fav ? "♥" : "♡"}
      </span>
    </button>
  );
}
