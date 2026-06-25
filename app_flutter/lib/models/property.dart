import 'package:intl/intl.dart';

final _cop = NumberFormat.currency(
  locale: 'es_CO',
  symbol: '\$',
  decimalDigits: 0,
);

String formatPrice(num value) => _cop.format(value);

String _slugify(String s) {
  s = s.toLowerCase();
  const from = 'áàäâãéèëêíìïîóòöôõúùüûñç';
  const to = 'aaaaaeeeeiiiiooooouuuunc';
  for (var i = 0; i < from.length; i++) {
    s = s.replaceAll(from[i], to[i]);
  }
  return s
      .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
      .replaceAll(RegExp(r'^-+|-+$'), '');
}

String propertySlug(Property p) {
  final opWord = p.operation == 'arriendo' ? 'en arriendo' : 'en venta';
  final words = [typeLabels[p.type] ?? p.type, opWord, p.neighborhood ?? '', p.city]
      .where((e) => e.isNotEmpty)
      .join(' ');
  return '${_slugify(words)}-${p.ref}';
}

const operationLabels = {
  'venta': 'En venta',
  'arriendo': 'En arriendo',
  'venta_arriendo': 'Venta y arriendo',
};

const typeLabels = {
  'apartamento': 'Apartamento',
  'casa': 'Casa',
  'apartaestudio': 'Apartaestudio',
  'local': 'Local',
  'oficina': 'Oficina',
  'bodega': 'Bodega',
  'lote': 'Lote',
  'finca': 'Finca',
  'consultorio': 'Consultorio',
  'edificio': 'Edificio',
  'parqueadero': 'Parqueadero',
};

const amenityCategoryLabels = {
  'interiores': 'Interiores',
  'zonas_comunes': 'Zonas comunes y exteriores',
  'sector': 'Características del sector',
  'general': 'Otras',
};

const amenityCategoryOrder = ['interiores', 'zonas_comunes', 'sector', 'general'];

const colombiaDepartments = [
  'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bogotá D.C.', 'Bolívar',
  'Boyacá', 'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó',
  'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira',
  'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío',
  'Risaralda', 'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima',
  'Valle del Cauca', 'Vaupés', 'Vichada',
];

class Plan {
  final String id;
  final String name;
  final String? description;
  final int price;
  final int durationDays;
  final bool isFeatured;

  Plan({
    required this.id,
    required this.name,
    this.description,
    required this.price,
    required this.durationDays,
    required this.isFeatured,
  });

  factory Plan.fromJson(Map<String, dynamic> j) => Plan(
        id: j['id'] as String,
        name: j['name'] as String,
        description: j['description'] as String?,
        price: (j['price'] as num).toInt(),
        durationDays: (j['duration_days'] as num).toInt(),
        isFeatured: (j['is_featured'] ?? false) as bool,
      );
}

class Amenity {
  final int id;
  final String name;
  final String category;

  Amenity({required this.id, required this.name, required this.category});

  factory Amenity.fromJson(Map<String, dynamic> j) => Amenity(
        id: (j['id'] as num).toInt(),
        name: j['name'] as String,
        category: (j['category'] ?? 'general') as String,
      );
}

class PropertyImage {
  final String id;
  final String url;
  final bool isCover;

  PropertyImage({required this.id, required this.url, required this.isCover});

  factory PropertyImage.fromJson(Map<String, dynamic> j) => PropertyImage(
        id: j['id'] as String,
        url: j['url'] as String,
        isCover: (j['is_cover'] ?? false) as bool,
      );
}

class Owner {
  final String? fullName;
  final String? phone;
  final String? whatsapp;
  final String? company;

  Owner({this.fullName, this.phone, this.whatsapp, this.company});

  factory Owner.fromJson(Map<String, dynamic> j) => Owner(
        fullName: j['full_name'] as String?,
        phone: j['phone'] as String?,
        whatsapp: j['whatsapp'] as String?,
        company: j['company'] as String?,
      );
}

class Property {
  final String id;
  final String ownerId;
  final String title;
  final String? description;
  final String operation;
  final String type;
  final String status;
  final int price;
  final int? admonFee;
  final int? estrato;
  final int bedrooms;
  final int bathrooms;
  final int parkingSpots;
  final num? areaM2;
  final String department;
  final String city;
  final String? neighborhood;
  final String? address;
  final List<String> nearbyPlaces;
  final List<int> amenityIds;
  final bool featured;
  final DateTime? featuredAt;
  final String plan;
  final DateTime? expiresAt;
  final int viewsCount;
  final int ref;
  final List<PropertyImage> images;
  final Owner? owner;

