import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Favoritos guardados en el teléfono (sin cuenta ni inicio de sesión).
/// Mantiene la misma interfaz que la app principal para reutilizar la UI.
class FavoritesManager {
  static final FavoritesManager instance = FavoritesManager._();
  FavoritesManager._();

  static const _key = 'favorite_property_ids';

  final ValueNotifier<Set<String>> ids = ValueNotifier({});

  Future<void> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      ids.value = (prefs.getStringList(_key) ?? []).toSet();
    } catch (_) {
      ids.value = {};
    }
  }

  bool isFavorite(String id) => ids.value.contains(id);

  Future<void> toggle(String propertyId) async {
    final next = Set<String>.from(ids.value);
    next.contains(propertyId)
        ? next.remove(propertyId)
        : next.add(propertyId);
    ids.value = next;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList(_key, next.toList());
    } catch (_) {
      // Si no se pudo guardar, el favorito queda solo en memoria.
    }
  }
}
