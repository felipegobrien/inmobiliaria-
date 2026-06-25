-- =============================================================
-- Slug amigable para la página de cada inmobiliaria (SEO)
-- /inmobiliaria/<nombre>  en vez de  /inmobiliaria/<uuid>
-- =============================================================
alter table profiles add column if not exists agency_slug text;

-- Backfill: generar slug a partir del nombre de la empresa (sin tildes)
with ag as (
  select id,
    trim(both '-' from regexp_replace(
      lower(translate(coalesce(company, 'inmobiliaria'),
        'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunaeiouun')),
      '[^a-z0-9]+', '-', 'g')) as base,
    row_number() over (
      partition by lower(coalesce(company, '')) order by created_at
    ) as rn
  from profiles
  where role = 'inmobiliaria' and agency_slug is null
)
update profiles p
set agency_slug = case when ag.rn = 1 then ag.base else ag.base || '-' || ag.rn end
from ag
where p.id = ag.id and ag.base <> '';

create unique index if not exists idx_profiles_agency_slug
  on profiles (agency_slug) where agency_slug is not null;
