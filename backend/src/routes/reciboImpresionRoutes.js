const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const controller = require('../controllers/reciboImpresionController');

const rolesPermitidos = authorize('Admin', 'Coordinador');

router.get('/cliente/:cedula', protect, rolesPermitidos, controller.buscarClientePorCedula);
router.post('/generar', protect, rolesPermitidos, controller.generar);
router.get('/:id/html', protect, rolesPermitidos, controller.reimprimir);
router.get('/', protect, rolesPermitidos, controller.listar);

module.exports = router;