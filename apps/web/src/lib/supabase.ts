'use client';

import { createSupabaseClient } from '@inmo/shared';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !anonKey) {
  throw new Error(
    'Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Copia .env.local.example a .env.local.',
  );
}

// Cliente para el navegador (componentes cliente).
export const supabase = createSupabaseClient(url, anonKey);
