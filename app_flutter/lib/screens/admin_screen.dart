import 'package:flutter/material.dart';
import '../models/property.dart';
import '../theme.dart';
import '../services/supabase_service.dart';

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
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final plans = await PropertyService.plans();
      final info = await PropertyService.getSetting('bancolombia_info');
      final users = await PropertyService.listProfiles();
      for (final p in plans) {
        _priceCtrls[p.id] = TextEditingController(text: p.price.toString());
      }
      _bancolombiaCtrl.text = info ?? '';
      if (mounted) {
        setState(() {
          _plans = plans;
          _users = users;
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

  void _msg(String m) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
          title: const Text('Panel de administración'),
          backgroundColor: Colors.white,
          foregroundColor: AppColors.text),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _section('Precios de planes'),
                for (final p in _plans)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
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
                ElevatedButton(
                    onPressed: _savePrices,
                    child: const Text('Guardar precios')),

                const SizedBox(height: 24),
                _section('Datos de pago (Bancolombia)'),
                TextField(
                  controller: _bancolombiaCtrl,
                  maxLines: 5,
                  decoration: const InputDecoration(
                      hintText: 'Cuenta, titular, instrucciones…'),
                ),
                const SizedBox(height: 10),
                ElevatedButton(
                    onPressed: _saveBancolombia,
                    child: const Text('Guardar datos de pago')),

                const SizedBox(height: 24),
                _section('Usuarios (${_users.length})'),
                for (final u in _users) _userTile(u),
                const SizedBox(height: 40),
              ],
            ),
    );
  }

  Widget _section(String t) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Text(t,
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
      );

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
