import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../config.dart';
import '../models/property.dart';
import '../theme.dart';
import '../services/supabase_service.dart';
import '../services/app_events.dart';
import 'crop_screen.dart';

/// Panel de la inmobiliaria: su marca, su sitio web, su dominio propio,
/// sus datos de contacto y el resumen de sus publicaciones.
class AgencyPanelScreen extends StatefulWidget {
  const AgencyPanelScreen({super.key});

  @override
  State<AgencyPanelScreen> createState() => _AgencyPanelScreenState();
}

class _AgencyPanelScreenState extends State<AgencyPanelScreen> {
  Map<String, dynamic>? _profile;
  bool _loading = true;
  bool _uploadingLogo = false;

  // Resumen de publicaciones
  int _activeCount = 0;
  int _totalViews = 0;
  int _totalContacts = 0;

  final _domainCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _whatsappCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _domainCtrl.dispose();
    _phoneCtrl.dispose();
    _whatsappCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final p = await PropertyService.myAgencyProfile();
      if (p != null) {
        _domainCtrl.text = (p['agency_domain'] as String?) ?? '';
        _phoneCtrl.text = (p['phone'] as String?) ?? '';
        _whatsappCtrl.text = (p['whatsapp'] as String?) ?? '';
        final stats =
            await PropertyService.myPropertiesWithStats(p['id'] as String);
        _activeCount = stats.where((e) => e.$1.status == 'activo').length;
        _totalViews = stats.fold(0, (s, e) => s + e.$1.viewsCount);
        _totalContacts = stats.fold(0, (s, e) => s + e.$2);
      }
      if (mounted) {
        setState(() {
          _profile = p;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        _msg('Error: $e');
      }
    }
  }

  String get _slug => (_profile?['agency_slug'] as String?) ?? '';
  String? get _domain {
    final d = (_profile?['agency_domain'] as String?) ?? '';
    return d.isEmpty ? null : d;
  }

  /// URL pública del sitio de la inmobiliaria (dominio propio o /sitio/slug).
  String get _siteUrl =>
      _domain != null ? 'https://$_domain' : '${Config.siteUrl}/sitio/$_slug';

