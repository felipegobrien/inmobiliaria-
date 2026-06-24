import { useState } from 'react';
import {
  Alert,
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
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';
import { useAuth } from '../lib/auth';

export function AccountScreen() {
  const { user, signOut } = useAuth();
  const [mode, setMode] = useState<'login' | 'registro'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert('Error', traducir(error.message));
  };

  const handleRegister = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      setLoading(false);
      Alert.alert('Error', traducir(error.message));
      return;
    }
    if (data.user && phone) {
      await supabase.from('profiles').update({ phone }).eq('id', data.user.id);
    }
    setLoading(false);
    if (!data.session) {
      Alert.alert(
        'Revisa tu correo',
        'Te enviamos un enlace para confirmar tu cuenta.',
      );
    }
  };

  // Sesión iniciada
  if (user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.profileBox}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user.user_metadata?.full_name ?? user.email ?? '?')
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>
            {user.user_metadata?.full_name ?? 'Mi cuenta'}
          </Text>
          <Text style={styles.email}>{user.email}</Text>

          <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Login / Registro
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.form}>
          <Text style={styles.brand}>🏠 Inmobiliaria</Text>

          <View style={styles.tabs}>
            {(['login', 'registro'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.tab, mode === m && styles.tabActive]}
                onPress={() => setMode(m)}
              >
                <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
                  {m === 'login' ? 'Ingresar' : 'Crear cuenta'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {mode === 'registro' && (
            <TextInput
              style={styles.input}
              placeholder="Nombre completo"
              value={fullName}
              onChangeText={setFullName}
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          {mode === 'registro' && (
            <TextInput
              style={styles.input}
              placeholder="Teléfono / WhatsApp"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={styles.submit}
            disabled={loading}
            onPress={mode === 'login' ? handleLogin : handleRegister}
          >
            <Text style={styles.submitText}>
              {loading
                ? 'Cargando…'
                : mode === 'login'
                  ? 'Ingresar'
                  : 'Crear cuenta'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function traducir(msg: string): string {
  if (msg.includes('Invalid login credentials'))
    return 'Correo o contraseña incorrectos.';
  if (msg.includes('Email not confirmed'))
    return 'Debes confirmar tu correo antes de ingresar.';
  if (msg.includes('already registered')) return 'Ese correo ya está registrado.';
  if (msg.includes('Password should be'))
    return 'La contraseña debe tener al menos 6 caracteres.';
  if (msg.includes('is invalid')) return 'Usa un correo real y válido.';
  return msg;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  form: { padding: 24, paddingTop: 40 },
  brand: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primaryDark,
    textAlign: 'center',
    marginBottom: 24,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#e4e4e7',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.primaryDark },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
    fontSize: 15,
  },
  submit: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  // Perfil
  profileBox: { alignItems: 'center', padding: 32, paddingTop: 60 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 16 },
  email: { color: colors.textMuted, marginTop: 4 },
  logoutBtn: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 40,
    marginTop: 32,
  },
  logoutText: { color: colors.danger, fontWeight: '700' },
});
