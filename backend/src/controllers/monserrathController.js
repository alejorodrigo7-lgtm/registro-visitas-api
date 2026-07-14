const Monserrath = require('../models/Monserrath');
const Ubicacion = require('../models/Ubicacion');
const ExcelJS = require('exceljs');

// ============================================
// 📋 FUNCIÓN PARA OBTENER FECHA LOCAL DE ECUADOR
// ============================================
const getFechaLocal = (date) => {
  if (!date) date = new Date();
  return new Date(date.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
};

const getFechaStr = (date) => {
  const d = getFechaLocal(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`; // "2026-07-14"
};

// ============================================
// 📋 CREAR REGISTRO MONSERRATH
// ============================================
exports.crearRegistro = async (req, res) => {
  console.log('📝 CrearRegistro Monserrath - Inicio');
  console.log('📝 Body:', req.body);

  try {
    const {
      cliente,
      identificador,
      barrio,
      direccion,
      telefono,
      ubicacion,
      fecha,
      hora_llegada,
      hora_salida,
      material_usado,
      observaciones,
    } = req.body;

    // Validar campos obligatorios
    if (!cliente) return res.status(400).json({ success: false, message: 'El campo cliente es obligatorio' });
    if (!identificador) return res.status(400).json({ success: false, message: 'El campo identificador es obligatorio' });
    if (!barrio) return res.status(400).json({ success: false, message: 'El campo barrio es obligatorio' });
    if (!direccion) return res.status(400).json({ success: false, message: 'El campo dirección es obligatorio' });
    if (!telefono) return res.status(400).json({ success: false, message: 'El campo teléfono es obligatorio' });
    if (!hora_llegada) return res.status(400).json({ success: false, message: 'La hora de llegada es obligatoria' });
    if (!hora_salida) return res.status(400).json({ success: false, message: 'La hora de salida es obligatoria' });

    // 🔥 OBTENER FECHA LOCAL DE ECUADOR
    const fechaLocal = fecha ? new Date(fecha) : new Date();
    const fechaObj = getFechaLocal(fechaLocal);
    const fechaStr = getFechaStr(fechaObj);
    
    console.log(`📅 Fecha local Ecuador: ${fechaObj.toLocaleString('es-ES', { timeZone: 'America/Guayaquil' })}`);
    console.log(`📅 FechaStr: ${fechaStr}`);

    const registro = new Monserrath({
      cliente,
      identificador,
      barrio,
      direccion,
      telefono,
      ubicacion: ubicacion?.latitude && ubicacion?.longitude ? {
        latitude: ubicacion.latitude,
        longitude: ubicacion.longitude,
        address: ubicacion.address || '',
      } : null,
      fecha: fechaObj,
      fechaStr: fechaStr,
      hora_llegada,
      hora_salida,
      material_usado: material_usado || '',
      observaciones: observaciones || '',
      tecnico: req.user._id,
      tecnicoNombre: req.user.nombre,
      estado: 'Pendiente',
    });

    await registro.save();
    console.log('✅ Registro guardado con ID:', registro._id);
    console.log('📅 Fecha guardada (local):', registro.fecha);
    console.log('📅 FechaStr guardada:', registro.fechaStr);

    res.status(201).json({
      success: true,
      message: 'Registro creado correctamente',
      data: registro,
    });

  } catch (error) {
    console.error('❌ Error en crearRegistro:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 📋 OBTENER TODOS LOS REGISTROS
// ============================================
exports.obtenerRegistros = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, tecnico, estado } = req.query;
    let query = {};

    if (fechaInicio && fechaFin) {
      // 🔥 BUSCAR POR FECHA STRING (YYYY-MM-DD)
      query.fechaStr = { $gte: fechaInicio, $lte: fechaFin };
      console.log(`📅 Buscando entre fechasStr: ${fechaInicio} y ${fechaFin}`);
    }

    if (tecnico) query.tecnico = tecnico;
    if (estado) query.estado = estado;

    if (req.user.rol === 'Tecnico') {
      query.tecnico = req.user._id;
    }

    const registros = await Monserrath.find(query)
      .populate('tecnico', 'nombre email')
      .sort({ fecha: -1 });

    console.log(`📋 ${registros.length} registros encontrados`);

    res.json({
      success: true,
      count: registros.length,
      data: registros,
    });

  } catch (error) {
    console.error('❌ Error en obtenerRegistros:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 📋 OBTENER UN REGISTRO POR ID
// ============================================
exports.obtenerRegistro = async (req, res) => {
  try {
    const registro = await Monserrath.findById(req.params.id)
      .populate('tecnico', 'nombre email');

    if (!registro) {
      return res.status(404).json({ success: false, message: 'Registro no encontrado' });
    }

    if (req.user.rol === 'Tecnico' && registro.tecnico._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para ver este registro' });
    }

    res.json({ success: true, data: registro });

  } catch (error) {
    console.error('❌ Error en obtenerRegistro:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 📋 ACTUALIZAR REGISTRO
// ============================================
exports.actualizarRegistro = async (req, res) => {
  try {
    const { estado, observaciones, material_usado } = req.body;
    const registro = await Monserrath.findById(req.params.id);

    if (!registro) {
      return res.status(404).json({ success: false, message: 'Registro no encontrado' });
    }

    if (req.user.rol === 'Tecnico' && registro.tecnico.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para actualizar este registro' });
    }

    if (estado) {
      const estadosValidos = ['Pendiente', 'Completado', 'Cancelado'];
      if (!estadosValidos.includes(estado)) {
        return res.status(400).json({ success: false, message: `Estado inválido. Debe ser: ${estadosValidos.join(', ')}` });
      }
      registro.estado = estado;
    }
    if (observaciones !== undefined) registro.observaciones = observaciones;
    if (material_usado !== undefined) registro.material_usado = material_usado;
    registro.updatedAt = new Date();

    await registro.save();

    res.json({
      success: true,
      message: 'Registro actualizado correctamente',
      data: registro,
    });

  } catch (error) {
    console.error('❌ Error en actualizarRegistro:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 🗑️ ELIMINAR REGISTRO
// ============================================
exports.eliminarRegistro = async (req, res) => {
  try {
    const registro = await Monserrath.findById(req.params.id);

    if (!registro) {
      return res.status(404).json({ success: false, message: 'Registro no encontrado' });
    }

    if (req.user.rol !== 'Admin' && req.user.rol !== 'Jefe') {
      return res.status(403).json({ success: false, message: 'No autorizado para eliminar este registro' });
    }

    await registro.deleteOne();

    res.json({ success: true, message: 'Registro eliminado correctamente' });

  } catch (error) {
    console.error('❌ Error en eliminarRegistro:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 📊 REPORTE MONSERRATH EN EXCEL
// ============================================
exports.generarReporteExcel = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, tecnico, estado } = req.query;
    let query = {};

    console.log(`📅 Reporte Excel - Fecha Inicio: ${fechaInicio}, Fecha Fin: ${fechaFin}`);

    if (fechaInicio && fechaFin) {
      // 🔥 BUSCAR POR FECHA STRING (YYYY-MM-DD)
      query.fechaStr = { $gte: fechaInicio, $lte: fechaFin };
      console.log(`📅 Buscando entre fechasStr: ${fechaInicio} y ${fechaFin}`);
    }

    if (tecnico) query.tecnico = tecnico;
    if (estado) query.estado = estado;

    if (req.user.rol === 'Tecnico') {
      query.tecnico = req.user._id;
    }

    const registros = await Monserrath.find(query)
      .populate('tecnico', 'nombre email')
      .sort({ fecha: -1 });

    console.log(`📋 ${registros.length} registros encontrados`);

    // Crear libro Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Monserrath');

    // Definir columnas
    worksheet.columns = [
      { header: '#', key: 'index', width: 8 },
      { header: 'Cliente', key: 'cliente', width: 30 },
      { header: 'Identificador', key: 'identificador', width: 20 },
      { header: 'Barrio', key: 'barrio', width: 20 },
      { header: 'Dirección', key: 'direccion', width: 35 },
      { header: 'Teléfono', key: 'telefono', width: 15 },
      { header: 'Fecha', key: 'fecha', width: 15 },
      { header: 'Hora Llegada', key: 'hora_llegada', width: 15 },
      { header: 'Hora Salida', key: 'hora_salida', width: 15 },
      { header: 'Material Usado', key: 'material_usado', width: 25 },
      { header: 'Observaciones', key: 'observaciones', width: 30 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Técnico', key: 'tecnico', width: 20 },
    ];

    // Estilo de encabezados
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF6C5CE7' },
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // Agregar datos
    registros.forEach((registro, index) => {
      // Formatear fecha local de Ecuador
      let fechaMostrar = '';
      if (registro.fecha) {
        const fechaObj = new Date(registro.fecha);
        fechaMostrar = fechaObj.toLocaleDateString('es-ES', { timeZone: 'America/Guayaquil' });
      }

      worksheet.addRow({
        index: index + 1,
        cliente: registro.cliente || '',
        identificador: registro.identificador || '',
        barrio: registro.barrio || '',
        direccion: registro.direccion || '',
        telefono: registro.telefono || '',
        fecha: fechaMostrar,
        hora_llegada: registro.hora_llegada || '',
        hora_salida: registro.hora_salida || '',
        material_usado: registro.material_usado || '',
        observaciones: registro.observaciones || '',
        estado: registro.estado || 'Pendiente',
        tecnico: registro.tecnicoNombre || '',
      });
    });

    // Agregar resumen al final
    worksheet.addRow({
      cliente: 'TOTAL REGISTROS',
      identificador: registros.length,
    });
    worksheet.getRow(worksheet.rowCount).font = { bold: true };

    // Generar archivo
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=monserrath_${fechaInicio || 'all'}_${fechaFin || 'all'}.xlsx`);
    res.send(buffer);

  } catch (error) {
    console.error('❌ Error en generarReporteExcel:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};