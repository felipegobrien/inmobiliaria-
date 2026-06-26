import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../models/property.dart';
import '../theme.dart';
import '../services/supabase_service.dart';
import '../services/app_events.dart';
import 'detail_screen.dart';

const _operations = ['venta', 'arriendo', 'venta_arriendo'];

class PublishScreen extends StatefulWidget {
  final Property? initial; // si viene, es edición
  final Plan? plan; // plan elegido (para publicaciones nuevas)
  const PublishScreen({super.key, this.initial, this.plan});

  @override
  State<PublishScreen> createState() => _PublishScreenState();
}

class _PublishScreenState extends State<PublishScreen> {
  late final bool isEdit = widget.initial != null;

  String _operation = 'venta';
  String _type = 'apartamento';
  String? _department;
  String? _estrato;
  final _title = TextEditingController();
  final _description = TextEditingController();
  final _price = TextEditingController();
  final _admon = TextEditingController();
  final _bedrooms = TextEditingController();
  final _bathrooms = TextEditingController();
  final _parking = TextEditingController();
  final _area = TextEditingController();
  final _city = TextEditingController();
  final _neighborhood = TextEditingController();
  final _address = TextEditingController();
  final _nearbyInput = TextEditingController();

  final List<String> _nearby = [];
  final List<XFile> _photos = [];
  List<PropertyImage> _existingImages = [];

  List<Amenity> _amenities = [];
  final Set<int> _selectedAmenities = {};

  bool _saving = false;

  @override
  void initState() {
    super.initState();
    supabase.auth.onAuthStateChange.listen((_) {
      if (mounted) setState(() {});
    });
    PropertyService.amenities().then((a) {
      if (mounted) setState(() => _amenities = a);
    });

    final p = widget.initial;
    if (p != null) {
      _operation = p.operation;
      _type = p.type;
      _department = colombiaDepartments.contains(p.department) ? p.department : null;
      _estrato = p.estrato?.toString();
      _title.text = p.title;
      _description.text = p.description ?? '';
      _price.text = p.price.toString();
      _admon.text = (p.admonFee ?? 0) > 0 ? p.admonFee.toString() : '';
      _bedrooms.text = p.bedrooms.toString();
      _bathrooms.text = p.bathrooms.toString();
      _parking.text = p.parkingSpots.toString();
      _area.text = p.areaM2?.toString() ?? '';
      _city.text = p.city;
      _neighborhood.text = p.neighborhood ?? '';
      _address.text = p.address ?? '';
      _nearby.addAll(p.nearbyPlaces);
      _selectedAmenities.addAll(p.amenityIds);
      _existingImages = List.from(p.images);
    }
  }

  Future<void> _pickImages() async {
    final picked = await ImagePicker().pickMultiImage(imageQuality: 70);
    if (picked.isNotEmpty) setState(() => _photos.addAll(picked));
  }

  void _addNearby() {
    final v = _nearbyInput.text.trim();
    if (v.isNotEmpty && !_nearby.contains(v)) {
      setState(() => _nearby.add(v));
    }
    _nearbyInput.clear();
  }

