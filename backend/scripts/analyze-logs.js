const fs = require('fs');
const path = require('path');
const readline = require('readline');

const logDir = path.join(__dirname, '../logs');

const analyzeLogs = async (date) => {
  const filename = `app-${date || new Date().toISOString().split('T')[0]}.log`;
  const filePath = path.join(logDir, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ No se encontró el archivo: ${filename}`);
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
    
    // Contar por nivel
    if (line.includes('[INFO]')) stats.info++;
    else if (line.includes('[ERROR]')) {
      stats.error++;
      stats.errors.push(line);
    } else if (line.includes('[WARN]')) stats.warn++;
    else if (line.includes('[DEBUG]')) stats.debug++;

    // Analizar endpoints
    const endpointMatch = line.match(/HTTP Request.*"url":"([^"]+)"/);
    if (endpointMatch) {
      const endpoint = endpointMatch[1];
      stats.endpoints[endpoint] = (stats.endpoints[endpoint] || 0) + 1;
    }

    // Extraer usuarios
    const userMatch = line.match(/userEmail":"([^"]+)"/);
    if (userMatch) stats.users.add(userMatch[1]);

    // Rendimiento
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

  // Calcular duración promedio
  const avgDuration = stats.performance.length > 0
    ? stats.performance.reduce((a, b) => a + b.duration, 0) / stats.performance.length
    : 0;

  console.log('\n📊 ANÁLISIS DE LOGS');
  console.log('═══════════════════════════════════════');
  console.log(`📁 Archivo: ${filename}`);
  console.log(`📝 Total líneas: ${stats.total}`);
  console.log(`✅ INFO: ${stats.info}`);
  console.log(`⚠️  WARN: ${stats.warn}`);
  console.log(`❌ ERROR: ${stats.error}`);
  console.log(`📈 ENDPOINTS: ${Object.keys(stats.endpoints).length}`);
  console.log(`👥 USUARIOS: ${stats.users.size}`);
  console.log(`⏱️  Promedio respuesta: ${avgDuration.toFixed(2)}ms`);
  console.log('\n📌 ENDPOINTS MÁS USADOS:');
  
  const sortedEndpoints = Object.entries(stats.endpoints)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  sortedEndpoints.forEach(([endpoint, count]) => {
    console.log(`   ${endpoint}: ${count} peticiones`);
  });

  if (stats.errors.length > 0) {
    console.log(`\n🚨 ÚLTIMOS 5 ERRORES:`);
    stats.errors.slice(-5).forEach((error, i) => {
      console.log(`   ${i+1}. ${error.substring(0, 150)}...`);
    });
  }
};

// Ejecutar con fecha específica o hoy
const date = process.argv[2];
analyzeLogs(date).catch(console.error);