const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const authController = require('../controllers/authController');

// Rutas públicas
router.post('/register', protect, authorize('Admin'), authController.register);
router.post('/login', authController.login);

// ✅ RUTA PARA RESTABLECER CONTRASEÑA (PÚBLICA)
router.post('/reset-password', authController.resetPassword);

// ✅ RUTA PARA CAMBIAR CONTRASEÑA (PROTEGIDA) - NUEVA
router.post('/change-password', protect, authController.changePassword);

// ✅ RUTA DE USUARIOS - PERMITIR A COORDINADOR Y TECNICO
router.get('/usuarios', protect, authorize('Admin', 'Jefe', 'Coordinador', 'Tecnico'), authController.getUsuarios);

// Otras rutas
router.get('/jefes', protect, authController.getJefes);
router.get('/:id', protect, authController.getUsuario);
router.put('/:id', protect, authorize('Admin'), authController.updateUsuario);
router.delete('/:id', protect, authorize('Admin'), authController.deleteUsuario);
router.put('/:id/toggle', protect, authorize('Admin'), authController.toggleUsuario);
router.put('/:id/password', protect, authController.changePassword);
router.post('/registrar-push-token', protect, authController.registrarPushToken);

module.exports = router;