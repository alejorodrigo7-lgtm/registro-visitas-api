const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const controller = require('../controllers/ingresoMensualController');

// Todas las rutas requieren autenticacion
router.use(protect);

// ============================================
// GET /api/ingreso-mensual?mes=X&anio=Y
// ============================================
router.get('/',
  authorize('Admin', 'Jefe'),
  controller.getIngresoMensual
);

module.exports = router;
