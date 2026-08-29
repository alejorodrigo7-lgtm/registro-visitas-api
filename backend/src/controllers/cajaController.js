const Caja = require('../models/Caja');
const Deposito = require('../models/Deposito');
const User = require('../models/User');
const CuadreCaja = require('../models/CuadreCaja');
const emailService = require('../services/emailService');

// ============================================
// 📊 FUNCIÓN AUXILIAR: Obtener saldo del día anterior (CORREGIDA)
// ============================================
async function obtenerSaldoDiaAnterior(zona, fecha) {
  try {
    const fechaParts = fecha.split('-');
    const year = parseInt(fechaParts[0]);
    const month = parseInt(fechaParts[1]) - 1;
    const day = parseInt(fechaParts[2]);
    
    const fechaObj = new Date(year, month, day);
    fechaObj.setDate(fechaObj.getDate() - 1);
    
    const yearAnterior = fechaObj.getFullYear();
    const monthAnterior = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const dayAnterior = String(fechaObj.getDate()).padStart(2, '0');
    const fechaAnterior = `${yearAnterior}-${monthAnterior}-${dayAnterior}`;
    
    console.log(`📊 Buscando saldo anterior para ${zona} en fecha ${fechaAnterior}`);
    
    let cuadreAnterior = await CuadreCaja.findOne({ 
      zona, 
      fecha: fechaAnterior,
      cerrado: true 
    });
    
    if (cuadreAnterior) {
      console.log(`📊 Saldo del día anterior CERRADO (${fechaAnterior}): ${cuadreAnterior.saldoDisponible}`);
      return cuadreAnterior.saldoDisponible;
    }
    
    cuadreAnterior = await CuadreCaja.findOne({ 
      zona, 
      fecha: fechaAnterior 
    });
    
    if (cuadreAnterior) {
      console.log(`📊 Saldo del día anterior (${fechaAnterior}): ${cuadreAnterior.saldoDisponible}`);
      return cuadreAnterior.saldoDisponible;
    }
    
    const ultimoCuadre = await CuadreCaja.findOne({ 
      zona,
      fecha: { $lt: fechaAnterior }
    }).sort({ fecha: -1 });
    
    if (ultimoCuadre) {
      console.log(`📊 Saldo del último cuadre disponible (${ultimoCuadre.fecha}): ${ultimoCuadre.saldoDisponible}`);
      return ultimoCuadre.saldoDisponible;
    }
    
    console.log(`📊 No se encontró saldo anterior, usando 0`);
    return 0;
  } catch (error) {
    console.error('❌ Error obteniendo saldo anterior:', error);
    return 0;
  }
}

