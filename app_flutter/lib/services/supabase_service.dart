import 'dart:typed_data';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config.dart';
import '../models/property.dart';

final supabase = Supabase.instance.client;

class PropertyService {
  /// Buscar inmuebles con filtros combinados.
  static Future<List<Property>> search(PropertyFilters f) async {
    var q = supabase
        .from('properties')
        .select(
            '*, property_images(*), property_amenities(amenity_id), owner:profiles!properties_owner_id_fkey(id, full_name, company, role, verified, avatar_url)')
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
      q = q.or('title.ilike.%$s%,neighborhood.ilike.%$s%,city.ilike.%$s%,'
          'department.ilike.%$s%,description.ilike.%$s%');
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
        .limit(50);
    var list = (data as List)
        .map((e) => Property.fromJson(e as Map<String, dynamic>))
        .toList();

    // Filtro por características (debe tenerlas todas).
    if (f.amenityIds.isNotEmpty) {
      list = list
          .where((p) => f.amenityIds.every((id) => p.amenityIds.contains(id)))
          .toList();
    }

    // Orden por nivel de destacado: Premium (negro) primero, luego Destacado
    // (naranja), luego el resto. Conserva el orden secundario de la consulta.
    list = [
      ...list.where((p) => p.isPremium),
      ...list.where((p) => p.isOrangeFeatured),
      ...list.where((p) => !p.featured && !p.isPremium),
    ];
    return list;
  }

