const IngresoOficina = require('../models/IngresoOficina');

// ============================================
// HELPERS DE FECHA (timezone Ecuador UTC-5)
// ============================================
const getRangoFechas = (fechaInicio, fechaFin) => {
  const inicio = new Date(fechaInicio + 'T00:00:00.000-05:00');
  const fin = new Date(fechaFin + 'T23:59:59.999-05:00');
  return { inicio, fin };
};

// ============================================
// @desc    Crear nuevo ingreso de oficina
// @route   POST /api/ingresos-oficinas
// @access  Admin, Jefe
// ============================================
const crearIngreso = async (req, res) => {
  try {
    const { tipo, mes, valor, nombreOficina, observacion, zonaSector } = req.body;

    if (!tipo || !['tola', 'otra'].includes(tipo)) {
      return res.status(400).json({ success: false, message: 'El tipo debe ser "tola" u "otra"' });
    }
    if (!mes || isNaN(Number(mes)) || Number(mes) < 1 || Number(mes) > 12) {
      return res.status(400).json({ success: false, message: 'El mes es obligatorio (1-12)' });
    }
    if (valor === undefined || valor === null || valor === '') {
      return res.status(400).json({ success: false, message: 'El valor es obligatorio' });
    }
    if (tipo === 'otra' && (!nombreOficina || nombreOficina.trim() === '')) {
      return res.status(400).json({ success: false, message: 'El nombre de la oficina es obligatorio para "Otras Oficinas"' });
    }
    const zonasValidas = ['TOLA', 'SAN JOSE DE CHILIBULO', 'MAGDALENA'];
    if (tipo === 'otra' && (!zonaSector || !zonasValidas.includes(zonaSector))) {
      return res.status(400).json({ success: false, message: 'La zona/sector es obligatoria para "Otras Oficinas" (TOLA, SAN JOSE DE CHILIBULO o MAGDALENA)' });
    }

    // Calcular fecha: dia 1 del mes elegido, año actual del sistema
    const anioActual = new Date().getFullYear();
    const mesNum = Number(mes);
    const fechaDate = new Date(anioActual, mesNum - 1, 1, 12, 0, 0);

    const nuevo = new IngresoOficina({
      tipo,
      fecha: fechaDate,
      valor: Number(valor),
      zonaSector: tipo === 'tola' ? 'TOLA' : zonaSector,
      nombreOficina: tipo === 'otra' ? nombreOficina.trim() : null,
      observacion: tipo === 'otra' ? (observacion || '').trim() : null,
      registradoPor: req.user._id,
      registradoPorNombre: req.user.nombre || req.user.email
    });

    await nuevo.save();

    console.log('[IngresoOficina] Creado: tipo=' + tipo + ' zona=' + (tipo === 'tola' ? 'TOLA' : zonaSector) + ' mes=' + mes + ' valor=' + valor + ' por ' + req.user.email);

    res.status(201).json({
      success: true,
      message: 'Ingreso registrado correctamente',
      data: nuevo
    });

  } catch (error) {
    console.error('Error creando ingreso oficina:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// @desc    Listar ingresos con filtro por fecha
// @route   GET /api/ingresos-oficinas
// @access  Admin, Jefe
// ============================================
const getIngresos = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, tipo } = req.query;
    const filtro = {};

    if (tipo && ['tola', 'otra'].includes(tipo)) {
      filtro.tipo = tipo;
    }

    if (fechaInicio && fechaFin) {
      const { inicio, fin } = getRangoFechas(fechaInicio, fechaFin);
      filtro.fecha = { $gte: inicio, $lte: fin };
    } else if (fechaInicio) {
      const { inicio, fin } = getRangoFechas(fechaInicio, fechaInicio);
      filtro.fecha = { $gte: inicio, $lte: fin };
    }

    const ingresos = await IngresoOficina.find(filtro)
      .populate('registradoPor', 'nombre email')
      .sort({ fecha: -1, createdAt: -1 })
      .limit(1000);

    const tola = ingresos.filter(i => i.tipo === 'tola');
    const otras = ingresos.filter(i => i.tipo === 'otra');
    const totalTola = tola.reduce((sum, i) => sum + i.valor, 0);
    const totalOtras = otras.reduce((sum, i) => sum + i.valor, 0);

    res.json({
      success: true,
      count: ingresos.length,
      data: ingresos,
      resumen: {
        tola: { cantidad: tola.length, total: totalTola },
        otras: { cantidad: otras.length, total: totalOtras },
        totalGeneral: totalTola + totalOtras
      }
    });

  } catch (error) {
    console.error('Error listando ingresos:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// @desc    Resumen por rango (totales separados)
// @route   GET /api/ingresos-oficinas/resumen
// @access  Admin, Jefe
// ============================================
const getResumen = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ success: false, message: 'Se requiere fechaInicio y fechaFin' });
    }

    const { inicio, fin } = getRangoFechas(fechaInicio, fechaFin);

    const resultado = await IngresoOficina.aggregate([
      { $match: { fecha: { $gte: inicio, $lte: fin } } },
      { $group: { _id: '$tipo', cantidad: { $sum: 1 }, total: { $sum: '$valor' } } }
    ]);

    const tola = resultado.find(r => r._id === 'tola') || { cantidad: 0, total: 0 };
    const otras = resultado.find(r => r._id === 'otra') || { cantidad: 0, total: 0 };

    res.json({
      success: true,
      rango: { fechaInicio, fechaFin },
      resumen: {
        tola: { cantidad: tola.cantidad, total: tola.total },
        otras: { cantidad: otras.cantidad, total: otras.total },
        totalGeneral: tola.total + otras.total
      }
    });

  } catch (error) {
    console.error('Error resumen ingresos:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// @desc    Actualizar (SOLO ADMIN)
// @route   PUT /api/ingresos-oficinas/:id
// ============================================
const actualizarIngreso = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, valor, nombreOficina, observacion } = req.body;

    const ingreso = await IngresoOficina.findById(id);
    if (!ingreso) {
      return res.status(404).json({ success: false, message: 'Ingreso no encontrado' });
    }

    if (fecha) {
      ingreso.fecha = new Date(fecha + 'T12:00:00.000-05:00');
    }
    if (valor !== undefined && valor !== null && valor !== '') {
      ingreso.valor = Number(valor);
    }
    if (ingreso.tipo === 'otra') {
      if (nombreOficina !== undefined) {
        if (!nombreOficina || nombreOficina.trim() === '') {
          return res.status(400).json({ success: false, message: 'El nombre de la oficina no puede estar vacio' });
        }
        ingreso.nombreOficina = nombreOficina.trim();
      }
      if (observacion !== undefined) {
        ingreso.observacion = (observacion || '').trim();
      }
    }

    ingreso.updatedAt = Date.now();
    await ingreso.save();

    console.log('[IngresoOficina] Actualizado: ' + id + ' por ' + req.user.email);

    res.json({ success: true, message: 'Ingreso actualizado correctamente', data: ingreso });

  } catch (error) {
    console.error('Error actualizando ingreso:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// @desc    Eliminar (SOLO ADMIN)
// @route   DELETE /api/ingresos-oficinas/:id
// ============================================
const eliminarIngreso = async (req, res) => {
  try {
    const { id } = req.params;

    const ingreso = await IngresoOficina.findById(id);
    if (!ingreso) {
      return res.status(404).json({ success: false, message: 'Ingreso no encontrado' });
    }

    await IngresoOficina.findByIdAndDelete(id);

    console.log('[IngresoOficina] Eliminado: ' + id + ' por ' + req.user.email);

    res.json({ success: true, message: 'Ingreso eliminado correctamente' });

  } catch (error) {
    console.error('Error eliminando ingreso:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  crearIngreso,
  getIngresos,
  getResumen,
  actualizarIngreso,
  eliminarIngreso
};