import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'property-images';

type UploadBody = File | Blob | ArrayBuffer | Uint8Array;

/**
 * Sube una imagen al storage dentro de la carpeta del usuario.
 * Acepta File/Blob (web) o ArrayBuffer/Uint8Array (React Native).
 * Devuelve la URL pública.
 */
export async function uploadPropertyImage(
  supabase: SupabaseClient,
  userId: string,
  body: UploadBody,
  ext = 'jpg',
  contentType?: string,
): Promise<string> {
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    cacheControl: '3600',
    upsert: false,
    contentType: contentType ?? `image/${ext === 'jpg' ? 'jpeg' : ext}`,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
