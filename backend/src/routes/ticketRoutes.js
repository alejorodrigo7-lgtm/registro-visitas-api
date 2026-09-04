const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ticketController = require('../controllers/ticketController');

// ============================================
// 🌐 RUTAS PÚBLICAS (Sin autenticación)
// ============================================

// ✅ Crear ticket desde la web (cliente)
router.post('/web', ticketController.crearTicketWeb);

// ✅ Consultar ticket por ID (cliente)
router.get('/publico/:ticketId', ticketController.consultarTicketPublico);

// ✅ Consultar tickets por email (cliente)
router.get('/publico/cliente/:email', ticketController.consultarTicketsCliente);

// ============================================
// 🔒 RUTAS PROTEGIDAS
// ============================================

// ✅ Obtener estadísticas
router.get('/estadisticas', protect, ticketController.getEstadisticas);

// ✅ Obtener tickets para técnico (app móvil)
router.get('/para-tecnico', protect, ticketController.getTicketsParaTecnico);

// ✅ Obtener todos los tickets (web panel)
router.get('/', protect, ticketController.getTickets);

// ✅ Obtener tickets por estado
router.get('/estado/:estado', protect, ticketController.getTicketsByEstado);

// ✅ Obtener un ticket por ID
router.get('/:id', protect, ticketController.getTicketById);

// ✅ Asignar técnico (Admin/Jefe/Coordinador)
router.put('/:id/asignar', protect, authorize('Admin', 'Jefe', 'Coordinador'), ticketController.asignarTecnico);

// ✅ Actualizar ticket desde app (con historial)
router.put('/:id/app', protect, authorize('Admin', 'Jefe', 'Tecnico'), ticketController.actualizarTicketApp);

module.exports = router;