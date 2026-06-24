-- =============================================================
-- Portal Inmobiliario — Esquema inicial
-- Postgres + Supabase (Auth, Storage, PostGIS)
-- =============================================================

-- Extensiones
create extension if not exists "uuid-ossp";
create extension if not exists postgis;
create extension if not exists pg_trgm; -- búsqueda por texto (títulos, barrios)

-- =============================================================
-- ENUMS
-- =============================================================
create type operation_type as enum ('venta', 'arriendo', 'venta_arriendo');
create type property_type as enum (
  'apartamento', 'casa', 'apartaestudio', 'local', 'oficina',
  'bodega', 'lote', 'finca', 'consultorio', 'edificio', 'parqueadero'
);
create type property_status as enum ('borrador', 'activo', 'pausado', 'vendido', 'arrendado');
create type user_role as enum ('usuario', 'agente', 'inmobiliaria', 'admin');

-- =============================================================
-- PROFILES (extiende auth.users)
-- =============================================================
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  whatsapp    text,
  avatar_url  text,
  role        user_role not null default 'usuario',
  bio         text,
  company     text,            -- nombre de la inmobiliaria si aplica
  verified    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- =============================================================
-- PROPERTIES (inmuebles)
-- =============================================================
create table properties (
  id              uuid primary key default uuid_generate_v4(),
  owner_id        uuid not null references profiles(id) on delete cascade,

  -- Básico
  title           text not null,
  description     text,
  operation       operation_type not null,
  type            property_type not null,
  status          property_status not null default 'borrador',

  -- Precio (COP)
  price           bigint not null,            -- venta o canon de arriendo
  admon_fee       bigint default 0,           -- administración mensual
  price_negotiable boolean not null default false,

  -- Características numéricas (filtros principales)
  estrato         smallint check (estrato between 1 and 6),
  bedrooms        smallint not null default 0,
  bathrooms       smallint not null default 0,
  parking_spots   smallint not null default 0,
  area_m2         numeric(10,2),              -- área total
  built_area_m2   numeric(10,2),              -- área construida
  floor           smallint,                   -- piso en que se ubica
  age_years       smallint,                   -- antigüedad

  -- Ubicación
  department      text not null,              -- ej. "Antioquia"
  city            text not null,              -- ej. "Medellín"
  neighborhood    text,                       -- barrio
  address         text,
  location        geography(Point, 4326),     -- lat/lon para mapas y "cerca de mí"

  -- Metadatos
  views_count     integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  published_at    timestamptz
);

