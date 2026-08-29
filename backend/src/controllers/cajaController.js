const Caja = require('../models/Caja');
const Deposito = require('../models/Deposito');
const User = require('../models/User');
const CuadreCaja = require('../models/CuadreCaja');

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
// 📊 CUADRE DE CAJA - FUNCIONES
// ============================================

// Obtener cuadre por zona y fecha
exports.getCuadre = async (req, res) => {
  try {
    const { zona, fecha } = req.params;
    
    console.log(`📊 Buscando cuadre para ${zona} - ${fecha}`);
    
    const cuadre = await CuadreCaja.findOne({ zona, fecha });
    
    if (!cuadre) {
      return res.status(404).json({
        success: false,
        message: 'No hay cuadre para esta fecha y zona',
      });
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

// Crear cuadre del día
exports.crearCuadre = async (req, res) => {
  try {
    const { zona, fecha, saldoInicial } = req.body;
    
    console.log(`📊 Creando cuadre para ${zona} - ${fecha}`);
    console.log(`📊 Saldo inicial: ${saldoInicial}`);
    
    const existe = await CuadreCaja.findOne({ zona, fecha });
    if (existe) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un cuadre para esta fecha y zona',
      });
    }
    
    const cuadre = new CuadreCaja({
      zona,
      fecha,
      saldoInicial: saldoInicial || 0,
      saldoDisponible: saldoInicial || 0,
      creadoPor: req.user._id,
    });
    
    await cuadre.save();
    
    console.log(`✅ Cuadre creado: ${cuadre._id}`);
    
    res.status(201).json({
      success: true,
      message: 'Cuadre creado correctamente',
      data: cuadre,
    });
  } catch (error) {
    console.error('❌ Error crearCuadre:', error);
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
    
    const cuadre = await CuadreCaja.findById(id);
    if (!cuadre) {
      return res.status(404).json({
        success: false,
        message: 'Cuadre no encontrado',
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