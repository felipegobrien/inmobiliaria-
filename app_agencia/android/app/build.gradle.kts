plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// ---- Marca blanca: cada inmobiliaria compila con su propio paquete y nombre.
// El script crear_app.ps1 define estas variables de entorno antes de compilar.
val agencyAppId: String = System.getenv("AGENCY_APP_ID") ?: "com.inmobiliaria.agencia"
val agencyAppName: String = System.getenv("AGENCY_APP_NAME") ?: "Inmobiliaria"

android {
    // El namespace es fijo (código compilado); lo que cambia por inmobiliaria
    // es el applicationId, que es lo que identifica la app en Play Store.
    namespace = "com.inmobiliaria.agencia"
    compileSdk = flutter.compileSdkVersion
    // NDK fijado a una versión instalada correctamente (la 26.3 quedó corrupta).
    ndkVersion = "27.0.12077973"

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_11.toString()
    }

    defaultConfig {
        applicationId = agencyAppId
        // Subido a 23: una librería de Supabase (ua_client_hints) requiere mínimo 22.
        minSdk = 23
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
        manifestPlaceholders["appName"] = agencyAppName
    }

    buildTypes {
        release {
            // TODO: Add your own signing config for the release build.
            // Signing with the debug keys for now, so `flutter run --release` works.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

flutter {
    source = "../.."
}
