import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  getProperty,
  deleteProperty,
  formatPrice,
  OPERATION_LABELS,
  TYPE_LABELS,
  type PropertyWithImages,
} from '@inmo/shared';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { useFavorites } from '../lib/favorites';

export function DetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const { user } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const { width } = useWindowDimensions();
  const [property, setProperty] = useState<PropertyWithImages | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProperty(supabase, id)
      .then(setProperty)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!property) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textMuted }}>
          Este inmueble no está disponible.
        </Text>
      </View>
    );
  }

  const images = property.property_images ?? [];
  const owner = property.owner;
  const isOwner = user?.id === property.owner_id;
  const fav = isFavorite(property.id);
  const wppNumber = owner?.whatsapp ?? owner?.phone;

  const openWhatsApp = () => {
    if (!wppNumber) return;
    const msg = encodeURIComponent(
      `Hola, estoy interesado en tu inmueble "${property.title}".`,
    );
    const num = wppNumber.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/57${num}?text=${msg}`);
  };

  const confirmDelete = () => {
    Alert.alert('Eliminar inmueble', '¿Seguro? No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProperty(supabase, id);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'No se pudo eliminar.');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Galería horizontal */}
      {images.length > 0 ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {images.map((img) => (
            <Image
              key={img.id}
              source={{ uri: img.url }}
              style={{ width, height: 260 }}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={[styles.noPhoto, { width }]}>
          <Text style={{ color: '#9ca3af' }}>Sin fotos</Text>
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.rowBetween}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {OPERATION_LABELS[property.operation]}
            </Text>
          </View>
          <TouchableOpacity onPress={() => toggle(property.id)}>
            <Text style={{ fontSize: 26, color: fav ? '#ef4444' : '#a1a1aa' }}>
              {fav ? '♥' : '♡'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>{property.title}</Text>
        <Text style={styles.location}>
          {[property.neighborhood, property.city, property.department]
            .filter(Boolean)
            .join(', ')}
        </Text>

        <Text style={styles.price}>
          {formatPrice(property.price)}
          {property.operation !== 'venta' && (
            <Text style={styles.month}>/mes</Text>
          )}
        </Text>
        {!!property.admon_fee && (
          <Text style={styles.admon}>
            + Administración {formatPrice(property.admon_fee)}/mes
          </Text>
        )}

        {/* Características */}
        <View style={styles.stats}>
          <Stat label="Tipo" value={TYPE_LABELS[property.type]} />
          <Stat label="Habitaciones" value={String(property.bedrooms)} />
          <Stat label="Baños" value={String(property.bathrooms)} />
          <Stat label="Parqueaderos" value={String(property.parking_spots)} />
          {property.area_m2 != null && (
            <Stat label="Área" value={`${property.area_m2} m²`} />
          )}
          {property.estrato != null && (
            <Stat label="Estrato" value={String(property.estrato)} />
          )}
        </View>

        {property.description ? (
          <>
            <Text style={styles.sectionTitle}>Descripción</Text>
            <Text style={styles.description}>{property.description}</Text>
          </>
        ) : null}

        {/* Contacto */}
        {wppNumber ? (
          <TouchableOpacity style={styles.wppBtn} onPress={openWhatsApp}>
            <Text style={styles.wppText}>Escribir por WhatsApp</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.noContact}>
            El anunciante no registró teléfono de contacto.
          </Text>
        )}

        {isOwner && (
          <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
            <Text style={styles.deleteText}>Eliminar inmueble</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noPhoto: {
    height: 260,
    backgroundColor: '#e4e4e7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 16 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 10 },
  location: { color: colors.textMuted, marginTop: 2 },
  price: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primaryDark,
    marginTop: 14,
  },
  month: { fontSize: 15, fontWeight: '400', color: colors.textMuted },
  admon: { color: colors.textMuted, fontSize: 13 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  stat: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    minWidth: '30%',
  },
  statLabel: { fontSize: 11, color: colors.textMuted },
  statValue: { fontWeight: '700', color: colors.text, marginTop: 2 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 20,
    marginBottom: 6,
  },
  description: { color: '#52525b', lineHeight: 20 },
  wppBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  wppText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  noContact: { color: colors.textMuted, marginTop: 24, textAlign: 'center' },
  deleteBtn: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  deleteText: { color: colors.danger, fontWeight: '700' },
});
