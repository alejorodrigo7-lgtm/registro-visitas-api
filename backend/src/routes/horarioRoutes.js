const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  crearHorario,
  getHorarios,
  getHorario,
  getMiHorario,
  updateHorario,
  deleteHorario,
  verificarAlertasHorario,
} = require('../controllers/horarioController');
const {
  crearSolicitud,
  getSolicitudes,
  actualizarSolicitud,
} = require('../controllers/solicitudPermisoController');

// Todas las rutas requieren autenticación
router.use(protect);

// ============================================
// 📋 HORARIOS
// ============================================

// Crear horario - Solo Admin y Jefe
router.post('/', authorize('Admin', 'Jefe'), crearHorario);

// Obtener todos los horarios
router.get('/', getHorarios);

// Obtener mi horario (para Técnico/Coordinador)
router.get('/mi-horario', getMiHorario);

// Obtener, actualizar o eliminar un horario específico
router.route('/:id')
  .get(getHorario)
  .put(authorize('Admin', 'Jefe'), updateHorario)
  .delete(authorize('Admin', 'Jefe'), deleteHorario);

// Verificar alertas manualmente
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

// ============================================
// 📋 SOLICITUDES DE PERMISO/RESESO
// ============================================

// Crear solicitud - Cualquier usuario autenticado
router.post('/solicitudes', crearSolicitud);

// Obtener solicitudes
router.get('/solicitudes', getSolicitudes);

// Aprobar/Desaprobar solicitud - Solo Admin y Jefe
router.put('/solicitudes/:id', authorize('Admin', 'Jefe'), actualizarSolicitud);

module.exports = router;