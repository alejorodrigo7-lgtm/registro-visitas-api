const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  crearVisita,
  obtenerVisitas,
  obtenerVisita,
  actualizarVisita,
  eliminarVisita,
  obtenerMisVisitas,
} = require('../controllers/visitaController');

// Todas las rutas requieren autenticación
router.use(protect);

// ============================================
// 📋 RUTAS DE VISITAS CON CONTROL DE ROLES
// ============================================

// 👤 OBTENER MIS VISITAS - SOLO TÉCNICO (sus propias visitas)
router.get('/mis-visitas', 
  authorize('Tecnico'), 
  obtenerMisVisitas
);

// 📋 OBTENER TODAS LAS VISITAS - ADMIN, JEFE, COORDINADOR
router.get('/', 
  authorize('Admin', 'Jefe', 'Coordinador'), 
  obtenerVisitas
);

// ➕ CREAR VISITA - ADMIN, JEFE, COORDINADOR, TECNICO
router.post('/', 
  authorize('Admin', 'Jefe', 'Coordinador', 'Tecnico'), 
  crearVisita
);

// 📋 OBTENER UNA VISITA POR ID - ADMIN, JEFE, COORDINADOR
router.get('/:id', 
  authorize('Admin', 'Jefe', 'Coordinador'), 
  obtenerVisita
);

// ✏️ ACTUALIZAR VISITA - ADMIN, JEFE, COORDINADOR
router.put('/:id', 
  authorize('Admin', 'Jefe', 'Coordinador'), 
  actualizarVisita
);

// 🗑️ ELIMINAR VISITA - ADMIN, JEFE
router.delete('/:id', 
  authorize('Admin', 'Jefe'), 
  eliminarVisita
);

module.exports = router;