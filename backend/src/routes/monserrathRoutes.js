const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  crearRegistro,
  obtenerRegistros,
  obtenerRegistro,
  actualizarRegistro,
  eliminarRegistro,
  obtenerReporte,
} = require('../controllers/monserrathController');

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas principales
router.post('/', crearRegistro);
router.get('/', obtenerRegistros);
router.get('/reporte', obtenerReporte);
router.get('/:id', obtenerRegistro);
router.put('/:id', actualizarRegistro);
router.delete('/:id', authorize('Admin', 'Jefe'), eliminarRegistro);

module.exports = router;