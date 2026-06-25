"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getFavoriteIds, toggleFavorite } from "@inmo/shared";
import { supabase } from "./supabase";
import { useAuth } from "./auth";

interface FavoritesContextValue {
  ids: Set<string>;
  isFavorite: (propertyId: string) => boolean;
  toggle: (propertyId: string) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue>({
  ids: new Set(),
  isFavorite: () => false,
  toggle: async () => {},
});

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setIds(new Set());
      return;
    }
    getFavoriteIds(supabase, user.id)
      .then((list) => setIds(new Set(list)))
      .catch((e) => console.error(e));
  }, [user]);

  const toggle = useCallback(
    async (propertyId: string) => {
      if (!user) return;
      const currentlyFav = ids.has(propertyId);
      try {
        // Guardar primero, luego actualizar (evita carreras al recargar la lista).
        await toggleFavorite(supabase, user.id, propertyId, currentlyFav);
        setIds((prev) => {
          const next = new Set(prev);
          if (currentlyFav) next.delete(propertyId);
          else next.add(propertyId);
          return next;
        });
      } catch (e) {
        console.error(e);
      }
    },
    [user, ids],
  );

  return (
    <FavoritesContext.Provider
      value={{ ids, isFavorite: (id) => ids.has(id), toggle }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export const useFavorites = () => useContext(FavoritesContext);
