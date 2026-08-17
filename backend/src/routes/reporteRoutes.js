// backend/src/routes/reporteRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const reporteController = require('../controllers/reporteController');

// Todas las rutas requieren autenticación y rol Admin/Jefe
router.use(protect);
router.use(authorize('Admin', 'Jefe'));

// Endpoints de reportes
router.get('/transferencias', reporteController.generarReporteTransferencias);
router.get('/visitas', reporteController.generarReporteVisitas);
router.get('/servicios', reporteController.generarReporteServicios);
router.get('/cajas', reporteController.generarReporteCajas);
router.get('/depositos', reporteController.generarReporteDepositos);
router.get('/usuarios', reporteController.generarReporteUsuarios);

// Endpoint raíz para resumen
router.get('/', async (req, res) => {
  try {
    const Visita = require('../models/Visita');
    const Transferencia = require('../models/Transferencia');
    const Servicio = require('../models/Servicio');
    const Caja = require('../models/Caja');
    const Deposito = require('../models/Deposito');
    const User = require('../models/User');

    const [visitas, transferencias, servicios, cajas, depositos, usuarios] = await Promise.all([
      Visita.countDocuments(),
      Transferencia.countDocuments(),
      Servicio.countDocuments(),
      Caja.countDocuments(),
      Deposito.countDocuments(),
      User.countDocuments(),
    ]);

    res.json({
      success: true,
      data: {
        totalVisitas: visitas,
        totalTransferencias: transferencias,
        totalServicios: servicios,
        totalCajas: cajas,
        totalDepositos: depositos,
        totalUsuarios: usuarios,
        fecha: new Date().toISOString(),
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;