  /// Inmueble con imágenes y datos del dueño.
  static Future<Property?> getById(String id) async {
    final data = await supabase
        .from('properties')
        .select(
            '*, property_images(*), property_amenities(amenity_id), owner:profiles!properties_owner_id_fkey(id, full_name, phone, whatsapp, company, role, avatar_url)')
        .eq('id', id)
        .maybeSingle();
    if (data == null) return null;
    // Registrar vista (sin bloquear)
    supabase.rpc('increment_property_views', params: {'prop_id': id}).then(
      (_) {},
      onError: (_) {},
    );
    return Property.fromJson(data);
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

  /// Leads de un inmueble (solo el dueño, por RLS).
  static Future<List<Map<String, dynamic>>> inquiries(String propertyId) async {
    final data = await supabase
        .from('inquiries')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', ascending: false);
    return (data as List).cast<Map<String, dynamic>>();
  }

  /// Mis inmuebles con nº de contactos (las vistas vienen en el inmueble).
  static Future<List<(Property, int)>> myPropertiesWithStats(
      String ownerId) async {
    final props = await myProperties(ownerId);
    final data = await supabase.from('inquiries').select('property_id');
    final counts = <String, int>{};
    for (final r in (data as List)) {
      final id = r['property_id'] as String;
      counts[id] = (counts[id] ?? 0) + 1;
    }
    return props.map((p) => (p, counts[p.id] ?? 0)).toList();
  }

  /// Inmuebles del usuario actual.
  static Future<List<Property>> myProperties(String ownerId) async {
    final data = await supabase
        .from('properties')
        .select('*, property_images(*)')
        .eq('owner_id', ownerId)
        .order('created_at', ascending: false);
    return (data as List)
        .map((e) => Property.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Crear inmueble con imágenes y características.
  static Future<String> create(
    Map<String, dynamic> payload,
    List<String> imageUrls,
    List<int> amenityIds,
  ) async {
    final inserted = await supabase
        .from('properties')
        .insert(payload)
        .select('id')
        .single();
    final id = inserted['id'] as String;
    if (imageUrls.isNotEmpty) {
      final rows = [
        for (var i = 0; i < imageUrls.length; i++)
          {
            'property_id': id,
            'url': imageUrls[i],
            'position': i,
            'is_cover': i == 0,
          }
      ];
      await supabase.from('property_images').insert(rows);
    }
    if (amenityIds.isNotEmpty) {
      await supabase.from('property_amenities').insert(
            amenityIds.map((a) => {'property_id': id, 'amenity_id': a}).toList(),
          );
    }
    return id;
  }

  /// Actualizar inmueble existente (datos + características + nuevas fotos).
  static Future<void> update(
    String id,
    Map<String, dynamic> payload,
    List<String> newImageUrls,
    List<int> amenityIds,
  ) async {
    await supabase.from('properties').update(payload).eq('id', id);

    // Reemplazar características
    await supabase.from('property_amenities').delete().eq('property_id', id);
    if (amenityIds.isNotEmpty) {
      await supabase.from('property_amenities').insert(
            amenityIds.map((a) => {'property_id': id, 'amenity_id': a}).toList(),
          );
    }

    // Agregar fotos nuevas al final
    if (newImageUrls.isNotEmpty) {
      final existing = await supabase
          .from('property_images')
          .select('id')
          .eq('property_id', id);
      final count = (existing as List).length;
      final rows = [
        for (var i = 0; i < newImageUrls.length; i++)
          {
            'property_id': id,
            'url': newImageUrls[i],
            'position': count + i,
            'is_cover': count == 0 && i == 0,
          }
      ];
      await supabase.from('property_images').insert(rows);
    }
  }

  static Future<void> deleteImage(String imageId) async {
    await supabase.from('property_images').delete().eq('id', imageId);
  }

  /// Republicar: reactiva y renueva el vencimiento según el plan elegido.
  static Future<void> republish(String id, Plan plan) async {
    final now = DateTime.now();
    await supabase.from('properties').update({
      'status': 'activo',
      'published_at': now.toIso8601String(),
      'expires_at': now.add(Duration(days: plan.durationDays)).toIso8601String(),
      'plan': plan.id,
      'featured': plan.isFeatured,
      'featured_at': plan.isFeatured ? now.toIso8601String() : null,
    }).eq('id', id);
  }

  /// Cambiar estado (vendido / arrendado / activo / pausado).
  static Future<void> setStatus(String id, String status) async {
    await supabase.from('properties').update({'status': status}).eq('id', id);
  }

  static Future<void> delete(String id) async {
    await supabase.from('properties').delete().eq('id', id);
  }

  // ---- Catálogos y autocompletado ----
  static Future<List<Amenity>> amenities() async {
    final data = await supabase.from('amenities').select('*').order('name');
    return (data as List)
        .map((e) => Amenity.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  static Future<List<String>> searchCities(String q) async {
    if (q.isEmpty) return [];
    final data = await supabase.rpc('search_cities', params: {'q': q});
    return (data as List).map((e) => e['city'] as String).toList();
  }

  static Future<List<String>> searchNeighborhoods(String q, String? city) async {
    if (q.isEmpty) return [];
    final data = await supabase
        .rpc('search_neighborhoods', params: {'q': q, 'c': city});
    return (data as List).map((e) => e['neighborhood'] as String).toList();
  }

  // ---- Planes y ajustes ----
  static Future<List<Plan>> plans() async {
    final data = await supabase.from('plans').select('*').order('sort');
    return (data as List)
        .map((e) => Plan.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  static Future<void> updatePlanPrice(String id, int price) async {
    await supabase.from('plans').update({'price': price}).eq('id', id);
  }

  static Future<String?> getSetting(String key) async {
    final data = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();
    return data?['value'] as String?;
  }

  static Future<void> setSetting(String key, String value) async {
    await supabase.from('app_settings').upsert({'key': key, 'value': value});
  }

  // ---- Inmobiliarias ----
  static Future<Map<String, dynamic>?> myProfile() async {
    final user = supabase.auth.currentUser;
    if (user == null) return null;
    final data = await supabase
        .from('profiles')
        .select('role, company, agency_promo_until, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
    return data;
  }

  static Future<void> updateAvatar(String url) async {
    final user = supabase.auth.currentUser;
    if (user == null) return;
    await supabase.from('profiles').update({'avatar_url': url}).eq('id', user.id);
  }

  static bool agencyPromoActive(String? until) =>
      until != null && DateTime.parse(until).isAfter(DateTime.now());

  static Future<void> createAgencyRequest({
    required String company,
    String? nit,
    String? phone,
    String? city,
    String? description,
  }) async {
    final user = supabase.auth.currentUser;
    if (user == null) return;
    await supabase.from('agency_requests').insert({
      'user_id': user.id,
      'company': company,
      'nit': nit,
      'phone': phone,
      'city': city,
      'description': description,
    });
  }

  static Future<List<Map<String, dynamic>>> agencyRequests() async {
    final data = await supabase
        .from('agency_requests')
        .select('*')
        .order('created_at', ascending: false);
    return (data as List).cast<Map<String, dynamic>>();
  }

  static Future<void> approveAgency(
      Map<String, dynamic> req, int? promoDays) async {
    await supabase
        .from('agency_requests')
        .update({'status': 'aprobada'}).eq('id', req['id']);
    final update = <String, dynamic>{
      'role': 'inmobiliaria',
      'company': req['company'],
      'verified': true,
      'agency_slug': await _uniqueAgencySlug(
          slugify(req['company']?.toString() ?? 'inmobiliaria'),
          req['user_id']),
    };
    if (promoDays != null && promoDays > 0) {
      update['agency_promo_until'] =
          DateTime.now().add(Duration(days: promoDays)).toIso8601String();
    }
    await supabase.from('profiles').update(update).eq('id', req['user_id']);
  }

  /// Genera un slug único para la inmobiliaria (agrega -2, -3… si ya existe).
  static Future<String> _uniqueAgencySlug(String base, String userId) async {
    if (base.isEmpty) base = 'inmobiliaria';
    var slug = base;
    var n = 1;
    while (true) {
      final existing = await supabase
          .from('profiles')
          .select('id')
          .eq('agency_slug', slug)
          .neq('id', userId)
          .maybeSingle();
      if (existing == null) return slug;
      n++;
      slug = '$base-$n';
    }
  }

  static Future<void> rejectAgency(String id) async {
    await supabase
        .from('agency_requests')
        .update({'status': 'rechazada'}).eq('id', id);
  }

  static Future<Map<String, dynamic>?> profileById(String id) async {
    final data = await supabase
        .from('profiles')
        .select('full_name, company, avatar_url')
        .eq('id', id)
        .maybeSingle();
    return data;
  }

  static Future<List<Property>> agencyProperties(String ownerId) async {
    final data = await supabase
        .from('properties')
        .select('*, property_images(*)')
        .eq('owner_id', ownerId)
        .eq('status', 'activo')
        .order('featured', ascending: false)
        .order('published_at', ascending: false, nullsFirst: false);
    final list = (data as List)
        .map((e) => Property.fromJson(e as Map<String, dynamic>))
        .toList();
    return [
      ...list.where((p) => p.isPremium),
      ...list.where((p) => p.isOrangeFeatured),
      ...list.where((p) => !p.featured && !p.isPremium),
    ];
  }

  // ---- Administración ----
  static Future<String?> myRole() async {
    final user = supabase.auth.currentUser;
    if (user == null) return null;
    final data = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
    return data?['role'] as String?;
  }

  static Future<List<Map<String, dynamic>>> listProfiles() async {
    final data = await supabase
        .from('profiles')
        .select('id, full_name, phone, role, blocked, created_at')
        .order('created_at', ascending: false);
    return (data as List).cast<Map<String, dynamic>>();
  }

  /// Bloquear/desbloquear: oculta o reactiva sus publicaciones.
  static Future<void> setUserBlocked(String userId, bool blocked) async {
    await supabase.from('profiles').update({'blocked': blocked}).eq('id', userId);
    await supabase
        .from('properties')
        .update({'status': blocked ? 'pausado' : 'activo'})
        .eq('owner_id', userId);
  }

  /// Eliminar todas las publicaciones de un usuario.
  static Future<void> deleteUserProperties(String userId) async {
    await supabase.from('properties').delete().eq('owner_id', userId);
  }

  /// Subir una imagen al storage del usuario. Devuelve URL pública.
  static Future<String> uploadImage(
    String userId,
    Uint8List bytes,
    String ext,
  ) async {
    final path =
        '$userId/${DateTime.now().millisecondsSinceEpoch}_${bytes.length}.$ext';
    await supabase.storage.from(Config.propertyImagesBucket).uploadBinary(
          path,
          bytes,
          fileOptions: FileOptions(
            contentType: ext == 'png' ? 'image/png' : 'image/jpeg',
          ),
        );
    return supabase.storage.from(Config.propertyImagesBucket).getPublicUrl(path);
  }

  // ---- Favoritos ----
  static Future<Set<String>> favoriteIds(String userId) async {
    final data = await supabase
        .from('favorites')
        .select('property_id')
        .eq('user_id', userId);
    return (data as List).map((e) => e['property_id'] as String).toSet();
  }

  static Future<void> toggleFavorite(
    String userId,
    String propertyId,
    bool isFav,
  ) async {
    if (isFav) {
      await supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('property_id', propertyId);
    } else {
      await supabase
          .from('favorites')
          .insert({'user_id': userId, 'property_id': propertyId});
    }
  }

  static Future<List<Property>> favorites(String userId) async {
    final data = await supabase
        .from('favorites')
        .select('property:properties(*, property_images(*))')
        .eq('user_id', userId);
    return (data as List)
        .map((e) => e['property'])
        .where((e) => e != null)
        .map((e) => Property.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
