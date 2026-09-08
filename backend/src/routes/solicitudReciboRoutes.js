const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getSolicitudes,
  crearSolicitud,
  aprobarSolicitud,
  denegarSolicitud,
  buscarClientes
} = require('../controllers/solicitudReciboController');

// Todas las rutas requieren autenticación
router.use(protect);

// ============================================
// 📄 RUTAS DE SOLICITUDES DE RECIBOS CON CONTROL DE ROLES
// ============================================

// ✅ NUEVA: Obtener mis solicitudes - SOLO TÉCNICO
router.get('/mis-solicitudes', authorize('Tecnico'), async (req, res) => {
  // Implementar en el controlador
});

// Buscar clientes - ADMIN, JEFE, COORDINADOR, TECNICO
router.get('/clientes/buscar', authorize('Admin', 'Jefe', 'Coordinador', 'Tecnico'), buscarClientes);

// Obtener todas las solicitudes - ADMIN, JEFE, COORDINADOR
router.get('/', authorize('Admin', 'Jefe', 'Coordinador'), getSolicitudes);

// Crear solicitud - ADMIN, JEFE, COORDINADOR, TECNICO
router.post('/', authorize('Admin', 'Jefe', 'Coordinador', 'Tecnico'), crearSolicitud);

// Aprobar solicitud - ADMIN, JEFE
router.put('/:id/aprobar', authorize('Admin', 'Jefe'), aprobarSolicitud);

// Denegar solicitud - ADMIN, JEFE
router.put('/:id/denegar', authorize('Admin', 'Jefe'), denegarSolicitud);

// ✅ NUEVA: Eliminar solicitud - ADMIN, JEFE
router.delete('/:id', authorize('Admin', 'Jefe'), async (req, res) => {
  // Implementar en el controlador
});

module.exports = router;