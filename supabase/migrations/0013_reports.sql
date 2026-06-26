-- =============================================================
-- Denuncias de publicaciones.
-- Cualquiera puede denunciar; solo el admin ve / gestiona las denuncias.
-- =============================================================
create table if not exists property_reports (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reason      text not null,
  details     text,
  status      text not null default 'pendiente', -- pendiente | resuelta
  created_at  timestamptz not null default now()
);

create index if not exists idx_reports_property on property_reports(property_id);
create index if not exists idx_reports_status on property_reports(status);

alter table property_reports enable row level security;

-- Crear denuncia: cualquiera (incluye anónimo).
create policy "crear denuncia"
  on property_reports for insert with check (true);

-- Ver / gestionar: solo administradores.
create policy "admin ve denuncias"
  on property_reports for select using (is_admin());
create policy "admin edita denuncias"
  on property_reports for update using (is_admin());
create policy "admin borra denuncias"
  on property_reports for delete using (is_admin());
