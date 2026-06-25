import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/property.dart';
import '../theme.dart';
import '../services/supabase_service.dart';
import 'detail_screen.dart';

class MyListingsScreen extends StatefulWidget {
  const MyListingsScreen({super.key});

  @override
  State<MyListingsScreen> createState() => _MyListingsScreenState();
}

class _MyListingsScreenState extends State<MyListingsScreen> {
  List<(Property, int)> _items = [];
  bool _loading = true;
  String _query = '';

  List<(Property, int)> get _filtered {
    final q = _query.trim().toLowerCase();
    if (q.isEmpty) return _items;
    return _items.where((e) {
      final p = e.$1;
      return p.title.toLowerCase().contains(q) ||
          (p.neighborhood ?? '').toLowerCase().contains(q) ||
          p.city.toLowerCase().contains(q);
    }).toList();
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = supabase.auth.currentUser;
    if (user == null) {
      setState(() => _loading = false);
      return;
    }
    try {
      final data = await PropertyService.myPropertiesWithStats(user.id);
      if (mounted) {
        setState(() {
          _items = data;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  int get _views => _items.fold(0, (s, e) => s + e.$1.viewsCount);
  int get _contacts => _items.fold(0, (s, e) => s + e.$2);

  Future<void> _showLeads(Property p) async {
    List<Map<String, dynamic>> leads = [];
    try {
      leads = await PropertyService.inquiries(p.id);
    } catch (_) {}
    if (!mounted) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.7,
        builder: (_, ctrl) => ListView(
          controller: ctrl,
          padding: const EdgeInsets.all(20),
          children: [
            Text('Contactos · ${p.title}',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            const SizedBox(height: 12),
            if (leads.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Text('Aún no tienes contactos en este inmueble.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.textMuted)),
              ),
            for (final l in leads) _leadTile(l),
          ],
        ),
      ),
    );
  }

  Widget _leadTile(Map<String, dynamic> l) {
    final date = l['created_at'] != null
        ? DateFormat('d MMM y, h:mm a', 'es')
            .format(DateTime.parse(l['created_at'] as String).toLocal())
        : '';
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF7F7F8),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(l['name'] as String? ?? 'Interesado',
              style: const TextStyle(fontWeight: FontWeight.w700)),
          if (l['phone'] != null)
            Text('📞 ${l['phone']}', style: const TextStyle(fontSize: 13)),
          if (l['email'] != null)
            Text('✉ ${l['email']}', style: const TextStyle(fontSize: 13)),
          if (l['message'] != null)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(l['message'] as String,
                  style: const TextStyle(
                      fontSize: 13, color: AppColors.textMuted)),
            ),
          if (date.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(date,
                  style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
            ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
          title: const Text('Mis publicaciones'),
          backgroundColor: Colors.white,
          foregroundColor: AppColors.text),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary))
          : _items.isEmpty
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text('Aún no has publicado inmuebles.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: AppColors.textMuted)),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Row(
                      children: [
                        _metric('Inmuebles', _items.length),
                        const SizedBox(width: 10),
                        _metric('Vistas', _views),
                        const SizedBox(width: 10),
                        _metric('Contactos', _contacts),
                      ],
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      onChanged: (v) => setState(() => _query = v),
                      decoration: InputDecoration(
                        hintText: 'Buscar en mis publicaciones…',
                        prefixIcon: const Icon(Icons.search,
                            color: AppColors.textMuted),
                        filled: true,
                        fillColor: const Color(0xFFF1F1F3),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    for (final e in _filtered) _listingTile(e.$1, e.$2),
                    if (_filtered.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 30),
                        child: Center(
                          child: Text('Sin resultados.',
                              style: TextStyle(color: AppColors.textMuted)),
                        ),
                      ),
                  ],
                ),
    );
  }

