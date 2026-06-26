-- =============================================================
-- Código de la propiedad (lo elige el usuario; si no, se asigna solo).
-- Sirve para buscar por código. Las URLs siguen usando "ref".
-- =============================================================
alter table properties add column if not exists code text;

-- Las que ya existen: su código es su referencia.
update properties set code = ref::text where code is null;

-- Código único (sin distinguir mayúsculas/minúsculas).
create unique index if not exists idx_properties_code
  on properties (lower(code)) where code is not null;

-- Si no se envía código al crear, se usa la referencia (ref).
create or replace function set_property_code()
returns trigger as $$
begin
  if new.code is null or btrim(new.code) = '' then
    new.code := new.ref::text;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_property_code on properties;
create trigger trg_property_code
  before insert on properties
  for each row execute function set_property_code();