  Property({
    required this.id,
    required this.ownerId,
    required this.title,
    this.description,
    required this.operation,
    required this.type,
    required this.status,
    required this.price,
    this.admonFee,
    this.estrato,
    required this.bedrooms,
    required this.bathrooms,
    required this.parkingSpots,
    this.areaM2,
    required this.department,
    required this.city,
    this.neighborhood,
    this.address,
    this.nearbyPlaces = const [],
    this.amenityIds = const [],
    this.featured = false,
    this.featuredAt,
    this.plan = 'estandar',
    this.expiresAt,
    this.viewsCount = 0,
    this.ref = 0,
    this.images = const [],
    this.owner,
  });

  String? get coverUrl {
    if (images.isEmpty) return null;
    final cover = images.firstWhere(
      (i) => i.isCover,
      orElse: () => images.first,
    );
    return cover.url;
  }

  factory Property.fromJson(Map<String, dynamic> j) {
    final imgs = (j['property_images'] as List?)
            ?.map((e) => PropertyImage.fromJson(e as Map<String, dynamic>))
            .toList() ??
        [];
    final ownerJson = j['owner'];
    final nearby = (j['nearby_places'] as List?)?.cast<String>() ?? [];
    final amenityIds = (j['property_amenities'] as List?)
            ?.map((e) => (e['amenity_id'] as num).toInt())
            .toList() ??
        [];
    return Property(
      id: j['id'] as String,
      ownerId: j['owner_id'] as String,
      title: j['title'] as String,
      description: j['description'] as String?,
      operation: j['operation'] as String,
      type: j['type'] as String,
      status: j['status'] as String,
      price: (j['price'] as num).toInt(),
      admonFee: (j['admon_fee'] as num?)?.toInt(),
      estrato: (j['estrato'] as num?)?.toInt(),
      bedrooms: (j['bedrooms'] as num?)?.toInt() ?? 0,
      bathrooms: (j['bathrooms'] as num?)?.toInt() ?? 0,
      parkingSpots: (j['parking_spots'] as num?)?.toInt() ?? 0,
      areaM2: j['area_m2'] as num?,
      department: j['department'] as String,
      city: j['city'] as String,
      neighborhood: j['neighborhood'] as String?,
      address: j['address'] as String?,
      nearbyPlaces: nearby,
      amenityIds: amenityIds,
      featured: (j['featured'] ?? false) as bool,
      featuredAt: j['featured_at'] != null
          ? DateTime.tryParse(j['featured_at'] as String)
          : null,
      plan: (j['plan'] ?? 'estandar') as String,
      expiresAt: j['expires_at'] != null
          ? DateTime.tryParse(j['expires_at'] as String)
          : null,
      viewsCount: (j['views_count'] as num?)?.toInt() ?? 0,
      ref: (j['ref'] as num?)?.toInt() ?? 0,
      images: imgs,
      owner: ownerJson != null
          ? Owner.fromJson(ownerJson as Map<String, dynamic>)
          : null,
    );
  }
}

// Filtros de búsqueda
class PropertyFilters {
  String? operation;
  String? type;
  String? city;
  String? search;
  int? minPrice;
  int? maxPrice;
  List<int> estrato;
  int? minBedrooms;
  int? minBathrooms;
  int? minParking;
  List<int> amenityIds;
  String sortBy;

  PropertyFilters({
    this.operation,
    this.type,
    this.city,
    this.search,
    this.minPrice,
    this.maxPrice,
    this.estrato = const [],
    this.minBedrooms,
    this.minBathrooms,
    this.minParking,
    this.amenityIds = const [],
    this.sortBy = 'recientes',
  });

  PropertyFilters copy() => PropertyFilters(
        operation: operation,
        type: type,
        city: city,
        search: search,
        minPrice: minPrice,
        maxPrice: maxPrice,
        estrato: List.from(estrato),
        minBedrooms: minBedrooms,
        minBathrooms: minBathrooms,
        minParking: minParking,
        amenityIds: List.from(amenityIds),
        sortBy: sortBy,
      );

  int get activeCount {
    var n = 0;
    if (operation != null) n++;
    if (type != null) n++;
    if (minPrice != null || maxPrice != null) n++;
    if (estrato.isNotEmpty) n++;
    if (minBedrooms != null) n++;
    if (minBathrooms != null) n++;
    if (minParking != null) n++;
    if (amenityIds.isNotEmpty) n += amenityIds.length;
    return n;
  }
}
