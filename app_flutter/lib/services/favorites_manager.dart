import 'package:flutter/foundation.dart';
import 'supabase_service.dart';

/// Gestor global de favoritos. Mantiene en memoria los ids del usuario
/// y notifica a la UI cuando cambian.
class FavoritesManager {
  static final FavoritesManager instance = FavoritesManager._();
  FavoritesManager._();

  final ValueNotifier<Set<String>> ids = ValueNotifier({});

  Future<void> load() async {
    final user = supabase.auth.currentUser;
    if (user == null) {
      ids.value = {};
      return;
    }
    try {
      ids.value = await PropertyService.favoriteIds(user.id);
    } catch (_) {
      ids.value = {};
    }
  }

  bool isFavorite(String id) => ids.value.contains(id);

  Future<void> toggle(String propertyId) async {
    final user = supabase.auth.currentUser;
    if (user == null) return;
    final wasFav = ids.value.contains(propertyId);
    // Optimista
    final next = Set<String>.from(ids.value);
    wasFav ? next.remove(propertyId) : next.add(propertyId);
    ids.value = next;
    try {
      await PropertyService.toggleFavorite(user.id, propertyId, wasFav);
    } catch (_) {
      // Revertir
      final revert = Set<String>.from(ids.value);
      wasFav ? revert.add(propertyId) : revert.remove(propertyId);
      ids.value = revert;
    }
  }
}
