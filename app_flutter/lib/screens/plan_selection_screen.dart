import 'package:flutter/material.dart';
import '../models/property.dart';
import '../theme.dart';
import '../services/supabase_service.dart';
import '../services/app_events.dart';
import 'publish_screen.dart';
import 'agency_register_screen.dart';

final _agencyPlan = Plan(
  id: 'destacado',
  name: 'Inmobiliaria (gratis)',
  description: 'Promo inmobiliaria: gratis y destacado.',
  price: 0,
  durationDays: 30,
  isFeatured: true,
);

class PlanSelectionScreen extends StatefulWidget {
  const PlanSelectionScreen({super.key});

  @override
  State<PlanSelectionScreen> createState() => _PlanSelectionScreenState();
}

class _PlanSelectionScreenState extends State<PlanSelectionScreen> {
  List<Plan> _plans = [];
  bool _loading = true;
  Map<String, dynamic>? _profile;

  bool get _agencyPromo =>
      _profile?['role'] == 'inmobiliaria' &&
      PropertyService.agencyPromoActive(
          _profile?['agency_promo_until'] as String?);

  @override
  void initState() {
    super.initState();
    supabase.auth.onAuthStateChange.listen((_) {
      if (mounted) {
        setState(() {});
        _loadProfile();
      }
    });
    _loadPlans();
    _loadProfile();
    appRefresh.addListener(_loadProfile);
  }

  @override
  void dispose() {
    appRefresh.removeListener(_loadProfile);
    super.dispose();
  }

  Future<void> _loadProfile() async {
    final p = await PropertyService.myProfile();
    if (mounted) setState(() => _profile = p);
  }

  Future<void> _loadPlans() async {
    try {
      final p = await PropertyService.plans();
      if (mounted) {
        setState(() {
          _plans = p;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _choosePlan(Plan plan) async {
    if (plan.price > 0) {
      final ok = await Navigator.push<bool>(
        context,
        MaterialPageRoute(builder: (_) => PaymentScreen(plan: plan)),
      );
      if (ok != true) return;
    }
    if (!mounted) return;
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => PublishScreen(plan: plan)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = supabase.auth.currentUser;
    if (user == null) {
      return Scaffold(
        appBar: AppBar(
            title: const Text('Publicar'),
            backgroundColor: Colors.white,
            foregroundColor: AppColors.text),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text(
              'Inicia sesión (pestaña Cuenta) para publicar un inmueble.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textMuted),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF0F0F2),
      body: SafeArea(
        child: _loading
            ? const Center(
                child: CircularProgressIndicator(color: AppColors.primary))
            : ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  const SizedBox(height: 8),
                  const Text('Elige cómo publicar',
                      style: TextStyle(
                          fontSize: 22, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  const Text('Selecciona un plan para tu inmueble.',
                      style: TextStyle(color: AppColors.textMuted)),
                  const SizedBox(height: 20),
                  if (_agencyPromo) ...[
                    _agencyPromoCard(),
                  ] else ...[
                    for (final plan in _plans) _planCard(plan),
                    if (_profile?['role'] != 'inmobiliaria') _agencyInvite(),
                  ],
                ],
              ),
      ),
    );
  }

  Widget _agencyPromoCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBEB),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFDE68A), width: 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: const [
            Icon(Icons.workspace_premium, color: Color(0xFFD97706)),
            SizedBox(width: 8),
            Text('Promo inmobiliaria',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          ]),
          const SizedBox(height: 8),
          const Text(
            'Tu publicación será GRATIS y quedará DESTACADA automáticamente.',
            style: TextStyle(color: Color(0xFF92400E)),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFD97706)),
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (_) => PublishScreen(plan: _agencyPlan)),
              ),
              child: const Text('Publicar gratis (destacado)'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _agencyInvite() {
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFECFDF5),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFA7F3D0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: const [
            Text('🏢 ', style: TextStyle(fontSize: 18)),
            Expanded(
              child: Text('¿Eres una inmobiliaria?',
                  style: TextStyle(
                      fontWeight: FontWeight.w800, color: Color(0xFF065F46))),
            ),
          ]),
          const SizedBox(height: 4),
          const Text(
            'Regístrate y agrupa todos tus inmuebles en una página propia. Por tiempo limitado: registro gratis y publicaciones destacadas.',
            style: TextStyle(fontSize: 13, color: Color(0xFF065F46)),
          ),
          const SizedBox(height: 12),
          OutlinedButton(
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const AgencyRegisterScreen()),
            ),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.primaryDark,
              side: const BorderSide(color: AppColors.primary),
            ),
            child: const Text('Registrarme como inmobiliaria'),
          ),
        ],
      ),
    );
  }

  Widget _planCard(Plan plan) {
    final featured = plan.isFeatured;
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
            color: featured ? const Color(0xFFFDE68A) : AppColors.border,
            width: featured ? 2 : 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(featured ? Icons.star : Icons.check_circle,
                  color: featured
                      ? const Color(0xFFD97706)
                      : AppColors.primary),
              const SizedBox(width: 8),
              Text(plan.name,
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w800)),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            plan.price == 0 ? 'Gratis' : formatPrice(plan.price),
            style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w800,
                color: featured ? const Color(0xFF92400E) : AppColors.primaryDark),
          ),
          Text('por ${plan.durationDays} días',
              style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
          if (plan.description != null) ...[
            const SizedBox(height: 8),
            Text(plan.description!,
                style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
          ],
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => _choosePlan(plan),
              style: featured
                  ? ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFD97706))
                  : null,
              child: Text(plan.price == 0
                  ? 'Publicar gratis'
                  : 'Elegir ${plan.name}'),
            ),
          ),
        ],
      ),
    );
  }
}

// Paso de pago (transferencia Bancolombia, manual por ahora).
class PaymentScreen extends StatefulWidget {
  final Plan plan;
  const PaymentScreen({super.key, required this.plan});

  @override
  State<PaymentScreen> createState() => PaymentScreenState();
}

class PaymentScreenState extends State<PaymentScreen> {
  String _info = '';
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    PropertyService.getSetting('bancolombia_info').then((v) {
      if (mounted) {
        setState(() {
          _info = v ?? 'Datos de pago no configurados.';
          _loading = false;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
          title: const Text('Pago del plan'),
          backgroundColor: Colors.white,
          foregroundColor: AppColors.text),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary))
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFFBEB),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFFDE68A)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        const Icon(Icons.star, color: Color(0xFFD97706)),
                        const SizedBox(width: 8),
                        Text('Plan ${widget.plan.name}',
                            style: const TextStyle(
                                fontWeight: FontWeight.w800, fontSize: 16)),
                      ]),
                      const SizedBox(height: 6),
                      Text(formatPrice(widget.plan.price),
                          style: const TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF92400E))),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                const Text('Transferencia Bancolombia',
                    style:
                        TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Text(_info,
                      style: const TextStyle(height: 1.5, fontSize: 14)),
                ),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: () => Navigator.pop(context, true),
                  child: const Text('Ya hice la transferencia, continuar'),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Tu inmueble quedará destacado. Guarda el comprobante por si el administrador lo solicita.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                ),
              ],
            ),
    );
  }
}
