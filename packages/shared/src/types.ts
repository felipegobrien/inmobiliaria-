// Tipos compartidos entre web y app — reflejan el esquema de la base de datos.

export type OperationType = 'venta' | 'arriendo' | 'venta_arriendo';

export type PropertyType =
  | 'apartamento'
  | 'casa'
  | 'apartaestudio'
  | 'local'
  | 'oficina'
  | 'bodega'
  | 'lote'
  | 'finca'
  | 'consultorio'
  | 'edificio'
  | 'parqueadero';

export type PropertyStatus =
  | 'borrador'
  | 'activo'
  | 'pausado'
  | 'vendido'
  | 'arrendado';

export type UserRole = 'usuario' | 'agente' | 'inmobiliaria' | 'admin';

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  avatar_url: string | null;
  role: UserRole;
  bio: string | null;
  company: string | null;
  verified: boolean;
  agency_promo_until: string | null;
  agency_slug: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgencyRequest {
  id: string;
  user_id: string;
  company: string;
  nit: string | null;
  phone: string | null;
  city: string | null;
  description: string | null;
  status: string; // pendiente | aprobada | rechazada
  created_at: string;
}

export interface PropertyImage {
  id: string;
  property_id: string;
  url: string;
  position: number;
  is_cover: boolean;
  created_at: string;
}

export interface Property {
  id: string;
  owner_id: string;

  title: string;
  description: string | null;
  operation: OperationType;
  type: PropertyType;
  status: PropertyStatus;

  price: number;
  admon_fee: number | null;
  price_negotiable: boolean;

  estrato: number | null;
  bedrooms: number;
  bathrooms: number;
  parking_spots: number;
  area_m2: number | null;
  built_area_m2: number | null;
  floor: number | null;
  age_years: number | null;

  department: string;
  city: string;
  neighborhood: string | null;
  address: string | null;
  location: unknown | null; // GeoJSON Point
  nearby_places: string[];

  views_count: number;
  ref: number;
  code: string | null;
  featured: boolean;
  featured_at: string | null;
  plan: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

// Inmueble con sus relaciones (lo que normalmente muestra la UI)
export interface PropertyWithImages extends Property {
  property_images: PropertyImage[];
  owner?: Pick<Profile, 'id' | 'full_name' | 'phone' | 'whatsapp' | 'avatar_url' | 'company' | 'verified' | 'role' | 'agency_slug'>;
  property_amenities?: { amenity_id: number }[];
}

// Filtros del buscador
export interface PropertyFilters {
  operation?: OperationType;
  type?: PropertyType;
  city?: string;
  search?: string;          // texto libre (título / barrio)
  minPrice?: number;
  maxPrice?: number;
  estrato?: number[];       // ej. [3, 4]
  minBedrooms?: number;
  minBathrooms?: number;
  minParking?: number;
  minArea?: number;
  maxArea?: number;
  amenities?: number[];     // ids de amenidades
  sortBy?: 'recientes' | 'precio_asc' | 'precio_desc' | 'area_desc';
  page?: number;
  pageSize?: number;
}

export interface Inquiry {
  id: string;
  property_id: string;
  sender_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  created_at: string;
}

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  is_featured: boolean;
  sort: number;
}

export type AmenityCategory =
  | 'interiores'
  | 'zonas_comunes'
  | 'sector'
  | 'general';

export interface Amenity {
  id: number;
  name: string;
  icon: string | null;
  category: AmenityCategory;
}

export const AMENITY_CATEGORY_LABELS: Record<AmenityCategory, string> = {
  interiores: 'Interiores',
  zonas_comunes: 'Zonas comunes y exteriores',
  sector: 'Características del sector',
  general: 'Otras',
};

// 32 departamentos de Colombia + Bogotá D.C.
export const COLOMBIA_DEPARTMENTS = [
  'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bogotá D.C.', 'Bolívar',
  'Boyacá', 'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó',
  'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira',
  'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío',
  'Risaralda', 'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima',
  'Valle del Cauca', 'Vaupés', 'Vichada',
] as const;