-- =============================================================
-- IMÁGENES
-- =============================================================
create table property_images (
  id          uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  url         text not null,
  position    smallint not null default 0,    -- orden de la galería
  is_cover    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- =============================================================
-- AMENIDADES (piscina, gimnasio, ascensor, etc.)
-- =============================================================
create table amenities (
  id    serial primary key,
  name  text not null unique,
  icon  text
);

create table property_amenities (
  property_id uuid not null references properties(id) on delete cascade,
  amenity_id  integer not null references amenities(id) on delete cascade,
  primary key (property_id, amenity_id)
);

-- =============================================================
-- FAVORITOS
-- =============================================================
create table favorites (
  user_id     uuid not null references profiles(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, property_id)
);

-- =============================================================
-- CONSULTAS / CONTACTO (interesado -> dueño)
-- =============================================================
create table inquiries (
  id          uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  sender_id   uuid references profiles(id) on delete set null,
  name        text not null,
  email       text,
  phone       text,
  message     text not null,
  created_at  timestamptz not null default now()
);

-- =============================================================
-- ÍNDICES (para filtros rápidos)
-- =============================================================
create index idx_properties_status      on properties(status);
create index idx_properties_operation   on properties(operation);
create index idx_properties_type        on properties(type);
create index idx_properties_city        on properties(city);
create index idx_properties_price       on properties(price);
create index idx_properties_estrato     on properties(estrato);
create index idx_properties_bedrooms    on properties(bedrooms);
create index idx_properties_bathrooms   on properties(bathrooms);
create index idx_properties_owner       on properties(owner_id);
create index idx_properties_published   on properties(published_at desc);
-- Índice geoespacial para mapas / cercanía
create index idx_properties_location    on properties using gist(location);
-- Índice de texto para búsqueda por título/barrio
create index idx_properties_title_trgm  on properties using gin(title gin_trgm_ops);
create index idx_properties_neigh_trgm  on properties using gin(neighborhood gin_trgm_ops);
-- Índice compuesto para el filtro típico del portal
create index idx_properties_search on properties(status, operation, type, city, price);

create index idx_property_images_property on property_images(property_id);
create index idx_favorites_user           on favorites(user_id);

-- =============================================================
-- TRIGGERS: updated_at automático
-- =============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated
  before update on profiles
  for each row execute function set_updated_at();

create trigger trg_properties_updated
  before update on properties
  for each row execute function set_updated_at();

-- Crear profile automáticamente al registrarse un usuario
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =============================================================
-- FUNCIÓN: incrementar vistas
-- =============================================================
create or replace function increment_property_views(prop_id uuid)
returns void as $$
  update properties set views_count = views_count + 1 where id = prop_id;
$$ language sql;

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================
alter table profiles            enable row level security;
alter table properties          enable row level security;
alter table property_images     enable row level security;
alter table property_amenities  enable row level security;
alter table favorites           enable row level security;
alter table inquiries           enable row level security;

-- PROFILES: todos pueden leer; cada quien edita el suyo
create policy "perfiles visibles para todos"
  on profiles for select using (true);
create policy "editar mi perfil"
  on profiles for update using (auth.uid() = id);

-- PROPERTIES: inmuebles activos visibles para todos; el dueño ve/gestiona los suyos
create policy "inmuebles activos visibles"
  on properties for select
  using (status in ('activo','vendido','arrendado') or owner_id = auth.uid());
create policy "crear mis inmuebles"
  on properties for insert with check (owner_id = auth.uid());
create policy "editar mis inmuebles"
  on properties for update using (owner_id = auth.uid());
create policy "borrar mis inmuebles"
  on properties for delete using (owner_id = auth.uid());

-- IMÁGENES: visibles si el inmueble es visible; gestiona el dueño
create policy "imagenes visibles"
  on property_images for select using (true);
create policy "gestionar imagenes propias"
  on property_images for all
  using (exists (
    select 1 from properties p
    where p.id = property_images.property_id and p.owner_id = auth.uid()
  ));

-- AMENIDADES del inmueble: visibles para todos; gestiona el dueño
create policy "amenidades visibles"
  on property_amenities for select using (true);
create policy "gestionar amenidades propias"
  on property_amenities for all
  using (exists (
    select 1 from properties p
    where p.id = property_amenities.property_id and p.owner_id = auth.uid()
  ));

-- FAVORITOS: cada quien gestiona los suyos
create policy "ver mis favoritos"
  on favorites for select using (user_id = auth.uid());
create policy "gestionar mis favoritos"
  on favorites for all using (user_id = auth.uid());

-- INQUIRIES: el dueño del inmueble las lee; cualquiera puede crear
create policy "dueño lee consultas"
  on inquiries for select
  using (exists (
    select 1 from properties p
    where p.id = inquiries.property_id and p.owner_id = auth.uid()
  ));
create policy "cualquiera puede consultar"
  on inquiries for insert with check (true);

-- =============================================================
-- DATOS SEMILLA: amenidades comunes
-- =============================================================
insert into amenities (name, icon) values
  ('Piscina', 'pool'),
  ('Gimnasio', 'dumbbell'),
  ('Ascensor', 'elevator'),
  ('Portería 24h', 'shield'),
  ('Parqueadero visitantes', 'car'),
  ('Zona BBQ', 'flame'),
  ('Salón comunal', 'users'),
  ('Cancha', 'volleyball'),
  ('Zona infantil', 'baby'),
  ('Balcón', 'home'),
  ('Terraza', 'sun'),
  ('Aire acondicionado', 'wind'),
  ('Calentador', 'thermometer'),
  ('Cocina integral', 'utensils'),
  ('Closets', 'shirt'),
  ('Vigilancia', 'camera'),
  ('Gas natural', 'flame'),
  ('Permite mascotas', 'dog');
