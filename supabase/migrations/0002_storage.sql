-- =============================================================
-- Storage: bucket para imágenes de inmuebles
-- =============================================================

-- Bucket público de imágenes
insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;

-- Lectura pública
create policy "imagenes lectura publica"
  on storage.objects for select
  using (bucket_id = 'property-images');

-- Subir: solo usuarios autenticados, dentro de su carpeta (user_id/...)
create policy "subir imagenes propias"
  on storage.objects for insert
  with check (
    bucket_id = 'property-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Borrar: solo el dueño de la carpeta
create policy "borrar imagenes propias"
  on storage.objects for delete
  using (
    bucket_id = 'property-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
