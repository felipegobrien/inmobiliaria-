import 'dart:async';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import '../models/property.dart';
import '../theme.dart';
import '../services/supabase_service.dart';
import 'detail_screen.dart';

String _area(num v) =>
    v == v.roundToDouble() ? v.toInt().toString() : v.toString();

class MapScreen extends StatefulWidget {
  /// Centro inicial opcional (p. ej. la ciudad que se está buscando).
  final LatLng? initialCenter;
  const MapScreen({super.key, this.initialCenter});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final _map = MapController();
  Timer? _debounce;
  List<MapPin> _pins = [];
  MapPin? _selected;
  bool _loading = false;

  // Centro por defecto: Colombia (Bogotá).
  static const _fallback = LatLng(4.7110, -74.0721);
  bool _located = false;

  /// Pide permiso, obtiene la ubicación y centra el mapa ahí.
  Future<void> _locate({bool initial = false}) async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        if (!initial) _toast('Activa la ubicación del dispositivo.');
        return;
      }
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied ||
          perm == LocationPermission.deniedForever) {
        if (!initial) _toast('Permiso de ubicación denegado.');
        return;
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      ).timeout(const Duration(seconds: 10));
      if (!mounted) return;
      _located = true;
      _map.move(LatLng(pos.latitude, pos.longitude), 14);
      _reload();
    } catch (_) {
      if (!initial && mounted) _toast('No pudimos obtener tu ubicación.');
    }
  }

  void _toast(String m) => ScaffoldMessenger.of(context)
      .showSnackBar(SnackBar(content: Text(m)));

  void _scheduleReload() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), _reload);
  }

  Future<void> _reload() async {
    final LatLngBounds bounds;
    try {
      bounds = _map.camera.visibleBounds;
    } catch (_) {
      return; // el mapa aún no está listo
    }
    setState(() => _loading = true);
    try {
      final pins = await PropertyService.propertiesInBounds(
        minLng: bounds.west,
        minLat: bounds.south,
        maxLng: bounds.east,
        maxLat: bounds.north,
      );
      if (!mounted) return;
      setState(() {
        _pins = pins;
        _loading = false;
        // Si el pin seleccionado ya no está en el área, lo ocultamos.
        if (_selected != null && !pins.any((p) => p.id == _selected!.id)) {
          _selected = null;
        }
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          FlutterMap(
            mapController: _map,
            options: MapOptions(
              initialCenter: widget.initialCenter ?? _fallback,
              initialZoom: 12,
              minZoom: 4,
              maxZoom: 18,
              onMapReady: () {
                _reload();
                if (widget.initialCenter == null && !_located) {
                  _locate(initial: true);
                }
              },
              onPositionChanged: (camera, hasGesture) {
                if (hasGesture) _scheduleReload();
              },
              onTap: (_, __) => setState(() => _selected = null),
            ),
            children: [
              TileLayer(
                urlTemplate:
                    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.example.inmobiliaria',
              ),
              MarkerLayer(
                markers: [
                  for (final p in _pins)
                    Marker(
                      point: LatLng(p.lat, p.lng),
                      width: 96,
                      height: 38,
                      alignment: Alignment.center,
                      child: _PricePill(
                        pin: p,
                        selected: _selected?.id == p.id,
                        onTap: () => setState(() => _selected = p),
                      ),
                    ),
                ],
              ),
            ],
          ),

          // Botón volver
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            left: 12,
            child: _circleButton(
              icon: Icons.arrow_back,
              onTap: () => Navigator.pop(context),
            ),
          ),

          // Botón localizarme
          Positioned(
            right: 12,
            bottom: (_selected != null
                    ? 140
                    : MediaQuery.of(context).padding.bottom) +
                24,
            child: _circleButton(
              icon: Icons.my_location,
              onTap: () => _locate(),
            ),
          ),

          // Indicador de carga + contador
          Positioned(
            top: MediaQuery.of(context).padding.top + 10,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(999),
                  boxShadow: [
                    BoxShadow(
                        color: Colors.black.withValues(alpha: 0.15),
                        blurRadius: 8),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_loading) ...[
                      const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: AppColors.primary),
                      ),
                      const SizedBox(width: 8),
                    ],
                    Text(
                      _loading
                          ? 'Buscando en esta zona…'
                          : '${_pins.length} inmuebles en esta zona',
                      style: const TextStyle(
                          fontWeight: FontWeight.w700, fontSize: 13),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Tarjeta del inmueble seleccionado
          if (_selected != null)
            Positioned(
              left: 12,
              right: 12,
              bottom: MediaQuery.of(context).padding.bottom + 14,
              child: _SelectedCard(
                pin: _selected!,
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) =>
                          DetailScreen(propertyId: _selected!.id)),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _circleButton({required IconData icon, required VoidCallback onTap}) =>
      GestureDetector(
        onTap: onTap,
        child: Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                  color: Colors.black.withValues(alpha: 0.18), blurRadius: 8),
            ],
          ),
          child: Icon(icon, color: AppColors.text),
        ),
      );
}

