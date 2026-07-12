const Bodega = require('../models/Bodega');
const User = require('../models/User');

// ============================================
// 📋 CREAR BODEGA (SOLO ADMIN)
// ============================================
exports.crearBodega = async (req, res) => {
  try {
    const { nombre, usuarioId } = req.body;

    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la bodega es obligatorio'
      });
    }

    if (!usuarioId) {
      return res.status(400).json({
        success: false,
        message: 'Debes seleccionar un usuario'
      });
    }

    const bodegaExistente = await Bodega.findOne({ nombre });
    if (bodegaExistente) {
      return res.status(400).json({
        success: false,
        message: `Ya existe una bodega con el nombre "${nombre}"`
      });
    }

    const usuario = await User.findById(usuarioId);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const bodegaUsuario = await Bodega.findOne({ usuario: usuarioId });
    if (bodegaUsuario) {
      return res.status(400).json({
        success: false,
        message: `El usuario ${usuario.nombre} ya tiene una bodega asignada: "${bodegaUsuario.nombre}"`
      });
    }

    const bodega = new Bodega({
      nombre: nombre.trim(),
      usuario: usuarioId,
      usuarioNombre: usuario.nombre,
      creadoPor: req.user._id,
      materiales: [],
      estado: 'ACTIVA',
    });

    await bodega.save();

    res.status(201).json({
      success: true,
      message: `Bodega "${nombre}" creada correctamente para ${usuario.nombre}`,
      data: bodega,
    });

  } catch (error) {
    console.error('Error en crearBodega:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor',
    });
  }
};

