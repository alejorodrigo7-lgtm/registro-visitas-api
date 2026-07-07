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
// Registrar usuario - SOLO ADMIN
router.post('/register', protect, authorize('Admin'), register);

// ============================================
// GESTIÓN DE USUARIOS
// ============================================
// Obtener todos los usuarios - Admin y Jefe pueden ver
router.get('/usuarios', protect, authorize('Admin', 'Jefe'), getUsuarios);

// Obtener un usuario específico - Admin y Jefe pueden ver
router.get('/usuarios/:id', protect, authorize('Admin', 'Jefe'), getUsuario);

// Actualizar usuario - SOLO ADMIN
router.put('/usuarios/:id', protect, authorize('Admin'), updateUsuario);

// Eliminar usuario - SOLO ADMIN
router.delete('/usuarios/:id', protect, authorize('Admin'), deleteUsuario);

// Activar/Desactivar usuario - SOLO ADMIN
router.put('/usuarios/:id/toggle', protect, authorize('Admin'), toggleUsuarioActivo);

// Cambiar contraseña - Admin o propio usuario
router.put('/usuarios/:id/password', protect, changePassword);

// ============================================
// NOTIFICACIONES PUSH
// ============================================
// Registrar token push - Cualquier usuario autenticado
router.post('/registrar-push-token', protect, registrarPushToken);

module.exports = router;