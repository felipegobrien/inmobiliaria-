import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import {
  createProperty,
  uploadPropertyImage,
  OPERATION_LABELS,
  TYPE_LABELS,
  type OperationType,
  type PropertyType,
  type PropertyInput,
} from '@inmo/shared';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';
import { useAuth } from '../lib/auth';

const OPERATIONS: OperationType[] = ['venta', 'arriendo', 'venta_arriendo'];
const TYPES = Object.keys(TYPE_LABELS) as PropertyType[];

export function PublishScreen({ navigation }: any) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: '',
    description: '',
    operation: 'venta' as OperationType,
    type: 'apartamento' as PropertyType,
    price: '',
    admon_fee: '',
    estrato: '',
    bedrooms: '',
    bathrooms: '',
    parking_spots: '',
    area_m2: '',
    department: '',
    city: '',
    neighborhood: '',
    address: '',
  });
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  if (!user) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <Text style={styles.msg}>
          Inicia sesión (pestaña Cuenta) para publicar un inmueble.
        </Text>
      </SafeAreaView>
    );
  }

  const pickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso necesario', 'Permite el acceso a tus fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled) {
      setPhotos((p) => [...p, ...result.assets]);
    }
  };

  const handleSubmit = async () => {
    if (!form.title || !form.price || !form.city || !form.department) {
      Alert.alert('Faltan datos', 'Completa título, precio, ciudad y departamento.');
      return;
    }
    setSaving(true);
    try {
      const urls: string[] = [];
      for (const photo of photos) {
        if (!photo.base64) continue;
        const ext = (photo.uri.split('.').pop() ?? 'jpg').toLowerCase();
        const url = await uploadPropertyImage(
          supabase,
          user.id,
          decode(photo.base64),
          ext === 'png' ? 'png' : 'jpg',
        );
        urls.push(url);
      }

      const payload: PropertyInput = {
        title: form.title,
        description: form.description || null,
        operation: form.operation,
        type: form.type,
        status: 'activo',
        price: Number(form.price),
        admon_fee: form.admon_fee ? Number(form.admon_fee) : 0,
        price_negotiable: false,
        estrato: form.estrato ? Number(form.estrato) : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : 0,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : 0,
        parking_spots: form.parking_spots ? Number(form.parking_spots) : 0,
        area_m2: form.area_m2 ? Number(form.area_m2) : null,
        built_area_m2: null,
        floor: null,
        age_years: null,
        department: form.department,
        city: form.city,
        neighborhood: form.neighborhood || null,
        address: form.address || null,
      };

      const id = await createProperty(supabase, user.id, payload, urls);
      Alert.alert('¡Publicado!', 'Tu inmueble ya está visible.');
      // Limpiar y abrir detalle
      navigation.navigate('Detail', { id });
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo publicar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.title}>Publicar inmueble</Text>

          <Label text="Operación" />
          <Selector
            options={OPERATIONS.map((o) => ({ value: o, label: OPERATION_LABELS[o] }))}
            value={form.operation}
            onSelect={(v) => set('operation', v)}
          />

          <Label text="Tipo de inmueble" />
          <Selector
            options={TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }))}
            value={form.type}
            onSelect={(v) => set('type', v)}
          />

          <Label text="Título" />
          <TextInput
            style={styles.input}
            placeholder="Ej. Apartamento con vista en El Poblado"
            value={form.title}
            onChangeText={(t) => set('title', t)}
          />

          <Label text="Descripción" />
          <TextInput
            style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
            placeholder="Describe el inmueble…"
            multiline
            value={form.description}
            onChangeText={(t) => set('description', t)}
          />

          <Row>
            <Field label="Precio (COP)" value={form.price} onChange={(t) => set('price', t)} numeric />
            <Field label="Administración" value={form.admon_fee} onChange={(t) => set('admon_fee', t)} numeric />
          </Row>
          <Row>
            <Field label="Estrato" value={form.estrato} onChange={(t) => set('estrato', t)} numeric />
            <Field label="Habitaciones" value={form.bedrooms} onChange={(t) => set('bedrooms', t)} numeric />
          </Row>
          <Row>
            <Field label="Baños" value={form.bathrooms} onChange={(t) => set('bathrooms', t)} numeric />
            <Field label="Parqueaderos" value={form.parking_spots} onChange={(t) => set('parking_spots', t)} numeric />
          </Row>
          <Field label="Área (m²)" value={form.area_m2} onChange={(t) => set('area_m2', t)} numeric />

          <Row>
            <Field label="Departamento" value={form.department} onChange={(t) => set('department', t)} />
            <Field label="Ciudad" value={form.city} onChange={(t) => set('city', t)} />
          </Row>
          <Row>
            <Field label="Barrio" value={form.neighborhood} onChange={(t) => set('neighborhood', t)} />
            <Field label="Dirección" value={form.address} onChange={(t) => set('address', t)} />
          </Row>

          <Label text="Fotos" />
          <TouchableOpacity style={styles.photoBtn} onPress={pickImages}>
            <Text style={styles.photoBtnText}>+ Agregar fotos</Text>
          </TouchableOpacity>
          {photos.length > 0 && (
            <ScrollView horizontal style={{ marginTop: 10 }}>
              {photos.map((p, i) => (
                <Image key={i} source={{ uri: p.uri }} style={styles.thumb} />
              ))}
            </ScrollView>
          )}

          <TouchableOpacity
            style={styles.submit}
            disabled={saving}
            onPress={handleSubmit}
          >
            <Text style={styles.submitText}>
              {saving ? 'Publicando…' : 'Publicar inmueble'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}
function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}
function Field({
  label,
  value,
  onChange,
  numeric,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  numeric?: boolean;
}) {
  return (
    <View style={{ flex: 1, marginHorizontal: 4 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? 'numeric' : 'default'}
      />
    </View>
  );
}
function Selector({
  options,
  value,
  onSelect,
}: {
  options: { value: string; label: string }[];
  value: string;
  onSelect: (v: any) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {options.map((o) => {
          const active = value === o.value;
          return (
            <TouchableOpacity
              key={o.value}
              style={[styles.opt, active && styles.optActive]}
              onPress={() => onSelect(o.value)}
            >
              <Text style={[styles.optText, active && { color: '#fff' }]}>
                {o.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
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
  msg: { textAlign: 'center', color: colors.textMuted },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 8 },
  label: {
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  fieldLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
  },
  row: { flexDirection: 'row', marginHorizontal: -4 },
  opt: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  optActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optText: { color: colors.text, fontWeight: '500' },
  photoBtn: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  photoBtnText: { color: colors.primary, fontWeight: '700' },
  thumb: { width: 80, height: 80, borderRadius: 10, marginRight: 8 },
  submit: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