  Widget _metric(String label, int value) => Expanded(
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('$value',
                  style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: AppColors.primaryDark)),
              Text(label,
                  style: const TextStyle(
                      fontSize: 12, color: AppColors.textMuted)),
            ],
          ),
        ),
      );

  Widget _listingTile(Property p, int contacts) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(
            onTap: () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => DetailScreen(propertyId: p.id))),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: SizedBox(
                    width: 76,
                    height: 76,
                    child: p.coverUrl != null
                        ? CachedNetworkImage(
                            imageUrl: p.coverUrl!,
                            fit: BoxFit.cover,
                            placeholder: (_, __) =>
                                Container(color: const Color(0xFFF1F1F3)),
                            errorWidget: (_, __, ___) => Container(
                                color: const Color(0xFFF1F1F3),
                                child: const Icon(Icons.image,
                                    color: Colors.grey)),
                          )
                        : Container(
                            color: const Color(0xFFF1F1F3),
                            child: const Icon(Icons.home, color: Colors.grey)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(p.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          const Icon(Icons.location_on_outlined,
                              size: 14, color: AppColors.textMuted),
                          const SizedBox(width: 2),
                          Expanded(
                            child: Text(
                              [p.neighborhood, p.city]
                                  .where((e) => e != null && e.isNotEmpty)
                                  .join(', '),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                  fontSize: 13, color: AppColors.textMuted),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(formatPrice(p.price),
                          style: const TextStyle(
                              color: AppColors.primaryDark,
                              fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              const Icon(Icons.remove_red_eye_outlined,
                  size: 16, color: AppColors.textMuted),
              const SizedBox(width: 4),
              Text('${p.viewsCount} vistas',
                  style: const TextStyle(fontSize: 13)),
              const SizedBox(width: 16),
              const Icon(Icons.mail_outline,
                  size: 16, color: AppColors.textMuted),
              const SizedBox(width: 4),
              Text('$contacts contactos',
                  style: const TextStyle(fontSize: 13)),
              const Spacer(),
              TextButton(
                onPressed: () => _showLeads(p),
                child: const Text('Ver contactos'),
              ),
            ],
          ),
          const Divider(height: 18),
          // Estado / vencimiento + republicar
          Row(
            children: [
              Expanded(child: _statusLine(p)),
              OutlinedButton.icon(
                onPressed: () => _republish(p),
                icon: const Icon(Icons.autorenew, size: 16),
                label: const Text('Republicar'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primaryDark,
                  visualDensity: VisualDensity.compact,
                  side: const BorderSide(color: AppColors.primary),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          // Marcar vendido / arrendado
          if (p.status == 'vendido' || p.status == 'arrendado')
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => _setStatus(p, 'activo'),
                icon: const Icon(Icons.undo, size: 16),
                label: const Text('Reactivar publicación'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
              ),
            )
          else
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _markClosed(p),
                icon: const Icon(Icons.check_circle, size: 18),
                label: Text(p.operation == 'arriendo'
                    ? 'Marcar como arrendado'
                    : 'Marcar como vendido'),
              ),
            ),
        ],
      ),
    );
  }

  Widget _statusLine(Property p) {
    if (p.status == 'vendido' || p.status == 'arrendado') {
      return Row(
        children: [
          const Icon(Icons.check_circle, size: 16, color: AppColors.primary),
          const SizedBox(width: 4),
          Text(p.status == 'vendido' ? 'Vendido' : 'Arrendado',
              style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primaryDark)),
        ],
      );
    }
    final exp = p.expiresAt;
    String text;
    Color color = AppColors.textMuted;
    if (exp == null) {
      text = 'Sin vencimiento';
    } else {
      final days = exp.difference(DateTime.now()).inDays;
      if (days < 0) {
        text = 'Vencida';
        color = AppColors.danger;
      } else if (days == 0) {
        text = 'Vence hoy';
        color = AppColors.danger;
      } else {
        text = 'Vence en $days día${days == 1 ? '' : 's'}';
        if (days <= 5) color = const Color(0xFFD97706);
      }
    }
    return Row(
      children: [
        Icon(Icons.schedule, size: 16, color: color),
        const SizedBox(width: 4),
        Text(text, style: TextStyle(fontSize: 13, color: color)),
      ],
    );
  }

  Future<void> _republish(Property p) async {
    try {
      await PropertyService.republish(p.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Publicación renovada por 30 días.')));
      }
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  Future<void> _setStatus(Property p, String status) async {
    try {
      await PropertyService.setStatus(p.id, status);
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  Future<void> _markClosed(Property p) async {
    final isRent = p.operation == 'arriendo';
    final status = isRent ? 'arrendado' : 'vendido';
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(isRent ? '¿Marcar como arrendado?' : '¿Marcar como vendido?'),
        content: const Text(
            'La publicación dejará de mostrarse en las búsquedas. Podrás reactivarla cuando quieras.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancelar')),
          TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Confirmar')),
        ],
      ),
    );
    if (ok == true) _setStatus(p, status);
  }
}
