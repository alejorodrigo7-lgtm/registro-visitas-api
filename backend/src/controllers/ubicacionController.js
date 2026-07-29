const Ubicacion = require('../models/Ubicacion');
const User = require('../models/User');
const mongoose = require('mongoose');

// ============================================
// 📍 GUARDAR UBICACIÓN
// ============================================
exports.guardarUbicacion = async (req, res) => {
  console.log('📍 1. guardarUbicacion - Inicio');
  console.log('📍 2. Body:', req.body);
  console.log('📍 3. Usuario:', req.user?.email);

  try {
    const { latitud, longitud, direccion, tipo, datos } = req.body;

    if (!latitud || !longitud) {
      return res.status(400).json({
        success: false,
        message: 'Latitud y longitud son obligatorias'
      });
    }

    const ubicacion = new Ubicacion({
      usuario: req.user._id,
      usuarioNombre: req.user.nombre,
      coordenadas: {
        type: 'Point',
        coordinates: [longitud, latitud],
      },
      direccion: direccion || '',
      tipo: tipo || 'registro',
      fecha: new Date(),
      datos: datos || {},
    });

    await ubicacion.save();
    console.log('✅ 4. Ubicación guardada:', ubicacion._id);

    res.status(201).json({
      success: true,
      message: 'Ubicación guardada correctamente',
      data: ubicacion,
    });

  } catch (error) {
    console.error('❌ Error en guardarUbicacion:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📍 OBTENER UBICACIONES POR FECHA Y USUARIO
// ============================================
exports.getUbicacionesPorFecha = async (req, res) => {
  console.log('📍 1. getUbicacionesPorFecha - Inicio');
  console.log('📍 2. Query:', req.query);

  try {
    const { fecha, usuarioId } = req.query;

    if (!fecha) {
      return res.status(400).json({
        success: false,
        message: 'La fecha es obligatoria'
      });
    }

    if (!usuarioId) {
      return res.status(400).json({
        success: false,
        message: 'El usuario es obligatorio'
      });
    }

    const usuario = await User.findById(usuarioId);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const fechaInicio = new Date(fecha);
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(fecha);
    fechaFin.setHours(23, 59, 59, 999);

    const ubicaciones = await Ubicacion.find({
      usuario: usuarioId,
      fecha: { $gte: fechaInicio, $lte: fechaFin },
    }).sort({ fecha: 1 });

    console.log(`✅ 3. Ubicaciones encontradas: ${ubicaciones.length}`);

    res.json({
      success: true,
      count: ubicaciones.length,
      data: ubicaciones,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
      },
    });

  } catch (error) {
    console.error('❌ Error en getUbicacionesPorFecha:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📍 OBTENER UBICACIONES EN TIEMPO REAL (CORREGIDO)
// ============================================
exports.getUbicacionesReales = async (req, res) => {
  console.log('📍 1. getUbicacionesReales - Inicio');

  try {
    const { usuarios } = req.query;

    if (!usuarios) {
      return res.status(400).json({
        success: false,
        message: 'Debes especificar al menos un usuario'
      });
    }

    const userIds = usuarios.split(',').map(id => id.trim());

    if (userIds.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'Máximo 5 usuarios permitidos'
      });
    }

    // ✅ Obtener última ubicación de cada usuario
    const ubicaciones = await Ubicacion.aggregate([
      { 
        $match: { 
          usuario: { $in: userIds.map(id => new mongoose.Types.ObjectId(id)) } 
        } 
      },
      { $sort: { fecha: -1 } },
      { 
        $group: { 
          _id: '$usuario', 
          ultimaUbicacion: { $first: '$$ROOT' } 
        } 
      }
    ]);

    console.log(`📍 2. Ubicaciones encontradas: ${ubicaciones.length}`);

    // ✅ Formatear respuesta para el frontend
    const resultado = [];
    for (const item of ubicaciones) {
      const user = await User.findById(item._id).select('nombre email rol');
      
      if (user) {
        const tiempoTranscurrido = new Date() - new Date(item.ultimaUbicacion.fecha);
        const activo = tiempoTranscurrido < 15 * 60 * 1000; // 15 minutos

        resultado.push({
          usuario: {
            _id: user._id,
            nombre: user.nombre,
            email: user.email,
            rol: user.rol
          },
          ultimaUbicacion: {
            coordenadas: item.ultimaUbicacion.coordenadas,
            fecha: item.ultimaUbicacion.fecha,
            direccion: item.ultimaUbicacion.direccion || ''
          },
          activo: activo
        });
      }
    }

    res.json({
      success: true,
      count: resultado.length,
      data: resultado
    });

  } catch (error) {
    console.error('❌ Error en getUbicacionesReales:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};