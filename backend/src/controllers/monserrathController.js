const Monserrath = require('../models/Monserrath');
const Ubicacion = require('../models/Ubicacion');

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
      fecha: fecha || new Date(),
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
      const inicio = new Date(fechaInicio);
      inicio.setHours(0, 0, 0, 0);
      const fin = new Date(fechaFin);
      fin.setHours(23, 59, 59, 999);
      query.fecha = { $gte: inicio, $lte: fin };
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
// 📊 REPORTE MONSERRATH
// ============================================
exports.obtenerReporte = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, tecnico } = req.query;
    let query = {};

    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio);
      inicio.setHours(0, 0, 0, 0);
      const fin = new Date(fechaFin);
      fin.setHours(23, 59, 59, 999);
      query.fecha = { $gte: inicio, $lte: fin };
    }

    if (tecnico) query.tecnico = tecnico;

    if (req.user.rol === 'Tecnico') {
      query.tecnico = req.user._id;
    }

    const registros = await Monserrath.find(query)
      .populate('tecnico', 'nombre email')
      .sort({ fecha: -1 });

    // Estadísticas
    const total = registros.length;
    const completados = registros.filter(r => r.estado === 'Completado').length;
    const pendientes = registros.filter(r => r.estado === 'Pendiente').length;
    const cancelados = registros.filter(r => r.estado === 'Cancelado').length;

    res.json({
      success: true,
      data: registros,
      estadisticas: {
        total,
        completados,
        pendientes,
        cancelados,
      },
    });

  } catch (error) {
    console.error('❌ Error en obtenerReporte:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};