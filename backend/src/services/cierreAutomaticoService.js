const CuadreCaja = require('../models/CuadreCaja');

// ============================================
// 📅 CERRAR CUADRES AUTOMÁTICAMENTE
// ============================================
async function cerrarCuadresAutomaticos() {
  try {
    const hoy = new Date();
    const fechaAyer = new Date(hoy);
    fechaAyer.setDate(fechaAyer.getDate() - 1);
    const fechaAyerStr = fechaAyer.toISOString().split('T')[0];
    
    console.log(`📅 [CIERRE AUTOMÁTICO] Procesando cuadres para: ${fechaAyerStr}`);
    
    const zonas = ['TOLA', 'CHILIBULO', 'MAGDALENA'];
    let cerrados = 0;
    let creados = 0;
    
    for (const zona of zonas) {
      // ✅ Buscar cuadre del día anterior
      let cuadre = await CuadreCaja.findOne({ 
        zona, 
        fecha: fechaAyerStr 
      });
      
      if (cuadre) {
        // ✅ Si existe y no está cerrado, cerrarlo
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
        // ✅ Si no existe, crear cuadre cerrado automáticamente
        console.log(`📊 [CIERRE AUTOMÁTICO] Creando cuadre para ${zona} - ${fechaAyerStr}`);
        
        // Obtener saldo del día anterior
        const saldoAnterior = await obtenerSaldoAnterior(zona, fechaAyerStr);
        
        cuadre = new CuadreCaja({
          zona,
          fecha: fechaAyerStr,
          saldoInicial: saldoAnterior,
          saldoDisponible: saldoAnterior,
          creadoPor: null, // Sistema
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
    
    // Buscar cuadre del día anterior
    let cuadreAnterior = await CuadreCaja.findOne({ 
      zona, 
      fecha: fechaAnteriorStr,
      cerrado: true 
    });
    
    if (cuadreAnterior) {
      return cuadreAnterior.saldoDisponible;
    }
    
    // Si no está cerrado, buscar cualquier cuadre del día anterior
    cuadreAnterior = await CuadreCaja.findOne({ 
      zona, 
      fecha: fechaAnteriorStr 
    });
    
    if (cuadreAnterior) {
      return cuadreAnterior.saldoDisponible;
    }
    
    // Si no existe, buscar el último cuadre disponible
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
  // Calcular la hora para ejecutar (12:05 AM)
  const ahora = new Date();
  const horaEjecucion = new Date(ahora);
  horaEjecucion.setHours(0, 5, 0, 0); // 12:05 AM
  
  // Si ya pasó la hora, programar para mañana
  if (ahora > horaEjecucion) {
    horaEjecucion.setDate(horaEjecucion.getDate() + 1);
  }
  
  const msHastaEjecucion = horaEjecucion - ahora;
  console.log(`⏰ [CIERRE AUTOMÁTICO] Próxima ejecución en ${Math.round(msHastaEjecucion / 60000)} minutos (${horaEjecucion.toLocaleString()})`);
  
  setTimeout(() => {
    console.log('🔄 [CIERRE AUTOMÁTICO] Ejecutando cierre automático programado...');
    cerrarCuadresAutomaticos();
    // Programar el siguiente
    programarCierreDiario();
  }, msHastaEjecucion);
}

module.exports = {
  cerrarCuadresAutomaticos,
  iniciarCierreAutomatico,
  programarCierreDiario,
  obtenerSaldoAnterior,
};