# Portal Inmobiliario

Portal tipo FincaRaíz: los usuarios se registran, publican inmuebles y buscan/filtran
por precio, estrato, habitaciones, baños, ubicación y más. **Web y app móvil comparten
la misma base de datos** (Supabase).

## Arquitectura

```
inmobiliaria/                  (monorepo — npm workspaces)
├── supabase/migrations/       Esquema SQL (tablas, índices, RLS, storage)
├── packages/shared/           Tipos + cliente Supabase + consultas (web y app)
├── app_flutter/               App móvil principal (Flutter)
├── app_agencia/               App de marca blanca: una app propia por cada
│                              inmobiliaria (solo su catálogo, sin publicar).
│                              Ver app_agencia/README.md
└── apps/
    ├── web/                   Next.js (React)  — sitio web
    └── mobile/                Expo (React Native) — app iOS/Android
```

- **Base de datos:** Supabase (Postgres + Auth + Storage + PostGIS para mapas).
- **Código compartido** en `packages/shared`: una sola fuente de verdad para tipos y queries.

## Puesta en marcha

### 1. Base de datos (una sola vez)
En el **SQL Editor** de tu proyecto Supabase, ejecuta en orden:
1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_storage.sql`

### 2. Variables de entorno
Copia los ejemplos y completa con tus claves (Dashboard → Project Settings → API):
- `apps/web/.env.local`   ← desde `apps/web/.env.local.example`
- `apps/mobile/.env`      ← desde `apps/mobile/.env.example`

### 3. Instalar dependencias (desde la raíz)
```bash
npm install
```

### 4. Ejecutar
```bash
npm run web      # Web en http://localhost:3000
npm run mobile   # App: abre Expo (escanea el QR con Expo Go)
```

## Estado actual
- [x] Esquema completo de base de datos (inmuebles, perfiles, imágenes, favoritos, consultas)
- [x] Seguridad por filas (RLS) — cada usuario gestiona lo suyo
- [x] Paquete compartido: tipos, cliente y consultas con filtros combinados
- [x] Web: home con buscador y filtros (precio, estrato, habitaciones, baños, tipo, orden)
- [x] App: listado y búsqueda básica
- [ ] Autenticación (registro/login) en web y app
- [ ] Formulario de publicar inmueble + subida de fotos
- [ ] Ficha de detalle del inmueble + contacto/WhatsApp
- [ ] Mapa de búsqueda (PostGIS)
- [ ] Favoritos y panel "Mis inmuebles"
```
