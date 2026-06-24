import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getFavorites, type PropertyWithImages } from '@inmo/shared';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { useFavorites } from '../lib/favorites';
import { PropertyCard } from '../components/PropertyCard';

export function FavoritesScreen({ navigation }: any) {
  const { user } = useAuth();
  const { ids } = useFavorites();
  const [items, setItems] = useState<PropertyWithImages[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getFavorites(supabase, user.id)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [user, ids]);

  if (!user) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <Text style={styles.msg}>
          Inicia sesión para guardar y ver tus favoritos.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Mis favoritos</Text>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={items.filter((p) => ids.has(p.id))}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 4 }}
          ListEmptyComponent={
            <Text style={styles.msg}>
              Aún no tienes favoritos. Toca el corazón ♥ en un inmueble.
            </Text>
          }
          renderItem={({ item }) => (
            <PropertyCard
              property={item}
              onPress={() => navigation.navigate('Detail', { id: item.id })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.bg,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    padding: 16,
    paddingBottom: 8,
  },
  msg: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
});
