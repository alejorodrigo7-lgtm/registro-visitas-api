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
  changePassword,
  registrarPushToken
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

// ============================================
// RUTAS PÚBLICAS
// ============================================
router.post('/login', login);

// ============================================
// RUTAS PROTEGIDAS
// ============================================
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
// NOTIFICACIONES PUSH
// ============================================
router.post('/registrar-push-token', protect, registrarPushToken);

module.exports = router;