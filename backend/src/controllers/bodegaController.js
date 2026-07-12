// ============================================
// 📋 RESTAR MATERIAL DE BODEGA (CON ALERTAS PUSH A ADMIN/JEFE)
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

    // Verificar permiso
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
    // 📲 ENVIAR ALERTAS PUSH SOLO A ADMIN Y JEFE
    // ============================================
    if (materialesAlertas.length > 0) {
      try {
        const { Expo } = require('expo-server-sdk');
        const expo = new Expo();

        // Buscar solo Admin y Jefe con token push
        const usuariosNotificar = await User.find({
          rol: { $in: ['Admin', 'Jefe'] },
          expoPushToken: { $ne: null, $exists: true }
        });

        console.log(`📲 Admin/Jefe a notificar: ${usuariosNotificar.length}`);

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
          console.log(`📲 Alertas push enviadas a ${usuariosNotificar.length} administradores/jefes`);
        } else {
          console.log('⚠️ No hay Admin o Jefe con token push registrado');
        }

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