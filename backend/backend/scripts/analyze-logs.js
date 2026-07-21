const fs = require('fs');
const path = require('path');
const readline = require('readline');

const logDir = path.join(__dirname, '../logs');

const analyzeLogs = async (date) => {
  const filename = pp-.log;
  const filePath = path.join(logDir, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(❌ No se encontró el archivo: );
    console.log('📂 Revisa que el servidor esté corriendo y generando logs.');
    console.log(📁 Buscado en: );
    return;
  }

  const stats = {
    total: 0,
    info: 0,
    error: 0,
    warn: 0,
    debug: 0,
    errors: [],
    endpoints: {},
    users: new Set(),
    performance: []
  };

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    stats.total++;
    
    if (line.includes('[INFO]')) stats.info++;
    else if (line.includes('[ERROR]')) {
      stats.error++;
      stats.errors.push(line);
    } else if (line.includes('[WARN]')) stats.warn++;
    else if (line.includes('[DEBUG]')) stats.debug++;

    const endpointMatch = line.match(/HTTP Request.*"url":"([^"]+)"/);
    if (endpointMatch) {
      const endpoint = endpointMatch[1];
      stats.endpoints[endpoint] = (stats.endpoints[endpoint] || 0) + 1;
    }

    const userMatch = line.match(/userEmail":"([^"]+)"/);
    if (userMatch) stats.users.add(userMatch[1]);

    if (line.includes('PERFORMANCE:')) {
      const perfMatch = line.match(/duration":"(\d+)ms/);
      if (perfMatch) {
        stats.performance.push({
          operation: line.match(/PERFORMANCE: ([^\s]+)/)?.[1],
          duration: parseInt(perfMatch[1])
        });
      }
    }
  }

  const avgDuration = stats.performance.length > 0
    ? stats.performance.reduce((a, b) => a + b.duration, 0) / stats.performance.length
    : 0;

  console.log('\n📊 ANÁLISIS DE LOGS');
  console.log('═══════════════════════════════════════');
  console.log(📁 Archivo: );
  console.log(📝 Total líneas: );
  console.log(✅ INFO: );
  console.log(⚠️  WARN: );
  console.log(❌ ERROR: );
  console.log(📈 ENDPOINTS: );
  console.log(👥 USUARIOS: );
  console.log(⏱️  Promedio respuesta: ms);
  console.log('\n📌 ENDPOINTS MÁS USADOS:');
  
  const sortedEndpoints = Object.entries(stats.endpoints)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  sortedEndpoints.forEach(([endpoint, count]) => {
    console.log(   :  peticiones);
  });

  if (stats.errors.length > 0) {
    console.log(\n🚨 ÚLTIMOS 5 ERRORES:);
    stats.errors.slice(-5).forEach((error, i) => {
      console.log(   . ...);
    });
  }
};

const date = process.argv[2];
analyzeLogs(date).catch(console.error);
