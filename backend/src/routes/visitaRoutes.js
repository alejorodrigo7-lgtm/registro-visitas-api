const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  crearVisita,
  obtenerVisitas,
  obtenerVisita,
  actualizarVisita,
  eliminarVisita,
} = require('../controllers/visitaController');

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas principales
router.route('/')
  .post(crearVisita)
  .get(obtenerVisitas);

// Rutas específicas
router.route('/:id')
  .get(obtenerVisita)
  .put(actualizarVisita)
  .delete(authorize('Admin', 'Jefe'), eliminarVisita);

module.exports = router;