// ============================================
// INGRESO DE CAJA
// ============================================
exports.ingresarCaja = async (req, res) => {
  try {
    const { zona, fecha, saldoInicial, cobroOficina, cobroCoordinador, egresos } = req.body;

    if (!zona || !fecha || saldoInicial === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Zona, fecha y saldo inicial son obligatorios',
      });
    }

    const fechaInicio = new Date(fecha);
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(fecha);
    fechaFin.setHours(23, 59, 59, 999);

    const cajaExistente = await Caja.findOne({
      zona,
      fecha: { $gte: fechaInicio, $lte: fechaFin },
    });

    if (cajaExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una caja para esta zona y fecha',
      });
    }

    const totalEgresos = egresos ? egresos.reduce((sum, e) => sum + (e.valor || 0), 0) : 0;
    const saldoFinal = (saldoInicial || 0) + (cobroOficina || 0) + (cobroCoordinador || 0) - totalEgresos;

    const caja = await Caja.create({
      zona,
      fecha: new Date(fecha),
      saldoInicial: saldoInicial || 0,
      cobroOficina: cobroOficina || 0,
      cobroCoordinador: cobroCoordinador || 0,
      egresos: egresos || [],
      saldoFinal,
      creadoPor: req.user._id,
      estado: 'ABIERTA',
    });

    await actualizarSaldoInicialSiguiente(zona, fecha, saldoFinal);

    res.status(201).json({
      success: true,
      message: 'Caja ingresada correctamente',
      data: caja,
    });
  } catch (error) {
    console.error('Error en ingresarCaja:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// OBTENER CAJA POR ZONA Y FECHA
// ============================================
exports.getCaja = async (req, res) => {
  try {
    const { zona, fecha } = req.query;

    if (!zona || !fecha) {
      return res.status(400).json({
        success: false,
        message: 'Zona y fecha son requeridos',
      });
    }

    const fechaInicio = new Date(fecha);
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(fecha);
    fechaFin.setHours(23, 59, 59, 999);

    const caja = await Caja.findOne({
      zona,
      fecha: { $gte: fechaInicio, $lte: fechaFin },
    }).populate('creadoPor', 'nombre email');

    res.json({
      success: true,
      data: caja || null,
    });
  } catch (error) {
    console.error('Error en getCaja:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// OBTENER SALDO DISPONIBLE
// ============================================
exports.getSaldoDisponible = async (req, res) => {
  try {
    const { zona } = req.query;

    if (!zona) {
      return res.status(400).json({
        success: false,
        message: 'Zona es requerida',
      });
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const caja = await Caja.findOne({
      zona,
      fecha: { $lt: hoy },
    }).sort({ fecha: -1 });

    res.json({
      success: true,
      data: {
        saldoFinal: caja ? caja.saldoFinal : 0,
        fecha: caja ? caja.fecha : null,
      },
    });
  } catch (error) {
    console.error('Error en getSaldoDisponible:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// ACTUALIZAR SALDO INICIAL DEL DÍA SIGUIENTE
// ============================================
async function actualizarSaldoInicialSiguiente(zona, fecha, saldoFinal) {
  try {
    const fechaSiguiente = new Date(fecha);
    fechaSiguiente.setDate(fechaSiguiente.getDate() + 1);
    fechaSiguiente.setHours(0, 0, 0, 0);

    const fechaFin = new Date(fechaSiguiente);
    fechaFin.setHours(23, 59, 59, 999);

    const cajaSiguiente = await Caja.findOne({
      zona,
      fecha: { $gte: fechaSiguiente, $lte: fechaFin },
    });

    if (cajaSiguiente) {
      cajaSiguiente.saldoInicial = saldoFinal;
      cajaSiguiente.saldoFinal = saldoFinal + (cajaSiguiente.cobroOficina || 0) + (cajaSiguiente.cobroCoordinador || 0);
      await cajaSiguiente.save();
    }
  } catch (error) {
    console.error('Error actualizando saldo inicial siguiente:', error);
  }
}

// ============================================
// EDITAR CAJA (SOLO ADMIN)
// ============================================
exports.editarCaja = async (req, res) => {
  try {
    const { id } = req.params;
    const { saldoInicial, cobroOficina, cobroCoordinador, egresos } = req.body;

    const caja = await Caja.findById(id);
    if (!caja) {
      return res.status(404).json({
        success: false,
        message: 'Caja no encontrada',
      });
    }

    if (saldoInicial !== undefined) caja.saldoInicial = saldoInicial;
    if (cobroOficina !== undefined) caja.cobroOficina = cobroOficina;
    if (cobroCoordinador !== undefined) caja.cobroCoordinador = cobroCoordinador;
    if (egresos) caja.egresos = egresos;

    const totalEgresos = caja.egresos.reduce((sum, e) => sum + (e.valor || 0), 0);
    caja.saldoFinal = (caja.saldoInicial || 0) + (caja.cobroOficina || 0) + (caja.cobroCoordinador || 0) - totalEgresos;
    caja.updatedAt = new Date();

    await caja.save();

    res.json({
      success: true,
      message: 'Caja actualizada correctamente',
      data: caja,
    });
  } catch (error) {
    console.error('Error en editarCaja:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// BUSCAR CAJAS POR FECHA (SOLO ADMIN)
// ============================================
exports.buscarCajas = async (req, res) => {
  try {
    const { fecha, zona } = req.query;

    if (!fecha) {
      return res.status(400).json({
        success: false,
        message: 'Fecha es requerida',
      });
    }

    const fechaInicio = new Date(fecha);
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(fecha);
    fechaFin.setHours(23, 59, 59, 999);

    let query = { fecha: { $gte: fechaInicio, $lte: fechaFin } };
    if (zona) query.zona = zona;

    const cajas = await Caja.find(query)
      .populate('creadoPor', 'nombre email')
      .sort({ zona: 1 });

    res.json({
      success: true,
      data: cajas,
    });
  } catch (error) {
    console.error('Error en buscarCajas:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// DEPÓSITOS - SUBIR
// ============================================
exports.subirDeposito = async (req, res) => {
  try {
    const { zona, fecha, nombre, cuenta, observaciones, imagen } = req.body;

    if (!zona || !fecha || !nombre || !cuenta) {
      return res.status(400).json({
        success: false,
        message: 'Zona, fecha, nombre y cuenta son obligatorios',
      });
    }

    const deposito = await Deposito.create({
      zona,
      fecha: new Date(fecha),
      nombre,
      cuenta,
      observaciones: observaciones || '',
      imagen: imagen || '',
      creadoPor: req.user._id,
      estado: 'SUBIDO',
    });

    res.status(201).json({
      success: true,
      message: 'Depósito subido correctamente',
      data: deposito,
    });
  } catch (error) {
    console.error('Error en subirDeposito:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// DEPÓSITOS - REVISAR
// ============================================
exports.revisarDepositos = async (req, res) => {
  try {
    const { fecha, cuenta, zona } = req.query;

    let query = {};
    if (fecha) {
      const fechaInicio = new Date(fecha);
      fechaInicio.setHours(0, 0, 0, 0);
      const fechaFin = new Date(fecha);
      fechaFin.setHours(23, 59, 59, 999);
      query.fecha = { $gte: fechaInicio, $lte: fechaFin };
    }
    if (cuenta) query.cuenta = cuenta;
    if (zona) query.zona = zona;

    const depositos = await Deposito.find(query)
      .populate('creadoPor', 'nombre email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: depositos,
    });
  } catch (error) {
    console.error('Error en revisarDepositos:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// DEPÓSITOS - MARCAR REVISADO
// ============================================
exports.marcarDepositoRevisado = async (req, res) => {
  try {
    const { id } = req.params;

    const deposito = await Deposito.findById(id);
    if (!deposito) {
      return res.status(404).json({
        success: false,
        message: 'Depósito no encontrado',
      });
    }

    deposito.estado = 'REVISADO';
    deposito.updatedAt = new Date();
    await deposito.save();

    res.json({
      success: true,
      message: 'Depósito marcado como revisado',
      data: deposito,
    });
  } catch (error) {
    console.error('Error en marcarDepositoRevisado:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// 📊 CUADRE DE CAJA - FUNCIONES PRINCIPALES
// ============================================

// Obtener cuadre por zona y fecha - CORREGIDO
exports.getCuadre = async (req, res) => {
  try {
    const { zona, fecha } = req.params;
    
    console.log(`📊 Buscando cuadre para ${zona} - ${fecha}`);
    
    let cuadre = await CuadreCaja.findOne({ zona, fecha });
    
    if (!cuadre) {
      // ✅ Si NO existe, CREAR uno nuevo
      console.log(`📊 No existe cuadre para ${zona} - ${fecha}, creando...`);
      
      const saldoAnterior = await obtenerSaldoDiaAnterior(zona, fecha);
      console.log(`📊 Saldo anterior obtenido: ${saldoAnterior}`);
      
      cuadre = new CuadreCaja({
        zona,
        fecha,
        saldoInicial: saldoAnterior,
        saldoDisponible: saldoAnterior,
        creadoPor: req.user._id,
        cerrado: false,
        ingresos: [],
        pagos: [],
      });
      
      await cuadre.save();
      console.log(`📊 Cuadre CREADO para ${zona} - ${fecha} con saldo inicial: ${saldoAnterior}`);
    } else {
      // ✅ Si EXISTE, verificar si necesita heredar saldo
      console.log(`📊 Cuadre EXISTENTE para ${zona} - ${fecha}`);
      console.log(`📊 Saldo actual: ${cuadre.saldoDisponible}, Cerrado: ${cuadre.cerrado}`);
      console.log(`📊 Ingresos: ${cuadre.ingresos.length}, Pagos: ${cuadre.pagos.length}`);
      
      // ✅ Si el cuadre está CERRADO, no se modifica
      if (cuadre.cerrado) {
        console.log(`📊 Cuadre CERRADO - No se modifica`);
      } 
      // ✅ Si está ABIERTO Y sin movimientos Y saldo 0, heredar saldo del día anterior
      else if (cuadre.ingresos.length === 0 && cuadre.pagos.length === 0 && cuadre.saldoDisponible === 0) {
        console.log(`📊 Cuadre abierto sin movimientos y saldo 0, verificando herencia...`);
        
        const saldoAnterior = await obtenerSaldoDiaAnterior(zona, fecha);
        console.log(`📊 Saldo anterior obtenido: ${saldoAnterior}`);
        
        if (saldoAnterior > 0) {
          console.log(`📊 ACTUALIZANDO saldo de ${cuadre.saldoInicial} a ${saldoAnterior}`);
          cuadre.saldoInicial = saldoAnterior;
          cuadre.saldoDisponible = saldoAnterior;
          await cuadre.save();
          console.log(`📊 Cuadre ACTUALIZADO para ${zona} - ${fecha} con saldo: ${saldoAnterior}`);
        } else {
          console.log(`📊 No hay saldo anterior disponible, se mantiene en 0`);
        }
      } 
      // ✅ Si tiene movimientos, no se modifica
      else {
        console.log(`📊 Cuadre con movimientos - No se modifica`);
      }
    }
    
    res.json({
      success: true,
      data: cuadre,
    });
  } catch (error) {
    console.error('❌ Error getCuadre:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Agregar ingreso a un cuadre
exports.agregarIngreso = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, monto, concepto } = req.body;
    
    console.log(`📊 Agregando ingreso al cuadre ${id}`);
    console.log(`📊 Tipo: ${tipo}, Monto: ${monto}`);
    
    const cuadre = await CuadreCaja.findById(id);
    if (!cuadre) {
      return res.status(404).json({
        success: false,
        message: 'Cuadre no encontrado',
      });
    }
    
    if (cuadre.cerrado) {
      return res.status(400).json({
        success: false,
        message: '⚠️ Este cuadre ya está CERRADO, no se pueden agregar más movimientos',
      });
    }
    
    cuadre.ingresos.push({
      tipo,
      monto,
      concepto: concepto || '',
      fecha: new Date(),
      usuario: req.user._id,
    });
    
    const totalIngresos = cuadre.ingresos.reduce((sum, i) => sum + i.monto, 0);
    const totalPagos = cuadre.pagos.reduce((sum, p) => sum + p.monto, 0);
    cuadre.saldoDisponible = cuadre.saldoInicial + totalIngresos - totalPagos;
    
    await cuadre.save();
    
    console.log(`✅ Ingreso agregado. Nuevo saldo: ${cuadre.saldoDisponible}`);
    
    res.json({
      success: true,
      message: 'Ingreso agregado correctamente',
      data: cuadre,
    });
  } catch (error) {
    console.error('❌ Error agregarIngreso:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Agregar egreso a un cuadre
exports.agregarPago = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo, monto, descripcion } = req.body;
    
    console.log(`📊 Agregando egreso al cuadre ${id}`);
    console.log(`📊 Monto: ${monto}`);
    console.log(`📊 Descripción: ${descripcion}`);
    
    if (motivo !== 'EGRESO') {
      return res.status(400).json({
        success: false,
        message: 'Solo se permite EGRESO como motivo',
      });
    }
    
    if (!descripcion || descripcion.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Debes escribir una descripción para el egreso',
      });
    }
    
    const cuadre = await CuadreCaja.findById(id);
    if (!cuadre) {
      return res.status(404).json({
        success: false,
        message: 'Cuadre no encontrado',
      });
    }
    
    if (cuadre.cerrado) {
      return res.status(400).json({
        success: false,
        message: '⚠️ Este cuadre ya está CERRADO, no se pueden agregar más movimientos',
      });
    }
    
    cuadre.pagos.push({
      motivo: 'EGRESO',
      monto,
      descripcion: descripcion.trim(),
      fecha: new Date(),
      usuario: req.user._id,
    });
    
    const totalIngresos = cuadre.ingresos.reduce((sum, i) => sum + i.monto, 0);
    const totalPagos = cuadre.pagos.reduce((sum, p) => sum + p.monto, 0);
    cuadre.saldoDisponible = cuadre.saldoInicial + totalIngresos - totalPagos;
    
    await cuadre.save();
    
    console.log(`✅ Egreso agregado. Nuevo saldo: ${cuadre.saldoDisponible}`);
    
    res.json({
      success: true,
      message: 'Egreso agregado correctamente',
      data: cuadre,
    });
  } catch (error) {
    console.error('❌ Error agregarPago:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cerrar cuadre del día para una zona
exports.cerrarCuadre = async (req, res) => {
  try {
    const { id } = req.params;
    
    const cuadre = await CuadreCaja.findById(id);
    if (!cuadre) {
      return res.status(404).json({
        success: false,
        message: 'Cuadre no encontrado',
      });
    }
    
    if (cuadre.cerrado) {
      return res.status(400).json({
        success: false,
        message: 'Este cuadre ya está cerrado',
      });
    }
    
    const totalIngresos = cuadre.ingresos.reduce((sum, i) => sum + i.monto, 0);
    const totalPagos = cuadre.pagos.reduce((sum, p) => sum + p.monto, 0);
    cuadre.saldoDisponible = cuadre.saldoInicial + totalIngresos - totalPagos;
    
    cuadre.cerrado = true;
    cuadre.fechaCierre = new Date();
    await cuadre.save();
    
    console.log(`✅ Cuadre CERRADO para ${cuadre.zona} - ${cuadre.fecha}`);
    console.log(`✅ Saldo Final: ${cuadre.saldoDisponible}`);
    
    res.json({
      success: true,
      message: `Cuadre de ${cuadre.zona} cerrado correctamente`,
      data: cuadre,
    });
  } catch (error) {
    console.error('❌ Error cerrarCuadre:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// ✅ ENVIAR CORREO CON RESUMEN DE LAS 3 ZONAS (SOLO UN DESTINATARIO)
// ============================================
exports.enviarCorreoResumen = async (req, res) => {
  try {
    const { fecha } = req.body;
    
    if (!fecha) {
      return res.status(400).json({
        success: false,
        message: 'La fecha es requerida',
      });
    }
    
    const zonas = ['TOLA', 'CHILIBULO', 'MAGDALENA'];
    const cuadres = await Promise.all(
      zonas.map(zona => CuadreCaja.findOne({ zona, fecha }))
    );
    
    // ✅ Verificar que TODAS las zonas existan y estén cerradas
    const zonasSinCuadre = [];
    const zonasNoCerradas = [];
    const zonasCerradas = [];
    
    for (let i = 0; i < zonas.length; i++) {
      if (!cuadres[i]) {
        zonasSinCuadre.push(zonas[i]);
      } else if (!cuadres[i].cerrado) {
        zonasNoCerradas.push(zonas[i]);
      } else {
        zonasCerradas.push(zonas[i]);
      }
    }
    
    // ✅ Si hay zonas sin cuadre o no cerradas, mostrar mensaje claro
    if (zonasSinCuadre.length > 0 || zonasNoCerradas.length > 0) {
      let mensajeError = 'Para enviar el resumen, TODAS las zonas deben estar CERRADAS.\n\n';
      
      if (zonasSinCuadre.length > 0) {
        mensajeError += `❌ Zonas SIN CUADRE: ${zonasSinCuadre.join(', ')}\n`;
      }
      if (zonasNoCerradas.length > 0) {
        mensajeError += `❌ Zonas ABIERTAS: ${zonasNoCerradas.join(', ')}\n`;
      }
      if (zonasCerradas.length > 0) {
        mensajeError += `✅ Zonas CERRADAS: ${zonasCerradas.join(', ')}`;
      }
      
      return res.status(400).json({
        success: false,
        message: mensajeError,
        data: {
          zonasSinCuadre,
          zonasNoCerradas,
          zonasCerradas,
        },
      });
    }
    
    // ✅ VERIFICAR SI YA SE ENVIÓ EL CORREO
    const yaEnviado = cuadres.every(c => c.enviadoCorreo === true);
    const intentos = cuadres.reduce((sum, c) => sum + (c.intentosCorreo || 0), 0);
    
    // ✅ SI YA FUE ENVIADO, NO REENVIAR
    if (yaEnviado) {
      return res.status(400).json({
        success: false,
        message: `⚠️ El resumen para la fecha ${fecha} ya fue enviado anteriormente (${intentos} envíos totales). No se puede reenviar.`,
        data: {
          yaEnviado: true,
          intentos: intentos,
          fecha: fecha,
        },
      });
    }
    
    const nuevoIntento = intentos + 1;
    
    // Generar resumen HTML
    let resumen = `
      <h2>📊 RESUMEN DE CAJA - ${fecha}</h2>
      <hr>
    `;
    
    let totalGeneral = 0;
    
    for (const cuadre of cuadres) {
      const totalIngresos = cuadre.ingresos.reduce((sum, i) => sum + i.monto, 0);
      const totalPagos = cuadre.pagos.reduce((sum, p) => sum + p.monto, 0);
      
      resumen += `
        <h3>📍 ${cuadre.zona}</h3>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td><strong>Saldo Inicial:</strong></td><td>$${cuadre.saldoInicial.toFixed(2)}</td></tr>
          <tr><td><strong>Total Ingresos:</strong></td><td>+$${totalIngresos.toFixed(2)}</td></tr>
          <tr><td><strong>Total Egresos:</strong></td><td>-$${totalPagos.toFixed(2)}</td></tr>
          <tr style="font-weight: bold; background-color: #f0f0f0;">
            <td><strong>Saldo Disponible:</strong></td>
            <td>$${cuadre.saldoDisponible.toFixed(2)}</td>
          </tr>
        </table>
        <p><strong>Estado:</strong> ✅ CERRADO</p>
        <p><strong>Correo enviado:</strong> ${cuadre.enviadoCorreo ? '✅ Sí' : '❌ No'}</p>
        <hr>
      `;
      
      totalGeneral += cuadre.saldoDisponible;
    }
    
    resumen += `
      <h3 style="text-align: center; color: #6C5CE7;">💰 TOTAL GENERAL: $${totalGeneral.toFixed(2)}</h3>
      <p style="text-align: center; color: #636E72; font-size: 12px;">
        📧 Primer envío de este resumen
      </p>
    `;
    
    // ✅ ENVIAR CORREO A UN SOLO DESTINATARIO
    await emailService.enviarCorreo({
      to: 'alejorodrigo7@gmail.com',
      subject: `📊 Resumen de Caja - ${fecha}`,
      html: resumen,
    });
    
    // ✅ ACTUALIZAR ESTADO DE ENVÍO EN TODOS LOS CUADRES
    for (const cuadre of cuadres) {
      cuadre.enviadoCorreo = true;
      cuadre.intentosCorreo = nuevoIntento;
      cuadre.ultimoEnvioCorreo = new Date();
      await cuadre.save();
    }
    
    console.log(`✅ Correo de resumen enviado para ${fecha} a alejorodrigo7@gmail.com (Intento #${nuevoIntento})`);
    
    res.json({
      success: true,
      message: `Correo de resumen enviado correctamente a alejorodrigo7@gmail.com (Intento #${nuevoIntento})`,
      data: { 
        totalGeneral, 
        fecha, 
        intento: nuevoIntento,
      },
    });
  } catch (error) {
    console.error('❌ Error enviarCorreoResumen:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener resumen del día para las 3 zonas
exports.getResumenDia = async (req, res) => {
  try {
    const { fecha } = req.params;
    
    const zonas = ['TOLA', 'CHILIBULO', 'MAGDALENA'];
    const cuadres = await Promise.all(
      zonas.map(zona => CuadreCaja.findOne({ zona, fecha }))
    );
    
    const resumen = cuadres.map((cuadre, index) => {
      if (!cuadre) {
        return {
          zona: zonas[index],
          existe: false,
          cerrado: false,
          saldoInicial: 0,
          saldoDisponible: 0,
          totalIngresos: 0,
          totalPagos: 0,
          ingresos: [],
          pagos: [],
          enviadoCorreo: false,
          intentosCorreo: 0,
        };
      }
      
      const totalIngresos = cuadre.ingresos.reduce((sum, i) => sum + i.monto, 0);
      const totalPagos = cuadre.pagos.reduce((sum, p) => sum + p.monto, 0);
      
      return {
        zona: cuadre.zona,
        existe: true,
        cerrado: cuadre.cerrado,
        saldoInicial: cuadre.saldoInicial,
        saldoDisponible: cuadre.saldoDisponible,
        totalIngresos,
        totalPagos,
        ingresos: cuadre.ingresos,
        pagos: cuadre.pagos,
        enviadoCorreo: cuadre.enviadoCorreo || false,
        intentosCorreo: cuadre.intentosCorreo || 0,
      };
    });
    
    res.json({
      success: true,
      data: resumen,
    });
  } catch (error) {
    console.error('❌ Error getResumenDia:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};