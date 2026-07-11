const Visita = require('../models/Visita');

// ============================================
// 📋 CREAR VISITA
// ============================================
exports.crearVisita = async (req, res) => {
  console.log('📝 1. CrearVisita - Inicio');
  console.log('📝 2. Body recibido:', req.body);
  console.log('📝 3. Usuario:', req.user);

  try {
    const {
      cliente,
      identificador,
      barrio,
      direccion,
      telefono,
      tipo,
      monto,
      observaciones,
      foto,
      tecnico,
      ubicacion,
    } = req.body;

    // Validar campos obligatorios
    if (!cliente) {
      return res.status(400).json({
        success: false,
        message: 'El campo cliente es obligatorio'
      });
    }
    if (!identificador) {
      return res.status(400).json({
        success: false,
        message: 'El campo identificador es obligatorio'
      });
    }
    if (!barrio) {
      return res.status(400).json({
        success: false,
        message: 'El campo barrio es obligatorio'
      });
    }
    if (!direccion) {
      return res.status(400).json({
        success: false,
        message: 'El campo dirección es obligatorio'
      });
    }
    if (!telefono) {
      return res.status(400).json({
        success: false,
        message: 'El campo teléfono es obligatorio'
      });
    }
    if (!observaciones) {
      return res.status(400).json({
        success: false,
        message: 'El campo observaciones es obligatorio'
      });
    }
    if (!tipo) {
      return res.status(400).json({
        success: false,
        message: 'El campo tipo es obligatorio'
      });
    }

    // Validar tipo de visita
    const tiposValidos = ['Visita', 'Cobro', 'Instalación', 'Mantenimiento', 'Revisión', 'Otros', 'Servicio Técnico'];
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({
        success: false,
        message: `Tipo de visita inválido. Debe ser uno de: ${tiposValidos.join(', ')}`
      });
    }

    // Validar monto para cobro
    if (tipo === 'Cobro') {
      if (!monto || monto <= 0) {
        return res.status(400).json({
          success: false,
          message: 'El monto es obligatorio y debe ser mayor a 0 para cobros'
        });
      }
    }

    // Crear visita
    const tecnicoId = tecnico || req.user._id;

    const visitaData = {
      cliente,
      identificador,
      barrio,
      direccion,
      telefono,
      tipo,
      monto: monto || 0,
      observaciones,
      foto: foto || '',
      estado: 'Pendiente',
      tecnico: tecnicoId,
      fecha: new Date(),
    };

    // Agregar ubicación si existe
    if (ubicacion && ubicacion.latitude && ubicacion.longitude) {
      visitaData.ubicacion = {
        latitude: ubicacion.latitude,
        longitude: ubicacion.longitude,
        address: ubicacion.address || '',
        registradaEn: new Date(),
      };
    }

    const visita = new Visita(visitaData);
    await visita.save();

    console.log('✅ Visita guardada con ID:', visita._id);

    res.status(201).json({
      success: true,
      message: 'Visita registrada correctamente',
      data: visita,
    });

  } catch (error) {
    console.error('❌ Error en crearVisita:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor',
    });
  }
};

// ============================================
// 📋 OBTENER TODAS LAS VISITAS
// ============================================
exports.obtenerVisitas = async (req, res) => {
  try {
    const { estado, tecnico, fechaInicio, fechaFin } = req.query;
    let query = {};

    if (estado) query.estado = estado;
    if (tecnico) query.tecnico = tecnico;

    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio);
      inicio.setHours(0, 0, 0, 0);
      const fin = new Date(fechaFin);
      fin.setHours(23, 59, 59, 999);
      query.fecha = { $gte: inicio, $lte: fin };
    }

    if (req.user.rol === 'Tecnico') {
      query.tecnico = req.user._id;
    }

    const visitas = await Visita.find(query)
      .populate('tecnico', 'nombre email')
      .sort({ fecha: -1 });

    res.json({
      success: true,
      count: visitas.length,
      data: visitas,
    });

  } catch (error) {
    console.error('❌ Error en obtenerVisitas:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 OBTENER UNA VISITA POR ID
// ============================================
exports.obtenerVisita = async (req, res) => {
  try {
    const visita = await Visita.findById(req.params.id)
      .populate('tecnico', 'nombre email');

    if (!visita) {
      return res.status(404).json({
        success: false,
        message: 'Visita no encontrada',
      });
    }

    if (req.user.rol === 'Tecnico' && visita.tecnico._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver esta visita',
      });
    }

    res.json({
      success: true,
      data: visita,
    });

  } catch (error) {
    console.error('❌ Error en obtenerVisita:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 ACTUALIZAR VISITA
// ============================================
exports.actualizarVisita = async (req, res) => {
  try {
    const { estado, observaciones } = req.body;
    const visita = await Visita.findById(req.params.id);

    if (!visita) {
      return res.status(404).json({
        success: false,
        message: 'Visita no encontrada',
      });
    }

    if (req.user.rol === 'Tecnico' && visita.tecnico.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para actualizar esta visita',
      });
    }

    if (estado) {
      const estadosValidos = ['Completada', 'Pendiente', 'Cancelada'];
      if (!estadosValidos.includes(estado)) {
        return res.status(400).json({
          success: false,
          message: `Estado inválido. Debe ser: ${estadosValidos.join(', ')}`
        });
      }
      visita.estado = estado;
    }
    if (observaciones !== undefined) {
      visita.observaciones = observaciones;
    }
    visita.updatedAt = new Date();

    await visita.save();

    res.json({
      success: true,
      message: 'Visita actualizada correctamente',
      data: visita,
    });

  } catch (error) {
    console.error('❌ Error en actualizarVisita:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 ELIMINAR VISITA (Solo Admin/Jefe)
// ============================================
exports.eliminarVisita = async (req, res) => {
  try {
    const visita = await Visita.findById(req.params.id);

    if (!visita) {
      return res.status(404).json({
        success: false,
        message: 'Visita no encontrada',
      });
    }

    await visita.deleteOne();

    res.json({
      success: true,
      message: 'Visita eliminada correctamente',
    });

  } catch (error) {
    console.error('❌ Error en eliminarVisita:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};