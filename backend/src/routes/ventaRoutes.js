const express = require('express');
const router = express.Router();

console.log('🔄 ventaRoutes.js - Versión híbrida');

// Intentar cargar dependencias con manejo de errores
let ventaController, auth;
try {
  ventaController = require('../controllers/ventaController');
  console.log('✅ ventaController cargado');
} catch (error) {
  console.error('❌ Error cargando ventaController:', error.message);
}

try {
  auth = require('../middleware/auth');
  console.log('✅ auth cargado');
} catch (error) {
  console.error('❌ Error cargando auth:', error.message);
}

// Función checkRole
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

// Registrar rutas SOLO si las dependencias están disponibles
if (ventaController && auth) {
  console.log('✅ Registrando rutas completas de ventas');
  
  router.post('/venta', auth, ventaController.crearVenta);
  router.get('/ventas', auth, ventaController.obtenerVentas);
  router.put('/venta/:id/ingreso', auth, checkRole(['Admin', 'Jefe']), ventaController.actualizarIngresoVenta);
  router.post('/reporte', auth, ventaController.crearReporteVenta);
  router.get('/reportes', auth, ventaController.obtenerReportesVenta);
  router.put('/reporte/:id/pago', auth, checkRole(['Admin', 'Jefe']), ventaController.registrarPago);
  router.get('/ventas-pagadas', auth, ventaController.obtenerVentasPagadas);
} else {
  console.log('⚠️ Dependencias no disponibles, solo ruta de prueba');
}

// Siempre disponible para diagnóstico
router.get('/test', (req, res) => {
  res.json({ 
    message: '✅ ventaRoutes.js funcionando',
    status: ventaController && auth ? 'completo' : 'prueba'
  });
});

module.exports = router;
