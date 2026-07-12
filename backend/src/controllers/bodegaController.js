const Bodega = require('../models/Bodega');
const User = require('../models/User');

// ============================================
// 📋 CREAR BODEGA (SOLO ADMIN)
// ============================================
exports.crearBodega = async (req, res) => {
  console.log('🏗️ 1. CrearBodega - Inicio');
  console.log('🏗️ 2. Body recibido:', req.body);
  console.log('🏗️ 3. Usuario:', req.user?.email || req.user?.nombre);

  try {
    const { nombre, usuarioId } = req.body;

    if (!nombre) {
      console.log('❌ 4. Error: nombre faltante');
      return res.status(400).json({
        success: false,
        message: 'El nombre de la bodega es obligatorio'
      });
    }

    if (!usuarioId) {
      console.log('❌ 5. Error: usuarioId faltante');
      return res.status(400).json({
        success: false,
        message: 'Debes seleccionar un usuario'
      });
    }

    console.log('🔍 6. Verificando si la bodega existe:', nombre);
    const bodegaExistente = await Bodega.findOne({ nombre });
    if (bodegaExistente) {
      console.log('❌ 7. Bodega ya existe');
      return res.status(400).json({
        success: false,
        message: `Ya existe una bodega con el nombre "${nombre}"`
      });
    }

    console.log('👤 8. Verificando usuario:', usuarioId);
    const usuario = await User.findById(usuarioId);
    if (!usuario) {
      console.log('❌ 9. Usuario no encontrado');
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    console.log('✅ 10. Usuario encontrado:', usuario.nombre, usuario.email);

    console.log('🔍 11. Verificando si usuario ya tiene bodega');
    const bodegaUsuario = await Bodega.findOne({ usuario: usuarioId });
    if (bodegaUsuario) {
      console.log('❌ 12. Usuario ya tiene bodega:', bodegaUsuario.nombre);
      return res.status(400).json({
        success: false,
        message: `El usuario ${usuario.nombre} ya tiene una bodega asignada: "${bodegaUsuario.nombre}"`
      });
    }

    console.log('🏗️ 13. Creando bodega...');
    const bodega = new Bodega({
      nombre: nombre.trim(),
      usuario: usuarioId,
      usuarioNombre: usuario.nombre,
      creadoPor: req.user._id,
      materiales: [],
      estado: 'ACTIVA',
    });

    await bodega.save();
    console.log('✅ 14. Bodega creada con ID:', bodega._id);

    res.status(201).json({
      success: true,
      message: `Bodega "${nombre}" creada correctamente para ${usuario.nombre}`,
      data: bodega,
    });

  } catch (error) {
    console.log('❌ 15. Error en crearBodega:', error);
    console.log('❌ 16. Stack:', error.stack);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una bodega con ese nombre'
      });
    }

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
  console.log('📋 1. obtenerBodegas - Inicio');
  
  try {
    const { estado, usuario } = req.query;
    let query = {};

    if (estado) query.estado = estado;
    if (usuario) query.usuario = usuario;

    if (req.user.rol === 'Tecnico') {
      query.usuario = req.user._id;
    }

    console.log('📋 2. Query:', query);

    const bodegas = await Bodega.find(query)
      .populate('usuario', 'nombre email rol')
      .populate('creadoPor', 'nombre')
      .sort({ nombre: 1 });

    console.log('✅ 3. Bodegas encontradas:', bodegas.length);

    res.json({
      success: true,
      count: bodegas.length,
      data: bodegas,
    });

  } catch (error) {
    console.log('❌ Error en obtenerBodegas:', error);
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
// 📋 ASIGNAR MATERIAL A BODEGA (CORREGIDO - SIN UNIDAD)
// ============================================
exports.asignarMaterial = async (req, res) => {
  console.log('📦 1. asignarMaterial - Inicio');
  console.log('📦 2. ID Bodega:', req.params.id);
  console.log('📦 3. Materiales:', req.body);

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

    // 👈 PROCESAR MATERIALES SIN UNIDAD
    for (const material of materiales) {
      const { nombre, cantidad, minimo } = material;

      if (!nombre || cantidad === undefined) {
        console.log('⚠️ Material inválido:', material);
        continue;
      }

      const materialExistente = bodega.materiales.find(
        m => m.nombre.toLowerCase() === nombre.toLowerCase()
      );

      if (materialExistente) {
        // Actualizar cantidad sumando
        materialExistente.cantidad += cantidad;
        materialExistente.fechaActualizacion = new Date();
        if (minimo !== undefined) {
          materialExistente.minimo = minimo;
        }
        console.log(`✅ Material actualizado: ${nombre} -> ${materialExistente.cantidad}`);
      } else {
        // Agregar nuevo material
        bodega.materiales.push({
          nombre,
          cantidad,
          minimo: minimo || 0,
          fechaAsignacion: new Date(),
          fechaActualizacion: new Date(),
        });
        console.log(`✅ Material agregado: ${nombre} -> ${cantidad}`);
      }
    }

    await bodega.save();
    console.log('✅ Materiales guardados correctamente');

    res.json({
      success: true,
      message: 'Materiales asignados correctamente',
      data: bodega,
    });

  } catch (error) {
    console.error('❌ Error en asignarMaterial:', error);
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
  console.log('📉 1. restarMaterial - Inicio');
  console.log('📉 2. ID Bodega:', req.params.id);
  console.log('📉 3. Materiales a restar:', req.body);

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

      // Verificar si llegó al mínimo
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

    // ============================================
    // 📲 ENVIAR ALERTAS PUSH
    // ============================================
    if (materialesAlertas.length > 0 && bodega.usuario.expoPushToken) {
      try {
        const { Expo } = require('expo-server-sdk');
        const expo = new Expo();

        const messages = [{
          to: bodega.usuario.expoPushToken,
          sound: 'default',
          title: '⚠️ Alerta de Stock Bajo',
          body: `Materiales en nivel mínimo: ${materialesAlertas.map(m => m.nombre).join(', ')}`,
          data: { 
            type: 'stock_bajo',
            bodega: bodega.nombre,
            materiales: materialesAlertas,
          },
        }];

        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
          await expo.sendPushNotificationsAsync(chunk);
        }
        console.log('📲 Alertas push enviadas:', materialesAlertas.length);

      } catch (pushError) {
        console.error('❌ Error enviando alertas push:', pushError);
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
    console.error('❌ Error en restarMaterial:', error);
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