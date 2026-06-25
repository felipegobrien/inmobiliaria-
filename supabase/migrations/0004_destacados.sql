-- =============================================================
-- Inmuebles destacados
-- =============================================================
alter table properties add column if not exists featured boolean not null default false;
alter table properties add column if not exists featured_at timestamptz;

-- Índice para ordenar destacados primero (el último destacado va de primero)
create index if not exists idx_properties_featured
  on properties (featured desc, featured_at desc);
