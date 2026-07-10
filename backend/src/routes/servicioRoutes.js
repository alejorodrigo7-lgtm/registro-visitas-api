const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const servicioController = require('../controllers/servicioController');

router.use(protect);

// Rutas principales
router.post('/tomar', servicioController.tomarServicio);
router.get('/', servicioController.getServicios);
router.get('/estado/:estado', servicioController.getServiciosByEstado);
router.get('/buscar', servicioController.buscarServicios);
router.get('/:id', servicioController.getServicio);

// Acciones
router.put('/:id/ejecutar', authorize('Admin', 'Jefe', 'Tecnico'), servicioController.ejecutarServicio);
router.put('/:id/pendiente', authorize('Admin', 'Jefe', 'Tecnico'), servicioController.pendienteServicio);
router.put('/:id/retroalimentar', authorize('Admin', 'Jefe', 'Tecnico'), servicioController.retroalimentarServicio);

module.exports = router;