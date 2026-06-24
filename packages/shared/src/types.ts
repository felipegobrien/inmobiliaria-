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
  created_at: string;
  updated_at: string;
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

  views_count: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

// Inmueble con sus relaciones (lo que normalmente muestra la UI)
export interface PropertyWithImages extends Property {
  property_images: PropertyImage[];
  owner?: Pick<Profile, 'id' | 'full_name' | 'phone' | 'whatsapp' | 'avatar_url' | 'company' | 'verified'>;
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

export interface Amenity {
  id: number;
  name: string;
  icon: string | null;
}
