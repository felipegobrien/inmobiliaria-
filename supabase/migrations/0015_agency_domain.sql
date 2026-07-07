-- =============================================================
-- Dominio propio por inmobiliaria (sitio de marca blanca).
-- Mientras no haya dominio, su sitio vive en /sitio/<slug> del
-- dominio principal. Si conecta dominio, el proxy de la web lo
-- resuelve por este campo.
-- =============================================================
alter table profiles add column if not exists agency_domain text;

-- Un dominio solo puede pertenecer a una inmobiliaria.
create unique index if not exists idx_profiles_agency_domain
  on profiles (lower(agency_domain)) where agency_domain is not null;
