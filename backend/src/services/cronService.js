const cron = require('node-cron');
const { verificarAlertasHorario } = require('../controllers/horarioController');

// Ejecutar cada 5 minutos
cron.schedule('*/5 * * * *', async () => {
  console.log('🔄 Verificando alertas de horarios...');
  try {
    await verificarAlertasHorario();
  } catch (error) {
    console.error('❌ Error en cron job:', error);
  }
});

console.log('✅ Cron job de alertas iniciado (cada 5 minutos)');