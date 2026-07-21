const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getDashboardStats,
  getStatsByTecnico,
  getStatsVisitas,
  getStatsAsistencia,
} = require('../controllers/statsController');

// Todas las rutas requieren autenticación
router.use(protect);

// 📊 Dashboard principal (solo Admin/Jefe)
router.get('/', authorize('Admin', 'Jefe'), getDashboardStats);

// 📊 Estadísticas por técnico
router.get('/tecnico', authorize('Admin', 'Jefe'), getStatsByTecnico);

// 📊 Estadísticas de visitas
router.get('/visitas', authorize('Admin', 'Jefe'), getStatsVisitas);

// 📊 Estadísticas de asistencia
router.get('/asistencia', authorize('Admin', 'Jefe'), getStatsAsistencia);

module.exports = router;