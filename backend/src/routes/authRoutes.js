const express = require('express');
const router = express.Router();
const { 
  login, 
  register, 
  getUsuarios,
  getUsuario,
  updateUsuario,
  deleteUsuario,
  toggleUsuarioActivo,
  changePassword
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');

// ============================================
// RUTAS PÚBLICAS
// ============================================
router.post('/login', login);

// ============================================
// RUTAS PROTEGIDAS
// ============================================
// Registrar usuario - SOLO ADMIN
router.post('/register', protect, authorize('Admin'), register);

// ============================================
// GESTIÓN DE USUARIOS
// ============================================
router.get('/usuarios', protect, authorize('Admin', 'Jefe'), getUsuarios);
router.get('/usuarios/:id', protect, authorize('Admin', 'Jefe'), getUsuario);
router.put('/usuarios/:id', protect, authorize('Admin'), updateUsuario);
router.delete('/usuarios/:id', protect, authorize('Admin'), deleteUsuario);
router.put('/usuarios/:id/toggle', protect, authorize('Admin'), toggleUsuarioActivo);
router.put('/usuarios/:id/password', protect, changePassword);

// ============================================
// NOTIFICACIONES PUSH - RUTA SIMPLIFICADA
// ============================================
router.post('/registrar-push-token', protect, async (req, res) => {
  try {
    const { userId, token } = req.body;
    
    console.log('📡 Registrando token push para usuario:', userId);
    console.log('📡 Token:', token);
    
    if (!userId || !token) {
      return res.status(400).json({ 
        success: false, 
        message: 'UserId y token son requeridos' 
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }
    
    user.expoPushToken = token;
    await user.save();
    
    console.log(`✅ Token push registrado para ${user.email}`);
    
    res.json({
      success: true,
      message: 'Token push registrado correctamente',
      user: {
        id: user._id,
        email: user.email,
        rol: user.rol,
        expoPushToken: user.expoPushToken,
      },
    });
  } catch (error) {
    console.error('❌ Error registrando token push:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;