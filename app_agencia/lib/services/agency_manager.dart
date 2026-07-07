import '../config.dart';
import 'supabase_service.dart';

/// Datos de la inmobiliaria dueña de esta app.
class Agency {
  final String id;
  final String name;
  final String? phone;
  final String? whatsapp;
  final String? avatarUrl;
  final String slug;

  /// Dominio propio de la inmobiliaria (ej. "inmobiliariagomez.com").
  /// Si es null, su sitio vive en `/sitio/<slug>` del dominio principal.
  final String? domain;

  Agency({
    required this.id,
    required this.name,
    this.phone,
    this.whatsapp,
    this.avatarUrl,
    required this.slug,
    this.domain,
  });

  /// Número para WhatsApp/llamadas (usa whatsapp y si no hay, el teléfono).
  String? get contactNumber {
    final n = whatsapp ?? phone;
    return (n == null || n.isEmpty) ? null : n;
  }

  /// URL base del sitio web de marca blanca de la inmobiliaria.
  /// Los enlaces que se comparten desde la app siempre caen en SU sitio,
  /// nunca en el portal general.
  String get siteBase => (domain != null && domain!.isNotEmpty)
      ? 'https://$domain'
      : '${Config.siteUrl}/sitio/$slug';
}

/// Carga y guarda en memoria el perfil de la inmobiliaria configurada
/// en Config.agencySlug. Se carga una vez al arrancar la app.
class AgencyManager {
  static Agency? current;

  static Future<Agency> load() async {
    final slug = Config.agencySlug;
    if (slug.isEmpty) {
      throw StateError(
          'Falta AGENCY_SLUG. Compila con --dart-define=AGENCY_SLUG=<slug>.');
    }
    final data = await PropertyService.agencyBySlug(slug);
    if (data == null) {
      throw StateError('No existe una inmobiliaria con slug "$slug".');
    }
    current = Agency(
      id: data['id'] as String,
      name: (data['company'] as String?) ??
          (data['full_name'] as String?) ??
          'Inmobiliaria',
      phone: data['phone'] as String?,
      whatsapp: data['whatsapp'] as String?,
      avatarUrl: data['avatar_url'] as String?,
      slug: data['agency_slug'] as String,
      domain: data['agency_domain'] as String?,
    );
    return current!;
  }
}
