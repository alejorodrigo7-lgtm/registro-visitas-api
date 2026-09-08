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

// 📋 Obtener todos los servicios - ADMIN, JEFE, COORDINADOR
router.get('/', authorize('Admin', 'Jefe', 'Coordinador'), servicioController.getServicios);

// 📋 Obtener servicios por estado (TOMADO, EJECUTADO, PENDIENTE)
router.get('/estado/:estado', authorize('Admin', 'Jefe', 'Coordinador'), servicioController.getServiciosByEstado);

// 🔍 Buscar servicios (por cliente, dirección, etc.)
router.get('/buscar', authorize('Admin', 'Jefe', 'Coordinador'), servicioController.buscarServicios);

// 📋 Obtener un servicio específico
router.get('/:id', authorize('Admin', 'Jefe', 'Coordinador'), servicioController.getServicio);

// ============================================
// 📋 RUTAS DE ACCIÓN
// ============================================

// 📋 Tomar un servicio (Coordinador/Admin)
router.post('/tomar', authorize('Admin', 'Jefe', 'Coordinador'), servicioController.tomarServicio);

// ✅ ASIGNAR SERVICIO A TÉCNICO
router.put('/:id/asignar', authorize('Admin', 'Jefe'), servicioController.asignarServicio);

// 🚀 Ejecutar un servicio (Técnico, Admin, Jefe)
router.put('/:id/ejecutar', authorize('Admin', 'Jefe', 'Tecnico'), servicioController.ejecutarServicio);

// ⏳ Marcar servicio como pendiente (Técnico, Admin, Jefe)
router.put('/:id/pendiente', authorize('Admin', 'Jefe', 'Tecnico'), servicioController.pendienteServicio);

// 💬 Retroalimentar un servicio
router.put('/:id/retroalimentar', authorize('Admin', 'Jefe', 'Tecnico'), servicioController.retroalimentarServicio);

// ❌ Rechazar servicio
router.put('/:id/rechazar', authorize('Admin', 'Jefe', 'Coordinador'), servicioController.rechazarServicio);

// ✅ NUEVA: Obtener servicios TOMADOS asignados a un técnico específico
router.get('/tecnico/:tecnicoId/tomados', authorize('Admin', 'Jefe', 'Tecnico'), servicioController.getServiciosTomadosByTecnico);

// ✅ NUEVA: Obtener mis servicios asignados (Técnico)
router.get('/mis-servicios', authorize('Tecnico'), servicioController.getMisServicios);

// ✅ NUEVA: Eliminar servicio (Admin, Jefe)
router.delete('/:id', authorize('Admin', 'Jefe'), servicioController.eliminarServicio);

module.exports = router;