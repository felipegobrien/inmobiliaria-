import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/property.dart';

final supabase = Supabase.instance.client;

class PropertyService {
  /// Buscar inmuebles de la inmobiliaria con filtros combinados.
  /// [ownerId] es obligatorio: esta app solo muestra los inmuebles
  /// de la inmobiliaria dueña de la app.
  static Future<List<Property>> search(String ownerId, PropertyFilters f) async {
    var q = supabase
        .from('properties')
        .select(
            '*, property_images(*), property_amenities(amenity_id), owner:profiles!properties_owner_id_fkey(id, full_name, company, role, verified, avatar_url)')
        .eq('owner_id', ownerId)
        .eq('status', 'activo')
        .or('expires_at.is.null,expires_at.gte.${DateTime.now().toIso8601String()}');

    if (f.operation != null) {
      if (f.operation == 'venta' || f.operation == 'arriendo') {
        q = q.inFilter('operation', [f.operation!, 'venta_arriendo']);
      } else {
        q = q.eq('operation', f.operation!);
      }
    }
    if (f.type != null) q = q.eq('type', f.type!);
    if (f.city != null && f.city!.isNotEmpty) {
      q = q.ilike('city', f.city!);
    }
    if (f.search != null && f.search!.isNotEmpty) {
      final s = f.search!;
      final parts = [
        'title.ilike.%$s%',
        'neighborhood.ilike.%$s%',
        'city.ilike.%$s%',
        'department.ilike.%$s%',
        'description.ilike.%$s%',
        'code.ilike.%$s%',
      ];
      if (RegExp(r'^\d+$').hasMatch(s.trim())) {
        parts.add('ref.eq.${s.trim()}');
      }
      q = q.or(parts.join(','));
    }
    if (f.minPrice != null) q = q.gte('price', f.minPrice!);
    if (f.maxPrice != null) q = q.lte('price', f.maxPrice!);
    if (f.estrato.isNotEmpty) q = q.inFilter('estrato', f.estrato);
    if (f.minBedrooms != null) q = q.gte('bedrooms', f.minBedrooms!);
    if (f.minBathrooms != null) q = q.gte('bathrooms', f.minBathrooms!);
    if (f.minParking != null) q = q.gte('parking_spots', f.minParking!);

    final (col, asc) = switch (f.sortBy) {
      'precio_asc' => ('price', true),
      'precio_desc' => ('price', false),
      'area_desc' => ('area_m2', false),
      _ => ('published_at', false),
    };

    final data = await q
        .order('featured', ascending: false)
        .order('featured_at', ascending: false, nullsFirst: false)
        .order(col, ascending: asc)
        .limit(100);
    var list = (data as List)
        .map((e) => Property.fromJson(e as Map<String, dynamic>))
        .toList();

    // Filtro por características (debe tenerlas todas).
    if (f.amenityIds.isNotEmpty) {
      list = list
          .where((p) => f.amenityIds.every((id) => p.amenityIds.contains(id)))
          .toList();
    }

    // Orden por nivel de destacado: Premium primero, luego Destacado naranja.
    list = [
      ...list.where((p) => p.isPremium),
      ...list.where((p) => p.isOrangeFeatured),
      ...list.where((p) => !p.featured && !p.isPremium),
    ];
    return list;
  }

  /// Inmueble con imágenes y datos del dueño.
  static Future<Property?> getById(String id, {bool registerView = true}) async {
    final data = await supabase
        .from('properties')
        .select(
            '*, property_images(*), property_amenities(amenity_id), owner:profiles!properties_owner_id_fkey(id, full_name, phone, whatsapp, company, role, avatar_url)')
        .eq('id', id)
        .maybeSingle();
    if (data == null) return null;
    if (registerView) {
      supabase.rpc('increment_property_views', params: {'prop_id': id}).then(
        (_) {},
        onError: (_) {},
      );
    }
    return Property.fromJson(data);
  }

  /// Inmuebles por ids (para la lista local de favoritos).
  static Future<List<Property>> byIds(List<String> ids) async {
    if (ids.isEmpty) return [];
    final data = await supabase
        .from('properties')
        .select('*, property_images(*)')
        .inFilter('id', ids)
        .eq('status', 'activo');
    return (data as List)
        .map((e) => Property.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Registrar un lead/consulta de un interesado.
  static Future<void> createInquiry({
    required String propertyId,
    String? senderId,
    required String name,
    String? email,
    String? phone,
    required String message,
  }) async {
    await supabase.from('inquiries').insert({
      'property_id': propertyId,
      'sender_id': senderId,
      'name': name,
      'email': email,
      'phone': phone,
      'message': message,
    });
  }

  // ---- Catálogos ----
  static Future<List<Amenity>> amenities() async {
    final data = await supabase.from('amenities').select('*').order('name');
    return (data as List)
        .map((e) => Amenity.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // ---- Inmobiliaria dueña de la app ----

  /// Perfil de la inmobiliaria por su slug (marca de la app).
  static Future<Map<String, dynamic>?> agencyBySlug(String slug) async {
    final data = await supabase
        .from('profiles')
        .select(
            'id, full_name, company, phone, whatsapp, avatar_url, agency_slug, agency_domain')
        .eq('agency_slug', slug)
        .eq('role', 'inmobiliaria')
        .maybeSingle();
    return data;
  }
}
