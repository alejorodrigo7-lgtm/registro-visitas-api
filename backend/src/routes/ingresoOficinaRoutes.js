const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const controller = require('../controllers/ingresoOficinaController');

// Todas las rutas requieren autenticacion
router.use(protect);

// ============================================
// RESUMEN (debe ir ANTES de /:id)
// ============================================
router.get('/resumen',
  authorize('Admin', 'Jefe'),
  controller.getResumen
);

// ============================================
// LISTAR (con filtros)
// ============================================
router.get('/',
  authorize('Admin', 'Jefe'),
  controller.getIngresos
);

// ============================================
// CREAR
// ============================================
router.post('/',
  authorize('Admin', 'Jefe'),
  controller.crearIngreso
);

// ============================================
// ACTUALIZAR (SOLO ADMIN)
// ============================================
router.put('/:id',
  authorize('Admin'),
  controller.actualizarIngreso
);

// ============================================
// ELIMINAR (SOLO ADMIN)
// ============================================
router.delete('/:id',
  authorize('Admin'),
  controller.eliminarIngreso
);

module.exports = router;
