-- =============================================================
-- Características categorizadas + lugares cercanos + autocompletado
-- =============================================================

-- 1) Categoría en amenidades (interiores / zonas_comunes / sector)
alter table amenities add column if not exists category text not null default 'general';

-- 2) Lugares cercanos en el inmueble (lista de textos libres)
alter table properties add column if not exists nearby_places text[] not null default '{}';

-- =============================================================
-- 3) Catálogo de características (upsert por nombre, con categoría)
-- =============================================================
insert into amenities (name, category) values
  -- Interiores
  ('Cocina tipo americano', 'interiores'),
  ('Cocina integral', 'interiores'),
  ('Cocina lineal', 'interiores'),
  ('Closets', 'interiores'),
  ('Vestier / Walk-in closet', 'interiores'),
  ('Balcón', 'interiores'),
  ('Terraza', 'interiores'),
  ('Estudio', 'interiores'),
  ('Cuarto de servicio', 'interiores'),
  ('Chimenea', 'interiores'),
  ('Aire acondicionado', 'interiores'),
  ('Calentador', 'interiores'),
  ('Gas natural', 'interiores'),
  ('Pisos en madera', 'interiores'),
  -- Zonas comunes y exteriores
  ('Salón comunal', 'zonas_comunes'),
  ('Jardín', 'zonas_comunes'),
  ('Conjunto cerrado', 'zonas_comunes'),
  ('Piscina', 'zonas_comunes'),
  ('Gimnasio', 'zonas_comunes'),
  ('Ascensor', 'zonas_comunes'),
  ('Portería 24h', 'zonas_comunes'),
  ('Vigilancia', 'zonas_comunes'),
  ('Parqueadero visitantes', 'zonas_comunes'),
  ('Zona BBQ', 'zonas_comunes'),
  ('Cancha', 'zonas_comunes'),
  ('Zona infantil', 'zonas_comunes'),
  ('Turco / Sauna', 'zonas_comunes'),
  ('Zona húmeda', 'zonas_comunes'),
  ('Permite mascotas', 'zonas_comunes'),
  -- Sector
  ('Cerca Centros Comerciales', 'sector'),
  ('Cerca Colegios / Universidades', 'sector'),
  ('Cerca Parques', 'sector'),
  ('Cerca Supermercados', 'sector'),
  ('Cerca Transporte Público', 'sector'),
  ('Cerca Vías Principales', 'sector'),
  ('Área Rural', 'sector'),
  ('Área Urbana', 'sector')
on conflict (name) do update set category = excluded.category;

-- =============================================================
-- 4) Funciones de autocompletado (ciudades / barrios)
-- =============================================================
create or replace function search_cities(q text)
returns table(city text)
language sql stable
as $$
  select distinct p.city
  from properties p
  where p.city ilike q || '%'
  order by p.city
  limit 20;
$$;

create or replace function search_neighborhoods(q text, c text default null)
returns table(neighborhood text)
language sql stable
as $$
  select distinct p.neighborhood
  from properties p
  where p.neighborhood is not null
    and p.neighborhood ilike q || '%'
    and (c is null or p.city ilike c)
  order by p.neighborhood
  limit 20;
$$;