// ============================================
// 📋 OBTENER TODAS LAS BODEGAS
// ============================================
exports.obtenerBodegas = async (req, res) => {
  try {
    const { estado, usuario } = req.query;
    let query = {};

    if (estado) query.estado = estado;
    if (usuario) query.usuario = usuario;

    if (req.user.rol === 'Tecnico') {
      query.usuario = req.user._id;
    }

    const bodegas = await Bodega.find(query)
      .populate('usuario', 'nombre email rol')
      .populate('creadoPor', 'nombre')
      .sort({ nombre: 1 });

    res.json({
      success: true,
      count: bodegas.length,
      data: bodegas,
    });

  } catch (error) {
    console.error('Error en obtenerBodegas:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 OBTENER UNA BODEGA POR ID
// ============================================
exports.obtenerBodega = async (req, res) => {
  try {
    const bodega = await Bodega.findById(req.params.id)
      .populate('usuario', 'nombre email rol')
      .populate('creadoPor', 'nombre');

    if (!bodega) {
      return res.status(404).json({
        success: false,
        message: 'Bodega no encontrada'
      });
    }

    if (req.user.rol === 'Tecnico' && bodega.usuario._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver esta bodega'
      });
    }

    res.json({
      success: true,
      data: bodega,
    });

  } catch (error) {
    console.error('Error en obtenerBodega:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 ASIGNAR MATERIAL A BODEGA
// ============================================
exports.asignarMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { materiales } = req.body;

    if (!materiales || !Array.isArray(materiales) || materiales.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debes enviar al menos un material'
      });
    }

    const bodega = await Bodega.findById(id);
    if (!bodega) {
      return res.status(404).json({
        success: false,
        message: 'Bodega no encontrada'
      });
    }

    if (!['Admin', 'Jefe'].includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para asignar materiales'
      });
    }

    for (const material of materiales) {
      const { nombre, cantidad, minimo } = material;

      if (!nombre || cantidad === undefined) {
        continue;
      }

      const materialExistente = bodega.materiales.find(
        m => m.nombre.toLowerCase() === nombre.toLowerCase()
      );

      if (materialExistente) {
        materialExistente.cantidad += cantidad;
        materialExistente.fechaActualizacion = new Date();
        if (minimo !== undefined) {
          materialExistente.minimo = minimo;
        }
      } else {
        bodega.materiales.push({
          nombre,
          cantidad,
          minimo: minimo || 0,
          fechaAsignacion: new Date(),
          fechaActualizacion: new Date(),
        });
      }
    }

    await bodega.save();

    res.json({
      success: true,
      message: 'Materiales asignados correctamente',
      data: bodega,
    });

  } catch (error) {
    console.error('Error en asignarMaterial:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 RESTAR MATERIAL DE BODEGA (CON ALERTAS PUSH)
// ============================================
exports.restarMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { materiales } = req.body;

    if (!materiales || !Array.isArray(materiales) || materiales.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debes enviar al menos un material a restar'
      });
    }

    const bodega = await Bodega.findById(id).populate('usuario', 'nombre email expoPushToken');
    if (!bodega) {
      return res.status(404).json({
        success: false,
        message: 'Bodega no encontrada'
      });
    }

    if (req.user.rol === 'Tecnico' && bodega.usuario._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para modificar esta bodega'
      });
    }

    const errores = [];
    const materialesAlertas = [];

    for (const material of materiales) {
      const { nombre, cantidad } = material;

      if (!nombre || !cantidad || cantidad <= 0) {
        errores.push(`Material ${nombre} inválido`);
        continue;
      }

      const materialExistente = bodega.materiales.find(
        m => m.nombre.toLowerCase() === nombre.toLowerCase()
      );

      if (!materialExistente) {
        errores.push(`Material ${nombre} no encontrado en la bodega`);
        continue;
      }

      if (materialExistente.cantidad < cantidad) {
        errores.push(`Stock insuficiente para ${nombre}. Disponible: ${materialExistente.cantidad}`);
        continue;
      }

      materialExistente.cantidad -= cantidad;
      materialExistente.fechaActualizacion = new Date();

      if (materialExistente.minimo > 0 && materialExistente.cantidad <= materialExistente.minimo) {
        materialesAlertas.push({
          nombre: materialExistente.nombre,
          cantidad: materialExistente.cantidad,
          minimo: materialExistente.minimo,
        });
      }
    }

    if (errores.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Errores al restar materiales',
        errores,
      });
    }

    await bodega.save();

    // 📲 ENVIAR ALERTAS PUSH A ADMIN Y JEFE
    if (materialesAlertas.length > 0) {
      try {
        const { Expo } = require('expo-server-sdk');
        const expo = new Expo();

        const usuariosNotificar = await User.find({
          rol: { $in: ['Admin', 'Jefe'] },
          expoPushToken: { $ne: null, $exists: true }
        });

        if (usuariosNotificar.length > 0) {
          const messages = usuariosNotificar.map(user => ({
            to: user.expoPushToken,
            sound: 'default',
            title: `⚠️ Alerta de Stock Bajo - ${bodega.nombre}`,
            body: `Materiales en nivel mínimo: ${materialesAlertas.map(m => m.nombre).join(', ')}`,
            data: {
              type: 'stock_bajo',
              bodega: bodega.nombre,
              materiales: materialesAlertas,
              usuarioAfectado: bodega.usuarioNombre,
            },
          }));

          const chunks = expo.chunkPushNotifications(messages);
          for (const chunk of chunks) {
            await expo.sendPushNotificationsAsync(chunk);
          }
        }

      } catch (pushError) {
        console.error('Error enviando alertas push:', pushError);
      }
    }

    res.json({
      success: true,
      message: 'Materiales restados correctamente',
      data: bodega,
      alertas: materialesAlertas.length > 0 ? {
        enviadas: true,
        materiales: materialesAlertas,
      } : null,
    });

  } catch (error) {
    console.error('Error en restarMaterial:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 ELIMINAR BODEGA (SOLO ADMIN)
// ============================================
exports.eliminarBodega = async (req, res) => {
  try {
    const { id } = req.params;

    const bodega = await Bodega.findById(id);
    if (!bodega) {
      return res.status(404).json({
        success: false,
        message: 'Bodega no encontrada'
      });
    }

    await bodega.deleteOne();

    res.json({
      success: true,
      message: 'Bodega eliminada correctamente',
    });

  } catch (error) {
    console.error('Error en eliminarBodega:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 CAMBIAR ESTADO DE BODEGA (SOLO ADMIN)
// ============================================
exports.cambiarEstadoBodega = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['ACTIVA', 'INACTIVA'].includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido. Debe ser ACTIVA o INACTIVA'
      });
    }

    const bodega = await Bodega.findById(id);
    if (!bodega) {
      return res.status(404).json({
        success: false,
        message: 'Bodega no encontrada'
      });
    }

    bodega.estado = estado;
    await bodega.save();

    res.json({
      success: true,
      message: `Bodega ${estado === 'ACTIVA' ? 'activada' : 'desactivada'} correctamente`,
      data: bodega,
    });

  } catch (error) {
    console.error('Error en cambiarEstadoBodega:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 EXPORTAR TODAS LAS FUNCIONES
// ============================================
module.exports = {
  crearBodega,
  obtenerBodegas,
  obtenerBodega,
  asignarMaterial,
  restarMaterial,
  eliminarBodega,
  cambiarEstadoBodega,
};