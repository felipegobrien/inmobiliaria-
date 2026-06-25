import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'config.dart';
import 'theme.dart';
import 'services/favorites_manager.dart';
import 'screens/home_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(
    url: Config.supabaseUrl,
    anonKey: Config.supabaseAnonKey,
  );

  // Cargar favoritos al inicio y cada vez que cambie la sesión.
  FavoritesManager.instance.load();
  Supabase.instance.client.auth.onAuthStateChange.listen((_) {
    FavoritesManager.instance.load();
  });

  runApp(const InmobiliariaApp());
}

class InmobiliariaApp extends StatelessWidget {
  const InmobiliariaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Inmobiliaria',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(),
      home: const HomeScreen(),
    );
  }
}
