const Caja = require('../models/Caja');
const Deposito = require('../models/Deposito');
const User = require('../models/User');
const CuadreCaja = require('../models/CuadreCaja');
const emailService = require('../services/emailService');

// ============================================
// 📊 FUNCIÓN AUXILIAR: Obtener saldo del día anterior
// ============================================
async function obtenerSaldoDiaAnterior(zona, fecha) {
  try {
    const fechaObj = new Date(fecha);
    const diaAnterior = new Date(fechaObj);
    diaAnterior.setDate(diaAnterior.getDate() - 1);
    const fechaAnterior = diaAnterior.toISOString().split('T')[0];
    
    console.log(`📊 Buscando saldo anterior para ${zona} en fecha ${fechaAnterior}`);
    
    // ✅ Buscar cualquier cuadre del día anterior (cerrado o no)
    const cuadreAnterior = await CuadreCaja.findOne({ 
      zona, 
      fecha: fechaAnterior 
    });
    
    // ✅ Si existe, devolver el saldo disponible
    if (cuadreAnterior) {
      console.log(`📊 Saldo del día anterior (${fechaAnterior}): ${cuadreAnterior.saldoDisponible}`);
      return cuadreAnterior.saldoDisponible;
    }
    
    // ✅ Si no existe en esa fecha, buscar el cuadre más reciente
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
    
    // ✅ SI NO EXISTE, CREAR UNO CON EL SALDO DEL DÍA ANTERIOR
    if (!cuadre) {
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
      });
      
      await cuadre.save();
      console.log(`📊 Cuadre CREADO para ${zona} - ${fecha} con saldo inicial: ${saldoAnterior}`);
    } else {
      console.log(`📊 Cuadre EXISTENTE para ${zona} - ${fecha}`);
      
      // ✅ VERIFICAR SI EL SALDO INICIAL ES CORRECTO
      const saldoAnterior = await obtenerSaldoDiaAnterior(zona, fecha);
      if (cuadre.saldoInicial !== saldoAnterior && saldoAnterior !== 0) {
        console.log(`📊 Actualizando saldo inicial de ${cuadre.saldoInicial} a ${saldoAnterior}`);
        cuadre.saldoInicial = saldoAnterior;
        cuadre.saldoDisponible = saldoAnterior;
        await cuadre.save();
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
    
    // ✅ Validar que el cuadre no esté cerrado
    if (cuadre.cerrado) {
      return res.status(400).json({
        success: false,
        message: 'Este cuadre ya está cerrado, no se pueden agregar más movimientos',
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

// Agregar pago a un cuadre
exports.agregarPago = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo, monto, descripcion } = req.body;
    
    console.log(`📊 Agregando pago al cuadre ${id}`);
    console.log(`📊 Motivo: ${motivo}, Monto: ${monto}`);
    
    // ✅ Validar que el motivo sea válido
    const motivosValidos = ['PAGO PROVEEDOR', 'PAGO PERSONAL', 'PAGO SERVICIOS', 'OTROS'];
    if (!motivosValidos.includes(motivo)) {
      return res.status(400).json({
        success: false,
        message: `Motivo inválido. Motivos válidos: ${motivosValidos.join(', ')}`,
      });
    }
    
    const cuadre = await CuadreCaja.findById(id);
    if (!cuadre) {
      return res.status(404).json({
        success: false,
        message: 'Cuadre no encontrado',
      });
    }
    
    // ✅ Validar que el cuadre no esté cerrado
    if (cuadre.cerrado) {
      return res.status(400).json({
        success: false,
        message: 'Este cuadre ya está cerrado, no se pueden agregar más movimientos',
      });
    }
    
    cuadre.pagos.push({
      motivo,
      monto,
      descripcion: descripcion || '',
      fecha: new Date(),
      usuario: req.user._id,
    });
    
    const totalIngresos = cuadre.ingresos.reduce((sum, i) => sum + i.monto, 0);
    const totalPagos = cuadre.pagos.reduce((sum, p) => sum + p.monto, 0);
    cuadre.saldoDisponible = cuadre.saldoInicial + totalIngresos - totalPagos;
    
    await cuadre.save();
    
    console.log(`✅ Pago agregado. Nuevo saldo: ${cuadre.saldoDisponible}`);
    
    res.json({
      success: true,
      message: 'Pago agregado correctamente',
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
    
    cuadre.cerrado = true;
    cuadre.fechaCierre = new Date();
    await cuadre.save();
    
    console.log(`✅ Cuadre cerrado para ${cuadre.zona} - ${cuadre.fecha}`);
    
    res.json({
      success: true,
      message: 'Cuadre cerrado correctamente',
      data: cuadre,
    });
  } catch (error) {
    console.error('❌ Error cerrarCuadre:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Enviar correo con resumen de las 3 zonas
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
    
    // ✅ Verificar si ya se envió el correo
    const yaEnviado = cuadres.some(c => c.enviadoCorreo === true);
    const intentos = cuadres.reduce((sum, c) => sum + (c.intentosCorreo || 0), 0);
    const nuevoIntento = intentos + 1;
    
    let mensajeAdicional = '';
    if (yaEnviado) {
      mensajeAdicional = ` (REENVÍO #${nuevoIntento})`;
    }
    
    // Generar resumen HTML
    let resumen = `
      <h2>📊 RESUMEN DE CAJA - ${fecha}${mensajeAdicional}</h2>
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
          <tr><td><strong>Total Pagos:</strong></td><td>-$${totalPagos.toFixed(2)}</td></tr>
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
        ${yaEnviado ? `⚠️ Este resumen ya fue enviado anteriormente (Intento #${nuevoIntento})` : '📧 Primer envío de este resumen'}
      </p>
    `;
    
    // Enviar correo
    await emailService.enviarCorreo({
      to: 'alejorodrigo7@gmail.com',
      subject: `📊 Resumen de Caja - ${fecha}${yaEnviado ? ` (RE-ENVÍO #${nuevoIntento})` : ''}`,
      html: resumen,
    });
    
    // ✅ Actualizar estado de envío en TODOS los cuadres
    for (const cuadre of cuadres) {
      cuadre.enviadoCorreo = true;
      cuadre.intentosCorreo = nuevoIntento;
      cuadre.ultimoEnvioCorreo = new Date();
      await cuadre.save();
    }
    
    console.log(`✅ Correo de resumen enviado para ${fecha} (Intento #${nuevoIntento})`);
    
    res.json({
      success: true,
      message: `Correo de resumen enviado correctamente${yaEnviado ? ` (Reenvío #${nuevoIntento})` : ''}`,
      data: { 
        totalGeneral, 
        fecha, 
        enviadoAnteriormente: yaEnviado,
        intento: nuevoIntento,
        reenvio: yaEnviado,
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