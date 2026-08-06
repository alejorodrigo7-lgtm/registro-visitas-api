const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Notificacion = require('../models/Notificacion');
const User = require('../models/User');
const notificationService = require('../services/notificationService');
const pushService = require('../services/pushService');

// ============================================
// 📱 ENVIAR NOTIFICACIÓN PUSH (USANDO NOTIFICATION SERVICE)
// ============================================
router.post('/enviar', protect, async (req, res) => {
  try {
    const { titulo, mensaje, destinatarioId, tipo, data } = req.body;

    console.log('📱 Enviando notificación...');
    console.log('📱 Título:', titulo);
    console.log('📱 Mensaje:', mensaje);
    console.log('📱 Destinatario:', destinatarioId);

    // Verificar que el destinatario existe
    const destinatario = await User.findById(destinatarioId);
    if (!destinatario) {
      return res.status(404).json({
        success: false,
        message: 'Destinatario no encontrado'
      });
    }

    // Enviar notificación usando el servicio completo
    const resultado = await notificationService.enviarNotificacion(
      destinatarioId,
      titulo || '📢 Notificación RA²P',
      mensaje || 'Tienes una nueva notificación',
      data || {},
      tipo || 'sistema'
    );

    res.json({
      success: resultado.success,
      message: resultado.message,
      data: {
        notificacionId: resultado.notificacionId,
        dbSaved: resultado.dbSaved,
        pushEnviado: resultado.success
      }
    });

  } catch (error) {
    console.error('❌ Error enviando notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar notificación',
      error: error.message
    });
  }
});

// ============================================
// 📱 ENVIAR NOTIFICACIÓN A MÚLTIPLES USUARIOS
// ============================================
router.post('/enviar-multiple', protect, async (req, res) => {
  try {
    const { titulo, mensaje, destinatariosIds, tipo, data } = req.body;

    console.log('📱 Enviando notificación múltiple...');
    console.log('📱 Título:', titulo);
    console.log('📱 Destinatarios:', destinatariosIds?.length || 0);

    if (!destinatariosIds || destinatariosIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere al menos un destinatario'
      });
    }

    const resultado = await notificationService.enviarNotificacionMultiple(
      destinatariosIds,
      titulo || '📢 Notificación RA²P',
      mensaje || 'Tienes una nueva notificación',
      data || {},
      tipo || 'sistema'
    );

    res.json({
      success: resultado.success,
      message: resultado.message,
      data: {
        total: resultado.total,
        enviadas: resultado.enviadas,
        dbSaved: resultado.dbSaved
      }
    });

  } catch (error) {
    console.error('❌ Error enviando notificación múltiple:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar notificaciones',
      error: error.message
    });
  }
});

// ============================================
// 📱 ENVIAR NOTIFICACIÓN A TODOS
// ============================================
router.post('/enviar-todos', protect, async (req, res) => {
  try {
    const { titulo, mensaje, roles, tipo, data } = req.body;

    console.log('📱 Enviando notificación a todos...');
    console.log('📱 Título:', titulo);
    console.log('📱 Roles:', roles || 'todos');

    const resultado = await notificationService.enviarNotificacionATodos(
      titulo || '📢 Notificación RA²P',
      mensaje || 'Tienes una nueva notificación',
      data || {},
      roles || [],
      tipo || 'sistema'
    );

    res.json({
      success: resultado.success,
      message: resultado.message,
      data: {
        total: resultado.total,
        enviadas: resultado.enviadas,
        dbSaved: resultado.dbSaved
      }
    });

  } catch (error) {
    console.error('❌ Error enviando notificación a todos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar notificaciones',
      error: error.message
    });
  }
});

// ============================================
// 📱 PROBAR NOTIFICACIÓN PUSH (ENDPOINT DE PRUEBA)
// ============================================
router.post('/test', protect, async (req, res) => {
  try {
    const { titulo, mensaje } = req.body;

    console.log('🧪 Enviando notificación de prueba...');
    console.log('🧪 Usuario:', req.user._id);

    const resultado = await notificationService.enviarNotificacion(
      req.user._id,
      titulo || '🔔 Notificación de prueba',
      mensaje || '¡Las notificaciones push están funcionando correctamente!',
      { type: 'test', timestamp: new Date().toISOString() },
      'test'
    );

    res.json({
      success: resultado.success,
      message: resultado.success ? 'Notificación de prueba enviada' : 'Error enviando prueba',
      data: resultado
    });
  } catch (error) {
    console.error('❌ Error en prueba:', error);
    res.status(500).json({
      success: false,
      message: 'Error en prueba',
      error: error.message
    });
  }
});

// ============================================
// GUARDAR TOKEN PUSH
// ============================================
router.post('/guardar-token', protect, async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token es requerido'
      });
    }

    const result = await pushService.guardarTokenPush(req.user._id, token);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Token guardado correctamente',
        data: result.user
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    console.error('❌ Error guardando token:', error);
    res.status(500).json({
      success: false,
      message: 'Error guardando token',
      error: error.message
    });
  }
});

// ============================================
// OBTENER TODAS LAS NOTIFICACIONES DEL USUARIO
// ============================================
router.get('/', protect, async (req, res) => {
  try {
    const notificaciones = await Notificacion.find({ usuario: req.user._id })
      .sort({ fecha: -1 })
      .limit(100);

    res.json({
      success: true,
      count: notificaciones.length,
      data: notificaciones,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// OBTENER NOTIFICACIONES NO LEÍDAS
// ============================================
router.get('/no-leidas', protect, async (req, res) => {
  try {
    const notificaciones = await Notificacion.find({
      usuario: req.user._id,
      leida: false
    }).sort({ fecha: -1 });

    res.json({
      success: true,
      count: notificaciones.length,
      data: notificaciones,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// MARCAR NOTIFICACIÓN COMO LEÍDA
// ============================================
router.put('/:id/leer', protect, async (req, res) => {
  try {
    const notificacion = await Notificacion.findOne({
      _id: req.params.id,
      usuario: req.user._id,
    });

    if (!notificacion) {
      return res.status(404).json({ message: 'Notificación no encontrada' });
    }

    notificacion.leida = true;
    await notificacion.save();

    res.json({
      success: true,
      message: 'Notificación marcada como leída',
      data: notificacion,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// MARCAR TODAS COMO LEÍDAS
// ============================================
router.put('/leer-todas', protect, async (req, res) => {
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
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// ELIMINAR NOTIFICACIÓN
// ============================================
router.delete('/:id', protect, async (req, res) => {
  try {
    const notificacion = await Notificacion.findOne({
      _id: req.params.id,
      usuario: req.user._id,
    });

    if (!notificacion) {
      return res.status(404).json({ message: 'Notificación no encontrada' });
    }

    await notificacion.deleteOne();

    res.json({
      success: true,
      message: 'Notificación eliminada',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// CONTAR NOTIFICACIONES NO LEÍDAS
// ============================================
router.get('/no-leidas/count', protect, async (req, res) => {
  try {
    const count = await Notificacion.countDocuments({
      usuario: req.user._id,
      leida: false,
    });

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// ELIMINAR TODAS LAS NOTIFICACIONES
// ============================================
router.delete('/eliminar-todas', protect, async (req, res) => {
  try {
    await Notificacion.deleteMany({ usuario: req.user._id });

    res.json({
      success: true,
      message: 'Todas las notificaciones eliminadas',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;