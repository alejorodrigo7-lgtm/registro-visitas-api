const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

console.log('🔄 ventaRoutes.js - Versión con auth interno');

// ============ AUTH INTERNO ============
const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'No autorizado - Token no proporcionado' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_secret_aqui');
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
      }

      req.user = user;
      req.userId = user._id;
      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
    }
  } catch (error) {
    console.error('Error en auth:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

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

// ============ CONTROLADOR ============
let ventaController;
try {
  ventaController = require('../controllers/ventaController');
  console.log('✅ ventaController cargado');
} catch (error) {
  console.error('❌ Error cargando ventaController:', error.message);
}

// ============ RUTAS ============
if (ventaController) {
  console.log('✅ Registrando rutas completas de ventas');
  
  router.post('/venta', protect, ventaController.crearVenta);
  router.get('/ventas', protect, ventaController.obtenerVentas);
  router.put('/venta/:id/ingreso', protect, checkRole(['Admin', 'Jefe']), ventaController.actualizarIngresoVenta);
  router.post('/reporte', protect, ventaController.crearReporteVenta);
  router.get('/reportes', protect, ventaController.obtenerReportesVenta);
  router.put('/reporte/:id/pago', protect, checkRole(['Admin', 'Jefe']), ventaController.registrarPago);
  router.get('/ventas-pagadas', protect, ventaController.obtenerVentasPagadas);
} else {
  console.log('⚠️ ventaController no disponible, solo ruta de prueba');
}

// Ruta de diagnóstico
router.get('/test', (req, res) => {
  res.json({ 
    message: '✅ ventaRoutes.js funcionando',
    status: ventaController ? 'completo' : 'prueba'
  });
});

module.exports = router;
