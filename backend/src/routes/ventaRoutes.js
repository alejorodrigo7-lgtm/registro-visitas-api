const express = require('express');
const router = express.Router();
const ventaController = require('../controllers/ventaController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// ============ VENTA NUEVA ============
router.post('/venta', auth, ventaController.crearVenta);
router.get('/ventas', auth, ventaController.obtenerVentas);
router.put('/venta/:id/ingreso', auth, roleCheck(['Admin', 'Jefe']), ventaController.actualizarIngresoVenta);

// ============ REPORTE DE VENTA ============
router.post('/reporte', auth, ventaController.crearReporteVenta);
router.get('/reportes', auth, ventaController.obtenerReportesVenta);

// ============ PAGO DE VENTA ============
router.put('/reporte/:id/pago', auth, roleCheck(['Admin', 'Jefe']), ventaController.registrarPago);
router.get('/ventas-pagadas', auth, ventaController.obtenerVentasPagadas);

module.exports = router;