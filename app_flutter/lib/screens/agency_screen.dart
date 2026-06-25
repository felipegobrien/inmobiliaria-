import 'package:flutter/material.dart';
import '../models/property.dart';
import '../theme.dart';
import '../services/supabase_service.dart';
import '../widgets/property_card.dart';
import 'detail_screen.dart';

class AgencyScreen extends StatefulWidget {
  final String ownerId;
  final String name;
  const AgencyScreen({super.key, required this.ownerId, required this.name});

  @override
  State<AgencyScreen> createState() => _AgencyScreenState();
}

class _AgencyScreenState extends State<AgencyScreen> {
  List<Property> _items = [];
  String? _avatarUrl;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    PropertyService.agencyProperties(widget.ownerId).then((d) {
      if (mounted) {
        setState(() {
          _items = d;
          _loading = false;
        });
      }
    }).catchError((_) {
      if (mounted) setState(() => _loading = false);
    });
    PropertyService.profileById(widget.ownerId).then((p) {
      if (mounted) setState(() => _avatarUrl = p?['avatar_url'] as String?);
    }).catchError((_) {});
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
          title: const Text('Inmobiliaria'),
          backgroundColor: Colors.white,
          foregroundColor: AppColors.text),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary))
          : Column(
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  color: Colors.white,
                  child: Row(
                    children: [
                      Container(
                        width: 84,
                        height: 56,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          color: const Color(0xFFF1F1F3),
                          border: Border.all(color: AppColors.border),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: (_avatarUrl != null && _avatarUrl!.isNotEmpty)
                            ? Image.network(_avatarUrl!, fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => const Icon(
                                    Icons.apartment, color: AppColors.primary))
                            : const Icon(Icons.apartment,
                                color: AppColors.primary),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(titleCase(widget.name),
                                style: const TextStyle(
                                    fontSize: 18, fontWeight: FontWeight.w800)),
                            Text('${_items.length} inmuebles publicados',
                                style: const TextStyle(
                                    color: AppColors.textMuted, fontSize: 13)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: _items.isEmpty
                      ? const Center(
                          child: Text('Sin inmuebles activos.',
                              style: TextStyle(color: AppColors.textMuted)))
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _items.length,
                          itemBuilder: (_, i) => PropertyCard(
                            property: _items[i],
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (_) =>
                                      DetailScreen(propertyId: _items[i].id)),
                            ),
                          ),
                        ),
                ),
              ],
            ),
    );
  }
}
