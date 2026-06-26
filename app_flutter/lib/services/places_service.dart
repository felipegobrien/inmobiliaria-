import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config.dart';

/// Sugerencia de autocompletado de Google Places.
class PlaceSuggestion {
  final String placeId;
  final String main; // texto principal (ej. "Calle 10 #5-20")
  final String secondary; // texto secundario (ej. "El Poblado, Medellín")

  PlaceSuggestion(
      {required this.placeId, required this.main, required this.secondary});

  String get full =>
      secondary.isEmpty ? main : '$main, $secondary';
}

/// Autocompletado y detalle de lugares con Google Places API (New).
class PlacesService {
  static const _base = 'https://places.googleapis.com/v1';

  /// Sugerencias mientras se escribe. [lat]/[lng] sesgan a la zona cercana.
  static Future<List<PlaceSuggestion>> autocomplete(
    String input, {
    double? lat,
    double? lng,
  }) async {
    if (input.trim().length < 3) return [];
    try {
      final body = <String, dynamic>{
        'input': input,
        'languageCode': 'es',
        'regionCode': 'co',
        'includedRegionCodes': ['co'],
      };
      if (lat != null && lng != null) {
        body['locationBias'] = {
          'circle': {
            'center': {'latitude': lat, 'longitude': lng},
            'radius': 30000.0, // 30 km alrededor de lo que se ve
          }
        };
      }
      final r = await http
          .post(
            Uri.parse('$_base/places:autocomplete'),
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': Config.googlePlacesKey,
            },
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 8));
      if (r.statusCode != 200) return [];
      final data = jsonDecode(r.body) as Map<String, dynamic>;
      final list = (data['suggestions'] as List?) ?? [];
      return [
        for (final s in list)
          if (s['placePrediction'] != null)
            PlaceSuggestion(
              placeId: s['placePrediction']['placeId'] as String,
              main: (s['placePrediction']['structuredFormat']?['mainText']
                      ?['text'] as String?) ??
                  (s['placePrediction']['text']?['text'] as String? ?? ''),
              secondary: (s['placePrediction']['structuredFormat']
                      ?['secondaryText']?['text'] as String?) ??
                  '',
            ),
      ];
    } catch (_) {
      return [];
    }
  }

  /// Coordenadas de un lugar a partir de su placeId.
  static Future<({double lat, double lng})?> details(String placeId) async {
    try {
      final r = await http.get(
        Uri.parse('$_base/places/$placeId'),
        headers: {
          'X-Goog-Api-Key': Config.googlePlacesKey,
          'X-Goog-FieldMask': 'location',
        },
      ).timeout(const Duration(seconds: 8));
      if (r.statusCode != 200) return null;
      final data = jsonDecode(r.body) as Map<String, dynamic>;
      final loc = data['location'] as Map<String, dynamic>?;
      if (loc == null) return null;
      return (
        lat: (loc['latitude'] as num).toDouble(),
        lng: (loc['longitude'] as num).toDouble(),
      );
    } catch (_) {
      return null;
    }
  }
}
