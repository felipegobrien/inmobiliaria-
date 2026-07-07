# =====================================================================
# Genera la app propia de una inmobiliaria (marca blanca).
#
# Uso (desde la carpeta app_agencia):
#   .\crear_app.ps1 -Slug "inmobiliaria-gomez" -Nombre "Inmobiliaria Gómez"
#
# Opcionales:
#   -PaqueteId "com.inmobiliariagomez.app"   (id único en Play Store;
#                                             por defecto se deriva del slug)
#   -Color "#0F766E"                         (color principal de la app)
#   -Logo  "C:\ruta\logo.png"                (ícono de la app, PNG cuadrado 1024x1024)
#   -Aab                                     (genera .aab para Play Store
#                                             en vez de .apk)
#
# El resultado queda en app_agencia\salidas\<slug>\
# =====================================================================
param(
    [Parameter(Mandatory = $true)][string]$Slug,
    [Parameter(Mandatory = $true)][string]$Nombre,
    [string]$PaqueteId = "",
    [string]$Color = "",
    [string]$Logo = "",
    [switch]$Aab
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# --- Paquete por defecto derivado del slug: com.inmobiliaria.<slug sin guiones>
if ($PaqueteId -eq "") {
    $limpio = ($Slug -replace '[^a-z0-9]', '')
    if ($limpio -eq "" ) { throw "El slug no sirve para derivar un paquete; pasa -PaqueteId." }
    if ($limpio -match '^\d') { $limpio = "a$limpio" }
    $PaqueteId = "com.inmobiliaria.$limpio"
}

# --- Color: convertir #RRGGBB a 0xFFRRGGBB y derivar tonos oscuros
$defines = @(
    "--dart-define=AGENCY_SLUG=$Slug",
    "--dart-define=APP_NAME=$Nombre"
)
if ($Color -ne "") {
    $hex = $Color.TrimStart('#')
    if ($hex.Length -ne 6) { throw "El color debe ser hex de 6 dígitos, ej. #0F766E" }
    $r = [Convert]::ToInt32($hex.Substring(0, 2), 16)
    $g = [Convert]::ToInt32($hex.Substring(2, 2), 16)
    $b = [Convert]::ToInt32($hex.Substring(4, 2), 16)
    function Shade([int]$v, [double]$f) { return [int][Math]::Round($v * $f) }
    $dark = "0xFF{0:X2}{1:X2}{2:X2}" -f (Shade $r 0.8), (Shade $g 0.8), (Shade $b 0.8)
    $deep = "0xFF{0:X2}{1:X2}{2:X2}" -f (Shade $r 0.62), (Shade $g 0.62), (Shade $b 0.62)
    $defines += "--dart-define=PRIMARY_COLOR=0xFF$hex"
    $defines += "--dart-define=PRIMARY_COLOR_DARK=$dark"
    $defines += "--dart-define=PRIMARY_COLOR_DEEP=$deep"
}

# --- Ícono de la app (opcional)
if ($Logo -ne "") {
    if (-not (Test-Path $Logo)) { throw "No existe el archivo de logo: $Logo" }
    Copy-Item $Logo "icono_app.png" -Force
    $iconCfg = @"
flutter_launcher_icons:
  android: true
  ios: false
  image_path: "icono_app.png"
"@
    Set-Content -Path "flutter_launcher_icons.yaml" -Value $iconCfg -Encoding utf8
    flutter pub get
    dart run flutter_launcher_icons -f flutter_launcher_icons.yaml
    if ($LASTEXITCODE -ne 0) { throw "No se pudo generar el ícono." }
}

# --- Identidad Android (paquete + nombre visible)
$env:AGENCY_APP_ID = $PaqueteId
$env:AGENCY_APP_NAME = $Nombre

Write-Host ""
Write-Host "Compilando app de '$Nombre'" -ForegroundColor Green
Write-Host "  slug:    $Slug"
Write-Host "  paquete: $PaqueteId"
if ($Color -ne "") { Write-Host "  color:   $Color" }
Write-Host ""

flutter pub get
if ($LASTEXITCODE -ne 0) { throw "flutter pub get falló." }

if ($Aab) {
    flutter build appbundle --release @defines
    if ($LASTEXITCODE -ne 0) { throw "La compilación falló." }
    $origen = "build\app\outputs\bundle\release\app-release.aab"
    $destino = "salidas\$Slug\$Slug.aab"
} else {
    flutter build apk --release @defines
    if ($LASTEXITCODE -ne 0) { throw "La compilación falló." }
    $origen = "build\app\outputs\flutter-apk\app-release.apk"
    $destino = "salidas\$Slug\$Slug.apk"
}

New-Item -ItemType Directory -Force (Split-Path $destino) | Out-Null
Copy-Item $origen $destino -Force

Write-Host ""
Write-Host "Listo: $PSScriptRoot\$destino" -ForegroundColor Green
if ($Aab) {
    Write-Host "Sube ese .aab a Play Console como una app nueva (paquete $PaqueteId)."
} else {
    Write-Host "Ese .apk se puede instalar directo en cualquier Android."
    Write-Host "Para Play Store vuelve a ejecutar con -Aab."
}
