import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:share_plus/share_plus.dart';
import '../theme.dart';
import '../models/property.dart';
import '../services/agency_manager.dart';

/// Datos de contacto de la inmobiliaria dueña de la app.
class ContactScreen extends StatelessWidget {
  const ContactScreen({super.key});

  Agency get _agency => AgencyManager.current!;

  Future<void> _openWhatsApp(BuildContext context, String number) async {
    final num = number.replaceAll(RegExp(r'\D'), '');
    final msg = Uri.encodeComponent(
        'Hola, los contacto desde la app de ${titleCase(_agency.name)}.');
    final uri = Uri.parse('https://wa.me/57$num?text=$msg');
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No se pudo abrir WhatsApp')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final a = _agency;
    final number = a.contactNumber;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Contacto'),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.text,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Center(
            child: Container(
              width: 140,
              height: 92,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                color: const Color(0xFFF1F1F3),
                border: Border.all(color: AppColors.border),
              ),
              clipBehavior: Clip.antiAlias,
              child: (a.avatarUrl != null && a.avatarUrl!.isNotEmpty)
                  ? CachedNetworkImage(
                      imageUrl: a.avatarUrl!,
                      fit: BoxFit.cover,
                      errorWidget: (_, __, ___) => const Icon(Icons.apartment,
                          size: 40, color: AppColors.primary))
                  : const Icon(Icons.apartment,
                      size: 40, color: AppColors.primary),
            ),
          ),
          const SizedBox(height: 14),
          Center(
            child: Text(titleCase(a.name),
                textAlign: TextAlign.center,
                style: const TextStyle(
                    fontSize: 20, fontWeight: FontWeight.w800)),
          ),
          const SizedBox(height: 4),
          const Center(
            child: Text('Inmobiliaria',
                style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
          ),
          const SizedBox(height: 24),
          if (number == null)
            const Center(
              child: Text('La inmobiliaria no registró teléfono.',
                  style: TextStyle(color: AppColors.textMuted)),
            )
          else ...[
            ElevatedButton.icon(
              onPressed: () => _openWhatsApp(context, number),
              icon: const Icon(Icons.chat),
              label: const Text('Escribir por WhatsApp'),
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: () => launchUrl(
                  Uri.parse('tel:+57${number.replaceAll(RegExp(r'\D'), '')}'),
                  mode: LaunchMode.externalApplication),
              icon: const Icon(Icons.call),
              label: Text('Llamar: $number'),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: () {
              final url = a.siteBase;
              SharePlus.instance.share(ShareParams(
                  text: 'Mira los inmuebles de ${titleCase(a.name)}:\n$url'));
            },
            icon: const Icon(Icons.share_outlined),
            label: const Text('Compartir'),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
    );
  }
}
