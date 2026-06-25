-- =============================================================
-- Inmobiliarias (agencias): solicitudes, aprobación y promo
-- =============================================================

-- Solicitudes de registro como inmobiliaria
create table if not exists agency_requests (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  company     text not null,
  nit         text,
  phone       text,
  city        text,
  description text,
  status      text not null default 'pendiente', -- pendiente | aprobada | rechazada
  created_at  timestamptz not null default now()
);

alter table agency_requests enable row level security;

create policy "crear mi solicitud de inmobiliaria"
  on agency_requests for insert with check (user_id = auth.uid());
create policy "ver mi solicitud o admin"
  on agency_requests for select using (user_id = auth.uid() or is_admin());
create policy "admin gestiona solicitudes"
  on agency_requests for update using (is_admin());

-- Promo de la inmobiliaria: publica gratis y destacado hasta esta fecha
alter table profiles add column if not exists agency_promo_until timestamptz;

-- Ajustes de la promo (editables desde el panel admin)
insert into app_settings (key, value) values
  ('agency_promo_enabled', 'true'),
  ('agency_promo_days', '90')
on conflict (key) do nothing;
