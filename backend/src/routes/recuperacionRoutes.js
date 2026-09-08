const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getCoordinadores,
  crearOrden,
  getOrdenes,
  getOrdenesPorEstado,
  ejecutarVisita,
  actualizarVisita,
  getOrdenById,
  marcarRetirado,
  anularOrden,
  reconectarEquipo
} = require('../controllers/recuperacionController');

// Todas las rutas requieren autenticación
router.use(protect);

// ============================================
// 📋 RUTAS DE RECUPERACIÓN CON CONTROL DE ROLES
// ============================================

// Obtener coordinadores - ADMIN, JEFE, COORDINADOR
router.get('/coordinadores', authorize('Admin', 'Jefe', 'Coordinador'), getCoordinadores);

// Crear orden - ADMIN, JEFE
router.post('/orden', authorize('Admin', 'Jefe'), crearOrden);

// Obtener órdenes por estado - ADMIN, JEFE, COORDINADOR
router.get('/ordenes/estado/:estado', authorize('Admin', 'Jefe', 'Coordinador'), getOrdenesPorEstado);

// Obtener órdenes con filtros - ADMIN, JEFE, COORDINADOR
router.get('/ordenes', authorize('Admin', 'Jefe', 'Coordinador'), getOrdenes);

// Obtener orden por ID - ADMIN, JEFE, COORDINADOR
router.get('/orden/:id', authorize('Admin', 'Jefe', 'Coordinador'), getOrdenById);

// Ejecutar visita - ADMIN, JEFE, COORDINADOR
router.put('/orden/:id/visita', authorize('Admin', 'Jefe', 'Coordinador'), ejecutarVisita);

// Actualizar visita - ADMIN, JEFE, COORDINADOR
router.put('/orden/:id/visita/:visitaId', authorize('Admin', 'Jefe', 'Coordinador'), actualizarVisita);

// Marcar como retirado - ADMIN, JEFE, COORDINADOR
router.put('/orden/:id/marcar-retirado', authorize('Admin', 'Jefe', 'Coordinador'), marcarRetirado);

// ANULAR ORDEN - ADMIN, JEFE
router.put('/orden/:id/anular', authorize('Admin', 'Jefe'), anularOrden);

// RECONECTAR EQUIPO - ADMIN, JEFE
router.put('/orden/:id/reconectar', authorize('Admin', 'Jefe'), reconectarEquipo);

// ✅ NUEVA: Obtener mis órdenes - SOLO TÉCNICO
router.get('/mis-ordenes', authorize('Tecnico'), async (req, res) => {
  // Implementar en el controlador
});

// ✅ NUEVA: Eliminar orden - SOLO ADMIN
router.delete('/orden/:id', authorize('Admin'), async (req, res) => {
  // Implementar en el controlador
});

module.exports = router;