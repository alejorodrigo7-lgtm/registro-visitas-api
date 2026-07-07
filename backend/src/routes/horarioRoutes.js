const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  crearHorario,
  getHorarios,
  getHorario,
  updateHorario,
  deleteHorario,
} = require('../controllers/horarioController');

router.use(protect);

router.route('/')
  .post(authorize('Admin', 'Jefe'), crearHorario)
  .get(getHorarios);

router.route('/:id')
  .get(getHorario)
  .put(authorize('Admin', 'Jefe'), updateHorario)
  .delete(authorize('Admin', 'Jefe'), deleteHorario);

module.exports = router;