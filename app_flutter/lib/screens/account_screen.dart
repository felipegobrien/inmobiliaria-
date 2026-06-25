import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../theme.dart';
import '../services/supabase_service.dart';
import 'admin_screen.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  bool _isLogin = true;
  bool _loading = false;
  String? _role;
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadRole();
    supabase.auth.onAuthStateChange.listen((_) {
      if (mounted) {
        setState(() {});
        _loadRole();
      }
    });
  }

  Future<void> _loadRole() async {
    final r = await PropertyService.myRole();
    if (mounted) setState(() => _role = r);
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    _password.dispose();
    super.dispose();
  }

  String _traducir(String msg) {
    if (msg.contains('Invalid login credentials')) {
      return 'Correo o contraseña incorrectos.';
    }
    if (msg.contains('Email not confirmed')) {
      return 'Debes confirmar tu correo antes de ingresar.';
    }
    if (msg.contains('already registered')) {
      return 'Ese correo ya está registrado.';
    }
    if (msg.contains('Password should be')) {
      return 'La contraseña debe tener al menos 6 caracteres.';
    }
    if (msg.contains('is invalid')) return 'Usa un correo real y válido.';
    return msg;
  }

  Future<void> _submit() async {
    setState(() => _loading = true);
    try {
      if (_isLogin) {
        await supabase.auth.signInWithPassword(
          email: _email.text.trim(),
          password: _password.text,
        );
      } else {
        final res = await supabase.auth.signUp(
          email: _email.text.trim(),
          password: _password.text,
          data: {'full_name': _name.text.trim()},
        );
        if (res.user != null && _phone.text.trim().isNotEmpty) {
          await supabase
              .from('profiles')
              .update({'phone': _phone.text.trim()}).eq('id', res.user!.id);
        }
        if (res.session == null && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
              content: Text(
                  'Revisa tu correo para confirmar la cuenta.')));
        }
      }
    } on AuthException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(_traducir(e.message))));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = supabase.auth.currentUser;

    if (user != null) {
      final name = user.userMetadata?['full_name'] as String? ?? 'Mi cuenta';
      return Scaffold(
        appBar: AppBar(
            title: const Text('Mi cuenta'),
            backgroundColor: Colors.white,
            foregroundColor: AppColors.text),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircleAvatar(
                  radius: 44,
                  backgroundColor: AppColors.primary,
                  child: Text(
                    (name.isNotEmpty ? name : user.email ?? '?')[0]
                        .toUpperCase(),
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 36,
                        fontWeight: FontWeight.w800),
                  ),
                ),
                const SizedBox(height: 16),
                Text(name,
                    style: const TextStyle(
                        fontSize: 20, fontWeight: FontWeight.w800)),
                Text(user.email ?? '',
                    style: const TextStyle(color: AppColors.textMuted)),
                const SizedBox(height: 28),
                if (_role == 'admin')
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: ElevatedButton.icon(
                      onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const AdminScreen()),
                      ),
                      icon: const Icon(Icons.admin_panel_settings),
                      label: const Text('Panel de administración'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 28, vertical: 13),
                      ),
                    ),
                  ),
                OutlinedButton.icon(
                  onPressed: () => supabase.auth.signOut(),
                  icon: const Icon(Icons.logout, color: AppColors.danger),
                  label: const Text('Cerrar sesión',
                      style: TextStyle(color: AppColors.danger)),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 40, vertical: 13),
                    side: const BorderSide(color: AppColors.danger),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const SizedBox(height: 20),
              const Text('🏠 Inmobiliaria',
                  style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      color: AppColors.primaryDark)),
              const SizedBox(height: 24),
              Container(
                decoration: BoxDecoration(
                  color: const Color(0xFFE4E4E7),
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.all(4),
                child: Row(
                  children: [
                    _tab('Ingresar', _isLogin, () => setState(() => _isLogin = true)),
                    _tab('Crear cuenta', !_isLogin,
                        () => setState(() => _isLogin = false)),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              if (!_isLogin)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: TextField(
                    controller: _name,
                    decoration:
                        const InputDecoration(hintText: 'Nombre completo'),
                  ),
                ),
              TextField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                decoration:
                    const InputDecoration(hintText: 'Correo electrónico'),
              ),
              const SizedBox(height: 12),
              if (!_isLogin)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: TextField(
                    controller: _phone,
                    keyboardType: TextInputType.phone,
                    decoration:
                        const InputDecoration(hintText: 'Teléfono / WhatsApp'),
                  ),
                ),
              TextField(
                controller: _password,
                obscureText: true,
                decoration: const InputDecoration(hintText: 'Contraseña'),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading ? null : _submit,
                  child: Text(_loading
                      ? 'Cargando…'
                      : (_isLogin ? 'Ingresar' : 'Crear cuenta')),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _tab(String label, bool active, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: active ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(9),
          ),
          alignment: Alignment.center,
          child: Text(label,
              style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: active ? AppColors.primaryDark : AppColors.textMuted)),
        ),
      ),
    );
  }
}
