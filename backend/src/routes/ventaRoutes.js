const express = require('express');
const router = express.Router();

console.log('⚠️ ventaRoutes.js cargado (versión de prueba)');

// TEMPORALMENTE COMENTADO PARA QUE EL SERVIDOR PUEDA INICIAR
/*
const ventaController = require('../controllers/ventaController');
const auth = require('../middleware/auth');

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

router.post('/venta', auth, ventaController.crearVenta);
router.get('/ventas', auth, ventaController.obtenerVentas);
router.put('/venta/:id/ingreso', auth, checkRole(['Admin', 'Jefe']), ventaController.actualizarIngresoVenta);
router.post('/reporte', auth, ventaController.crearReporteVenta);
router.get('/reportes', auth, ventaController.obtenerReportesVenta);
router.put('/reporte/:id/pago', auth, checkRole(['Admin', 'Jefe']), ventaController.registrarPago);
router.get('/ventas-pagadas', auth, ventaController.obtenerVentasPagadas);
*/

// Ruta de prueba
router.get('/test', (req, res) => {
  res.json({ message: '✅ ventaRoutes.js funcionando (modo prueba)' });
});

module.exports = router;
