import 'package:flutter/material.dart';
import '../models/property.dart';
import '../theme.dart';
import '../services/supabase_service.dart';
import '../services/app_events.dart';

class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key});

  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> {
  List<Plan> _plans = [];
  final Map<String, TextEditingController> _priceCtrls = {};
  final _bancolombiaCtrl = TextEditingController();
  List<Map<String, dynamic>> _users = [];
  List<Map<String, dynamic>> _requests = [];
  bool _promoEnabled = true;
  final _promoDaysCtrl = TextEditingController(text: '90');
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    for (final c in _priceCtrls.values) {
      c.dispose();
    }
    _bancolombiaCtrl.dispose();
    _promoDaysCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final plans = await PropertyService.plans();
      final info = await PropertyService.getSetting('bancolombia_info');
      final users = await PropertyService.listProfiles();
      final reqs = await PropertyService.agencyRequests();
      final promoEnabled = await PropertyService.getSetting('agency_promo_enabled');
      final promoDays = await PropertyService.getSetting('agency_promo_days');
      for (final p in plans) {
        _priceCtrls[p.id] = TextEditingController(text: p.price.toString());
      }
      _bancolombiaCtrl.text = info ?? '';
      _promoEnabled = (promoEnabled ?? 'true') == 'true';
      _promoDaysCtrl.text = promoDays ?? '90';
      if (mounted) {
        setState(() {
          _plans = plans;
          _users = users;
          _requests = reqs;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  Future<void> _savePrices() async {
    try {
      for (final p in _plans) {
        final v = int.tryParse(_priceCtrls[p.id]!.text) ?? p.price;
        await PropertyService.updatePlanPrice(p.id, v);
      }
      _msg('Precios actualizados');
    } catch (e) {
      _msg('Error: $e');
    }
  }

  Future<void> _saveBancolombia() async {
    try {
      await PropertyService.setSetting(
          'bancolombia_info', _bancolombiaCtrl.text.trim());
      _msg('Datos de pago guardados');
    } catch (e) {
      _msg('Error: $e');
    }
  }

  Future<void> _toggleBlock(Map<String, dynamic> u) async {
    final blocked = (u['blocked'] ?? false) as bool;
    try {
      await PropertyService.setUserBlocked(u['id'] as String, !blocked);
      _msg(blocked ? 'Usuario desbloqueado' : 'Usuario bloqueado');
      _load();
    } catch (e) {
      _msg('Error: $e');
    }
  }

  Future<void> _deleteProps(Map<String, dynamic> u) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Eliminar publicaciones'),
        content: Text(
            '¿Eliminar TODAS las publicaciones de ${u['full_name'] ?? 'este usuario'}? No se puede deshacer.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancelar')),
          TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Eliminar',
                  style: TextStyle(color: AppColors.danger))),
        ],
      ),
    );
    if (ok == true) {
      try {
        await PropertyService.deleteUserProperties(u['id'] as String);
        _msg('Publicaciones eliminadas');
      } catch (e) {
        _msg('Error: $e');
      }
    }
  }

  Future<void> _savePromo() async {
    try {
      await PropertyService.setSetting(
          'agency_promo_enabled', _promoEnabled ? 'true' : 'false');
      await PropertyService.setSetting(
          'agency_promo_days', _promoDaysCtrl.text.trim());
      _msg('Promo de inmobiliarias actualizada');
    } catch (e) {
      _msg('Error: $e');
    }
  }

  Future<void> _approveAgency(Map<String, dynamic> req) async {
    try {
      final days = _promoEnabled ? int.tryParse(_promoDaysCtrl.text) : null;
      await PropertyService.approveAgency(req, days);
      bumpRefresh();
      _msg('Inmobiliaria aprobada');
      _load();
    } catch (e) {
      _msg('Error: $e');
    }
  }

  Future<void> _rejectAgency(String id) async {
    try {
      await PropertyService.rejectAgency(id);
      _msg('Solicitud rechazada');
      _load();
    } catch (e) {
      _msg('Error: $e');
    }
  }

  void _msg(String m) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final pending =
        _requests.where((r) => r['status'] == 'pendiente').length;
    return Scaffold(
      backgroundColor: const Color(0xFFF0F0F2),
      appBar: AppBar(
          title: const Text('Panel de administración'),
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.white,
          foregroundColor: AppColors.text),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Resumen
                Row(
                  children: [
                    _stat('Usuarios', '${_users.length}', Icons.people_outline),
                    const SizedBox(width: 10),
                    _stat('Solicitudes', '$pending', Icons.mark_email_unread_outlined),
                  ],
                ),
                const SizedBox(height: 16),

                _card(Icons.sell_outlined, 'Precios de planes', [
                  for (final p in _plans)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Row(
                        children: [
                          Expanded(
                            flex: 2,
                            child: Text(p.name,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w600)),
                          ),
                          Expanded(
                            flex: 3,
                            child: TextField(
                              controller: _priceCtrls[p.id],
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(
                                  prefixText: '\$ ', isDense: true),
                            ),
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 4),
                  _saveButton('Guardar precios', _savePrices),
                ]),

                _card(Icons.account_balance_outlined,
                    'Datos de pago (Bancolombia)', [
                  TextField(
                    controller: _bancolombiaCtrl,
                    maxLines: 5,
                    decoration: const InputDecoration(
                        hintText: 'Cuenta, titular, instrucciones…'),
                  ),
                  const SizedBox(height: 10),
                  _saveButton('Guardar datos de pago', _saveBancolombia),
                ]),

                _card(Icons.workspace_premium_outlined,
                    'Promo inmobiliarias', [
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    value: _promoEnabled,
                    activeColor: AppColors.primary,
                    title: const Text('Promo activa',
                        style: TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: const Text(
                        'Registro gratis + publicaciones destacadas al aprobar.'),
                    onChanged: (v) => setState(() => _promoEnabled = v),
                  ),
                  Row(
                    children: [
                      const Text('Días de promo: '),
                      SizedBox(
                        width: 80,
                        child: TextField(
                          controller: _promoDaysCtrl,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(isDense: true),
                        ),
                      ),
                      const Spacer(),
                      _saveButton('Guardar', _savePromo),
                    ],
                  ),
                ]),

                _card(
                  Icons.business_outlined,
                  'Solicitudes de inmobiliarias',
                  [
                    if (_requests.isEmpty)
                      const Text('No hay solicitudes.',
                          style: TextStyle(color: AppColors.textMuted)),
                    for (final r in _requests) _requestTile(r),
                  ],
                  badge: pending > 0 ? pending : null,
                ),

                _card(Icons.people_outline, 'Usuarios (${_users.length})', [
                  for (final u in _users) _userTile(u),
                ]),
                const SizedBox(height: 40),
              ],
            ),
    );
  }

  Widget _card(IconData icon, String title, List<Widget> children,
      {int? badge}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
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
              if (badge != null)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                      color: const Color(0xFFD97706),
                      borderRadius: BorderRadius.circular(999)),
                  child: Text('$badge',
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w700)),
                ),
            ],
          ),
          const Divider(height: 20),
          ...children,
        ],
      ),
    );
  }

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
                    fontSize: 22,
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

  Widget _saveButton(String label, VoidCallback onTap) => SizedBox(
        width: double.infinity,
        child: ElevatedButton(onPressed: onTap, child: Text(label)),
      );

  Widget _requestTile(Map<String, dynamic> r) {
    final status = r['status'] as String? ?? 'pendiente';
    final pending = status == 'pendiente';
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
            color: pending ? const Color(0xFFFDE68A) : AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(r['company'] as String? ?? 'Inmobiliaria',
                    style: const TextStyle(fontWeight: FontWeight.w700)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                    color: pending
                        ? const Color(0xFFD97706)
                        : (status == 'aprobada'
                            ? AppColors.primary
                            : AppColors.danger),
                    borderRadius: BorderRadius.circular(999)),
                child: Text(status,
                    style: const TextStyle(color: Colors.white, fontSize: 11)),
              ),
            ],
          ),
          if (r['nit'] != null) Text('NIT: ${r['nit']}', style: const TextStyle(fontSize: 13)),
          if (r['phone'] != null) Text('📞 ${r['phone']}', style: const TextStyle(fontSize: 13)),
          if (r['city'] != null) Text('📍 ${r['city']}', style: const TextStyle(fontSize: 13)),
          if (r['description'] != null)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(r['description'] as String,
                  style: const TextStyle(
                      fontSize: 13, color: AppColors.textMuted)),
            ),
          if (pending) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _approveAgency(r),
                    child: const Text('Aprobar'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _rejectAgency(r['id'] as String),
                    style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.danger,
                        side: const BorderSide(color: AppColors.danger)),
                    child: const Text('Rechazar'),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _userTile(Map<String, dynamic> u) {
    final blocked = (u['blocked'] ?? false) as bool;
    final isAdmin = u['role'] == 'admin';
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
            color: blocked ? const Color(0xFFFCA5A5) : AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(u['full_name'] ?? 'Sin nombre',
                    style: const TextStyle(fontWeight: FontWeight.w700)),
              ),
              if (isAdmin)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(999)),
                  child: const Text('admin',
                      style: TextStyle(color: Colors.white, fontSize: 11)),
                ),
              if (blocked)
                Container(
                  margin: const EdgeInsets.only(left: 6),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                      color: AppColors.danger,
                      borderRadius: BorderRadius.circular(999)),
                  child: const Text('bloqueado',
                      style: TextStyle(color: Colors.white, fontSize: 11)),
                ),
            ],
          ),
          if (u['phone'] != null)
            Text('${u['phone']}',
                style: const TextStyle(
                    color: AppColors.textMuted, fontSize: 13)),
          if (!isAdmin) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _toggleBlock(u),
                    child: Text(blocked ? 'Desbloquear' : 'Bloquear'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _deleteProps(u),
                    style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.danger,
                        side: const BorderSide(color: AppColors.danger)),
                    child: const Text('Borrar publicaciones'),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
