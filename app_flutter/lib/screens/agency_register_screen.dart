import 'package:flutter/material.dart';
import '../theme.dart';
import '../services/supabase_service.dart';

class AgencyRegisterScreen extends StatefulWidget {
  const AgencyRegisterScreen({super.key});

  @override
  State<AgencyRegisterScreen> createState() => _AgencyRegisterScreenState();
}

class _AgencyRegisterScreenState extends State<AgencyRegisterScreen> {
  final _company = TextEditingController();
  final _nit = TextEditingController();
  final _phone = TextEditingController();
  final _city = TextEditingController();
  final _desc = TextEditingController();
  bool _sending = false;
  bool _done = false;

  Future<void> _submit() async {
    if (_company.text.trim().isEmpty || _phone.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Ingresa al menos el nombre y el teléfono.')));
      return;
    }
    setState(() => _sending = true);
    try {
      await PropertyService.createAgencyRequest(
        company: _company.text.trim(),
        nit: _nit.text.trim().isEmpty ? null : _nit.text.trim(),
        phone: _phone.text.trim(),
        city: _city.text.trim().isEmpty ? null : _city.text.trim(),
        description: _desc.text.trim().isEmpty ? null : _desc.text.trim(),
      );
      if (mounted) setState(() => _done = true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
          title: const Text('Registrarme como inmobiliaria'),
          backgroundColor: Colors.white,
          foregroundColor: AppColors.text),
      body: _done
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(28),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.check_circle,
                        color: AppColors.primary, size: 64),
                    const SizedBox(height: 16),
                    const Text('¡Solicitud enviada!',
                        style: TextStyle(
                            fontSize: 20, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 8),
                    const Text(
                      'Revisaremos tu solicitud y te activaremos como inmobiliaria. Te avisaremos pronto.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.textMuted),
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Entendido'),
                    ),
                  ],
                ),
              ),
            )
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFA7F3D0)),
                  ),
                  child: const Text(
                    '🏢 Registra tu inmobiliaria y agrupa todos tus inmuebles en una página propia. '
                    'Por tiempo limitado: registro gratis y tus publicaciones quedan destacadas.',
                    style: TextStyle(fontSize: 13, color: Color(0xFF065F46)),
                  ),
                ),
                const SizedBox(height: 18),
                _field('Nombre de la inmobiliaria *', _company),
                _field('NIT (opcional)', _nit),
                _field('Teléfono / WhatsApp *', _phone,
                    keyboard: TextInputType.phone),
                _field('Ciudad', _city),
                _field('Descripción (opcional)', _desc, lines: 3),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: _sending ? null : _submit,
                  child: Text(_sending ? 'Enviando…' : 'Enviar solicitud'),
                ),
              ],
            ),
    );
  }

  Widget _field(String label, TextEditingController c,
      {TextInputType? keyboard, int lines = 1}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: c,
        keyboardType: keyboard,
        maxLines: lines,
        decoration: InputDecoration(labelText: label),
      ),
    );
  }
}
