import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import '../models/property.dart';
import '../theme.dart';
import '../services/favorites_manager.dart';

class PropertyCard extends StatefulWidget {
  final Property property;
  final VoidCallback onTap;

  const PropertyCard({super.key, required this.property, required this.onTap});

  @override
  State<PropertyCard> createState() => _PropertyCardState();
}

class _PropertyCardState extends State<PropertyCard> {
  final _pageCtrl = PageController();
  int _page = 0;

  @override
  void dispose() {
    _pageCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final property = widget.property;
    final images = property.images;

    return GestureDetector(
      onTap: widget.onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFEAEAED)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.14),
              blurRadius: 18,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Carrusel de fotos
            Stack(
              children: [
                AspectRatio(
                  aspectRatio: 16 / 10,
                  child: images.isEmpty
                      ? Container(
                          color: const Color(0xFFF1F1F3),
                          alignment: Alignment.center,
                          child: const Text('Sin foto',
                              style: TextStyle(color: Colors.grey)),
                        )
                      : PageView.builder(
                          controller: _pageCtrl,
                          itemCount: images.length,
                          onPageChanged: (i) => setState(() => _page = i),
                          itemBuilder: (_, i) => CachedNetworkImage(
                            imageUrl: images[i].url,
                            fit: BoxFit.cover,
                            width: double.infinity,
                            placeholder: (_, __) =>
                                Container(color: const Color(0xFFF1F1F3)),
                            errorWidget: (_, __, ___) => Container(
                              color: const Color(0xFFF1F1F3),
                              alignment: Alignment.center,
                              child: const Icon(Icons.image_not_supported_outlined,
                                  color: Colors.grey),
                            ),
                          ),
                        ),
                ),
                // Operación / Destacado
                Positioned(
                  left: 12,
                  top: 12,
                  child: property.featured
                      ? _bubble(
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: const [
                              Icon(Icons.star,
                                  size: 14, color: Color(0xFFD97706)),
                              SizedBox(width: 4),
                              Text('Destacado',
                                  style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: Color(0xFF92400E))),
                            ],
                          ),
                        )
                      : _bubble(
                          child: Text(
                            operationLabels[property.operation] ?? '',
                            style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primaryDark),
                          ),
                        ),
                ),
                // Favorito
                Positioned(
                  right: 12,
                  top: 12,
                  child: ValueListenableBuilder<Set<String>>(
                    valueListenable: FavoritesManager.instance.ids,
                    builder: (_, ids, __) {
                      final fav = ids.contains(property.id);
                      return GestureDetector(
                        onTap: () =>
                            FavoritesManager.instance.toggle(property.id),
                        child: Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.92),
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.12),
                                blurRadius: 6,
                              ),
                            ],
                          ),
                          child: Icon(
                            fav ? Icons.favorite : Icons.favorite_border,
                            color: fav ? Colors.red : AppColors.textMuted,
                            size: 20,
                          ),
                        ),
                      );
                    },
                  ),
                ),
                // Indicador de fotos (puntos)
                if (images.length > 1)
                  Positioned(
                    bottom: 10,
                    left: 0,
                    right: 0,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        for (var i = 0; i < images.length; i++)
                          AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            margin: const EdgeInsets.symmetric(horizontal: 2),
                            width: i == _page ? 16 : 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: i == _page
                                  ? Colors.white
                                  : Colors.white.withValues(alpha: 0.6),
                              borderRadius: BorderRadius.circular(3),
                            ),
                          ),
                      ],
                    ),
                  ),
              ],
            ),

            // Contenido
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 14, 14, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    formatPrice(property.price) +
                        (property.operation != 'venta' ? ' / mes' : ''),
                    style: const TextStyle(
                        fontSize: 21,
                        fontWeight: FontWeight.w800,
                        color: AppColors.text),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    [property.neighborhood, property.city]
                        .where((e) => e != null && e.isNotEmpty)
                        .join(', '),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        color: AppColors.textMuted, fontSize: 14),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      _spec(Icons.king_bed_outlined, '${property.bedrooms} Habs.'),
                      const SizedBox(width: 16),
                      _spec(Icons.bathtub_outlined,
                          '${property.bathrooms} Baño${property.bathrooms == 1 ? '' : 's'}'),
                      if (property.areaM2 != null) ...[
                        const SizedBox(width: 16),
                        _spec(Icons.straighten, '${_area(property.areaM2!)} m²'),
                      ],
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    property.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.text,
                        height: 1.25),
                  ),
                  if (property.description != null &&
                      property.description!.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      property.description!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textMuted,
                          height: 1.3),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _bubble({required Widget child}) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.92),
          borderRadius: BorderRadius.circular(999),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.12),
              blurRadius: 6,
            ),
          ],
        ),
        child: child,
      );

  Widget _spec(IconData icon, String text) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 18, color: AppColors.textMuted),
          const SizedBox(width: 5),
          Text(text,
              style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.text,
                  fontWeight: FontWeight.w500)),
        ],
      );

  String _area(num v) =>
      v == v.roundToDouble() ? v.toInt().toString() : v.toString();
}
