const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  crearBodega,
  obtenerBodegas,
  obtenerBodega,
  asignarMaterial,
  restarMaterial,
  eliminarBodega,
  cambiarEstadoBodega,
} = require('../controllers/bodegaController');

// Todas las rutas requieren autenticación
router.use(protect);

// ============================================
// RUTAS PRINCIPALES
// ============================================
router.route('/')
  .get(obtenerBodegas);

// ============================================
// CREAR BODEGA - SOLO ADMIN
// ============================================
router.post('/crear', authorize('Admin'), crearBodega);

// ============================================
// ASIGNAR MATERIAL - ADMIN Y JEFE
// ============================================
router.post('/:id/asignar-material', authorize('Admin', 'Jefe'), asignarMaterial);

// ============================================
// RESTAR MATERIAL - DUEÑO DE BODEGA, ADMIN O JEFE
// ============================================
router.post('/:id/restar-material', restarMaterial);

// ============================================
// RUTAS ESPECÍFICAS
// ============================================
router.route('/:id')
  .get(obtenerBodega)
  .delete(authorize('Admin'), eliminarBodega);

// ============================================
// CAMBIAR ESTADO - SOLO ADMIN
// ============================================
router.put('/:id/estado', authorize('Admin'), cambiarEstadoBodega);

module.exports = router;