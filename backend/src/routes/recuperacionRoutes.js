const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getCoordinadores,
  crearOrden,
  getOrdenes,
  getOrdenesPorEstado,
  ejecutarVisita,
  actualizarVisita,
  getOrdenById
} = require('../controllers/recuperacionController');

// Todas las rutas requieren autenticación
router.use(protect);

// Obtener coordinadores
router.get('/coordinadores', getCoordinadores);

// Crear orden (Admin/Jefe)
router.post('/orden', (req, res, next) => {
  if (!['Admin', 'Jefe'].includes(req.user.rol)) {
    return res.status(403).json({ success: false, message: 'No tienes permiso para subir órdenes' });
  }
  next();
}, crearOrden);

// Obtener órdenes por estado
router.get('/ordenes/estado/:estado', getOrdenesPorEstado);

// Obtener órdenes con filtros
router.get('/ordenes', getOrdenes);

// Obtener orden por ID
router.get('/orden/:id', getOrdenById);

// Ejecutar visita (Coordinador)
router.put('/orden/:id/visita', (req, res, next) => {
  if (!['Coordinador', 'Admin', 'Jefe'].includes(req.user.rol)) {
    return res.status(403).json({ success: false, message: 'No tienes permiso para ejecutar órdenes' });
  }
  next();
}, ejecutarVisita);

// Actualizar visita (Coordinador)
router.put('/orden/:id/visita/:visitaId', (req, res, next) => {
  if (!['Coordinador', 'Admin', 'Jefe'].includes(req.user.rol)) {
    return res.status(403).json({ success: false, message: 'No tienes permiso para modificar visitas' });
  }
  next();
}, actualizarVisita);

module.exports = router;