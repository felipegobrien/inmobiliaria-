import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_map_marker_cluster/flutter_map_marker_cluster.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import '../models/property.dart';
import '../theme.dart';
import '../services/supabase_service.dart';
import '../widgets/property_card.dart';
import 'detail_screen.dart';

class MapScreen extends StatefulWidget {
  /// Centro inicial opcional (p. ej. la ciudad que se está buscando).
  final LatLng? initialCenter;
  const MapScreen({super.key, this.initialCenter});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final _map = MapController();
  final _placeCtrl = TextEditingController();
  Timer? _debounce;
  List<MapPin> _pins = [];
  MapPin? _selected;
  Property? _selectedProperty; // ficha completa del pin tocado
  bool _loading = false;
  bool _searching = false;

  /// Busca un lugar por nombre/dirección y centra el mapa ahí.
  Future<void> _searchPlace(String q) async {
    if (q.trim().isEmpty) return;
    FocusScope.of(context).unfocus();
    setState(() => _searching = true);
    final c = await PropertyService.geocode(q);
    if (!mounted) return;
    setState(() => _searching = false);
    if (c != null) {
      _closeCard();
      _map.move(LatLng(c.lat, c.lng), 14);
      _reload();
    } else {
      _toast('No encontramos ese lugar.');
    }
  }

  Future<void> _selectPin(MapPin p) async {
    setState(() {
      _selected = p;
      _selectedProperty = null;
    });
    final prop = await PropertyService.getById(p.id, registerView: false);
    if (!mounted || _selected?.id != p.id) return;
    setState(() => _selectedProperty = prop);
  }

  void _closeCard() => setState(() {
        _selected = null;
        _selectedProperty = null;
      });

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
      // 1) Rápido: última posición conocida (casi instantánea).
      final last = await Geolocator.getLastKnownPosition();
      if (last != null && mounted) {
        _located = true;
        _map.move(LatLng(last.latitude, last.longitude), 16);
        _reload();
      }
      // 2) Refina con una lectura nueva (precisión media = más rápida).
      final pos = await Geolocator.getCurrentPosition(
        locationSettings:
            const LocationSettings(accuracy: LocationAccuracy.medium),
      ).timeout(const Duration(seconds: 8));
      if (!mounted) return;
      _located = true;
      _map.move(LatLng(pos.latitude, pos.longitude), 16);
      _reload();
    } catch (_) {
      if (!initial && mounted && !_located) {
        _toast('No pudimos obtener tu ubicación.');
      }
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
        limit: 300,
      );
      if (!mounted) return;
      setState(() {
        _pins = pins;
        _loading = false;
        // Si el pin seleccionado ya no está en el área, lo ocultamos.
        if (_selected != null && !pins.any((p) => p.id == _selected!.id)) {
          _selected = null;
          _selectedProperty = null;
        }
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _placeCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _selected == null,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _closeCard(); // back cierra solo la ficha
      },
      child: Scaffold(
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
              onTap: (_, __) => _closeCard(),
            ),
            children: [
              TileLayer(
                // Mapa claro con detalle de lugares/calles (CartoDB Voyager).
                urlTemplate:
                    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
                subdomains: const ['a', 'b', 'c', 'd'],
                userAgentPackageName: 'com.example.inmobiliaria',
              ),
              MarkerClusterLayerWidget(
                options: MarkerClusterLayerOptions(
                  maxClusterRadius: 50,
                  size: const Size(42, 42),
                  padding: const EdgeInsets.all(50),
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
                          onTap: () => _selectPin(p),
                        ),
                      ),
                  ],
                  builder: (context, markers) => Container(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.primary,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      '${markers.length}',
                      style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 14),
                    ),
                  ),
                ),
              ),
            ],
          ),

          // Barra superior: volver + buscador de lugares
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            left: 12,
            right: 12,
            child: Row(
              children: [
                _circleButton(
                  icon: Icons.arrow_back,
                  onTap: () => Navigator.pop(context),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Container(
                    height: 46,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(999),
                      boxShadow: [
                        BoxShadow(
                            color: Colors.black.withValues(alpha: 0.18),
                            blurRadius: 8),
                      ],
                    ),
                    child: Row(
                      children: [
                        _searching
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: AppColors.primary),
                              )
                            : const Icon(Icons.search,
                                size: 20, color: AppColors.textMuted),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: _placeCtrl,
                            textInputAction: TextInputAction.search,
                            onChanged: (_) => setState(() {}),
                            onSubmitted: _searchPlace,
                            decoration: const InputDecoration(
                              isCollapsed: true,
                              border: InputBorder.none,
                              hintText: 'Busca un lugar o dirección',
                              hintStyle: TextStyle(
                                  color: AppColors.textMuted, fontSize: 14),
                            ),
                          ),
                        ),
                        if (_placeCtrl.text.isNotEmpty)
                          GestureDetector(
                            onTap: () {
                              _placeCtrl.clear();
                              setState(() {});
                            },
                            child: const Icon(Icons.close,
                                size: 18, color: AppColors.textMuted),
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Botón localizarme (se oculta cuando hay una ficha abierta)
          if (_selected == null)
            Positioned(
              right: 12,
              bottom: MediaQuery.of(context).padding.bottom + 24,
              child: _circleButton(
                icon: Icons.my_location,
                onTap: () => _locate(),
              ),
            ),

          // Indicador de carga + contador
          Positioned(
            top: MediaQuery.of(context).padding.top + 66,
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

          // Ficha del inmueble seleccionado (la misma de Buscar)
          if (_selected != null)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 0, 12, 6),
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      ConstrainedBox(
                        constraints: BoxConstraints(
                          maxHeight:
                              MediaQuery.of(context).size.height * 0.62,
                        ),
                        child: SingleChildScrollView(
                          child: _selectedProperty == null
                              ? Container(
                                  height: 120,
                                  margin: const EdgeInsets.only(bottom: 18),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                  alignment: Alignment.center,
                                  child: const CircularProgressIndicator(
                                      color: AppColors.primary),
                                )
                              : PropertyCard(
                                  property: _selectedProperty!,
                                  onTap: () => Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                        builder: (_) => DetailScreen(
                                            propertyId: _selected!.id)),
                                  ),
                                ),
                        ),
                      ),
                      // Botón cerrar
                      Positioned(
                        right: 6,
                        top: 6,
                        child: GestureDetector(
                          onTap: _closeCard,
                          child: Container(
                            width: 34,
                            height: 34,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                    color:
                                        Colors.black.withValues(alpha: 0.2),
                                    blurRadius: 6),
                              ],
                            ),
                            child: const Icon(Icons.close,
                                size: 20, color: AppColors.text),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
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
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
              color: selected ? AppColors.primary : const Color(0x33000000)),
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