  Future<void> _removeExisting(PropertyImage img) async {
    try {
      await PropertyService.deleteImage(img.id);
      setState(() => _existingImages.removeWhere((i) => i.id == img.id));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  Future<void> _submit() async {
    final user = supabase.auth.currentUser;
    if (user == null) return;
    if (_title.text.isEmpty ||
        _price.text.isEmpty ||
        _city.text.isEmpty ||
        _department == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Completa título, precio, departamento y ciudad.')));
      return;
    }
    setState(() => _saving = true);
    try {
      final urls = <String>[];
      for (final photo in _photos) {
        final Uint8List bytes = await photo.readAsBytes();
        final ext = photo.name.split('.').last.toLowerCase();
        urls.add(await PropertyService.uploadImage(
            user.id, bytes, ext == 'png' ? 'png' : 'jpg'));
      }

      final payload = {
        'title': _title.text.trim(),
        'description':
            _description.text.trim().isEmpty ? null : _description.text.trim(),
        'operation': _operation,
        'type': _type,
        'status': 'activo',
        'price': int.parse(_price.text),
        'admon_fee': int.tryParse(_admon.text) ?? 0,
        'estrato': _estrato != null ? int.parse(_estrato!) : null,
        'bedrooms': int.tryParse(_bedrooms.text) ?? 0,
        'bathrooms': int.tryParse(_bathrooms.text) ?? 0,
        'parking_spots': int.tryParse(_parking.text) ?? 0,
        'area_m2': _area.text.isEmpty ? null : num.tryParse(_area.text),
        'department': _department,
        'city': _city.text.trim(),
        'neighborhood':
            _neighborhood.text.trim().isEmpty ? null : _neighborhood.text.trim(),
        'address': _address.text.trim().isEmpty ? null : _address.text.trim(),
        'nearby_places': _nearby,
        'published_at': DateTime.now().toIso8601String(),
      };

      if (isEdit) {
        // Mantener plan/vencimiento/destacado tal como estaban.
        final p = widget.initial!;
        payload['plan'] = p.plan;
        payload['featured'] = p.featured;
        payload['featured_at'] = p.featuredAt?.toIso8601String();
        payload['expires_at'] = p.expiresAt?.toIso8601String();
      } else {
        final plan = widget.plan!;
        final now = DateTime.now();
        payload['plan'] = plan.id;
        payload['featured'] = plan.isFeatured;
        payload['featured_at'] =
            plan.isFeatured ? now.toIso8601String() : null;
        payload['expires_at'] =
            now.add(Duration(days: plan.durationDays)).toIso8601String();
      }

      final amenityIds = _selectedAmenities.toList();
      String id;
      if (isEdit) {
        id = widget.initial!.id;
        await PropertyService.update(id, payload, urls, amenityIds);
      } else {
        payload['owner_id'] = user.id;
        id = await PropertyService.create(payload, urls, amenityIds);
      }

      bumpRefresh();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(isEdit ? 'Cambios guardados' : '¡Inmueble publicado!')));
      if (isEdit) {
        Navigator.pop(context, true);
      } else {
        _clear();
        Navigator.push(context,
            MaterialPageRoute(builder: (_) => DetailScreen(propertyId: id)));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _clear() {
    for (final c in [
      _title, _description, _price, _admon, _bedrooms, _bathrooms,
      _parking, _area, _city, _neighborhood, _address,
    ]) {
      c.clear();
    }
    setState(() {
      _photos.clear();
      _nearby.clear();
      _selectedAmenities.clear();
      _estrato = null;
      _department = null;
      _operation = 'venta';
      _type = 'apartamento';
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = supabase.auth.currentUser;
    if (user == null) {
      return Scaffold(
        appBar: AppBar(
            title: const Text('Publicar'),
            backgroundColor: Colors.white,
            foregroundColor: AppColors.text),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text(
              'Inicia sesión (pestaña Cuenta) para publicar un inmueble.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textMuted),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: isEdit
          ? AppBar(
              title: const Text('Editar inmueble'),
              backgroundColor: Colors.white,
              foregroundColor: AppColors.text)
          : null,
      body: SafeArea(
        top: !isEdit,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (!isEdit)
              const Padding(
                padding: EdgeInsets.only(bottom: 8, top: 8),
                child: Text('Publicar inmueble',
                    style: TextStyle(
                        fontSize: 22, fontWeight: FontWeight.w800)),
              ),
            if (!isEdit && widget.plan != null)
              Builder(builder: (_) {
                final plan = widget.plan!;
                final premium = plan.id == 'premium';
                final bg = premium
                    ? const Color(0xFF33333A)
                    : (plan.isFeatured
                        ? const Color(0xFFFFFBEB)
                        : const Color(0xFFECFDF5));
                final border = premium
                    ? const Color(0xFF33333A)
                    : (plan.isFeatured
                        ? const Color(0xFFFDE68A)
                        : const Color(0xFFA7F3D0));
                final fg = premium
                    ? const Color(0xFFE8C66A)
                    : (plan.isFeatured
                        ? const Color(0xFFD97706)
                        : AppColors.primary);
                return Container(
                  margin: const EdgeInsets.only(bottom: 4),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: bg,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: border),
                  ),
                  child: Row(
                    children: [
                      Icon(
                          premium
                              ? Icons.workspace_premium
                              : (plan.isFeatured
                                  ? Icons.star
                                  : Icons.check_circle),
                          color: fg,
                          size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Plan ${plan.name} · ${plan.durationDays} días',
                          style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: premium ? fg : null),
                        ),
                      ),
                    ],
                  ),
                );
              }),
            _label('Operación'),
            _chips(
              {for (final o in _operations) o: operationLabels[o]!},
              _operation,
              (v) => setState(() => _operation = v),
            ),
            _label('Tipo de inmueble'),
            _chips(typeLabels, _type, (v) => setState(() => _type = v)),
            _label('Título'),
            TextField(controller: _title),
            _label('Descripción'),
            TextField(controller: _description, maxLines: 3),
            Row(children: [
              Expanded(child: _numField('Precio (COP)', _price)),
              const SizedBox(width: 12),
              Expanded(child: _numField('Administración', _admon)),
            ]),
            _label('Estrato'),
            Wrap(
              spacing: 8,
              children: [
                for (final e in ['1', '2', '3', '4', '5', '6'])
                  ChoiceChip(
                    label: Text(e),
                    selected: _estrato == e,
                    onSelected: (_) =>
                        setState(() => _estrato = _estrato == e ? null : e),
                    selectedColor: AppColors.primary,
                    labelStyle: TextStyle(
                        color:
                            _estrato == e ? Colors.white : AppColors.text),
                  ),
              ],
            ),
            Row(children: [
              Expanded(child: _numField('Habitaciones', _bedrooms)),
              const SizedBox(width: 12),
              Expanded(child: _numField('Baños', _bathrooms)),
            ]),
            Row(children: [
              Expanded(child: _numField('Parqueaderos', _parking)),
              const SizedBox(width: 12),
              Expanded(child: _numField('Área (m²)', _area)),
            ]),

            // Ubicación
            _label('Departamento'),
            DropdownButtonFormField<String>(
              value: _department,
              isExpanded: true,
              hint: const Text('Selecciona…'),
              items: [
                for (final d in colombiaDepartments)
                  DropdownMenuItem(value: d, child: Text(d)),
              ],
              onChanged: (v) => setState(() => _department = v),
            ),
            _label('Ciudad'),
            _AutocompleteField(
              controller: _city,
              hint: 'Medellín',
              fetcher: (q) => PropertyService.searchCities(q),
            ),
            _label('Barrio'),
            _AutocompleteField(
              controller: _neighborhood,
              hint: 'El Poblado',
              fetcher: (q) =>
                  PropertyService.searchNeighborhoods(q, _city.text.trim()),
            ),
            _label('Dirección'),
            TextField(controller: _address),

            // Características
            const SizedBox(height: 20),
            const Text('Características del inmueble',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            for (final cat in amenityCategoryOrder)
              _amenityCategory(cat),

            // Lugares cercanos
            _label('Lugares cercanos'),
            Row(children: [
              Expanded(
                child: TextField(
                  controller: _nearbyInput,
                  decoration: const InputDecoration(
                      hintText: 'Ej. Centro Comercial Santafé'),
                  onSubmitted: (_) => _addNearby(),
                ),
              ),
              const SizedBox(width: 8),
              SizedBox(
                height: 48,
                child: ElevatedButton(
                  onPressed: _addNearby,
                  child: const Text('+'),
                ),
              ),
            ]),
            if (_nearby.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 10),
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final n in _nearby)
                      Chip(
                        label: Text('📍 $n'),
                        onDeleted: () => setState(() => _nearby.remove(n)),
                      ),
                  ],
                ),
              ),

            // Fotos existentes (edición)
            if (_existingImages.isNotEmpty) ...[
              _label('Fotos actuales'),
              SizedBox(
                height: 80,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _existingImages.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (_, i) {
                    final img = _existingImages[i];
                    return Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: Image.network(img.url,
                              width: 80, height: 80, fit: BoxFit.cover),
                        ),
                        Positioned(
                          right: 0,
                          top: 0,
                          child: GestureDetector(
                            onTap: () => _removeExisting(img),
                            child: const CircleAvatar(
                              radius: 11,
                              backgroundColor: AppColors.danger,
                              child: Icon(Icons.close,
                                  size: 14, color: Colors.white),
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
            ],

            _label(isEdit ? 'Agregar más fotos' : 'Fotos'),
            OutlinedButton.icon(
              onPressed: _pickImages,
              icon: const Icon(Icons.add_a_photo_outlined),
              label: const Text('Agregar fotos'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(vertical: 16),
                side: const BorderSide(color: AppColors.primary),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
            ),
            if (_photos.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 10),
                child: SizedBox(
                  height: 80,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: _photos.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (_, i) => ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image.network(_photos[i].path,
                          width: 80,
                          height: 80,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                              width: 80,
                              height: 80,
                              color: const Color(0xFFE4E4E7),
                              child: const Icon(Icons.image))),
                    ),
                  ),
                ),
              ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _saving ? null : _submit,
              child: Text(_saving
                  ? 'Guardando…'
                  : (isEdit ? 'Guardar cambios' : 'Publicar inmueble')),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _amenityCategory(String cat) {
    final items = _amenities.where((a) => a.category == cat).toList();
    if (items.isEmpty) return const SizedBox.shrink();
    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(amenityCategoryLabels[cat] ?? cat,
              style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                  color: AppColors.text)),
          const SizedBox(height: 10),
          LayoutBuilder(builder: (ctx, c) {
            final w = (c.maxWidth - 12) / 2;
            return Wrap(
              spacing: 12,
              runSpacing: 4,
              children: [
                for (final a in items)
                  SizedBox(width: w, child: _amenityCheck(a)),
              ],
            );
          }),
        ],
      ),
    );
  }

  Widget _amenityCheck(Amenity a) {
    final sel = _selectedAmenities.contains(a.id);
    return InkWell(
      onTap: () => setState(() =>
          sel ? _selectedAmenities.remove(a.id) : _selectedAmenities.add(a.id)),
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 7),
        child: Row(
          children: [
            Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                color: sel ? AppColors.primary : Colors.white,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(
                    color: sel ? AppColors.primary : AppColors.textMuted,
                    width: 1.5),
              ),
              child: sel
                  ? const Icon(Icons.check, size: 15, color: Colors.white)
                  : null,
            ),
            const SizedBox(width: 9),
            Expanded(
              child: Text(a.name,
                  style: const TextStyle(fontSize: 13, color: AppColors.text)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _label(String t) => Padding(
        padding: const EdgeInsets.only(top: 16, bottom: 8),
        child: Text(t,
            style: const TextStyle(
                fontWeight: FontWeight.w700, color: AppColors.text)),
      );

  Widget _numField(String hint, TextEditingController c) => Padding(
        padding: const EdgeInsets.only(top: 8),
        child: TextField(
            controller: c,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(labelText: hint)),
      );

  Widget _chips(
      Map<String, String> options, String selected, void Function(String) onSel) {
    return SizedBox(
      height: 44,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          for (final e in options.entries)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                label: Text(e.value),
                selected: selected == e.key,
                onSelected: (_) => onSel(e.key),
                selectedColor: AppColors.primary,
                labelStyle: TextStyle(
                    color:
                        selected == e.key ? Colors.white : AppColors.text),
              ),
            ),
        ],
      ),
    );
  }
}

