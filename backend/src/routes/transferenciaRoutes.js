const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const transferenciaController = require('../controllers/transferenciaController');

router.use(protect);

router.post('/subir', transferenciaController.subirTransferencia);
router.get('/', transferenciaController.getTransferencias);
router.get('/estado/:estado', transferenciaController.getTransferenciasByEstado);
router.get('/buscar-revision', transferenciaController.buscarTransferenciasRevision);
router.get('/:id', transferenciaController.getTransferencia);
router.put('/:id/confirmar', authorize('Admin', 'Jefe'), transferenciaController.confirmarTransferencia);
router.put('/:id/ingresar', authorize('Admin', 'Jefe'), transferenciaController.ingresarTransferencia);

module.exports = router;