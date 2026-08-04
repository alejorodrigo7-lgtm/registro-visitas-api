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
// GUARDAR TOKEN PUSH
// ============================================
router.post('/guardar-token', protect, async (req, res) => {
  try {
    const { pushToken } = req.body;
    const userId = req.user._id;

    console.log(`📱 Guardando token para usuario: ${userId}`);
    console.log(`📱 Token: ${pushToken ? pushToken.substring(0, 30) + '...' : 'NULO'}`);

    if (!pushToken) {
      return res.status(400).json({
        success: false,
        message: 'Token push es requerido'
      });
    }

    // Verificar que sea un token válido de Expo
    try {
      const { Expo } = require('expo-server-sdk');
      if (!Expo.isExpoPushToken(pushToken)) {
        console.log(`❌ Token push inválido: ${pushToken.substring(0, 30)}...`);
        return res.status(400).json({
          success: false,
          message: 'Token push inválido'
        });
      }
    } catch (expoError) {
      console.log('⚠️ Expo SDK no disponible, guardando token sin validación');
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { pushToken: pushToken },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    console.log(`✅ Token push guardado para ${user.email}`);
    console.log(`📱 Token: ${pushToken.substring(0, 30)}...`);

    res.json({
      success: true,
      message: 'Token push guardado correctamente',
      data: { 
        pushToken: user.pushToken,
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

module.exports = router;
