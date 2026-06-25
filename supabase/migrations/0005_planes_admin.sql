-- =============================================================
-- Planes de publicación, ajustes y administración
-- =============================================================

-- Helper: ¿el usuario actual es admin?
create or replace function is_admin()
returns boolean
language sql stable security definer
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ---- PLANES ----
create table if not exists plans (
  id            text primary key,        -- 'estandar' | 'destacado'
  name          text not null,
  description   text,
  price         bigint not null default 0,
  duration_days integer not null default 30,
  is_featured   boolean not null default false,
  sort          integer not null default 0
);

insert into plans (id, name, description, price, duration_days, is_featured, sort) values
  ('estandar', 'Estándar', 'Publicación normal por 30 días.', 0, 30, false, 0),
  ('destacado', 'Destacado', 'Aparece de primero con etiqueta "Destacado" por 30 días.', 20000, 30, true, 1)
on conflict (id) do nothing;

alter table plans enable row level security;
create policy "planes visibles" on plans for select using (true);
create policy "admin edita planes" on plans for update using (is_admin());

-- ---- AJUSTES (ej. datos de pago) ----
create table if not exists app_settings (
  key   text primary key,
  value text
);

insert into app_settings (key, value) values
  ('bancolombia_info',
   'Cuenta de Ahorros Bancolombia\nNº 000-000000-00\nA nombre de: TU NOMBRE\nEnvía el comprobante por WhatsApp.')
on conflict (key) do nothing;

alter table app_settings enable row level security;
create policy "ajustes visibles" on app_settings for select using (true);
create policy "admin edita ajustes" on app_settings for all using (is_admin());

-- ---- PERFILES: bloqueo + administración ----
alter table profiles add column if not exists blocked boolean not null default false;

create policy "admin gestiona perfiles" on profiles for update using (is_admin());

-- ---- INMUEBLES: plan + vencimiento + moderación ----
alter table properties add column if not exists plan text not null default 'estandar';
alter table properties add column if not exists expires_at timestamptz;

create policy "admin gestiona inmuebles" on properties for all using (is_admin());

create index if not exists idx_properties_expires on properties (expires_at);