// Campo con autocompletado (chips de sugerencias debajo).
class _AutocompleteField extends StatefulWidget {
  final TextEditingController controller;
  final String hint;
  final Future<List<String>> Function(String) fetcher;

  const _AutocompleteField({
    required this.controller,
    required this.hint,
    required this.fetcher,
  });

  @override
  State<_AutocompleteField> createState() => _AutocompleteFieldState();
}

class _AutocompleteFieldState extends State<_AutocompleteField> {
  List<String> _suggestions = [];
  Timer? _debounce;

  void _onChanged(String v) {
    _debounce?.cancel();
    if (v.trim().length < 2) {
      setState(() => _suggestions = []);
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 300), () async {
      try {
        final s = await widget.fetcher(v.trim());
        if (mounted) {
          setState(() => _suggestions =
              s.where((x) => x != widget.controller.text).toList());
        }
      } catch (_) {}
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: widget.controller,
          decoration: InputDecoration(hintText: widget.hint),
          onChanged: _onChanged,
        ),
        if (_suggestions.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final s in _suggestions.take(8))
                  ActionChip(
                    label: Text(s),
                    onPressed: () {
                      widget.controller.text = s;
                      setState(() => _suggestions = []);
                    },
                  ),
              ],
            ),
          ),
      ],
    );
  }
}
