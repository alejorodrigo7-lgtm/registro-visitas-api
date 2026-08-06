// src/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getStatsByTecnico,
  getStatsVisitas,
  getStatsAsistencia,
} = require('../controllers/statsController');
const { getDashboardStats, getDashboardCompleto } = require('../controllers/dashboardController');

// ============================================
// 🔒 TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================
router.use(protect);

// ============================================
// 📊 RUTAS DEL DASHBOARD
// ============================================

// 📊 Dashboard principal (solo Admin/Jefe)
router.get('/', authorize('Admin', 'Jefe'), getDashboardStats);

// 📊 Dashboard stats (alias de / para compatibilidad)
router.get('/stats', authorize('Admin', 'Jefe'), getDashboardStats);

// 📊 Dashboard completo con todas las estadísticas
router.get('/completo', authorize('Admin', 'Jefe'), getDashboardCompleto);

// 📊 Estadísticas por técnico
router.get('/tecnico', authorize('Admin', 'Jefe'), getStatsByTecnico);

// 📊 Estadísticas de visitas
router.get('/visitas', authorize('Admin', 'Jefe'), getStatsVisitas);

// 📊 Estadísticas de asistencia
router.get('/asistencia', authorize('Admin', 'Jefe'), getStatsAsistencia);

module.exports = router;
