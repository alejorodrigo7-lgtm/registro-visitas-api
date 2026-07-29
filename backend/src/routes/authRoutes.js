const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const authController = require('../controllers/authController');

// ============================================
// RUTAS PÚBLICAS
// ============================================
router.post('/login', authController.login);

// ============================================
// RUTAS PROTEGIDAS - ESPECÍFICAS (DEBEN IR ANTES)
// ============================================
router.post('/register', protect, authorize('Admin'), authController.register);

// Ruta para restablecer contraseña
router.post('/reset-password', authController.resetPassword);

// Ruta para cambiar contraseña
router.post('/change-password', protect, authController.changePassword);

// Ruta para obtener todos los usuarios
router.get('/usuarios', protect, authorize('Admin', 'Jefe', 'Coordinador', 'Tecnico'), authController.getUsuarios);

// Ruta para obtener jefes
router.get('/jefes', protect, authController.getJefes);

// Ruta para eliminar usuario
router.delete('/usuarios/:id', protect, authorize('Admin'), authController.deleteUsuario);

// ✅ Ruta para activar/desactivar usuario (CORREGIDA)
router.put('/usuarios/:id/toggle', protect, authorize('Admin'), authController.toggleUsuario);

// Ruta para registrar push token
router.post('/registrar-push-token', protect, authController.registrarPushToken);

// ============================================
// RUTAS CON PARÁMETROS (DEBEN IR AL FINAL)
// ============================================
router.get('/:id', protect, authController.getUsuario);
router.put('/:id', protect, authorize('Admin'), authController.updateUsuario);
router.put('/:id/password', protect, authController.changePassword);

module.exports = router;