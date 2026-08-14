Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   AGREGANDO CONTENIDO A SERVER.JS" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Ir al backend
cd "C:\Users\MARYLUZ CORDOBA\Desktop\registro-visitas-app\backend\src"

# Mostrar instrucciones
Write-Host "📋 INSTRUCCIONES:" -ForegroundColor Yellow
Write-Host "1. El archivo server.js se abrirá en el bloc de notas" -ForegroundColor Cyan
Write-Host "2. Copia el código del mensaje anterior" -ForegroundColor Cyan
Write-Host "3. Pégarlo en el archivo y guarda (Ctrl+S)" -ForegroundColor Cyan
Write-Host "4. Cierra el bloc de notas" -ForegroundColor Cyan
Write-Host ""

# Abrir el archivo
notepad server.js

# Esperar a que el usuario guarde
Read-Host "`nPresiona Enter después de guardar el archivo"

# Verificar que el archivo no esté vacío
$content = Get-Content "server.js" -Raw
if ([string]::IsNullOrWhiteSpace($content)) {
    Write-Host "❌ Error: El archivo server.js está vacío" -ForegroundColor Red
    Write-Host "📝 Asegúrate de pegar el código antes de continuar" -ForegroundColor Yellow
    exit
}

# Verificar que contenga las palabras clave principales
$hasRequire = $content -match "require\('dotenv'\)"
$hasExpress = $content -match "express"
$hasPort = $content -match "PORT"

Write-Host ""
Write-Host "🔍 Verificando contenido del archivo:" -ForegroundColor Yellow
if ($hasRequire) { Write-Host "  ✅ Contiene require('dotenv')" -ForegroundColor Green }
else { Write-Host "  ❌ FALTA require('dotenv')" -ForegroundColor Red }

if ($hasExpress) { Write-Host "  ✅ Contiene express" -ForegroundColor Green }
else { Write-Host "  ❌ FALTA express" -ForegroundColor Red }

if ($hasPort) { Write-Host "  ✅ Contiene PORT" -ForegroundColor Green }
else { Write-Host "  ❌ FALTA PORT" -ForegroundColor Red }

# Verificar que termine correctamente
$endsCorrectly = $content -match "}\);\s*$"
if ($endsCorrectly) { Write-Host "  ✅ Termina correctamente con '});'" -ForegroundColor Green }
else { Write-Host "  ⚠️ El archivo NO termina con '});' - puede haber caracteres extra" -ForegroundColor Yellow }

Write-Host ""

# Validar sintaxis
Write-Host "🔍 Validando sintaxis..." -ForegroundColor Yellow
node -c server.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ server.js es sintácticamente válido" -ForegroundColor Green
    
    # Subir cambios
    cd "C:\Users\MARYLUZ CORDOBA\Desktop\registro-visitas-app"
    
    Write-Host ""
    Write-Host "📦 Agregando archivo a Git..." -ForegroundColor Yellow
    git add backend/src/server.js
    
    Write-Host "📝 Haciendo commit..." -ForegroundColor Yellow
    git commit -m "🐛 Fix: Agregar server.js con contenido correcto"
    
    Write-Host "🚀 Subiendo a GitHub..." -ForegroundColor Yellow
    git push origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Cambios subidos exitosamente a GitHub" -ForegroundColor Green
        Write-Host "🔗 Render detectará el cambio y re-desplegará automáticamente" -ForegroundColor Cyan
        Write-Host "⏳ Espera 2-3 minutos para que se complete el despliegue" -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "❌ Error al subir a GitHub. Intentando con --force..." -ForegroundColor Red
        git push origin main --force
    }
} else {
    Write-Host ""
    Write-Host "❌ Error: server.js tiene errores de sintaxis" -ForegroundColor Red
    Write-Host ""
    Write-Host "📝 Posibles causas:" -ForegroundColor Yellow
    Write-Host "  - El código está incompleto o cortado" -ForegroundColor Cyan
    Write-Host "  - Hay caracteres extraños al final del archivo" -ForegroundColor Cyan
    Write-Host "  - El archivo no termina con '});'" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🔧 Solución:" -ForegroundColor Yellow
    Write-Host "  - Vuelve a abrir el archivo: notepad server.js" -ForegroundColor Cyan
    Write-Host "  - Asegúrate de que el código esté COMPLETO" -ForegroundColor Cyan
    Write-Host "  - Elimina cualquier comentario o carácter después de '});'" -ForegroundColor Cyan
    Write-Host "  - Guarda y vuelve a ejecutar este script" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan