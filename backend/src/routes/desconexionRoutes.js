const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const desconexionController = require('../controllers/desconexionController');

router.use(protect);

// ============================================
// 🔌 RUTAS DE DESCONEXIONES CON CONTROL DE ROLES
// ============================================

// 👤 OBTENER MIS DESCONEXIONES - SOLO TÉCNICO
// COMENTADO TEMPORALMENTE - FUNCIÓN NO IMPLEMENTADA EN EL CONTROLADOR
// router.get('/mis-desconexiones', authorize('Tecnico'), desconexionController.getMisDesconexiones);

// 📋 RUTAS PRINCIPALES
router.post('/', authorize('Admin', 'Jefe', 'Coordinador', 'Tecnico'), desconexionController.crear);
router.get('/', authorize('Admin', 'Jefe', 'Coordinador'), desconexionController.obtenerTodos);
router.get('/pendientes', authorize('Admin', 'Jefe', 'Coordinador'), desconexionController.obtenerPendientes);
router.get('/buscar', authorize('Admin', 'Jefe', 'Coordinador'), desconexionController.buscar);

// 📋 RUTAS DE ACCIÓN
router.put('/:id/realizado', authorize('Admin', 'Jefe', 'Coordinador', 'Tecnico'), desconexionController.realizar);
router.put('/:id/anulado', authorize('Admin', 'Jefe', 'Coordinador', 'Tecnico'), desconexionController.anular);

// 🗑️ ELIMINAR DESCONEXIÓN - ADMIN, JEFE
// COMENTADO TEMPORALMENTE - FUNCIÓN NO IMPLEMENTADA EN EL CONTROLADOR
// router.delete('/:id', authorize('Admin', 'Jefe'), desconexionController.eliminar);

module.exports = router;