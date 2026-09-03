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
  getOrdenById,
  marcarRetirado,
  anularOrden,
  reconectarEquipo
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

// Ejecutar visita (Coordinador, Admin, Jefe)
router.put('/orden/:id/visita', (req, res, next) => {
  if (!['Coordinador', 'Admin', 'Jefe'].includes(req.user.rol)) {
    return res.status(403).json({ success: false, message: 'No tienes permiso para ejecutar órdenes' });
  }
  next();
}, ejecutarVisita);

// Actualizar visita (Coordinador, Admin, Jefe)
router.put('/orden/:id/visita/:visitaId', (req, res, next) => {
  if (!['Coordinador', 'Admin', 'Jefe'].includes(req.user.rol)) {
    return res.status(403).json({ success: false, message: 'No tienes permiso para modificar visitas' });
  }
  next();
}, actualizarVisita);

// Marcar como retirado (Coordinador, Admin, Jefe)
router.put('/orden/:id/marcar-retirado', (req, res, next) => {
  if (!['Coordinador', 'Admin', 'Jefe'].includes(req.user.rol)) {
    return res.status(403).json({ success: false, message: 'No tienes permiso para marcar como retirado' });
  }
  next();
}, marcarRetirado);

// ✅ ANULAR ORDEN (solo Admin/Jefe)
router.put('/orden/:id/anular', (req, res, next) => {
  if (!['Admin', 'Jefe'].includes(req.user.rol)) {
    return res.status(403).json({ success: false, message: 'Solo Administradores y Jefes pueden anular órdenes' });
  }
  next();
}, anularOrden);

// ✅ RECONECTAR EQUIPO (solo Admin/Jefe)
router.put('/orden/:id/reconectar', (req, res, next) => {
  if (!['Admin', 'Jefe'].includes(req.user.rol)) {
    return res.status(403).json({ success: false, message: 'Solo Administradores y Jefes pueden reconectar equipos' });
  }
  next();
}, reconectarEquipo);

module.exports = router;