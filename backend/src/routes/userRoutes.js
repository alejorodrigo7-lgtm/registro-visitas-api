const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// ============================================
// RUTAS DE USUARIOS
// ============================================

// Obtener todos los usuarios (solo Admin)
router.get('/', protect, authorize('Admin'), async (req, res) => {
  try {
    const usuarios = await User.find({}, '-password -__v');
    
    res.json({
      success: true,
      count: usuarios.length,
      data: usuarios
    });
  } catch (error) {
    console.error('❌ Error obteniendo usuarios:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// GUARDAR TOKEN PUSH (para el propio usuario)
// ============================================
router.post('/guardar-token', protect, async (req, res) => {
  try {
    const pushToken = req.body.pushToken || req.body.expoPushToken;
    const userId = req.user._id;

    console.log(`📱 Guardando token para usuario: ${userId}`);
    console.log(`📱 Token recibido: ${pushToken ? pushToken.substring(0, 30) + '...' : 'NULO'}`);

    if (!pushToken) {
      return res.status(400).json({
        success: false,
        message: 'Token push es requerido'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { expoPushToken: pushToken },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    console.log(`✅ Token push guardado para ${user.email}`);
    res.json({
      success: true,
      message: 'Token push guardado correctamente',
      data: { 
        expoPushToken: user.expoPushToken,
        email: user.email,
        nombre: user.nombre
      }
    });
  } catch (error) {
    console.error('❌ Error guardando token push:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// ADMIN: REGISTRAR TOKEN PARA OTRO USUARIO
// ============================================
router.post('/admin/registrar-token', protect, authorize('Admin'), async (req, res) => {
  try {
    const { userId, expoPushToken } = req.body;

    console.log(`👑 Admin registrando token para usuario: ${userId}`);
    console.log(`📱 Token: ${expoPushToken ? expoPushToken.substring(0, 30) + '...' : 'NULO'}`);

    if (!userId || !expoPushToken) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere userId y expoPushToken'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { expoPushToken: expoPushToken },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    console.log(`✅ Token registrado por admin para ${user.email}`);
    res.json({
      success: true,
      message: 'Token registrado correctamente',
      data: { 
        userId: user._id,
        email: user.email,
        nombre: user.nombre,
        expoPushToken: user.expoPushToken
      }
    });
  } catch (error) {
    console.error('❌ Error registrando token por admin:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
