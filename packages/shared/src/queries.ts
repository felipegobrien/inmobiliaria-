import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AgencyRequest,
  Amenity,
  Inquiry,
  Plan,
  Property,
  PropertyFilters,
  PropertyWithImages,
} from './types';

export interface InquiryInput {
  property_id: string;
  sender_id?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  message: string;
}

/** Registrar un lead/consulta de un interesado. */
export async function createInquiry(
  supabase: SupabaseClient,
  input: InquiryInput,
): Promise<void> {
  const { error } = await supabase.from('inquiries').insert(input);
  if (error) throw error;
}

/** Leads de un inmueble (solo el dueño, por RLS). */
export async function getInquiries(
  supabase: SupabaseClient,
  propertyId: string,
): Promise<Inquiry[]> {
  const { data, error } = await supabase
    .from('inquiries')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Inquiry[];
}

/** Mis inmuebles con métricas (vistas ya vienen; agrega nº de contactos). */
export async function getMyPropertiesWithStats(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<(PropertyWithImages & { contacts: number })[]> {
  const props = await getMyProperties(supabase, ownerId);
  const { data } = await supabase.from('inquiries').select('property_id');
  const counts: Record<string, number> = {};
  for (const r of (data ?? []) as { property_id: string }[]) {
    counts[r.property_id] = (counts[r.property_id] ?? 0) + 1;
  }
  return props.map((p) => ({ ...p, contacts: counts[p.id] ?? 0 }));
}

// Datos para crear/editar un inmueble (sin los campos que pone el servidor).
export type PropertyInput = Omit<
  Property,
  'id' | 'owner_id' | 'views_count' | 'ref' | 'code' | 'created_at' | 'updated_at' | 'published_at' | 'location' | 'featured' | 'featured_at' | 'plan' | 'expires_at'
> & {
  latitude?: number | null;
  longitude?: number | null;
  code?: string | null;
  featured?: boolean;
  featured_at?: string | null;
  plan?: string;
  expires_at?: string | null;
};

/**
 * Crear un inmueble y asociar sus imágenes (URLs ya subidas a Storage).
 * Devuelve el id del inmueble creado.
 */
export async function createProperty(
  supabase: SupabaseClient,
  ownerId: string,
  input: PropertyInput,
  imageUrls: string[] = [],
  amenityIds: number[] = [],
): Promise<string> {
  const { latitude, longitude, ...rest } = input;

  const row: Record<string, unknown> = {
    ...rest,
    owner_id: ownerId,
    published_at: rest.status === 'activo' ? new Date().toISOString() : null,
  };
  if (latitude != null && longitude != null) {
    row.location = `SRID=4326;POINT(${longitude} ${latitude})`;
  }

  const { data, error } = await supabase
    .from('properties')
    .insert(row)
    .select('id')
    .single();
  if (error) throw error;

  const propertyId = data.id as string;

  if (imageUrls.length) {
    const images = imageUrls.map((url, i) => ({
      property_id: propertyId,
      url,
      position: i,
      is_cover: i === 0,
    }));
    const { error: imgErr } = await supabase.from('property_images').insert(images);
    if (imgErr) throw imgErr;
  }

  if (amenityIds.length) {
    const rows = amenityIds.map((amenity_id) => ({
      property_id: propertyId,
      amenity_id,
    }));
    const { error: amErr } = await supabase.from('property_amenities').insert(rows);
    if (amErr) throw amErr;
  }

  return propertyId;
}

const PAGE_SIZE = 20;

const SORT_MAP: Record<NonNullable<PropertyFilters['sortBy']>, { col: string; asc: boolean }> = {
  recientes: { col: 'published_at', asc: false },
  precio_asc: { col: 'price', asc: true },
  precio_desc: { col: 'price', asc: false },
  area_desc: { col: 'area_m2', asc: false },
};

/**
 * Buscar inmuebles con filtros combinados.
 * Devuelve { data, count } para paginación.
 */
export async function searchProperties(
  supabase: SupabaseClient,
  filters: PropertyFilters = {},
): Promise<{ data: PropertyWithImages[]; count: number }> {
  const page = filters.page ?? 0;
  const pageSize = filters.pageSize ?? PAGE_SIZE;

  let query = supabase
    .from('properties')
    .select(
      '*, property_images(*), owner:profiles!properties_owner_id_fkey(id, full_name, company, role, verified, avatar_url)',
      { count: 'exact' },
    )
    .eq('status', 'activo')
    .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`);

  if (filters.operation) {
    // venta_arriendo cubre ambas; si piden venta o arriendo, incluir también el combinado
    if (filters.operation === 'venta' || filters.operation === 'arriendo') {
      query = query.in('operation', [filters.operation, 'venta_arriendo']);
    } else {
      query = query.eq('operation', filters.operation);
    }
  }
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.ownerId) query = query.eq('owner_id', filters.ownerId);
  if (filters.city) query = query.ilike('city', filters.city);
  if (filters.search) {
    const s = filters.search;
    const parts = [
      `title.ilike.%${s}%`,
      `neighborhood.ilike.%${s}%`,
      `city.ilike.%${s}%`,
      `department.ilike.%${s}%`,
      `description.ilike.%${s}%`,
      `code.ilike.%${s}%`,
    ];
    if (/^\d+$/.test(s.trim())) parts.push(`ref.eq.${s.trim()}`);
    query = query.or(parts.join(','));
  }
  if (filters.minPrice != null) query = query.gte('price', filters.minPrice);
  if (filters.maxPrice != null) query = query.lte('price', filters.maxPrice);
  if (filters.estrato?.length) query = query.in('estrato', filters.estrato);
  if (filters.minBedrooms != null) query = query.gte('bedrooms', filters.minBedrooms);
  if (filters.minBathrooms != null) query = query.gte('bathrooms', filters.minBathrooms);
  if (filters.minParking != null) query = query.gte('parking_spots', filters.minParking);
  if (filters.minArea != null) query = query.gte('area_m2', filters.minArea);
  if (filters.maxArea != null) query = query.lte('area_m2', filters.maxArea);

  // Destacados primero (el último en destacarse va de primero).
  query = query
    .order('featured', { ascending: false })
    .order('featured_at', { ascending: false, nullsFirst: false });

  const sort = SORT_MAP[filters.sortBy ?? 'recientes'];
  query = query.order(sort.col, { ascending: sort.asc, nullsFirst: false });

  const from = page * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  return { data: (data ?? []) as PropertyWithImages[], count: count ?? 0 };
}

/** Actualizar un inmueble existente (solo el dueño, por RLS). */
export async function updateProperty(
  supabase: SupabaseClient,
  id: string,
  input: PropertyInput,
  newImageUrls: string[] = [],
  amenityIds?: number[],
): Promise<void> {
  const { latitude, longitude, ...rest } = input;

  const row: Record<string, unknown> = {
    ...rest,
    published_at: rest.status === 'activo' ? new Date().toISOString() : null,
  };
  if (latitude != null && longitude != null) {
    row.location = `SRID=4326;POINT(${longitude} ${latitude})`;
  }

  const { error } = await supabase.from('properties').update(row).eq('id', id);
  if (error) throw error;

  // Si se pasan amenidades, reemplazar las existentes.
  if (amenityIds) {
    await supabase.from('property_amenities').delete().eq('property_id', id);
    if (amenityIds.length) {
      const rows = amenityIds.map((amenity_id) => ({
        property_id: id,
        amenity_id,
      }));
      const { error: amErr } = await supabase
        .from('property_amenities')
        .insert(rows);
      if (amErr) throw amErr;
    }
  }

  if (newImageUrls.length) {
    // Posición de las nuevas fotos = después de las existentes.
    const { count } = await supabase
      .from('property_images')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', id);
    const start = count ?? 0;
    const images = newImageUrls.map((url, i) => ({
      property_id: id,
      url,
      position: start + i,
      is_cover: start === 0 && i === 0,
    }));
    const { error: imgErr } = await supabase.from('property_images').insert(images);
    if (imgErr) throw imgErr;
  }
}

/** Republicar: reactiva y renueva el vencimiento según el plan elegido. */
export async function republishProperty(
  supabase: SupabaseClient,
  id: string,
  plan: Plan,
): Promise<void> {
  const now = new Date();
  const { error } = await supabase
    .from('properties')
    .update({
      status: 'activo',
      published_at: now.toISOString(),
      expires_at: new Date(
        now.getTime() + plan.duration_days * 86400000,
      ).toISOString(),
      plan: plan.id,
      featured: plan.is_featured,
      featured_at: plan.is_featured ? now.toISOString() : null,
    })
    .eq('id', id);
  if (error) throw error;
}

/** Cambiar estado de un inmueble (vendido / arrendado / activo / pausado). */
export async function setPropertyStatus(
  supabase: SupabaseClient,
  id: string,
  status: string,
): Promise<void> {
  const { error } = await supabase
    .from('properties')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

/** Eliminar un inmueble (sus imágenes y relaciones se borran en cascada). */
export async function deleteProperty(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from('properties').delete().eq('id', id);
  if (error) throw error;
}

/** Eliminar una imagen específica de un inmueble. */
export async function deletePropertyImage(
  supabase: SupabaseClient,
  imageId: string,
): Promise<void> {
  const { error } = await supabase.from('property_images').delete().eq('id', imageId);
  if (error) throw error;
}

/** Obtener un inmueble con imágenes y datos del dueño. */
export async function getProperty(
  supabase: SupabaseClient,
  id: string,
): Promise<PropertyWithImages | null> {
  const { data, error } = await supabase
    .from('properties')
    .select('*, property_images(*), property_amenities(amenity_id), owner:profiles!properties_owner_id_fkey(id, full_name, phone, whatsapp, avatar_url, company, verified, role, agency_slug)')
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null; // no rows
    throw error;
  }
  // Registrar vista (sin bloquear)
  void supabase.rpc('increment_property_views', { prop_id: id });
  return data as PropertyWithImages;
}

const DETAIL_SELECT =
  '*, property_images(*), property_amenities(amenity_id), owner:profiles!properties_owner_id_fkey(id, full_name, phone, whatsapp, avatar_url, company, verified, role, agency_slug)';

/** Obtener un inmueble por su número de referencia (para URLs amigables). */
export async function getPropertyByRef(
  supabase: SupabaseClient,
  ref: number,
): Promise<PropertyWithImages | null> {
  const { data, error } = await supabase
    .from('properties')
    .select(DETAIL_SELECT)
    .eq('ref', ref)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  void supabase.rpc('increment_property_views', { prop_id: data.id });
  return data as PropertyWithImages;
}

/** Slug amigable para la URL del inmueble: "apartamento-en-arriendo-el-poblado-1042". */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function propertySlug(p: {
  type: string;
  operation: string;
  neighborhood: string | null;
  city: string;
  ref: number;
}): string {
  const opWord = p.operation === 'arriendo' ? 'en arriendo' : 'en venta';
  const words = [p.type, opWord, p.neighborhood ?? '', p.city]
    .filter(Boolean)
    .join(' ');
  return `${slugify(words)}-${p.ref}`;
}

export function propertyPath(p: {
  type: string;
  operation: string;
  neighborhood: string | null;
  city: string;
  ref: number;
}): string {
  return `/inmueble/${propertySlug(p)}`;
}

/** Inmuebles del usuario autenticado (incluye borradores/pausados). */
export async function getMyProperties(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<PropertyWithImages[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('*, property_images(*)')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PropertyWithImages[];
}

// ---- Inmobiliarias (agencias) ----

/** ¿La promo de inmobiliaria de este perfil está vigente? */
export function isAgencyPromoActive(promoUntil: string | null): boolean {
  return !!promoUntil && new Date(promoUntil).getTime() > Date.now();
}

/** Perfil (rol, empresa, promo) por id. */
export async function getProfile(
  supabase: SupabaseClient,
  id: string,
): Promise<{
  role: string;
  company: string | null;
  agency_promo_until: string | null;
} | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, company, agency_promo_until')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as any) ?? null;
}

/** Crear solicitud para registrarse como inmobiliaria. */
export async function createAgencyRequest(
  supabase: SupabaseClient,
  input: {
    user_id: string;
    company: string;
    nit?: string | null;
    phone?: string | null;
    city?: string | null;
    description?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from('agency_requests').insert(input);
  if (error) throw error;
}

/** Solicitudes de inmobiliaria (admin). */
export async function listAgencyRequests(
  supabase: SupabaseClient,
): Promise<AgencyRequest[]> {
  const { data, error } = await supabase
    .from('agency_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AgencyRequest[];
}

/** Aprobar inmobiliaria: marca la solicitud y actualiza el perfil. */
export async function approveAgency(
  supabase: SupabaseClient,
  request: AgencyRequest,
  promoDays: number | null,
): Promise<void> {
  await supabase
    .from('agency_requests')
    .update({ status: 'aprobada' })
    .eq('id', request.id);
  const update: Record<string, unknown> = {
    role: 'inmobiliaria',
    company: request.company,
    verified: true,
    agency_slug: slugify(request.company),
  };
  if (promoDays && promoDays > 0) {
    update.agency_promo_until = new Date(
      Date.now() + promoDays * 86400000,
    ).toISOString();
  }
  const { error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', request.user_id);
  if (error) throw error;
}

export async function rejectAgency(
  supabase: SupabaseClient,
  requestId: string,
): Promise<void> {
  const { error } = await supabase
    .from('agency_requests')
    .update({ status: 'rechazada' })
    .eq('id', requestId);
  if (error) throw error;
}

/** Buscar inmobiliaria por slug o por id (uuid). Devuelve perfil público. */
export async function getAgencyByParam(
  supabase: SupabaseClient,
  param: string,
): Promise<{
  id: string;
  full_name: string | null;
  company: string | null;
  verified: boolean;
  role: string;
  avatar_url: string | null;
} | null> {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      param,
    );
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, company, verified, role, avatar_url')
    .eq(isUuid ? 'id' : 'agency_slug', param)
    .maybeSingle();
  if (error) throw error;
  return (data as any) ?? null;
}

/** Inmuebles activos de una inmobiliaria (para su página). */
export async function getAgencyProperties(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<PropertyWithImages[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('*, property_images(*)')
    .eq('owner_id', ownerId)
    .eq('status', 'activo')
    .order('featured', { ascending: false })
    .order('published_at', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as PropertyWithImages[];
}

/** Denunciar una publicación. */
export async function createReport(
  supabase: SupabaseClient,
  propertyId: string,
  reason: string,
  details?: string,
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from('property_reports').insert({
    property_id: propertyId,
    reporter_id: auth.user?.id ?? null,
    reason,
    details: details ?? null,
  });
  if (error) throw error;
}

/** Inmueble liviano para los pines del mapa (estilo Airbnb). */
export interface MapPin {
  id: string;
  title: string;
  price: number;
  operation: string;
  type: string;
  neighborhood: string | null;
  city: string;
  bedrooms: number;
  bathrooms: number;
  area_m2: number | null;
  featured: boolean;
  plan: string;
  ref: number;
  lat: number;
  lng: number;
  cover_url: string | null;
}

/** Inmuebles dentro del recuadro visible del mapa (búsqueda por área). */
export async function getPropertiesInBounds(
  supabase: SupabaseClient,
  bounds: {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
    limit?: number;
  },
): Promise<MapPin[]> {
  const { data, error } = await supabase.rpc('properties_in_bounds', {
    min_lng: bounds.minLng,
    min_lat: bounds.minLat,
    max_lng: bounds.maxLng,
    max_lat: bounds.maxLat,
    lim: bounds.limit ?? 300,
  });
  if (error) throw error;
  return (data ?? []) as MapPin[];
}

/** Sugerencia de lugar para autocompletar (gratuito, OpenStreetMap). */
export interface PlaceSuggestion {
  label: string;
  lat: number;
  lng: number;
}

/** Sugerencias de lugares (Nominatim/OpenStreetMap), gratis. */
export async function geocodeSuggestions(
  query: string,
): Promise<PlaceSuggestion[]> {
  if (query.trim().length < 3) return [];
  try {
    const url =
      'https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=co&accept-language=es&q=' +
      encodeURIComponent(query);
    const r = await fetch(url, { headers: { 'Accept-Language': 'es' } });
    if (!r.ok) return [];
    const list = (await r.json()) as Array<{
      display_name: string;
      lat: string;
      lon: string;
    }>;
    return list.map((e) => ({
      label: e.display_name,
      lat: parseFloat(e.lat),
      lng: parseFloat(e.lon),
    }));
  } catch {
    return [];
  }
}

/** Geocodifica una dirección/barrio/ciudad a coordenadas (OpenStreetMap). */
export async function geocodeAddress(
  query: string,
): Promise<{ lat: number; lng: number } | null> {
  if (!query.trim()) return null;
  try {
    const url =
      'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=co&q=' +
      encodeURIComponent(query);
    const r = await fetch(url, {
      headers: { 'Accept-Language': 'es' },
    });
    if (!r.ok) return null;
    const list = (await r.json()) as Array<{ lat: string; lon: string }>;
    if (!list.length) return null;
    return { lat: parseFloat(list[0].lat), lng: parseFloat(list[0].lon) };
  } catch {
    return null;
  }
}

/** Planes de publicación. */
export async function getPlans(supabase: SupabaseClient): Promise<Plan[]> {
  const { data, error } = await supabase.from('plans').select('*').order('sort');
  if (error) throw error;
  return (data ?? []) as Plan[];
}

/** Leer un ajuste de la app (ej. datos de pago). */
export async function getSetting(
  supabase: SupabaseClient,
  key: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) throw error;
  return (data?.value as string | undefined) ?? null;
}

/** Catálogo de amenidades (características). */
export async function getAmenities(supabase: SupabaseClient): Promise<Amenity[]> {
  const { data, error } = await supabase.from('amenities').select('*').order('name');
  if (error) throw error;
  return (data ?? []) as Amenity[];
}

/** Autocompletado de ciudades por prefijo. */
export async function searchCities(
  supabase: SupabaseClient,
  q: string,
): Promise<string[]> {
  if (!q) return [];
  const { data, error } = await supabase.rpc('search_cities', { q });
  if (error) throw error;
  return (data ?? []).map((r: any) => r.city as string);
}

/** Autocompletado de barrios por prefijo (opcionalmente filtrado por ciudad). */
export async function searchNeighborhoods(
  supabase: SupabaseClient,
  q: string,
  city?: string,
): Promise<string[]> {
  if (!q) return [];
  const { data, error } = await supabase.rpc('search_neighborhoods', {
    q,
    c: city ?? null,
  });
  if (error) throw error;
  return (data ?? []).map((r: any) => r.neighborhood as string);
}

/** Alternar favorito. */
export async function toggleFavorite(
  supabase: SupabaseClient,
  userId: string,
  propertyId: string,
  isFav: boolean,
): Promise<void> {
  if (isFav) {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('property_id', propertyId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('favorites')
      .insert({ user_id: userId, property_id: propertyId });
    if (error) throw error;
  }
}

/** Ids de los inmuebles marcados como favoritos por el usuario. */
export async function getFavoriteIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select('property_id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.property_id as string);
}

/** Favoritos del usuario. */
export async function getFavorites(
  supabase: SupabaseClient,
  userId: string,
): Promise<PropertyWithImages[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select('property:properties(*, property_images(*))')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.property).filter(Boolean) as PropertyWithImages[];
}
