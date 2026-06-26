import 'dart:async';
import 'package:flutter/material.dart';
import '../models/property.dart';
import '../theme.dart';
import '../services/supabase_service.dart';
import '../widgets/property_card.dart';
import 'detail_screen.dart';
import 'map_screen.dart';

const _types = ['apartamento', 'casa', 'apartaestudio', 'local', 'oficina',
    'bodega', 'lote', 'finca', 'consultorio', 'parqueadero'];

const _sortLabels = {
  'recientes': 'Más recientes',
  'precio_asc': 'Menor precio',
  'precio_desc': 'Mayor precio',
  'area_desc': 'Mayor área',
};

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  PropertyFilters _filters = PropertyFilters();
  List<Property> _results = [];
  List<Amenity> _amenities = [];
  bool _loading = true;
  Timer? _debounce;
  final _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
    PropertyService.amenities().then((a) {
      if (mounted) setState(() => _amenities = a);
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchCtrl.dispose();
    super.dispose();
  }

  void _load() {
    setState(() => _loading = true);
    PropertyService.search(_filters).then((data) {
      if (!mounted) return;
      setState(() {
        _results = data;
        _loading = false;
      });
    }).catchError((e) {
      if (!mounted) return;
      setState(() => _loading = false);
    });
  }

  void _onSearchChanged(String v) {
    _filters.search = v.isEmpty ? null : v;
    setState(() {}); // refresca el botón de limpiar (x)
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), _load);
  }

  void _clearSearch() {
    _searchCtrl.clear();
    _filters.search = null;
    _debounce?.cancel();
    setState(() {});
    _load();
  }

  void _openMap() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const MapScreen()),
    );
  }

  Future<void> _openFilters() async {
    final result = await showModalBottomSheet<PropertyFilters>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) =>
          _FiltersSheet(filters: _filters.copy(), amenities: _amenities),
    );
    if (result != null) {
      setState(() => _filters = result);
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final count = _filters.activeCount;
    return Scaffold(
      backgroundColor: const Color(0xFFF0F0F2),
      body: SafeArea(
        child: Column(
          children: [
            // Buscador (todo el largo)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
              child: TextField(
                controller: _searchCtrl,
                onChanged: _onSearchChanged,
                decoration: InputDecoration(
                  hintText: 'Busca por ubicación o palabra clave',
                  hintStyle: const TextStyle(
                      color: AppColors.textMuted, fontSize: 14),
                  prefixIcon:
                      const Icon(Icons.search, color: AppColors.textMuted),
                  suffixIcon: _searchCtrl.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.close,
                              color: AppColors.textMuted, size: 20),
                          tooltip: 'Borrar',
                          onPressed: _clearSearch,
                        )
                      : null,
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(
                        color: AppColors.primary, width: 1.5),
                  ),
                ),
              ),
            ),

            // Botón Filtros + Orden
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 2, 16, 8),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: _openFilters,
                    child: Container(
                      padding:
                          const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
                      decoration: BoxDecoration(
                        color: count > 0 ? AppColors.primary : Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                            color: count > 0
                                ? AppColors.primary
                                : AppColors.border),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.tune,
                              size: 18,
                              color:
                                  count > 0 ? Colors.white : AppColors.text),
                          const SizedBox(width: 6),
                          Text('Filtros',
                              style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  color: count > 0
                                      ? Colors.white
                                      : AppColors.text)),
                          if (count > 0) ...[
                            const SizedBox(width: 6),
                            Container(
                              width: 20,
                              height: 20,
                              alignment: Alignment.center,
                              decoration: const BoxDecoration(
                                  color: Colors.white, shape: BoxShape.circle),
                              child: Text('$count',
                                  style: const TextStyle(
                                      color: AppColors.primaryDark,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700)),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  GestureDetector(
                    onTap: _openMap,
                    child: Container(
                      padding:
                          const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.map_outlined,
                              size: 18, color: AppColors.text),
                          SizedBox(width: 6),
                          Text('Mapa',
                              style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.text)),
                        ],
                      ),
                    ),
                  ),
                  const Spacer(),
                  PopupMenuButton<String>(
                    initialValue: _filters.sortBy,
                    onSelected: (v) {
                      setState(() => _filters.sortBy = v);
                      _load();
                    },
                    itemBuilder: (_) => [
                      for (final e in _sortLabels.entries)
                        PopupMenuItem(value: e.key, child: Text(e.value)),
                    ],
                    child: Row(
                      children: [
                        Text(_sortLabels[_filters.sortBy] ?? '',
                            style: const TextStyle(
                                color: AppColors.primaryDark,
                                fontWeight: FontWeight.w700,
                                fontSize: 13)),
                        const Icon(Icons.keyboard_arrow_down,
                            size: 18, color: AppColors.primaryDark),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            // Resultados
            Expanded(
              child: Container(
                decoration: const BoxDecoration(
                  color: Colors.white,
                  border: Border(top: BorderSide(color: AppColors.border)),
                ),
                child: _loading
                  ? const Center(
                      child:
                          CircularProgressIndicator(color: AppColors.primary))
                  : RefreshIndicator(
                      onRefresh: () async => _load(),
                      child: _results.isEmpty
                          ? ListView(
                              children: const [
                                SizedBox(height: 80),
                                Center(
                                  child: Text(
                                    'No encontramos inmuebles.\nPrueba quitar filtros.',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(color: AppColors.textMuted),
                                  ),
                                ),
                              ],
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
                              itemCount: _results.length + 1,
                              itemBuilder: (_, i) {
                                if (i == 0) {
                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: 10),
                                    child: Text('${_results.length} resultados',
                                        style: const TextStyle(
                                            color: AppColors.textMuted,
                                            fontSize: 13)),
                                  );
                                }
                                final p = _results[i - 1];
                                return PropertyCard(
                                  property: p,
                                  onTap: () => Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                        builder: (_) =>
                                            DetailScreen(propertyId: p.id)),
                                  ),
                                );
                              },
                            ),
                    ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FiltersSheet extends StatefulWidget {
  final PropertyFilters filters;
  final List<Amenity> amenities;
  const _FiltersSheet({required this.filters, required this.amenities});

  @override
  State<_FiltersSheet> createState() => _FiltersSheetState();
}

class _FiltersSheetState extends State<_FiltersSheet> {
  late PropertyFilters f = widget.filters;
  late final Set<int> _amenities = {...f.amenityIds};
  final _minCtrl = TextEditingController();
  final _maxCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    if (f.minPrice != null) _minCtrl.text = f.minPrice.toString();
    if (f.maxPrice != null) _maxCtrl.text = f.maxPrice.toString();
  }

  @override
  void dispose() {
    _minCtrl.dispose();
    _maxCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.85,
      maxChildSize: 0.92,
      minChildSize: 0.5,
      builder: (context, scrollCtrl) => Column(
        children: [
          // Handle + título
          Padding(
            padding: const EdgeInsets.only(top: 12, bottom: 4),
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2)),
            ),
          ),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: Text('Filtros',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          ),
          const Divider(height: 1),
          Expanded(
            child: ListView(
              controller: scrollCtrl,
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
              children: [
                _title('Operación'),
                Wrap(spacing: 8, children: [
                  _chip('Todos', f.operation == null,
                      () => setState(() => f.operation = null)),
                  _chip('Venta', f.operation == 'venta',
                      () => setState(() => f.operation = 'venta')),
                  _chip('Arriendo', f.operation == 'arriendo',
                      () => setState(() => f.operation = 'arriendo')),
                ]),
                _title('Tipo de inmueble'),
                Wrap(spacing: 8, runSpacing: 8, children: [
                  _chip('Todos', f.type == null,
                      () => setState(() => f.type = null)),
                  for (final t in _types)
                    _chip(typeLabels[t]!, f.type == t,
                        () => setState(() => f.type = f.type == t ? null : t)),
                ]),
                _title('Precio (COP)'),
                Row(children: [
                  Expanded(
                    child: TextField(
                      controller: _minCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(hintText: 'Mínimo'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _maxCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(hintText: 'Máximo'),
                    ),
                  ),
                ]),
                _title('Estrato'),
                Wrap(spacing: 8, children: [
                  for (final e in [1, 2, 3, 4, 5, 6])
                    _mini(e.toString(), f.estrato.contains(e), () {
                      setState(() {
                        f.estrato = List.from(f.estrato);
                        f.estrato.contains(e)
                            ? f.estrato.remove(e)
                            : f.estrato.add(e);
                      });
                    }),
                ]),
                _title('Habitaciones (mínimo)'),
                Wrap(spacing: 8, children: [
                  for (final n in [1, 2, 3, 4, 5])
                    _mini('$n+', f.minBedrooms == n,
                        () => setState(() =>
                            f.minBedrooms = f.minBedrooms == n ? null : n)),
                ]),
                _title('Baños (mínimo)'),
                Wrap(spacing: 8, children: [
                  for (final n in [1, 2, 3, 4])
                    _mini('$n+', f.minBathrooms == n,
                        () => setState(() =>
                            f.minBathrooms = f.minBathrooms == n ? null : n)),
                ]),
                _title('Parqueaderos (mínimo)'),
                Wrap(spacing: 8, children: [
                  for (final n in [1, 2, 3])
                    _mini('$n+', f.minParking == n,
                        () => setState(() =>
                            f.minParking = f.minParking == n ? null : n)),
                ]),
                // Características
                for (final cat in amenityCategoryOrder)
                  ..._amenityCategory(cat),
                const SizedBox(height: 8),
              ],
            ),
          ),
          // Botones
          Container(
            padding: EdgeInsets.fromLTRB(
                20, 12, 20, MediaQuery.of(context).padding.bottom + 12),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: AppColors.border)),
            ),
            child: Row(children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(
                      context, PropertyFilters(sortBy: f.sortBy, search: f.search)),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Limpiar'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    f.minPrice = int.tryParse(_minCtrl.text);
                    f.maxPrice = int.tryParse(_maxCtrl.text);
                    f.amenityIds = _amenities.toList();
                    Navigator.pop(context, f);
                  },
                  child: const Text('Ver resultados'),
                ),
              ),
            ]),
          ),
        ],
      ),
    );
  }

  List<Widget> _amenityCategory(String cat) {
    final items = widget.amenities.where((a) => a.category == cat).toList();
    if (items.isEmpty) return [];
    return [
      _title(amenityCategoryLabels[cat] ?? cat),
      Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          for (final a in items)
            FilterChip(
              label: Text(a.name),
              selected: _amenities.contains(a.id),
              onSelected: (_) => setState(() => _amenities.contains(a.id)
                  ? _amenities.remove(a.id)
                  : _amenities.add(a.id)),
              selectedColor: AppColors.primary,
              checkmarkColor: Colors.white,
              backgroundColor: Colors.white,
              side: BorderSide(
                  color: _amenities.contains(a.id)
                      ? AppColors.primary
                      : AppColors.border),
              labelStyle: TextStyle(
                  color: _amenities.contains(a.id)
                      ? Colors.white
                      : AppColors.text,
                  fontSize: 13),
            ),
        ],
      ),
    ];
  }

  Widget _title(String t) => Padding(
        padding: const EdgeInsets.only(top: 18, bottom: 8),
        child: Text(t,
            style: const TextStyle(
                fontSize: 15, fontWeight: FontWeight.w700)),
      );

  Widget _chip(String label, bool active, VoidCallback onTap) => ChoiceChip(
        label: Text(label),
        selected: active,
        onSelected: (_) => onTap(),
        showCheckmark: false,
        selectedColor: AppColors.primary,
        backgroundColor: Colors.white,
        side: BorderSide(color: active ? AppColors.primary : AppColors.border),
        labelStyle: TextStyle(
            color: active ? Colors.white : AppColors.text, fontSize: 13),
      );

  Widget _mini(String label, bool active, VoidCallback onTap) => GestureDetector(
        onTap: onTap,
        child: Container(
          width: 46,
          height: 42,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: active ? AppColors.primary : Colors.white,
            borderRadius: BorderRadius.circular(10),
            border:
                Border.all(color: active ? AppColors.primary : AppColors.border),
          ),
          child: Text(label,
              style: TextStyle(
                  color: active ? Colors.white : AppColors.text,
                  fontWeight: FontWeight.w600)),
        ),
      );
}
