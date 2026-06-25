// Prueba básica de humo.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('App arranca sin errores de construcción', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: Scaffold(body: Text('Inmobiliaria'))),
    );
    expect(find.text('Inmobiliaria'), findsOneWidget);
  });
}
