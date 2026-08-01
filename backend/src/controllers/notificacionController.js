const Notificacion = require('../models/Notificacion');
const User = require('../models/User');
const { enviarNotificacionPush } = require('../services/pushService');

// ============================================
// 📤 ENVIAR NOTIFICACIÓN
// ============================================
exports.enviarNotificacion = async (req, res) => {
  try {
    const { titulo, mensaje, destinatarioId, tipo, data } = req.body;

    console.log('📤 Enviando notificación:', { titulo, mensaje, destinatarioId, tipo });

    if (!titulo || !mensaje || !destinatarioId) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios: titulo, mensaje, destinatarioId'
      });
    }

    // Verificar que el destinatario existe
    const destinatario = await User.findById(destinatarioId);
    if (!destinatario) {
      console.log('❌ Destinatario no encontrado:', destinatarioId);
      return res.status(404).json({
        success: false,
        message: 'Destinatario no encontrado'
      });
    }

    // Crear notificación en la base de datos
    const notificacion = new Notificacion({
      titulo,
      mensaje,
      usuario: destinatarioId,
      destinatario: destinatarioId,
      tipo: tipo || 'GENERAL',
      data: data || {},
      leida: false,
    });

    await notificacion.save();
    console.log('✅ Notificación guardada en BD:', notificacion._id);

    // Enviar notificación push
    try {
      await enviarNotificacionPush(destinatarioId, {
        title: titulo,
        body: mensaje,
        data: data || {},
      });
      console.log('✅ Push enviado');
    } catch (pushError) {
      console.error('Error enviando push:', pushError);
    }

    res.status(201).json({
      success: true,
      message: 'Notificación enviada correctamente',
      data: notificacion,
    });
  } catch (error) {
    console.error('❌ Error en enviarNotificacion:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 OBTENER NOTIFICACIONES DEL USUARIO
// ============================================
exports.getNotificaciones = async (req, res) => {
  try {
    const notificaciones = await Notificacion.find({
      usuario: req.user._id
    }).sort({ createdAt: -1 });

    const noLeidas = notificaciones.filter(n => !n.leida).length;

    res.json({
      success: true,
      count: notificaciones.length,
      noLeidas: noLeidas,
      data: notificaciones,
    });
  } catch (error) {
    console.error('❌ Error en getNotificaciones:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 MARCAR COMO LEÍDA
// ============================================
exports.marcarComoLeida = async (req, res) => {
  try {
    const { id } = req.params;
    const notificacion = await Notificacion.findOne({
      _id: id,
      usuario: req.user._id
    });

    if (!notificacion) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }

    notificacion.leida = true;
    await notificacion.save();

    res.json({
      success: true,
      message: 'Notificación marcada como leída',
      data: notificacion,
    });
  } catch (error) {
    console.error('❌ Error en marcarComoLeida:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 MARCAR TODAS COMO LEÍDAS
// ============================================
exports.marcarTodasComoLeidas = async (req, res) => {
  try {
    await Notificacion.updateMany(
      { usuario: req.user._id, leida: false },
      { leida: true }
    );

    res.json({
      success: true,
      message: 'Todas las notificaciones marcadas como leídas',
    });
  } catch (error) {
    console.error('❌ Error en marcarTodasComoLeidas:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};