// Burbuja con el precio (estilo Airbnb).
class _PricePill extends StatelessWidget {
  final MapPin pin;
  final bool selected;
  final VoidCallback onTap;
  const _PricePill(
      {required this.pin, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final Color bg;
    final Color fg;
    if (selected) {
      bg = AppColors.primary;
      fg = Colors.white;
    } else if (pin.isPremium) {
      bg = const Color(0xFF33333A);
      fg = const Color(0xFFE8C66A);
    } else if (pin.isOrangeFeatured) {
      bg = const Color(0xFFF97316);
      fg = Colors.white;
    } else {
      bg = Colors.white;
      fg = AppColors.text;
    }
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
              color: selected ? AppColors.primary : const Color(0x22000000)),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.22), blurRadius: 6),
          ],
        ),
        child: Text(
          _short(pin.price),
          style: TextStyle(
              color: fg, fontWeight: FontWeight.w800, fontSize: 13),
        ),
      ),
    );
  }

  String _short(int v) {
    if (v >= 1000000) {
      final m = v / 1000000;
      return '\$${m.toStringAsFixed(m >= 10 ? 0 : 1)}M';
    }
    if (v >= 1000) return '\$${(v / 1000).round()}K';
    return '\$$v';
  }
}

// Tarjeta inferior con la foto y datos del inmueble seleccionado.
class _SelectedCard extends StatelessWidget {
  final MapPin pin;
  final VoidCallback onTap;
  const _SelectedCard({required this.pin, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.2), blurRadius: 14),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Row(
          children: [
            SizedBox(
              width: 120,
              height: 130,
              child: (pin.coverUrl != null && pin.coverUrl!.isNotEmpty)
                  ? CachedNetworkImage(
                      imageUrl: pin.coverUrl!,
                      fit: BoxFit.cover,
                      placeholder: (_, __) =>
                          Container(color: const Color(0xFFF1F1F3)),
                      errorWidget: (_, __, ___) => Container(
                        color: const Color(0xFFF1F1F3),
                        child: const Icon(Icons.image_not_supported_outlined,
                            color: Colors.grey),
                      ),
                    )
                  : Container(
                      color: const Color(0xFFF1F1F3),
                      child: const Icon(Icons.home_outlined, color: Colors.grey),
                    ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      pin.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          height: 1.2),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      formatPrice(pin.price) +
                          (pin.operation != 'venta' ? ' / mes' : ''),
                      style: const TextStyle(
                          fontSize: 17, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      [pin.neighborhood, pin.city]
                          .where((e) => e != null && e.isNotEmpty)
                          .join(', '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          color: AppColors.textMuted, fontSize: 13),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(Icons.king_bed_outlined,
                            size: 16, color: AppColors.textMuted),
                        const SizedBox(width: 4),
                        Text('${pin.bedrooms}',
                            style: const TextStyle(fontSize: 13)),
                        const SizedBox(width: 12),
                        const Icon(Icons.bathtub_outlined,
                            size: 16, color: AppColors.textMuted),
                        const SizedBox(width: 4),
                        Text('${pin.bathrooms}',
                            style: const TextStyle(fontSize: 13)),
                        if (pin.areaM2 != null) ...[
                          const SizedBox(width: 12),
                          const Icon(Icons.straighten,
                              size: 16, color: AppColors.textMuted),
                          const SizedBox(width: 4),
                          Text('${_area(pin.areaM2!)} m²',
                              style: const TextStyle(fontSize: 13)),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const Padding(
              padding: EdgeInsets.only(right: 8),
              child: Icon(Icons.chevron_right, color: AppColors.textMuted),
            ),
          ],
        ),
      ),
    );
  }
}
