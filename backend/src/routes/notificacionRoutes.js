const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Notificacion = require('../models/Notificacion');

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

module.exports = router;