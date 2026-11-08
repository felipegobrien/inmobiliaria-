-- ============================================================
-- Blog / guías: tabla de artículos para SEO y contenido editorial
-- ============================================================

create table if not exists posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null,
  excerpt      text,
  content      text not null default '',   -- cuerpo en Markdown
  cover_url    text,
  status       text not null default 'borrador'
               check (status in ('borrador', 'publicado')),
  author_id    uuid references profiles(id) on delete set null,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Listado de publicados por fecha (uso más común).
create index if not exists posts_status_pub_idx
  on posts (status, published_at desc);

-- updated_at automático (reutiliza el helper existente).
drop trigger if exists trg_posts_updated on posts;
create trigger trg_posts_updated
  before update on posts
  for each row execute function set_updated_at();

-- ---- RLS ----
alter table posts enable row level security;

-- Cualquiera puede leer los artículos publicados.
drop policy if exists "lectura publica de posts publicados" on posts;
create policy "lectura publica de posts publicados" on posts
  for select using (status = 'publicado');

-- Solo admin gestiona (crear, editar, borrar y ver borradores).
drop policy if exists "admin gestiona posts" on posts;
create policy "admin gestiona posts" on posts
  for all using (is_admin()) with check (is_admin());
