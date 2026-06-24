import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Fábrica del cliente Supabase. Web y app le pasan sus propias claves
// (y storage/auth options) desde sus variables de entorno.
export function createSupabaseClient(
  url: string,
  anonKey: string,
  options?: Parameters<typeof createClient>[2],
): SupabaseClient {
  return createClient(url, anonKey, options);
}

export type { SupabaseClient };
