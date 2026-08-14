const express = require('express');
const router = express.Router();
const ventaController = require('../controllers/ventaController');
const auth = require('../middleware/auth');

// Función de verificación de roles
const checkRole = (roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'No autenticado' });
      }
      if (!req.user.rol) {
        return res.status(403).json({ success: false, message: 'Usuario sin rol' });
      }
      if (!roles.includes(req.user.rol)) {
        return res.status(403).json({ success: false, message: 'Acceso denegado' });
      }
      next();
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error interno' });
    }
  };
};

// ============ VENTA NUEVA ============
router.post('/venta', auth, ventaController.crearVenta);
router.get('/ventas', auth, ventaController.obtenerVentas);
router.put('/venta/:id/ingreso', auth, checkRole(['Admin', 'Jefe']), ventaController.actualizarIngresoVenta);

// ============ REPORTE DE VENTA ============
router.post('/reporte', auth, ventaController.crearReporteVenta);
router.get('/reportes', auth, ventaController.obtenerReportesVenta);

// ============ PAGO DE VENTA ============
router.put('/reporte/:id/pago', auth, checkRole(['Admin', 'Jefe']), ventaController.registrarPago);
router.get('/ventas-pagadas', auth, ventaController.obtenerVentasPagadas);

module.exports = router;
