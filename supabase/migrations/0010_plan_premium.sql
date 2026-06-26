-- =============================================================
-- Plan "Premium": destacado superior (sello negro con letras oro).
-- Aparece de primero, por encima del Destacado (naranja).
-- El precio se puede ajustar desde el panel de administración.
-- =============================================================
insert into plans (id, name, description, price, duration_days, is_featured, sort)
values (
  'premium',
  'Premium',
  'Máxima visibilidad: sello negro con letras doradas y aparece de primero, por encima de los destacados.',
  50000,
  30,
  true,
  2
)
on conflict (id) do nothing;
