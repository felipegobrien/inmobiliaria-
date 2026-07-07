import 'package:flutter/material.dart';

// Paleta configurable por inmobiliaria: se inyecta al compilar con
// --dart-define=PRIMARY_COLOR=0xFF047857 (y variantes oscuras).
// Si no se define nada, queda el verde por defecto.
class AppColors {
  static const primary =
      Color(int.fromEnvironment('PRIMARY_COLOR', defaultValue: 0xFF047857));
  static const primaryDark = Color(
      int.fromEnvironment('PRIMARY_COLOR_DARK', defaultValue: 0xFF065F46));
  static const primaryDeep = Color(
      int.fromEnvironment('PRIMARY_COLOR_DEEP', defaultValue: 0xFF064E3B));
  static const accent = Color(0xFFFCD34D); // amber-300
  static const bg = Color(0xFFFAFAFA);
  static const card = Colors.white;
  static const border = Color(0xFFE4E4E7);
  static const text = Color(0xFF18181B);
  static const textMuted = Color(0xFF71717A);
  static const danger = Color(0xFFDC2626);
}

ThemeData buildTheme() {
  return ThemeData(
    useMaterial3: true,
    scaffoldBackgroundColor: AppColors.bg,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.primaryDark,
      primary: AppColors.primary,
    ),
    fontFamily: 'Roboto',
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.primary, width: 2),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
      ),
    ),
  );
}
