import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  searchProperties,
  TYPE_LABELS,
  type OperationType,
  type PropertyFilters,
  type PropertyType,
  type PropertyWithImages,
} from '@inmo/shared';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';
import { PropertyCard } from '../components/PropertyCard';

const QUICK_TYPES: PropertyType[] = [
  'apartamento',
  'casa',
  'apartaestudio',
  'local',
  'oficina',
  'finca',
];

export function SearchScreen({ navigation }: any) {
  const [filters, setFilters] = useState<PropertyFilters>({});
  const [results, setResults] = useState<PropertyWithImages[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const t = setTimeout(() => {
      searchProperties(supabase, filters)
        .then(({ data, count }) => {
          if (!active) return;
          setResults(data);
          setCount(count);
        })
        .catch((e) => console.error(e))
        .finally(() => active && setLoading(false));
    }, 300);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [filters]);

  const set = (patch: Partial<PropertyFilters>) =>
    setFilters((f) => ({ ...f, ...patch, page: 0 }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Encabezado verde */}
      <View style={styles.hero}>
        <Text style={styles.brand}>🏠 Inmobiliaria</Text>
        <TextInput
          style={styles.search}
          placeholder="Ciudad, barrio o palabra clave…"
          placeholderTextColor="#9ca3af"
          value={filters.search ?? ''}
          onChangeText={(text) => set({ search: text || undefined })}
        />
        <View style={styles.row}>
          <View style={styles.segment}>
            {(['venta', 'arriendo'] as OperationType[]).map((op) => {
              const active = filters.operation === op;
              return (
                <TouchableOpacity
                  key={op}
                  style={[styles.segBtn, active && styles.segBtnActive]}
                  onPress={() => set({ operation: active ? undefined : op })}
                >
                  <Text
                    style={[styles.segText, active && styles.segTextActive]}
                  >
                    {op === 'venta' ? 'Venta' : 'Arriendo'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setShowFilters(true)}
          >
            <Text style={styles.filterBtnText}>Filtros</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Chips de tipo */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <Chip
            label="Todos"
            active={!filters.type}
            onPress={() => set({ type: undefined })}
          />
          {QUICK_TYPES.map((t) => (
            <Chip
              key={t}
              label={TYPE_LABELS[t]}
              active={filters.type === t}
              onPress={() =>
                set({ type: filters.type === t ? undefined : t })
              }
            />
          ))}
        </ScrollView>
      </View>

      {/* Resultados */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          ListHeaderComponent={
            <Text style={styles.count}>{count} resultados</Text>
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              No encontramos inmuebles. Prueba quitar filtros.
            </Text>
          }
          renderItem={({ item }) => (
            <PropertyCard
              property={item}
              onPress={() =>
                navigation.navigate('Detail', { id: item.id })
              }
            />
          )}
        />
      )}

      <FiltersModal
        visible={showFilters}
        filters={filters}
        onClose={() => setShowFilters(false)}
        onApply={(f) => {
          setFilters({ ...f, page: 0 });
          setShowFilters(false);
        }}
      />
    </SafeAreaView>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function FiltersModal({
  visible,
  filters,
  onClose,
  onApply,
}: {
  visible: boolean;
  filters: PropertyFilters;
  onClose: () => void;
  onApply: (f: PropertyFilters) => void;
}) {
  const [local, setLocal] = useState<PropertyFilters>(filters);
  useEffect(() => setLocal(filters), [filters, visible]);

  const toggleEstrato = (e: number) => {
    const current = local.estrato ?? [];
    setLocal((l) => ({
      ...l,
      estrato: current.includes(e)
        ? current.filter((x) => x !== e)
        : [...current, e],
    }));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Filtros</Text>
          <ScrollView>
            <Text style={styles.label}>Precio (COP)</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 6 }]}
                placeholder="Mínimo"
                keyboardType="numeric"
                value={local.minPrice ? String(local.minPrice) : ''}
                onChangeText={(t) =>
                  setLocal((l) => ({ ...l, minPrice: t ? Number(t) : undefined }))
                }
              />
              <TextInput
                style={[styles.input, { flex: 1, marginLeft: 6 }]}
                placeholder="Máximo"
                keyboardType="numeric"
                value={local.maxPrice ? String(local.maxPrice) : ''}
                onChangeText={(t) =>
                  setLocal((l) => ({ ...l, maxPrice: t ? Number(t) : undefined }))
                }
              />
            </View>

            <Text style={styles.label}>Estrato</Text>
            <View style={styles.estratoRow}>
              {[1, 2, 3, 4, 5, 6].map((e) => {
                const active = local.estrato?.includes(e);
                return (
                  <TouchableOpacity
                    key={e}
                    style={[styles.estBtn, active && styles.estBtnActive]}
                    onPress={() => toggleEstrato(e)}
                  >
                    <Text
                      style={[
                        styles.estText,
                        active && { color: '#fff' },
                      ]}
                    >
                      {e}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Habitaciones (mínimo)</Text>
            <View style={styles.estratoRow}>
              {[1, 2, 3, 4, 5].map((n) => {
                const active = local.minBedrooms === n;
                return (
                  <TouchableOpacity
                    key={n}
                    style={[styles.estBtn, active && styles.estBtnActive]}
                    onPress={() =>
                      setLocal((l) => ({
                        ...l,
                        minBedrooms: active ? undefined : n,
                      }))
                    }
                  >
                    <Text style={[styles.estText, active && { color: '#fff' }]}>
                      {n}+
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Baños (mínimo)</Text>
            <View style={styles.estratoRow}>
              {[1, 2, 3, 4].map((n) => {
                const active = local.minBathrooms === n;
                return (
                  <TouchableOpacity
                    key={n}
                    style={[styles.estBtn, active && styles.estBtnActive]}
                    onPress={() =>
                      setLocal((l) => ({
                        ...l,
                        minBathrooms: active ? undefined : n,
                      }))
                    }
                  >
                    <Text style={[styles.estText, active && { color: '#fff' }]}>
                      {n}+
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={[styles.row, { marginTop: 16 }]}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnGhost]}
              onPress={() => onApply({})}
            >
              <Text style={styles.modalBtnGhostText}>Limpiar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnPrimary]}
              onPress={() => onApply(local)}
            >
              <Text style={styles.modalBtnPrimaryText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 8 }}>
            <Text style={{ textAlign: 'center', color: colors.textMuted }}>
              Cerrar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hero: {
    backgroundColor: colors.primaryDeep,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  brand: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 10 },
  search: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  segment: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 3,
    marginRight: 8,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segBtnActive: { backgroundColor: '#fff' },
  segText: { color: '#fff', fontWeight: '600' },
  segTextActive: { color: colors.primaryDark },
  filterBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  filterBtnText: { fontWeight: '700', color: '#3f3f00' },
  chips: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  count: { color: colors.textMuted, marginBottom: 10, fontSize: 13 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  label: { fontWeight: '600', marginTop: 12, marginBottom: 6, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  estratoRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  estBtn: {
    width: 44,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  estBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  estText: { fontWeight: '600', color: colors.text },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnGhost: { borderWidth: 1, borderColor: colors.border, marginRight: 6 },
  modalBtnGhostText: { fontWeight: '600', color: colors.text },
  modalBtnPrimary: { backgroundColor: colors.primary, marginLeft: 6 },
  modalBtnPrimaryText: { fontWeight: '700', color: '#fff' },
});
