const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  guardarUbicacion,
  getUbicacionesPorFecha,
  getUbicacionesReales,
} = require('../controllers/ubicacionController');
const {
  subirKMZ,
  getKMZ,
  getKMZById,
  deleteKMZ,
} = require('../controllers/kmzController');

router.use(protect);

// ============================================
// 📍 UBICACIONES
// ============================================
router.post('/ubicaciones', guardarUbicacion);
router.get('/ubicaciones', getUbicacionesPorFecha);
router.get('/ubicaciones/reales', getUbicacionesReales);

// ============================================
// 📤 KMZ
// ============================================
router.post('/kmz', subirKMZ);
router.get('/kmz', getKMZ);
router.get('/kmz/:id', getKMZById);
router.delete('/kmz/:id', authorize('Admin'), deleteKMZ);

module.exports = router;