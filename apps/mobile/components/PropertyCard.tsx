import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  formatPrice,
  OPERATION_LABELS,
  TYPE_LABELS,
  type PropertyWithImages,
} from '@inmo/shared';
import { colors } from '../lib/theme';
import { useFavorites } from '../lib/favorites';

export function PropertyCard({
  property,
  onPress,
}: {
  property: PropertyWithImages;
  onPress: () => void;
}) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(property.id);
  const cover =
    property.property_images?.find((i) => i.is_cover)?.url ??
    property.property_images?.[0]?.url;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
      <View>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverEmpty]}>
            <Text style={{ color: '#9ca3af' }}>Sin foto</Text>
          </View>
        )}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {OPERATION_LABELS[property.operation]}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.heart}
          onPress={() => toggle(property.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={{ fontSize: 18, color: fav ? '#ef4444' : '#a1a1aa' }}>
            {fav ? '♥' : '♡'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Text style={styles.price}>
          {formatPrice(property.price)}
          {property.operation !== 'venta' && (
            <Text style={styles.month}>/mes</Text>
          )}
        </Text>
        <Text style={styles.title} numberOfLines={1}>
          {property.title}
        </Text>
        <Text style={styles.location} numberOfLines={1}>
          {[property.neighborhood, property.city].filter(Boolean).join(', ')}
        </Text>
        <Text style={styles.meta}>
          {TYPE_LABELS[property.type]} · {property.bedrooms} hab ·{' '}
          {property.bathrooms} baños
          {property.estrato ? ` · Estrato ${property.estrato}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cover: { width: '100%', height: 190, backgroundColor: '#f4f4f5' },
  coverEmpty: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    left: 10,
    top: 10,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  heart: {
    position: 'absolute',
    right: 10,
    top: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 14 },
  price: { fontSize: 18, fontWeight: '800', color: colors.primaryDark },
  month: { fontSize: 13, fontWeight: '400', color: colors.textMuted },
  title: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 2 },
  location: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  meta: { fontSize: 13, color: '#52525b', marginTop: 6 },
});
