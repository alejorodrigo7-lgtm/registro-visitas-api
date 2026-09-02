const CuadreCaja = require('../models/CuadreCaja');
const cron = require('node-cron');

// ============================================
// 📅 CERRAR CUADRES AUTOMÁTICAMENTE
// ============================================
async function cerrarCuadresAutomaticos() {
  try {
    // ✅ Usar fecha en zona horaria de Ecuador
    const ahora = new Date();
    const formatter = new Intl.DateTimeFormat('es-EC', {
      timeZone: 'America/Guayaquil',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(ahora);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    const fechaAyerStr = `${year}-${month}-${day}`;
    
    console.log(`📅 [CIERRE AUTOMÁTICO] Procesando cuadres para: ${fechaAyerStr}`);
    
    const zonas = ['TOLA', 'CHILIBULO', 'MAGDALENA'];
    let cerrados = 0;
    let creados = 0;
    
    for (const zona of zonas) {
      let cuadre = await CuadreCaja.findOne({ 
        zona, 
        fecha: fechaAyerStr 
      });
      
      if (cuadre) {
        if (!cuadre.cerrado) {
          cuadre.cerrado = true;
          cuadre.fechaCierre = new Date();
          await cuadre.save();
          cerrados++;
          console.log(`✅ [CIERRE AUTOMÁTICO] Cerrado: ${zona} - ${fechaAyerStr} - Saldo: ${cuadre.saldoDisponible}`);
        } else {
          console.log(`ℹ️ [CIERRE AUTOMÁTICO] Ya cerrado: ${zona} - ${fechaAyerStr}`);
        }
      } else {
        console.log(`📊 [CIERRE AUTOMÁTICO] Creando cuadre para ${zona} - ${fechaAyerStr}`);
        const saldoAnterior = await obtenerSaldoAnterior(zona, fechaAyerStr);
        
        cuadre = new CuadreCaja({
          zona,
          fecha: fechaAyerStr,
          saldoInicial: saldoAnterior,
          saldoDisponible: saldoAnterior,
          creadoPor: null,
          cerrado: true,
          fechaCierre: new Date(),
          ingresos: [],
          pagos: [],
        });
        
        await cuadre.save();
        creados++;
        console.log(`✅ [CIERRE AUTOMÁTICO] Creado y cerrado: ${zona} - ${fechaAyerStr} - Saldo: ${saldoAnterior}`);
      }
    }
    
    console.log(`✅ [CIERRE AUTOMÁTICO] Resumen: ${cerrados} cerrados, ${creados} creados`);
    return { cerrados, creados, fecha: fechaAyerStr };
  } catch (error) {
    console.error('❌ [CIERRE AUTOMÁTICO] Error:', error);
    return { error: error.message };
  }
}

// ============================================
// 📊 OBTENER SALDO ANTERIOR
// ============================================
async function obtenerSaldoAnterior(zona, fecha) {
  try {
    const fechaObj = new Date(fecha);
    const diaAnterior = new Date(fechaObj);
    diaAnterior.setDate(diaAnterior.getDate() - 1);
    const fechaAnteriorStr = diaAnterior.toISOString().split('T')[0];
    
    let cuadreAnterior = await CuadreCaja.findOne({ 
      zona, 
      fecha: fechaAnteriorStr,
      cerrado: true 
    });
    
    if (cuadreAnterior) {
      return cuadreAnterior.saldoDisponible;
    }
    
    cuadreAnterior = await CuadreCaja.findOne({ 
      zona, 
      fecha: fechaAnteriorStr 
    });
    
    if (cuadreAnterior) {
      return cuadreAnterior.saldoDisponible;
    }
    
    const ultimoCuadre = await CuadreCaja.findOne({ 
      zona,
      fecha: { $lt: fechaAnteriorStr }
    }).sort({ fecha: -1 });
    
    return ultimoCuadre ? ultimoCuadre.saldoDisponible : 0;
  } catch (error) {
    console.error('❌ Error obteniendo saldo anterior:', error);
    return 0;
  }
}

// ============================================
// 🕐 EJECUTAR CIERRE AUTOMÁTICO AL INICIAR
// ============================================
async function iniciarCierreAutomatico() {
  try {
    console.log('🔄 [CIERRE AUTOMÁTICO] Iniciando cierre automático...');
    const resultado = await cerrarCuadresAutomaticos();
    console.log('✅ [CIERRE AUTOMÁTICO] Completado:', resultado);
    return resultado;
  } catch (error) {
    console.error('❌ [CIERRE AUTOMÁTICO] Error al iniciar:', error);
    return { error: error.message };
  }
}

// ============================================
// 📅 PROGRAMAR CIERRE AUTOMÁTICO DIARIO
// ============================================
function programarCierreDiario() {
  // ✅ Usar node-cron con zona horaria de Ecuador
  cron.schedule('59 23 * * *', () => {
    console.log('🔄 [CIERRE AUTOMÁTICO] Ejecutando cierre automático programado...');
    cerrarCuadresAutomaticos();
  }, {
    timezone: "America/Guayaquil"
  });
  
  console.log('⏰ [CIERRE AUTOMÁTICO] Programado para las 23:59 (hora Ecuador)');
  
  // ✅ También ejecutar al iniciar (si es necesario)
  setTimeout(async () => {
    console.log('🔄 [CIERRE AUTOMÁTICO] Ejecutando cierre automático inicial...');
    await cerrarCuadresAutomaticos();
  }, 3000);
}

module.exports = {
  cerrarCuadresAutomaticos,
  iniciarCierreAutomatico,
  programarCierreDiario,
  obtenerSaldoAnterior,
};