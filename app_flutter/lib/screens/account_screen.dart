import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:image_picker/image_picker.dart';
import '../config.dart';
import '../theme.dart';
import '../services/supabase_service.dart';
import '../services/app_events.dart';
import 'admin_screen.dart';
import 'agency_panel_screen.dart';
import 'reported_screen.dart';
import 'crop_screen.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  bool _isLogin = true;
  bool _loading = false;
  String? _role;
  String? _avatarUrl;
  bool _uploadingAvatar = false;
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
    final p = await PropertyService.myProfile();
    if (mounted) {
      setState(() {
        _role = p?['role'] as String?;
        _avatarUrl = p?['avatar_url'] as String?;
      });
    }
  }

  Widget _roleBadge() {
    final (label, color, icon) = switch (_role) {
      'admin' => ('Administrador', AppColors.primaryDark, Icons.shield),
      'inmobiliaria' => ('Inmobiliaria', const Color(0xFFD97706), Icons.apartment),
      'agente' => ('Agente', AppColors.primary, Icons.badge),
      _ => ('Cliente', AppColors.textMuted, Icons.person),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: color),
          const SizedBox(width: 5),
          Text(label,
              style: TextStyle(
                  color: color, fontWeight: FontWeight.w700, fontSize: 13)),
        ],
      ),
    );
  }

  Widget _initial(String name, String? email) => Center(
        child: Text(
          (name.isNotEmpty ? name : (email ?? '?'))[0].toUpperCase(),
          style: const TextStyle(
              color: Colors.white, fontSize: 36, fontWeight: FontWeight.w800),
        ),
      );

  Future<void> _changeAvatar() async {
    final picked =
        await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (picked == null) return;
    final user = supabase.auth.currentUser;
    if (user == null) return;
    final original = await picked.readAsBytes();
    if (!mounted) return;
    // Ajustar la imagen al rectángulo
    final Uint8List? cropped = await Navigator.push<Uint8List>(
      context,
      MaterialPageRoute(builder: (_) => CropScreen(image: original)),
    );
    if (cropped == null) return;
    setState(() => _uploadingAvatar = true);
    try {
      final url =
          await PropertyService.uploadImage(user.id, cropped, 'jpg');
      await PropertyService.updateAvatar(url);
      bumpRefresh();
      if (mounted) setState(() => _avatarUrl = url);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) setState(() => _uploadingAvatar = false);
    }
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

  /// Envía el correo de recuperación. El enlace abre la página web
  /// /restablecer, donde el usuario crea su contraseña nueva.
  Future<void> _forgotPassword() async {
    final ctrl = TextEditingController(text: _email.text.trim());
    final email = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Recuperar contraseña'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Te enviaremos un correo con un enlace para crear una contraseña nueva.',
              style: TextStyle(fontSize: 14, color: AppColors.textMuted),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: ctrl,
              keyboardType: TextInputType.emailAddress,
              autofocus: true,
              decoration:
                  const InputDecoration(hintText: 'Correo electrónico'),
            ),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancelar')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, ctrl.text.trim()),
            style: ElevatedButton.styleFrom(
                padding:
                    const EdgeInsets.symmetric(horizontal: 18, vertical: 10)),
            child: const Text('Enviar'),
          ),
        ],
      ),
    );
    if (email == null || email.isEmpty) return;
    try {
      await supabase.auth.resetPasswordForEmail(
        email,
        redirectTo: '${Config.siteUrl}/restablecer',
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(
                'Si $email está registrado, te llegará un correo con el enlace. Revisa también spam.')));
      }
    } on AuthException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(e.message.contains('rate limit') ||
                    e.message.contains('security purposes')
                ? 'Espera un momento antes de pedir otro correo.'
                : _traducir(e.message))));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
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
                Stack(
                  children: [
                    Container(
                      width: 150,
                      height: 94,
                      decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(14),
                          color: AppColors.primary),
                      clipBehavior: Clip.antiAlias,
                      child: _uploadingAvatar
                          ? const Center(
                              child: CircularProgressIndicator(
                                  color: Colors.white, strokeWidth: 2))
                          : (_avatarUrl != null && _avatarUrl!.isNotEmpty)
                              ? Image.network(_avatarUrl!,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => _initial(name, user.email))
                              : _initial(name, user.email),
                    ),
                    if (_role == 'inmobiliaria')
                      Positioned(
                        right: 0,
                        bottom: 0,
                        child: GestureDetector(
                          onTap: _uploadingAvatar ? null : _changeAvatar,
                          child: Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              border: Border.all(color: AppColors.border),
                            ),
                            child: const Icon(Icons.camera_alt,
                                size: 18, color: AppColors.primaryDark),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 6),
                if (_role == 'inmobiliaria')
                  const Text('Toca la cámara para cambiar tu logo',
                      style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                const SizedBox(height: 12),
                Text(name,
                    style: const TextStyle(
                        fontSize: 20, fontWeight: FontWeight.w800)),
                Text(user.email ?? '',
                    style: const TextStyle(color: AppColors.textMuted)),
                const SizedBox(height: 8),
                _roleBadge(),
                const SizedBox(height: 28),
                if (_role == 'inmobiliaria')
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: ElevatedButton.icon(
                      onPressed: () async {
                        await Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) => const AgencyPanelScreen()),
                        );
                        _loadRole(); // refresca logo si lo cambió en el panel
                      },
                      icon: const Icon(Icons.storefront_outlined),
                      label: const Text('Panel de mi inmobiliaria'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 28, vertical: 13),
                      ),
                    ),
                  ),
                if (_role == 'admin') ...[
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
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: OutlinedButton.icon(
                      onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const ReportedScreen()),
                      ),
                      icon: const Icon(Icons.flag_outlined),
                      label: const Text('Publicaciones denunciadas'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 28, vertical: 13),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
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
              if (_isLogin)
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: _forgotPassword,
                    child: const Text('¿Olvidaste tu contraseña?',
                        style: TextStyle(
                            color: AppColors.primaryDark,
                            fontWeight: FontWeight.w600,
                            fontSize: 13)),
                  ),
                ),
              SizedBox(height: _isLogin ? 8 : 20),
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
