import 'package:flutter/material.dart';
import '../models/property.dart';
import '../theme.dart';
import '../services/supabase_service.dart';
import '../services/favorites_manager.dart';
import '../widgets/property_card.dart';
import 'detail_screen.dart';

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key});

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  List<Property> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    FavoritesManager.instance.ids.addListener(_load);
    _load();
  }

  @override
  void dispose() {
    FavoritesManager.instance.ids.removeListener(_load);
    super.dispose();
  }

  void _load() {
    final user = supabase.auth.currentUser;
    if (user == null) {
      setState(() {
        _items = [];
        _loading = false;
      });
      return;
    }
    setState(() => _loading = true);
    PropertyService.favorites(user.id).then((data) {
      if (!mounted) return;
      setState(() {
        _items = data;
        _loading = false;
      });
    }).catchError((_) {
      if (!mounted) return;
      setState(() => _loading = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = supabase.auth.currentUser;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mis favoritos'),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.text,
      ),
      body: user == null
          ? const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'Inicia sesión para guardar y ver tus favoritos.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.textMuted),
                ),
              ),
            )
          : _loading
              ? const Center(
                  child: CircularProgressIndicator(color: AppColors.primary))
              : ValueListenableBuilder<Set<String>>(
                  valueListenable: FavoritesManager.instance.ids,
                  builder: (_, ids, __) {
                    final list =
                        _items.where((p) => ids.contains(p.id)).toList();
                    if (list.isEmpty) {
                      return const Center(
                        child: Padding(
                          padding: EdgeInsets.all(24),
                          child: Text(
                            'Aún no tienes favoritos.\nToca el corazón ♥ en un inmueble.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AppColors.textMuted),
                          ),
                        ),
                      );
                    }
                    return ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: list.length,
                      itemBuilder: (_, i) => PropertyCard(
                        property: list[i],
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) =>
                                  DetailScreen(propertyId: list[i].id)),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
