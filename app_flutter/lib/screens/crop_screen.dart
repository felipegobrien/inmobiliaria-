import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:crop_your_image/crop_your_image.dart';

/// Permite ajustar/recortar una imagen a un rectángulo 16:10 (logo).
class CropScreen extends StatefulWidget {
  final Uint8List image;
  const CropScreen({super.key, required this.image});

  @override
  State<CropScreen> createState() => _CropScreenState();
}

class _CropScreenState extends State<CropScreen> {
  final _controller = CropController();
  bool _cropping = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Ajusta tu logo'),
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        actions: [
          TextButton(
            onPressed: _cropping
                ? null
                : () {
                    setState(() => _cropping = true);
                    _controller.crop();
                  },
            child: Text(_cropping ? 'Procesando…' : 'Listo',
                style: const TextStyle(
                    color: Colors.white, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
      body: Crop(
        image: widget.image,
        controller: _controller,
        aspectRatio: 16 / 10,
        withCircleUi: false,
        baseColor: Colors.black,
        maskColor: Colors.black.withValues(alpha: 0.6),
        cornerDotBuilder: (size, edgeAlignment) =>
            const DotControl(color: Colors.white),
        onCropped: (result) {
          Uint8List? out;
          try {
            out = (result as dynamic).croppedImage as Uint8List;
          } catch (_) {}
          if (out != null && mounted) {
            Navigator.pop(context, out);
          } else if (mounted) {
            setState(() => _cropping = false);
          }
        },
      ),
    );
  }
}
