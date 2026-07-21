const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const logDir = path.join(__dirname, '../logs');
const logFile = path.join(logDir, 'app.log');

console.log('🔄 Monitoreando logs en tiempo real...');
console.log(📁 Archivo: );
console.log('Presiona Ctrl+C para salir\n');

if (!fs.existsSync(logFile)) {
  console.log('⚠️  El archivo de log aún no existe. Esperando a que se cree...');
}

const tail = exec(Get-Content -Path "" -Wait -Tail 10, { shell: 'powershell.exe' });

tail.stdout.on('data', (data) => {
  const line = data.toString().trim();
  if (!line) return;

  if (line.includes('[ERROR]')) {
    console.log('\x1b[31m%s\x1b[0m', ❌ );
  } else if (line.includes('[WARN]')) {
    console.log('\x1b[33m%s\x1b[0m', ⚠️  );
  } else if (line.includes('[INFO]')) {
    console.log('\x1b[32m%s\x1b[0m', ✅ );
  } else if (line.includes('AUDIT:')) {
    console.log('\x1b[36m%s\x1b[0m', 🔐 );
  } else if (line.includes('PERFORMANCE:')) {
    console.log('\x1b[35m%s\x1b[0m', ⚡ );
  } else {
    console.log(line);
  }
});

tail.stderr.on('data', (data) => {
  console.error('Error:', data.toString());
});

process.on('SIGINT', () => {
  console.log('\n\n👋 Deteniendo monitoreo...');
  tail.kill();
  process.exit(0);
});
