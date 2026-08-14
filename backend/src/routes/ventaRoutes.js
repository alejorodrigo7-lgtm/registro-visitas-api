const express = require('express');
const router = express.Router();

console.log('🔍 [DEBUG] Iniciando ventaRoutes.js');

// Intentar importar el controlador
let ventaController;
try {
  ventaController = require('../controllers/ventaController');
  console.log('✅ [DEBUG] ventaController importado:', typeof ventaController);
  console.log('✅ [DEBUG] Funciones disponibles:', Object.keys(ventaController));
} catch (error) {
  console.error('❌ [DEBUG] Error importando ventaController:', error.message);
}

// Intentar importar auth
let auth;
try {
  auth = require('../middleware/auth');
  console.log('✅ [DEBUG] auth importado:', typeof auth);
} catch (error) {
  console.error('❌ [DEBUG] Error importando auth:', error.message);
}

// Función checkRole simplificada
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

console.log('🔍 [DEBUG] checkRole definida');

// Solo registrar rutas si todo está bien
if (ventaController && auth) {
  console.log('✅ [DEBUG] Todas las dependencias cargadas, registrando rutas');
  
  router.post('/venta', auth, ventaController.crearVenta);
  router.get('/ventas', auth, ventaController.obtenerVentas);
  router.put('/venta/:id/ingreso', auth, checkRole(['Admin', 'Jefe']), ventaController.actualizarIngresoVenta);
  router.post('/reporte', auth, ventaController.crearReporteVenta);
  router.get('/reportes', auth, ventaController.obtenerReportesVenta);
  router.put('/reporte/:id/pago', auth, checkRole(['Admin', 'Jefe']), ventaController.registrarPago);
  router.get('/ventas-pagadas', auth, ventaController.obtenerVentasPagadas);
} else {
  console.log('❌ [DEBUG] Faltan dependencias, registrando solo ruta de prueba');
  
  router.get('/test', (req, res) => {
    res.json({ 
      message: '🔍 Modo depuración',
      ventaController: ventaController ? '✅ Cargado' : '❌ No cargado',
      auth: auth ? '✅ Cargado' : '❌ No cargado'
    });
  });
}

console.log('✅ [DEBUG] ventaRoutes.js finalizado');
module.exports = router;
