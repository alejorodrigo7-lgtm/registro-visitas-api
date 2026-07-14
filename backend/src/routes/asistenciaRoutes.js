const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  registrarAsistencia,
  obtenerAsistenciaHoy,
  obtenerAsistenciaPorFechas,
  generarReporteExcel,
  obtenerUbicacionesPermitidas,
} = require('../controllers/asistenciaController');

router.use(protect);

// Rutas para todos los usuarios
router.post('/', registrarAsistencia);
router.get('/hoy', obtenerAsistenciaHoy);
router.get('/ubicaciones', obtenerUbicacionesPermitidas);

// Rutas solo para Admin y Jefe
router.get('/reporte-excel', authorize('Admin', 'Jefe'), generarReporteExcel);
router.get('/fechas', authorize('Admin', 'Jefe'), obtenerAsistenciaPorFechas);

module.exports = router;