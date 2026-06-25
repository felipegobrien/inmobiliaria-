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
                    for (final e in _items) _listingTile(e.$1, e.$2),
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
            child: Text(p.title,
                style: const TextStyle(fontWeight: FontWeight.w700)),
          ),
          Text(formatPrice(p.price),
              style: const TextStyle(
                  color: AppColors.primaryDark, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
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
        ],
      ),
    );
  }
}
