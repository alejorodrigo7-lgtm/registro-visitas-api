// src/routes/desconexionRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const desconexionController = require('../controllers/desconexionController');

router.use(protect);

// 📋 RUTAS PRINCIPALES
router.post('/', authorize('Admin', 'Jefe', 'Coordinador', 'Tecnico'), desconexionController.crear);
router.get('/', authorize('Admin', 'Jefe', 'Coordinador', 'Tecnico'), desconexionController.obtenerTodos);
router.get('/pendientes', authorize('Admin', 'Jefe', 'Coordinador', 'Tecnico'), desconexionController.obtenerPendientes);
router.get('/buscar', authorize('Admin', 'Jefe', 'Coordinador', 'Tecnico'), desconexionController.buscar);

// 📋 RUTAS DE ACCIÓN
router.put('/:id/realizado', authorize('Admin', 'Jefe', 'Coordinador', 'Tecnico'), desconexionController.realizar);
router.put('/:id/anulado', authorize('Admin', 'Jefe', 'Coordinador', 'Tecnico'), desconexionController.anular);

module.exports = router;