// Configuración de Supabase. La anon key es pública por diseño.
class Config {
  static const supabaseUrl = 'https://ebdvhdcjwdpabhnkbhjd.supabase.co';
  static const supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViZHZoZGNqd2RwYWJobmtiaGpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNjUwNjAsImV4cCI6MjA5Nzg0MTA2MH0.4RKwnmEdUr0xEayWQI9fsgxJIW6co6DVGY5PgbnSP3o';

  static const propertyImagesBucket = 'property-images';

  // URL pública de la web (para compartir inmuebles).
  static const siteUrl = 'https://inmobiliaria-web-blush.vercel.app';

  // ---- Marca blanca: valores inyectados al compilar cada app ----
  // flutter build apk --dart-define=AGENCY_SLUG=mi-inmobiliaria ...

  /// Slug de la inmobiliaria dueña de esta app (profiles.agency_slug).
  static const agencySlug = String.fromEnvironment('AGENCY_SLUG');

  /// Nombre visible dentro de la app. Si está vacío se usa el nombre
  /// de la inmobiliaria cargado de la base de datos.
  static const appName = String.fromEnvironment('APP_NAME');

  /// Color principal en hex, ej. "#047857". Vacío = verde por defecto.
  static const primaryColorHex = String.fromEnvironment('PRIMARY_COLOR');
}