  void _msg(String m) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));
    }
  }

  Future<void> _changeLogo() async {
    final picked = await ImagePicker()
        .pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (picked == null) return;
    final user = supabase.auth.currentUser;
    if (user == null) return;
    final original = await picked.readAsBytes();
    if (!mounted) return;
    final Uint8List? cropped = await Navigator.push<Uint8List>(
      context,
      MaterialPageRoute(builder: (_) => CropScreen(image: original)),
    );
    if (cropped == null) return;
    setState(() => _uploadingLogo = true);
    try {
      final url = await PropertyService.uploadImage(user.id, cropped, 'jpg');
      await PropertyService.updateAvatar(url);
      bumpRefresh();
      if (mounted) {
        setState(() {
          _profile?['avatar_url'] = url;
          _uploadingLogo = false;
        });
      }
      _msg('Logo actualizado');
    } catch (e) {
      if (mounted) setState(() => _uploadingLogo = false);
      _msg('Error: $e');
    }
  }

  Future<void> _saveDomain() async {
    var domain = _domainCtrl.text
        .trim()
        .toLowerCase()
        .replaceAll(RegExp(r'^https?://'), '')
        .replaceAll(RegExp(r'/.*$'), '');
    _domainCtrl.text = domain;
    if (domain.isNotEmpty &&
        !RegExp(r'^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$')
            .hasMatch(domain)) {
      _msg('Dominio inválido. Ej: miinmobiliaria.com');
      return;
    }
    try {
      await PropertyService.updateMyAgencyProfile(
          {'agency_domain': domain.isEmpty ? null : domain});
      _msg(domain.isEmpty
          ? 'Dominio quitado. Tu sitio queda en /sitio/$_slug'
          : 'Dominio guardado. Falta activarlo: avísanos para conectarlo.');
      _load();
    } catch (e) {
      final s = e.toString();
      _msg(s.contains('idx_profiles_agency_domain') || s.contains('duplicate')
          ? 'Ese dominio ya está en uso por otra inmobiliaria.'
          : 'Error: $e');
    }
  }

  Future<void> _saveContact() async {
    try {
      await PropertyService.updateMyAgencyProfile({
        'phone': _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
        'whatsapp': _whatsappCtrl.text.trim().isEmpty
            ? null
            : _whatsappCtrl.text.trim(),
      });
      _msg('Datos de contacto guardados');
    } catch (e) {
      _msg('Error: $e');
    }
  }

  Future<void> _copy(String text) async {
    await Clipboard.setData(ClipboardData(text: text));
    _msg('Enlace copiado');
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body:
            Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }
    final p = _profile;
    if (p == null || p['role'] != 'inmobiliaria') {
      return Scaffold(
        appBar: AppBar(),
        body: const Center(
            child: Text('Esta sección es solo para inmobiliarias.',
                style: TextStyle(color: AppColors.textMuted))),
      );
    }
    final name = titleCase((p['company'] as String?) ?? 'Mi inmobiliaria');
    final avatarUrl = p['avatar_url'] as String?;
    final verified = (p['verified'] ?? false) as bool;
    final promoActive = PropertyService.agencyPromoActive(
        p['agency_promo_until'] as String?);

    return Scaffold(
      backgroundColor: const Color(0xFFF0F0F2),
      appBar: AppBar(
        title: const Text('Mi inmobiliaria'),
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        foregroundColor: AppColors.text,
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // ---- Marca ----
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: _uploadingLogo ? null : _changeLogo,
                    child: Stack(
                      children: [
                        Container(
                          width: 100,
                          height: 66,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            color: const Color(0xFFF1F1F3),
                            border: Border.all(color: AppColors.border),
                          ),
                          clipBehavior: Clip.antiAlias,
                          child: _uploadingLogo
                              ? const Center(
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: AppColors.primary))
                              : (avatarUrl != null && avatarUrl.isNotEmpty)
                                  ? Image.network(avatarUrl,
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, __, ___) => const Icon(
                                          Icons.apartment,
                                          color: AppColors.primary))
                                  : const Icon(Icons.apartment,
                                      color: AppColors.primary, size: 32),
                        ),
                        Positioned(
                          right: 4,
                          bottom: 4,
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              border: Border.all(color: AppColors.border),
                            ),
                            child: const Icon(Icons.camera_alt,
                                size: 14, color: AppColors.primaryDark),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(name,
                            style: const TextStyle(
                                fontSize: 18, fontWeight: FontWeight.w800)),
                        const SizedBox(height: 4),
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: [
                            if (verified)
                              _chip('✓ Verificada', AppColors.primary),
                            if (promoActive)
                              _chip('Promo activa', const Color(0xFFD97706)),
                            if (_domain != null)
                              _chip('Dominio propio', AppColors.primaryDark),
                          ],
                        ),
                        const SizedBox(height: 4),
                        const Text('Toca el logo para cambiarlo',
                            style: TextStyle(
                                fontSize: 11, color: AppColors.textMuted)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // ---- Resumen ----
            Row(
              children: [
                _stat('Inmuebles', '$_activeCount', Icons.home_work_outlined),
                const SizedBox(width: 10),
                _stat('Vistas', '$_totalViews', Icons.visibility_outlined),
                const SizedBox(width: 10),
                _stat('Contactos', '$_totalContacts',
                    Icons.mark_email_read_outlined),
              ],
            ),
            const SizedBox(height: 14),

            // ---- Mi sitio web ----
            _card(Icons.public, 'Mi sitio web', [
              const Text(
                'Tu página con solo tus inmuebles, tu logo y tu contacto. '
                'Los clientes no ven nada del portal general.',
                style: TextStyle(fontSize: 13, color: AppColors.textMuted),
              ),
              const SizedBox(height: 10),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF7F7F8),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(_siteUrl,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primaryDark)),
                    ),
                    IconButton(
                      visualDensity: VisualDensity.compact,
                      tooltip: 'Copiar',
                      onPressed: () => _copy(_siteUrl),
                      icon: const Icon(Icons.copy,
                          size: 18, color: AppColors.textMuted),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => launchUrl(Uri.parse(_siteUrl),
                          mode: LaunchMode.externalApplication),
                      icon: const Icon(Icons.open_in_new, size: 18),
                      label: const Text('Abrir'),
                      style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => SharePlus.instance.share(ShareParams(
                          text:
                              'Mira los inmuebles de $name:\n$_siteUrl')),
                      icon: const Icon(Icons.share_outlined, size: 18),
                      label: const Text('Compartir'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
              ),
            ]),

            // ---- Dominio propio ----
            _card(Icons.language_outlined, 'Dominio propio', [
              const Text(
                'Conecta tu propio dominio (ej. miinmobiliaria.com) para que '
                'tu sitio y los enlaces de tu app usen tu marca al 100%.',
                style: TextStyle(fontSize: 13, color: AppColors.textMuted),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _domainCtrl,
                keyboardType: TextInputType.url,
                autocorrect: false,
                decoration:
                    const InputDecoration(hintText: 'ej. miinmobiliaria.com'),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _saveDomain,
                  child: const Text('Guardar dominio'),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Después de guardarlo, escríbenos para activarlo: te indicamos '
                'la configuración DNS de tu dominio y queda funcionando.',
                style: TextStyle(fontSize: 12, color: AppColors.textMuted),
              ),
            ]),

            // ---- Datos de contacto ----
            _card(Icons.call_outlined, 'Datos de contacto', [
              const Text(
                'Estos son el teléfono y WhatsApp que ven los interesados en '
                'tu sitio, tu app y tus publicaciones.',
                style: TextStyle(fontSize: 13, color: AppColors.textMuted),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _phoneCtrl,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(hintText: 'Teléfono'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _whatsappCtrl,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                    hintText: 'WhatsApp (si es distinto al teléfono)'),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _saveContact,
                  child: const Text('Guardar contacto'),
                ),
              ),
            ]),

            // ---- Mi app ----
            _card(Icons.smartphone_outlined, 'Mi app', [
              const Text(
                'Tu inmobiliaria puede tener su propia app instalable (Android) '
                'con solo tu catálogo, tu logo y tus colores — lista para '
                'publicar en Play Store como app independiente.',
                style: TextStyle(fontSize: 13, color: AppColors.textMuted),
              ),
              const SizedBox(height: 10),
              const Text(
                'Escríbenos para generarla y te enviamos el instalador o la '
                'publicamos por ti.',
                style: TextStyle(
                    fontSize: 13,
                    color: AppColors.text,
                    fontWeight: FontWeight.w600),
              ),
            ]),
            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  Widget _chip(String label, Color color) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(label,
            style: TextStyle(
                color: color, fontSize: 11, fontWeight: FontWeight.w700)),
      );

  Widget _stat(String label, String value, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: AppColors.primary, size: 20),
            const SizedBox(height: 6),
            Text(value,
                style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primaryDark)),
            Text(label,
                style:
                    const TextStyle(fontSize: 12, color: AppColors.textMuted)),
          ],
        ),
      ),
    );
  }

  Widget _card(IconData icon, String title, List<Widget> children) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 20, color: AppColors.primary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(title,
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w800)),
              ),
            ],
          ),
          const Divider(height: 20),
          ...children,
        ],
      ),
    );
  }
}
