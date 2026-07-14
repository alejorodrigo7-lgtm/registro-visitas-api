const PedirAusencia = require('../models/PedirAusencia');
const ExcelJS = require('exceljs');

// ============================================
// 📋 FUNCIÓN PARA OBTENER FECHA LOCAL
// ============================================
const getFechaStr = (date) => {
  if (!date) date = new Date();
  const d = new Date(date.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ============================================
// 📋 CREAR SOLICITUD DE AUSENCIA
// ============================================
exports.crearSolicitud = async (req, res) => {
  try {
    const { tipo, motivo, observaciones, documento, documentoNombre } = req.body;

    if (!tipo) {
      return res.status(400).json({ success: false, message: 'El tipo es obligatorio' });
    }
    if (!motivo) {
      return res.status(400).json({ success: false, message: 'El motivo es obligatorio' });
    }

    const fechaStr = getFechaStr();

    const solicitud = new PedirAusencia({
      usuario: req.user._id,
      usuarioNombre: req.user.nombre,
      usuarioRol: req.user.rol,
      fecha: new Date(),
      fechaStr: fechaStr,
      tipo: tipo,
      motivo: motivo,
      observaciones: observaciones || '',
      documento: documento || null,
      documentoNombre: documentoNombre || null,
      estado: 'Pendiente',
    });

    await solicitud.save();

    res.status(201).json({
      success: true,
      message: 'Solicitud de ausencia creada correctamente',
      data: solicitud,
    });

  } catch (error) {
    console.error('❌ Error en crearSolicitud:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 📋 OBTENER SOLICITUDES DEL USUARIO
// ============================================
exports.obtenerSolicitudesUsuario = async (req, res) => {
  try {
    const solicitudes = await PedirAusencia.find({
      usuario: req.user._id,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: solicitudes.length,
      data: solicitudes,
    });

  } catch (error) {
    console.error('❌ Error en obtenerSolicitudesUsuario:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 📋 OBTENER SOLICITUDES PENDIENTES (Admin/Jefe)
// ============================================
exports.obtenerSolicitudesPendientes = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, usuario } = req.query;
    let query = { estado: 'Pendiente' };

    if (fechaInicio && fechaFin) {
      query.fechaStr = { $gte: fechaInicio, $lte: fechaFin };
    }

    if (usuario) query.usuario = usuario;

    const solicitudes = await PedirAusencia.find(query)
      .populate('usuario', 'nombre email rol')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: solicitudes.length,
      data: solicitudes,
    });

  } catch (error) {
    console.error('❌ Error en obtenerSolicitudesPendientes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 📋 OBTENER TODAS LAS SOLICITUDES (Admin/Jefe)
// ============================================
exports.obtenerTodasSolicitudes = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, usuario, estado } = req.query;
    let query = {};

    if (fechaInicio && fechaFin) {
      query.fechaStr = { $gte: fechaInicio, $lte: fechaFin };
    }

    if (usuario) query.usuario = usuario;
    if (estado) query.estado = estado;

    const solicitudes = await PedirAusencia.find(query)
      .populate('usuario', 'nombre email rol')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: solicitudes.length,
      data: solicitudes,
    });

  } catch (error) {
    console.error('❌ Error en obtenerTodasSolicitudes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 📋 APROBAR/RECHAZAR SOLICITUD (Admin/Jefe)
// ============================================
exports.actualizarSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, observaciones } = req.body;

    if (!['Aprobado', 'Rechazado'].includes(estado)) {
      return res.status(400).json({ success: false, message: 'Estado inválido' });
    }

    const solicitud = await PedirAusencia.findById(id);

    if (!solicitud) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    }

    solicitud.estado = estado;
    solicitud.aprobadoPor = req.user._id;
    solicitud.aprobadoPorNombre = req.user.nombre;
    solicitud.fechaAprobacion = new Date();

    if (observaciones) {
      solicitud.observaciones = solicitud.observaciones + `\n\n📝 Respuesta de ${req.user.nombre}: ${observaciones}`;
    }

    await solicitud.save();

    res.json({
      success: true,
      message: `Solicitud ${estado.toLowerCase()} correctamente`,
      data: solicitud,
    });

  } catch (error) {
    console.error('❌ Error en actualizarSolicitud:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 📋 REPORTE AUSENCIAS EXCEL
// ============================================
exports.generarReporteExcel = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, usuario, estado } = req.query;
    let query = {};

    if (fechaInicio && fechaFin) {
      query.fechaStr = { $gte: fechaInicio, $lte: fechaFin };
    }

    if (usuario) query.usuario = usuario;
    if (estado) query.estado = estado;

    const solicitudes = await PedirAusencia.find(query)
      .populate('usuario', 'nombre email rol')
      .sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Ausencias');

    worksheet.columns = [
      { header: '#', key: 'index', width: 8 },
      { header: 'Usuario', key: 'usuario', width: 25 },
      { header: 'Rol', key: 'rol', width: 15 },
      { header: 'Fecha', key: 'fecha', width: 15 },
      { header: 'Tipo', key: 'tipo', width: 20 },
      { header: 'Motivo', key: 'motivo', width: 35 },
      { header: 'Observaciones', key: 'observaciones', width: 35 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Aprobado Por', key: 'aprobadoPor', width: 20 },
      { header: 'Fecha Aprobación', key: 'fechaAprobacion', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF6B6B' },
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    solicitudes.forEach((item, index) => {
      let fechaAprob = '';
      if (item.fechaAprobacion) {
        const d = new Date(item.fechaAprobacion);
        fechaAprob = d.toLocaleDateString('es-ES', { timeZone: 'America/Guayaquil' }) + ' ' +
                     d.toLocaleTimeString('es-ES', { timeZone: 'America/Guayaquil', hour: '2-digit', minute: '2-digit' });
      }

      worksheet.addRow({
        index: index + 1,
        usuario: item.usuario?.nombre || '',
        rol: item.usuario?.rol || '',
        fecha: item.fechaStr || '',
        tipo: item.tipo || '',
        motivo: item.motivo || '',
        observaciones: item.observaciones || '',
        estado: item.estado || '',
        aprobadoPor: item.aprobadoPorNombre || '',
        fechaAprobacion: fechaAprob,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=ausencias_${fechaInicio || 'all'}_${fechaFin || 'all'}.xlsx`);
    res.send(buffer);

  } catch (error) {
    console.error('❌ Error en generarReporteExcel:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};