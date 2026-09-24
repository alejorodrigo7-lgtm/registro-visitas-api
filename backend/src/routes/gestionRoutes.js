// ✅ RUTAS DE GESTIÓN DE SERVICIOS
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const gestionController = require('../controllers/gestionController');

router.use(protect);

// ============================================
// 📋 RUTAS
// ============================================

// Listar técnicos activos (Admin/Jefe)
router.get('/tecnicos', authorize('Admin', 'Jefe'), gestionController.getTecnicos);

// Crear servicio de gestión (TODOS los roles)
router.post('/servicios', authorize('Admin', 'Jefe', 'Coordinador', 'Tecnico'), gestionController.crearServicioGestion);

// Listar servicios pendientes de revisión (Admin/Jefe)
router.get('/servicios/pendientes', authorize('Admin', 'Jefe'), gestionController.getServiciosGestionPendientes);

// Listar todos los servicios de gestión (Admin/Jefe)
router.get('/servicios', authorize('Admin', 'Jefe'), gestionController.getServiciosGestion);

// Marcar como RESUELTO (Admin/Jefe)
router.put('/servicios/:id/resuelto', authorize('Admin', 'Jefe'), gestionController.marcarResuelto);

// Asignar VISITA PRESENCIAL (Admin/Jefe)
router.put('/servicios/:id/visita', authorize('Admin', 'Jefe'), gestionController.asignarVisitaPresencial);

module.exports = router;