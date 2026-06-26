-- =============================================================
-- Mapa: agregar área (m²) a la información del pin.
-- (cambia el tipo de retorno -> hay que DROP + CREATE)
-- =============================================================
drop function if exists properties_in_bounds(
  double precision, double precision, double precision, double precision, int);

create function properties_in_bounds(
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
  area_m2 numeric,
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
    p.neighborhood, p.city, p.bedrooms, p.bathrooms, p.area_m2,
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
  order by (p.plan = 'premium') desc, p.featured desc, p.published_at desc
  limit lim;
$$;
