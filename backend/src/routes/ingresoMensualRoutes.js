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

// ============================================
// GET /api/ingreso-mensual/manual?mes=X&anio=Y
// ============================================
router.get('/manual',
  authorize('Admin', 'Jefe'),
  controller.getManual
);

// ============================================
// PUT /api/ingreso-mensual/manual
// ============================================
router.put('/manual',
  authorize('Admin', 'Jefe'),
  controller.guardarManual
);

// ============================================
// POST /api/ingreso-mensual/resumen-html
// ============================================
router.post('/resumen-html',
  authorize('Admin', 'Jefe'),
  controller.generarResumenHTML
);

module.exports = router;
