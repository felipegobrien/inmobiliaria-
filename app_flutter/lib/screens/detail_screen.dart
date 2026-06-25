import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:share_plus/share_plus.dart';
import 'package:intl/intl.dart';
import '../config.dart';
import '../models/property.dart';
import '../theme.dart';
import '../services/supabase_service.dart';
import '../services/favorites_manager.dart';
import 'publish_screen.dart';

class DetailScreen extends StatefulWidget {
  final String propertyId;
  const DetailScreen({super.key, required this.propertyId});

  @override
  State<DetailScreen> createState() => _DetailScreenState();
}

class _DetailScreenState extends State<DetailScreen> {
  Property? _p;
  List<Amenity> _amenities = [];
  bool _loading = true;
  bool _contactRevealed = false;

  @override
  void initState() {
    super.initState();
    _load();
    PropertyService.amenities().then((a) {
      if (mounted) setState(() => _amenities = a);
    });
  }

  void _load() {
    setState(() => _loading = true);
    PropertyService.getById(widget.propertyId).then((p) {
      if (!mounted) return;
      setState(() {
        _p = p;
        _loading = false;
      });
    }).catchError((_) {
      if (!mounted) return;
      setState(() => _loading = false);
    });
  }

  Future<void> _showContactForm(Property p) async {
    final user = supabase.auth.currentUser;
    final nameCtrl = TextEditingController(
        text: user?.userMetadata?['full_name'] as String? ?? '');
    final phoneCtrl = TextEditingController();
    final emailCtrl = TextEditingController(text: user?.email ?? '');
    final msgCtrl = TextEditingController(
        text: 'Hola, vi este inmueble "${p.title}" y me interesa más información.');

    final sent = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        bool sending = false;
        return StatefulBuilder(
          builder: (ctx, setSheet) => Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Completa tus datos',
                    style:
                        TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                const Text('Déjale tus datos al anunciante para ver el contacto.',
                    style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                const SizedBox(height: 14),
                TextField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(hintText: 'Tu nombre')),
                const SizedBox(height: 10),
                TextField(
                    controller: phoneCtrl,
                    keyboardType: TextInputType.phone,
                    decoration:
                        const InputDecoration(hintText: 'Tu teléfono / WhatsApp')),
                const SizedBox(height: 10),
                TextField(
                    controller: emailCtrl,
                    keyboardType: TextInputType.emailAddress,
                    decoration:
                        const InputDecoration(hintText: 'Tu correo (opcional)')),
                const SizedBox(height: 10),
                TextField(
                    controller: msgCtrl,
                    maxLines: 3,
                    decoration: const InputDecoration(hintText: 'Mensaje')),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: sending
                        ? null
                        : () async {
                            if (nameCtrl.text.trim().isEmpty ||
                                phoneCtrl.text.trim().isEmpty) {
                              ScaffoldMessenger.of(ctx).showSnackBar(
                                const SnackBar(
                                    content:
                                        Text('Ingresa tu nombre y teléfono.')),
                              );
                              return;
                            }
                            setSheet(() => sending = true);
                            try {
                              await PropertyService.createInquiry(
                                propertyId: p.id,
                                senderId: user?.id,
                                name: nameCtrl.text.trim(),
                                email: emailCtrl.text.trim().isEmpty
                                    ? null
                                    : emailCtrl.text.trim(),
                                phone: phoneCtrl.text.trim(),
                                message: msgCtrl.text.trim(),
                              );
                              if (ctx.mounted) Navigator.pop(ctx, true);
                            } catch (e) {
                              setSheet(() => sending = false);
                              if (ctx.mounted) {
                                ScaffoldMessenger.of(ctx).showSnackBar(
                                    SnackBar(content: Text('Error: $e')));
                              }
                            }
                          },
                    child: Text(sending ? 'Enviando…' : 'Ver datos de contacto'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );

    if (sent == true && mounted) setState(() => _contactRevealed = true);
  }

  Future<void> _openWhatsApp(String number, String title) async {
    final num = number.replaceAll(RegExp(r'\D'), '');
    final msg = Uri.encodeComponent('Hola, estoy interesado en tu inmueble "$title".');
    final uri = Uri.parse('https://wa.me/57$num?text=$msg');
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No se pudo abrir WhatsApp')),
        );
      }
    }
  }

  Future<void> _confirmDelete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Eliminar inmueble'),
        content: const Text('¿Seguro? No se puede deshacer.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancelar')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Eliminar', style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
    if (ok == true) {
      try {
        await PropertyService.delete(widget.propertyId);
        if (mounted) Navigator.pop(context);
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context)
              .showSnackBar(SnackBar(content: Text('Error: $e')));
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }
    final p = _p;
    if (p == null) {
      return Scaffold(
        appBar: AppBar(),
        body: const Center(
          child: Text('Este inmueble no está disponible.',
              style: TextStyle(color: AppColors.textMuted)),
        ),
      );
    }

    final user = supabase.auth.currentUser;
    final isOwner = user != null && user.id == p.ownerId;
    final wpp = p.owner?.whatsapp ?? p.owner?.phone;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Inmueble'),
        foregroundColor: AppColors.primaryDark,
        backgroundColor: Colors.white,
        actions: [
          IconButton(
            tooltip: 'Compartir',
            onPressed: () {
              final url = '${Config.siteUrl}/inmueble/${propertySlug(p)}';
              SharePlus.instance.share(
                ShareParams(text: '${p.title}\n$url'),
              );
            },
            icon: const Icon(Icons.share_outlined, color: AppColors.primaryDark),
          ),
          if (isOwner)
            IconButton(
              tooltip: 'Editar',
              onPressed: () async {
                final changed = await Navigator.push<bool>(
                  context,
                  MaterialPageRoute(
                      builder: (_) => PublishScreen(initial: p)),
                );
                if (changed == true) _load();
              },
              icon: const Icon(Icons.edit, color: AppColors.primaryDark),
            ),
          ValueListenableBuilder<Set<String>>(
            valueListenable: FavoritesManager.instance.ids,
            builder: (_, ids, __) {
              final fav = ids.contains(p.id);
              return IconButton(
                onPressed: () => FavoritesManager.instance.toggle(p.id),
                icon: Icon(fav ? Icons.favorite : Icons.favorite_border,
                    color: fav ? Colors.red : AppColors.textMuted),
              );
            },
          ),
        ],
      ),
      body: ListView(
        children: [
          // Galería
          SizedBox(
            height: 260,
            child: p.images.isEmpty
                ? Container(
                    color: const Color(0xFFE4E4E7),
                    alignment: Alignment.center,
                    child: const Text('Sin fotos'))
                : PageView(
                    children: [
                      for (final img in p.images)
                        CachedNetworkImage(imageUrl: img.url, fit: BoxFit.cover),
                    ],
                  ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    if (p.featured)
                      Container(
                        margin: const EdgeInsets.only(right: 8),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 5),
                        decoration: BoxDecoration(
                            color: const Color(0xFFFEF3C7),
                            borderRadius: BorderRadius.circular(999)),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.star,
                                size: 14, color: Color(0xFFD97706)),
                            SizedBox(width: 4),
                            Text('Destacado',
                                style: TextStyle(
                                    color: Color(0xFF92400E),
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700)),
                          ],
                        ),
                      ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 5),
                      decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(999)),
                      child: Text(operationLabels[p.operation] ?? '',
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(p.title,
                    style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: AppColors.text)),
                const SizedBox(height: 2),
                Text(
                  [p.neighborhood, p.city, p.department]
                      .where((e) => e != null && e.isNotEmpty)
                      .join(', '),
                  style: const TextStyle(color: AppColors.textMuted),
                ),
                if (p.publishedAt != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      'Publicado el ${DateFormat('d MMM y', 'es').format(p.publishedAt!.toLocal())} · Cód. ${p.ref}',
                      style: const TextStyle(
                          fontSize: 12, color: AppColors.textMuted),
                    ),
                  ),
                const SizedBox(height: 14),
                Text(
                  formatPrice(p.price) + (p.operation != 'venta' ? ' / mes' : ''),
                  style: const TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      color: AppColors.primaryDark),
                ),
                if (p.admonFee != null && p.admonFee! > 0)
                  Text('+ Administración ${formatPrice(p.admonFee!)}/mes',
                      style: const TextStyle(color: AppColors.textMuted)),
                const SizedBox(height: 18),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    _stat(Icons.home_work_outlined, 'Tipo',
                        typeLabels[p.type] ?? p.type),
                    _stat(Icons.king_bed_outlined, 'Habitaciones',
                        '${p.bedrooms}'),
                    _stat(Icons.bathtub_outlined, 'Baños', '${p.bathrooms}'),
                    _stat(Icons.directions_car_outlined, 'Parqueaderos',
                        '${p.parkingSpots}'),
                    if (p.areaM2 != null)
                      _stat(Icons.straighten, 'Área', '${p.areaM2} m²'),
                    if (p.estrato != null)
                      _stat(Icons.location_city_outlined, 'Estrato',
                          '${p.estrato}'),
                  ],
                ),
                if (p.description != null && p.description!.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  const Text('Descripción',
                      style: TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 6),
                  Text(p.description!,
                      style: const TextStyle(
                          color: Color(0xFF52525B), height: 1.4)),
                ],

                // Características agrupadas
                ..._buildCharacteristics(p),

                // Lugares cercanos
                if (p.nearbyPlaces.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  const Text('Lugares cercanos',
                      style: TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final n in p.nearbyPlaces)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF4F4F5),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text('📍 $n',
                              style: const TextStyle(fontSize: 13)),
                        ),
                    ],
                  ),
                ],

                const SizedBox(height: 24),
                if (wpp == null || wpp.isEmpty)
                  const Center(
                    child: Text('El anunciante no registró teléfono.',
                        style: TextStyle(color: AppColors.textMuted)),
                  )
                else if (!_contactRevealed)
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => _showContactForm(p),
                      icon: const Icon(Icons.lock_open),
                      label: const Text('Ver datos de contacto'),
                    ),
                  )
                else ...[
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => _openWhatsApp(wpp, p.title),
                      icon: const Icon(Icons.chat),
                      label: const Text('Escribir por WhatsApp'),
                    ),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () => launchUrl(
                          Uri.parse('tel:+57${wpp.replaceAll(RegExp(r'\D'), '')}'),
                          mode: LaunchMode.externalApplication),
                      icon: const Icon(Icons.call),
                      label: Text('Llamar: $wpp'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
                if (isOwner) ...[
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: _confirmDelete,
                      icon: const Icon(Icons.delete_outline,
                          color: AppColors.danger),
                      label: const Text('Eliminar inmueble',
                          style: TextStyle(color: AppColors.danger)),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        side: const BorderSide(color: AppColors.danger),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildCharacteristics(Property p) {
    if (_amenities.isEmpty || p.amenityIds.isEmpty) return [];
    final selected =
        _amenities.where((a) => p.amenityIds.contains(a.id)).toList();
    if (selected.isEmpty) return [];

    final widgets = <Widget>[
      const SizedBox(height: 20),
      const Text('Características del inmueble',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
    ];

    for (final cat in amenityCategoryOrder) {
      final items = selected.where((a) => a.category == cat).toList();
      if (items.isEmpty) continue;
      widgets.add(Container(
        margin: const EdgeInsets.only(top: 12),
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
        decoration: BoxDecoration(
          color: const Color(0xFFF7F7F8),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(amenityCategoryLabels[cat] ?? cat,
                style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                    color: AppColors.text)),
            const SizedBox(height: 10),
            LayoutBuilder(builder: (ctx, c) {
              final w = (c.maxWidth - 12) / 2;
              return Wrap(
                spacing: 12,
                runSpacing: 8,
                children: [
                  for (final a in items)
                    SizedBox(
                      width: w,
                      child: Row(
                        children: [
                          const Icon(Icons.check_circle,
                              size: 18, color: AppColors.primary),
                          const SizedBox(width: 7),
                          Expanded(
                            child: Text(a.name,
                                style: const TextStyle(
                                    fontSize: 13, color: AppColors.text)),
                          ),
                        ],
                      ),
                    ),
                ],
              );
            }),
          ],
        ),
      ));
    }
    return widgets;
  }

  Widget _stat(IconData icon, String label, String value) {
    return Container(
      constraints: const BoxConstraints(minWidth: 96),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFF7F7F8),
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 15, color: AppColors.textMuted),
              const SizedBox(width: 5),
              Text(label,
                  style: const TextStyle(
                      fontSize: 11, color: AppColors.textMuted)),
            ],
          ),
          const SizedBox(height: 4),
          Text(value,
              softWrap: false,
              overflow: TextOverflow.visible,
              style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                  color: AppColors.text)),
        ],
      ),
    );
  }
}
