"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteProperty } from "@inmo/shared";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export function OwnerActions({
  id,
  ownerId,
}: {
  id: string;
  ownerId: string;
}) {
  const router = useRouter();
  const { user } = useAuth();
  if (!user || user.id !== ownerId) return null;

  const handleDelete = async () => {
    if (!confirm("¿Seguro que quieres eliminar este inmueble? No se puede deshacer.")) {
      return;
    }
    try {
      await deleteProperty(supabase, id);
      router.push("/mis-inmuebles");
    } catch (e: any) {
      alert(e?.message ?? "No se pudo eliminar.");
    }
  };

  return (
    <div className="mb-4 flex gap-2">
      <Link
        href={`/inmueble/${id}/editar`}
        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        Editar
      </Link>
      <button
        onClick={handleDelete}
        className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
      >
        Eliminar
      </button>
    </div>
  );
}
