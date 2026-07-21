const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../logs');

// Función para encontrar el archivo de log más reciente
function encontrarLogMasReciente() {
    try {
        const files = fs.readdirSync(logDir);
        const logFiles = files
            .filter(f => f.startsWith('app-') && f.endsWith('.log'))
            .map(f => ({
                name: f,
                path: path.join(logDir, f),
                mtime: fs.statSync(path.join(logDir, f)).mtime
            }))
            .sort((a, b) => b.mtime - a.mtime);

        if (logFiles.length === 0) return null;
        return logFiles[0];
    } catch (error) {
        return null;
    }
}

// Obtener el archivo más reciente
let logInfo = encontrarLogMasReciente();
let logFile = logInfo ? logInfo.path : null;

console.log('🔄 Monitoreando logs en tiempo real...');
console.log(`📁 Archivo: ${logFile || 'No encontrado'}`);
console.log('Presiona Ctrl+C para salir\n');

// Verificar si el archivo de log existe
if (!logFile || !fs.existsSync(logFile)) {
    console.log('⚠️  No se encontró ningún archivo de log.');
    console.log('📝 Asegúrate de que el servidor esté corriendo y generando logs.');
    console.log('📁 Buscando en: ' + logDir + '\n');
} else {
    console.log(`✅ Archivo de log encontrado: ${logInfo.name}`);
    console.log(`📅 Última modificación: ${logInfo.mtime.toLocaleString()}\n`);
}

// Función para mostrar línea con colores
function mostrarLinea(line) {
    if (line.includes('[ERROR]')) {
        console.log('\x1b[31m%s\x1b[0m', `❌ ${line}`);
    } else if (line.includes('[WARN]')) {
        console.log('\x1b[33m%s\x1b[0m', `⚠️  ${line}`);
    } else if (line.includes('[INFO]')) {
        console.log('\x1b[32m%s\x1b[0m', `✅ ${line}`);
    } else if (line.includes('AUDIT:')) {
        console.log('\x1b[36m%s\x1b[0m', `🔐 ${line}`);
    } else if (line.includes('PERFORMANCE:')) {
        console.log('\x1b[35m%s\x1b[0m', `⚡ ${line}`);
    } else {
        console.log(line);
    }
}

// Función para leer las últimas líneas
function tailLogFile() {
    try {
        if (!logFile || !fs.existsSync(logFile)) return;
        
        const stats = fs.statSync(logFile);
        const fileSize = stats.size;
        
        const bufferSize = Math.min(fileSize, 10240);
        const buffer = Buffer.alloc(bufferSize);
        
        const fd = fs.openSync(logFile, 'r');
        fs.readSync(fd, buffer, 0, bufferSize, fileSize - bufferSize);
        fs.closeSync(fd);
        
        const content = buffer.toString('utf8');
        const lines = content.split('\n').filter(line => line.trim() !== '');
        
        const lastLines = lines.slice(-10);
        lastLines.forEach(line => mostrarLinea(line));
    } catch (error) {
        // Ignorar errores de lectura
    }
}

// Mostrar las últimas líneas al inicio
console.log('📋 Últimas líneas del log:');
tailLogFile();
console.log('\n⏳ Esperando nuevos logs...\n');

// Monitorear cambios
let lastSize = 0;

try {
    if (logFile && fs.existsSync(logFile)) {
        const stats = fs.statSync(logFile);
        lastSize = stats.size;
    }
} catch (error) {
    // Ignorar
}

function readNewLines() {
    try {
        // Verificar si hay un nuevo archivo de log (rotación)
        const newLogInfo = encontrarLogMasReciente();
        if (newLogInfo && (!logFile || newLogInfo.path !== logFile)) {
            logFile = newLogInfo.path;
            console.log(`\n📄 Cambiando a nuevo archivo: ${newLogInfo.name}`);
            lastSize = 0;
            setTimeout(tailLogFile, 100);
            return;
        }

        if (!logFile || !fs.existsSync(logFile)) return;
        
        const stats = fs.statSync(logFile);
        const currentSize = stats.size;
        
        if (currentSize > lastSize) {
            const bufferSize = currentSize - lastSize;
            const buffer = Buffer.alloc(bufferSize);
            
            const fd = fs.openSync(logFile, 'r');
            fs.readSync(fd, buffer, 0, bufferSize, lastSize);
            fs.closeSync(fd);
            
            const content = buffer.toString('utf8');
            const lines = content.split('\n').filter(line => line.trim() !== '');
            
            lines.forEach(line => mostrarLinea(line));
            
            lastSize = currentSize;
        }
    } catch (error) {
        // Ignorar errores
    }
}

const interval = setInterval(readNewLines, 500);

process.on('SIGINT', () => {
    console.log('\n\n👋 Deteniendo monitoreo...');
    clearInterval(interval);
    process.exit(0);
});