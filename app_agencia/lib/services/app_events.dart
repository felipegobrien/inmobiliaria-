import 'package:flutter/foundation.dart';

/// Señal global para refrescar pestañas cuando cambian los datos
/// (publicar, aprobar inmobiliaria, cambiar de pestaña, etc.).
final appRefresh = ValueNotifier<int>(0);

void bumpRefresh() => appRefresh.value++;
