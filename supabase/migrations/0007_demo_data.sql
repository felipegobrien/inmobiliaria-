-- =============================================================
-- Datos de DEMOSTRACIÓN (200 inmuebles ficticios)
-- Marcados con is_demo=true para poder borrarlos todos luego.
-- Para borrarlos:  delete from properties where is_demo = true;
-- =============================================================

alter table properties add column if not exists is_demo boolean not null default false;

-- 1) Insertar 200 inmuebles demo (owner = primer admin/usuario existente)
insert into properties (
  owner_id, title, description, operation, type, status, price, admon_fee,
  estrato, bedrooms, bathrooms, parking_spots, area_m2,
  department, city, neighborhood, address, nearby_places,
  plan, is_demo, featured, featured_at, published_at, expires_at
)
select
  (select id from profiles order by (role = 'admin') desc nulls last, created_at asc limit 1),
  initcap(t.typ) || ' en ' || (case when o.op = 'arriendo' then 'arriendo' else 'venta' end)
    || ' en ' || b.barrio,
  'Cómodo ' || t.typ || ' ubicado en ' || b.barrio || ', ' || c.city
    || '. Excelente ubicación, cerca de transporte público, centros comerciales y zonas verdes. '
    || 'Espacios iluminados y bien distribuidos. Ideal para vivir o invertir.',
  o.op::operation_type, t.typ::property_type, 'activo'::property_status,
  case when o.op = 'arriendo'
       then (800000 + floor(random() * 4500000)::bigint)
       else (150000000 + floor(random() * 850000000)::bigint) end,
  case when o.op = 'arriendo' then floor(random() * 400000)::bigint else 0 end,
  1 + floor(random() * 6)::int,
  case when t.typ in ('local','oficina') then 0 else 1 + floor(random() * 4)::int end,
  1 + floor(random() * 3)::int,
  floor(random() * 3)::int,
  (40 + floor(random() * 160))::numeric,
  c.dept, c.city, b.barrio,
  'Calle ' || (1 + floor(random() * 120))::int || ' # '
    || (1 + floor(random() * 80))::int || '-' || (1 + floor(random() * 99))::int,
  '{}',
  'estandar', true,
  (random() < 0.15),
  case when random() < 0.15 then now() - (random() * interval '5 days') else null end,
  now() - (random() * interval '20 days'),
  now() + interval '30 days'
from generate_series(1, 200) g(i)
cross join lateral (
  select * from (values
    ('Antioquia','Medellín',      array['El Poblado','Laureles','Envigado','Belén','Sabaneta','Robledo','La América','Calasanz','Itagüí','Bello']),
    ('Cundinamarca','Bogotá D.C.',array['Chapinero','Usaquén','Cedritos','Chicó','Suba','Salitre','Teusaquillo','Niza','Modelia','Castilla']),
    ('Valle del Cauca','Cali',    array['Granada','San Fernando','Ciudad Jardín','El Peñón','Pance','Tequendama','Normandía','La Flora']),
    ('Bolívar','Cartagena',       array['Bocagrande','Getsemaní','Manga','Castillogrande','Crespo','El Laguito','La Boquilla','Pie de la Popa'])
  ) cc(dept, city, barrios) order by random() limit 1
) c
cross join lateral (select c.barrios[1 + floor(random() * array_length(c.barrios, 1))::int] as barrio) b
cross join lateral (select (array['apartamento','casa','apartaestudio','local','oficina','finca'])[1 + floor(random() * 6)::int] as typ) t
cross join lateral (select (array['venta','arriendo'])[1 + floor(random() * 2)::int] as op) o;

-- 2) Fotos (3 por inmueble, desde un pool de Unsplash)
insert into property_images (property_id, url, position, is_cover)
select
  p.id,
  pool.urls[1 + ((p.ref + s.n) % array_length(pool.urls, 1))],
  s.n,
  (s.n = 0)
from properties p
cross join (
  select array[
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=70',
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&q=70',
    'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&q=70',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=70',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=70',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=70',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&q=70',
    'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&q=70',
    'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1200&q=70',
    'https://images.unsplash.com/photo-1430285561322-7808604715df?w=1200&q=70'
  ] as urls
) pool
cross join generate_series(0, 2) s(n)
where p.is_demo = true
  and not exists (select 1 from property_images pi where pi.property_id = p.id);

-- 3) Características aleatorias (3 a 7 por inmueble)
insert into property_amenities (property_id, amenity_id)
select p.id, a.id
from properties p
cross join lateral (
  select id from amenities order by random() limit (3 + (p.ref % 5))
) a
where p.is_demo = true
  and not exists (
    select 1 from property_amenities pa where pa.property_id = p.id
  );
