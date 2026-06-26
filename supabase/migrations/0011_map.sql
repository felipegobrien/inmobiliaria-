-- =============================================================
-- Mapa estilo Airbnb: búsqueda de inmuebles por área visible.
--  1) Backfill de coordenadas para los inmuebles que no tienen
--     (se dispersan alrededor del centro de su ciudad).
--  2) Función que devuelve los inmuebles dentro del recuadro
--     visible del mapa (bounding box) + lat/lng + foto de portada.
-- =============================================================

-- 1) Centros aproximados de las principales ciudades de Colombia
with centros(ciudad, lat, lng) as (
  values
    ('bogota', 4.7110, -74.0721),
    ('bogotá', 4.7110, -74.0721),
    ('medellin', 6.2442, -75.5812),
    ('medellín', 6.2442, -75.5812),
    ('cali', 3.4516, -76.5320),
    ('cartagena', 10.3910, -75.4794),
    ('barranquilla', 10.9685, -74.7813),
    ('bucaramanga', 7.1193, -73.1227),
    ('pereira', 4.8133, -75.6961),
    ('santa marta', 11.2408, -74.1990),
    ('cucuta', 7.8939, -72.5078),
    ('cúcuta', 7.8939, -72.5078),
    ('manizales', 5.0703, -75.5138),
    ('ibague', 4.4389, -75.2322),
    ('ibagué', 4.4389, -75.2322),
    ('pasto', 1.2136, -77.2811),
    ('villavicencio', 4.1420, -73.6266),
    ('armenia', 4.5339, -75.6811)
)
update properties p
set location = ST_SetSRID(
    ST_MakePoint(
      c.lng + (random() - 0.5) * 0.06,   -- dispersión ~±3 km
      c.lat + (random() - 0.5) * 0.06
    ), 4326)::geography
from centros c
where p.location is null
  and lower(trim(p.city)) = c.ciudad;

-- 2) Inmuebles dentro del recuadro visible del mapa
create or replace function properties_in_bounds(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision,
  lim int default 300
)
returns table (
  id uuid,
  title text,
  price numeric,
  operation text,
  type text,
  neighborhood text,
  city text,
  bedrooms int,
  bathrooms int,
  featured boolean,
  plan text,
  ref bigint,
  lat double precision,
  lng double precision,
  cover_url text
)
language sql
stable
as $$
  select
    p.id, p.title, p.price, p.operation::text, p.type::text,
    p.neighborhood, p.city, p.bedrooms, p.bathrooms,
    p.featured, p.plan, p.ref,
    ST_Y(p.location::geometry) as lat,
    ST_X(p.location::geometry) as lng,
    (select url from property_images i
       where i.property_id = p.id
       order by i.is_cover desc, i.position asc
       limit 1) as cover_url
  from properties p
  where p.status = 'activo'
    and (p.expires_at is null or p.expires_at >= now())
    and p.location is not null
    and ST_Intersects(
          p.location::geometry,
          ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326))
  -- Premium primero, luego destacados, luego el resto
  order by (p.plan = 'premium') desc, p.featured desc, p.published_at desc
  limit lim;
$$;
