import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../theme.dart';
import '../services/supabase_service.dart';
import 'detail_screen.dart';

class ReportedScreen extends StatefulWidget {
  const ReportedScreen({super.key});

  @override
  State<ReportedScreen> createState() => _ReportedScreenState();
}

class _ReportedScreenState extends State<ReportedScreen> {
  List<Map<String, dynamic>> _reports = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final r = await PropertyService.reports();
      if (!mounted) return;
      setState(() {
        _reports = r;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _dismiss(String id) async {
    await PropertyService.deleteReport(id);
    _load();
  }

  Future<void> _deleteProperty(String propertyId) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Eliminar inmueble'),
        content: const Text(
            'Se eliminará la publicación y todas sus denuncias. ¿Continuar?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancelar')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Eliminar',
                style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    await PropertyService.delete(propertyId);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Inmueble eliminado.')));
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F7),
      appBar: AppBar(title: const Text('Publicaciones denunciadas')),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary))
          : _reports.isEmpty
              ? const Center(
                  child: Text('No hay denuncias por ahora.',
                      style: TextStyle(color: AppColors.textMuted)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(14),
                    itemCount: _reports.length,
                    itemBuilder: (_, i) => _card(_reports[i]),
                  ),
                ),
    );
  }

  Widget _card(Map<String, dynamic> r) {
    final prop = r['property'] as Map<String, dynamic>?;
    final title = prop?['title'] as String? ?? '(inmueble eliminado)';
    final place = [prop?['neighborhood'], prop?['city']]
        .where((e) => e != null && (e as String).isNotEmpty)
        .join(', ');
    final ref = prop?['ref'];
    final date = DateTime.tryParse(r['created_at'] as String? ?? '');
    final propertyId = prop?['id'] as String?;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Motivo
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF2F2),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.flag, size: 14, color: AppColors.danger),
                const SizedBox(width: 5),
                Text(r['reason'] as String? ?? '',
                    style: const TextStyle(
                        color: AppColors.danger,
                        fontSize: 12,
                        fontWeight: FontWeight.w700)),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Text(title,
              style: const TextStyle(
                  fontSize: 15, fontWeight: FontWeight.w700)),
          if (place.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(place,
                  style: const TextStyle(
                      color: AppColors.textMuted, fontSize: 13)),
            ),
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Text(
              [
                if (ref != null) 'Cód. $ref',
                if (date != null) DateFormat('d MMM y', 'es').format(date),
              ].join(' · '),
              style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              if (propertyId != null)
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) =>
                              DetailScreen(propertyId: propertyId)),
                    ),
                    icon: const Icon(Icons.visibility_outlined, size: 18),
                    label: const Text('Ver'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
              if (propertyId != null) const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed: () => _dismiss(r['id'] as String),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('Descartar'),
                ),
              ),
              if (propertyId != null) const SizedBox(width: 8),
              if (propertyId != null)
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _deleteProperty(propertyId),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.danger,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('Eliminar'),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
