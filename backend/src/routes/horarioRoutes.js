const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  crearHorario,
  getHorarios,
  getHorario,
  updateHorario,
  deleteHorario,
  verificarAlertasHorario,
} = require('../controllers/horarioController');

// Todas las rutas requieren autenticación
router.use(protect);

// ============================================
// RUTAS PRINCIPALES
// ============================================
router.route('/')
  .post(authorize('Admin', 'Jefe'), crearHorario)
  .get(getHorarios);

// ============================================
// RUTAS ESPECÍFICAS
// ============================================
router.route('/:id')
  .get(getHorario)
  .put(authorize('Admin', 'Jefe'), updateHorario)
  .delete(authorize('Admin', 'Jefe'), deleteHorario);

// ============================================
// RUTA PARA VERIFICAR ALERTAS MANUALMENTE
// ============================================
router.post('/verificar', authorize('Admin', 'Jefe'), async (req, res) => {
  try {
    await verificarAlertasHorario();
    res.json({
      success: true,
      message: 'Verificación de horarios ejecutada correctamente'
    });
  } catch (error) {
    console.error('❌ Error en verificación manual:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;