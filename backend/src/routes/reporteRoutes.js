const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const reporteController = require('../controllers/reporteController');

router.use(protect);

// Reportes - Solo Admin y Jefe pueden generar
router.use(authorize('Admin', 'Jefe'));

router.get('/visitas', reporteController.generarReporteVisitas);
router.get('/transferencias', reporteController.generarReporteTransferencias);
router.get('/servicios', reporteController.generarReporteServicios);
router.get('/cajas', reporteController.generarReporteCajas);
router.get('/depositos', reporteController.generarReporteDepositos);
router.get('/usuarios', reporteController.generarReporteUsuarios);

module.exports = router;