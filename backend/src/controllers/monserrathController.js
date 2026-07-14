const Monserrath = require('../models/Monserrath');
const Ubicacion = require('../models/Ubicacion');
const ExcelJS = require('exceljs');

// ============================================
// 📋 CREAR REGISTRO MONSERRATH
// ============================================
exports.crearRegistro = async (req, res) => {
  console.log('📝 1. CrearRegistro Monserrath - Inicio');
  console.log('📝 2. Body:', req.body);
  console.log('📝 3. Usuario:', req.user);

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
    if (!cliente) {
      return res.status(400).json({ success: false, message: 'El campo cliente es obligatorio' });
    }
    if (!identificador) {
      return res.status(400).json({ success: false, message: 'El campo identificador es obligatorio' });
    }
    if (!barrio) {
      return res.status(400).json({ success: false, message: 'El campo barrio es obligatorio' });
    }
    if (!direccion) {
      return res.status(400).json({ success: false, message: 'El campo dirección es obligatorio' });
    }
    if (!telefono) {
      return res.status(400).json({ success: false, message: 'El campo teléfono es obligatorio' });
    }
    if (!hora_llegada) {
      return res.status(400).json({ success: false, message: 'La hora de llegada es obligatoria' });
    }
    if (!hora_salida) {
      return res.status(400).json({ success: false, message: 'La hora de salida es obligatoria' });
    }

    // 🔥 CORREGIR: Usar la fecha enviada desde el frontend o la fecha actual en zona horaria local
    let fechaRegistro = fecha ? new Date(fecha) : new Date();
    
    // Ajustar a zona horaria de Ecuador si viene del frontend
    if (fecha) {
      // La fecha ya viene en formato ISO del frontend
      fechaRegistro = new Date(fecha);
    } else {
      // Usar fecha actual con zona horaria local
      const ahora = new Date();
      fechaRegistro = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
    }

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
      fecha: fechaRegistro,
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
    console.log('📅 Fecha guardada:', registro.fecha);

    // 📍 Guardar ubicación en colección Ubicacion
    if (ubicacion?.latitude && ubicacion?.longitude) {
      try {
        const ubicacionData = {
          usuario: req.user._id,
          usuarioNombre: req.user.nombre,
          coordenadas: {
            type: 'Point',
            coordinates: [ubicacion.longitude, ubicacion.latitude],
          },
          direccion: ubicacion.address || '',
          tipo: 'monserrath',
          fecha: new Date(),
          datos: {
            registroId: registro._id,
            cliente: cliente,
            tipo: 'Monserrath',
          },
        };
        const nuevaUbicacion = new Ubicacion(ubicacionData);
        await nuevaUbicacion.save();
        console.log(`📍 Ubicación guardada para registro ${registro._id}`);
      } catch (ubiError) {
        console.error('❌ Error al guardar ubicación:', ubiError);
      }
    }

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
      // 🔥 CORREGIR: Ajustar fechas correctamente
      const inicio = new Date(fechaInicio);
      inicio.setHours(0, 0, 0, 0);
      
      const fin = new Date(fechaFin);
      fin.setHours(23, 59, 59, 999);
      
      // Convertir a UTC para buscar en MongoDB
      query.fecha = { 
        $gte: new Date(inicio.getTime() - (5 * 60 * 60 * 1000)),
        $lte: new Date(fin.getTime() - (5 * 60 * 60 * 1000))
      };
      
      console.log(`📅 Buscando entre: ${inicio} y ${fin}`);
    }

    if (tecnico) query.tecnico = tecnico;
    if (estado) query.estado = estado;

    if (req.user.rol === 'Tecnico') {
      query.tecnico = req.user._id;
    }

    const registros = await Monserrath.find(query)
      .populate('tecnico', 'nombre email')
      .sort({ fecha: -1 });

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
// 📊 REPORTE MONSERRATH EN EXCEL (CORREGIDO)
// ============================================
exports.generarReporteExcel = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, tecnico, estado } = req.query;
    let query = {};

    console.log(`📅 Reporte Excel - Fecha Inicio: ${fechaInicio}, Fecha Fin: ${fechaFin}`);

    if (fechaInicio && fechaFin) {
      // 🔥 CORREGIR: Ajustar fechas a la zona horaria de Ecuador
      const inicio = new Date(fechaInicio);
      inicio.setHours(0, 0, 0, 0);
      
      const fin = new Date(fechaFin);
      fin.setHours(23, 59, 59, 999);
      
      // Ajustar para que MongoDB busque correctamente (UTC-5)
      query.fecha = { 
        $gte: new Date(inicio.getTime() - (5 * 60 * 60 * 1000)),
        $lte: new Date(fin.getTime() - (5 * 60 * 60 * 1000))
      };
      
      console.log(`📅 Buscando entre: ${inicio.toLocaleString('es-ES', { timeZone: 'America/Guayaquil' })}`);
      console.log(`📅 Query MongoDB: ${query.fecha.$gte} y ${query.fecha.$lte}`);
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
      // Formatear fecha para mostrar en Ecuador
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
    const totalRow = worksheet.addRow({});
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