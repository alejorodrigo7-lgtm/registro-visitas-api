const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const servicioController = require('../controllers/servicioController');

router.use(protect);

// ============================================
// 📋 RUTAS PRINCIPALES
// ============================================

// 📋 Crear un servicio (Admin, Jefe, Coordinador)
router.post('/', authorize('Admin', 'Jefe', 'Coordinador'), servicioController.crearServicio);

// 📋 Obtener todos los servicios
router.get('/', servicioController.getServicios);

// 📋 Obtener servicios por estado (TOMADO, EJECUTADO, PENDIENTE)
router.get('/estado/:estado', servicioController.getServiciosByEstado);

// 🔍 Buscar servicios (por cliente, dirección, etc.)
router.get('/buscar', servicioController.buscarServicios);

// 📋 Obtener un servicio específico
router.get('/:id', servicioController.getServicio);

// ============================================
// 📋 RUTAS DE ACCIÓN
// ============================================

// 📋 Tomar un servicio (Coordinador/Admin)
router.post('/tomar', authorize('Admin', 'Coordinador'), servicioController.tomarServicio);

// ✅ ASIGNAR SERVICIO A TÉCNICO (NUEVA)
router.put('/:id/asignar', authorize('Admin', 'Jefe'), servicioController.asignarServicio);

// 🚀 Ejecutar un servicio (Técnico, Admin, Jefe)
router.put('/:id/ejecutar', authorize('Admin', 'Jefe', 'Tecnico'), servicioController.ejecutarServicio);

// ⏳ Marcar servicio como pendiente (Técnico, Admin, Jefe)
router.put('/:id/pendiente', authorize('Admin', 'Jefe', 'Tecnico'), servicioController.pendienteServicio);

// 💬 Retroalimentar un servicio
router.put('/:id/retroalimentar', authorize('Admin', 'Jefe', 'Tecnico'), servicioController.retroalimentarServicio);

// ❌ Rechazar servicio (NUEVA)
router.put('/:id/rechazar', authorize('Admin', 'Jefe', 'Coordinador'), servicioController.rechazarServicio);

// ============================================
// ✅ NUEVA RUTA: SERVICIOS TOMADOS POR TÉCNICO
// ============================================
// 📋 Obtener servicios TOMADOS asignados a un técnico específico
router.get('/tecnico/:tecnicoId/tomados', authorize('Admin', 'Jefe', 'Tecnico'), servicioController.getServiciosTomadosByTecnico);

module.exports = router;