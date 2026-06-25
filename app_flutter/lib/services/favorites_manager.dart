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
    try {
      // Guardar PRIMERO en la base, y luego actualizar los ids.
      // Así la lista de favoritos se recarga cuando el cambio ya está guardado.
      await PropertyService.toggleFavorite(user.id, propertyId, wasFav);
      final next = Set<String>.from(ids.value);
      wasFav ? next.remove(propertyId) : next.add(propertyId);
      ids.value = next;
    } catch (_) {
      // Si falla, no cambiamos nada.
    }
  }
}
