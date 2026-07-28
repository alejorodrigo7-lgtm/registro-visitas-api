const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Notificacion = require('../models/Notificacion');
const User = require('../models/User');

// ============================================
// 📱 ENVIAR NOTIFICACIÓN PUSH (NUEVO ENDPOINT)
// ============================================
router.post('/enviar', protect, async (req, res) => {
  try {
    const { titulo, mensaje, destinatarioId, tipo, data } = req.body;
    
    console.log('📱 Enviando notificación...');
    console.log('📱 Titulo:', titulo);
    console.log('📱 Mensaje:', mensaje);
    console.log('📱 Destinatario:', destinatarioId);
    console.log('📱 Tipo:', tipo);
    console.log('📱 Data:', data);
    
    // Verificar que el destinatario existe
    const destinatario = await User.findById(destinatarioId);
    if (!destinatario) {
      return res.status(404).json({
        success: false,
        message: 'Destinatario no encontrado'
      });
    }
    
    // Guardar notificación en la base de datos
    const notificacion = new Notificacion({
      titulo: titulo,
      mensaje: mensaje,
      usuario: destinatarioId,
      tipo: tipo || 'SERVICIO',
      data: data || {},
      leida: false,
      fecha: new Date()
    });
    
    await notificacion.save();
    
    console.log('✅ Notificación guardada en BD:', notificacion._id);
    
    // 🔔 Aquí se integraría la lógica de Firebase Cloud Messaging (FCM)
    // para enviar notificaciones push en tiempo real
    // Por ahora solo se guarda en la base de datos
    
    res.json({
      success: true,
      message: 'Notificación enviada correctamente',
      data: notificacion
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