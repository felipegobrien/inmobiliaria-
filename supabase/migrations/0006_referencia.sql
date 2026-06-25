-- =============================================================
-- Número de referencia corto para URLs amigables (SEO)
-- =============================================================
create sequence if not exists properties_ref_seq start 1000;

alter table properties add column if not exists ref bigint;

update properties set ref = nextval('properties_ref_seq') where ref is null;

alter table properties alter column ref set default nextval('properties_ref_seq');
alter table properties alter column ref set not null;

create unique index if not exists idx_properties_ref on properties (ref);
