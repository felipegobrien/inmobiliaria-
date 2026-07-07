# App de marca blanca por inmobiliaria

Plantilla de app Flutter para que **cada inmobiliaria registrada tenga su propia
app instalable**, separada de la app principal (`app_flutter`, que no se toca).

Qué tiene la app de cada inmobiliaria:

- **Solo los inmuebles de esa inmobiliaria** (filtrados por su perfil en Supabase).
- Búsqueda, filtros, detalle con fotos, favoritos (guardados en el teléfono, sin
  necesidad de cuenta) y pestaña de contacto (WhatsApp / llamada).
- **Sin opción de publicar**: es solo catálogo. Los inmuebles se siguen subiendo
  desde la app principal con la cuenta de la inmobiliaria.
- Nombre, color, logo y paquete Android propios, así cada app se instala y se
  publica en Play Store **de forma independiente**.

Usa la **misma base de datos** (Supabase) que la app y la web principales: si la
inmobiliaria publica o edita un inmueble en la app principal, su app propia se
actualiza sola.

> **Requisito:** ejecutar la migración `supabase/migrations/0015_agency_domain.sql`
> en el SQL Editor de Supabase (agrega la columna `agency_domain` que usan la
> app y el sitio web de marca blanca).

## Sitio web de marca blanca

Cada inmobiliaria también tiene su **sitio web propio**, servido por la web del
proyecto (`apps/web`) pero aislado: solo su logo, su contacto y sus inmuebles,
sin enlaces al portal general.

- **Sin dominio propio:** su sitio vive en
  `https://<dominio-principal>/sitio/<slug>` (ej. `/sitio/propierty`).
- **Con dominio propio:** se guarda el dominio en su perfil
  (`profiles.agency_domain`, ej. `inmobiliariagomez.com`) y se agrega ese
  dominio al proyecto de Vercel (Settings → Domains). El proxy de la web
  detecta el dominio y sirve su sitio con URLs limpias
  (`https://inmobiliariagomez.com/inmueble/...`).

Los botones **Compartir** de esta app siempre generan enlaces al sitio de la
inmobiliaria (su dominio si lo tiene, o `/sitio/<slug>` si no) — nunca al
portal general. El dominio se lee de la base de datos al abrir la app, así que
al conectar un dominio **no hace falta recompilar la app**.

## Generar la app de una inmobiliaria

Requisito: la inmobiliaria debe estar aprobada (rol `inmobiliaria`) y tener
`agency_slug` en su perfil (se asigna automáticamente al aprobarla).

Desde esta carpeta, en PowerShell:

```powershell
.\crear_app.ps1 -Slug "inmobiliaria-gomez" -Nombre "Inmobiliaria Gómez"
```

Opciones:

| Opción | Para qué |
|---|---|
| `-Color "#0F766E"` | Color principal de la app (botones, íconos). |
| `-Logo "C:\ruta\logo.png"` | Ícono de la app (PNG cuadrado, ideal 1024×1024). |
| `-PaqueteId "com.inmobiliariagomez.app"` | Identificador único en Android/Play Store. Si no se pasa, se deriva del slug (`com.inmobiliaria.<slug>`). |
| `-Aab` | Genera un `.aab` (para subir a Play Store) en vez de `.apk`. |

El resultado queda en `salidas\<slug>\<slug>.apk` (o `.aab`).

Como cada app tiene su propio `applicationId`, se pueden instalar varias en el
mismo teléfono y **cada una se publica en Play Console como una app distinta**.

## Probar en el computador / emulador

```powershell
flutter pub get
flutter run --dart-define=AGENCY_SLUG=inmobiliaria-gomez --dart-define="APP_NAME=Inmobiliaria Gómez"
```

## Publicar en Play Store (cada inmobiliaria)

1. Generar el bundle: `.\crear_app.ps1 -Slug ... -Nombre ... -Aab`
2. En [Play Console](https://play.google.com/console) crear una **app nueva**.
3. Subir el `.aab` de `salidas\<slug>\`.
4. Completar ficha (nombre, descripción, capturas) y enviar a revisión.

> **Pendiente para producción:** la compilación release firma con la clave de
> debug (igual que la app principal). Antes de subir a Play Store hay que crear
> un keystore propio (idealmente uno por inmobiliaria) y configurarlo en
> `android/app/build.gradle.kts`.

## Cómo funciona por dentro

- `crear_app.ps1` compila con `--dart-define` (slug, nombre, color) y variables
  de entorno (`AGENCY_APP_ID`, `AGENCY_APP_NAME`) que lee
  `android/app/build.gradle.kts` para el paquete y el nombre visible.
- Al arrancar, la app busca el perfil de la inmobiliaria por `AGENCY_SLUG`
  (`lib/services/agency_manager.dart`) y toma de ahí nombre, logo y teléfonos.
- Todas las consultas de inmuebles filtran por `owner_id` de la inmobiliaria
  (`lib/services/supabase_service.dart`).
