const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  crearSolicitud,
  obtenerSolicitudesUsuario,
  obtenerSolicitudesPendientes,
  obtenerTodasSolicitudes,
  actualizarSolicitud,
  generarReporteExcel,
} = require('../controllers/pedirAusenciaController');

router.use(protect);

router.post('/', crearSolicitud);
router.get('/mis-solicitudes', obtenerSolicitudesUsuario);

router.get('/pendientes', authorize('Admin', 'Jefe'), obtenerSolicitudesPendientes);
router.get('/todas', authorize('Admin', 'Jefe'), obtenerTodasSolicitudes);
router.put('/:id', authorize('Admin', 'Jefe'), actualizarSolicitud);
router.get('/reporte-excel', authorize('Admin', 'Jefe'), generarReporteExcel);

module.exports = router;