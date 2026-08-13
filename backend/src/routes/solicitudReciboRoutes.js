const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  getSolicitudes,
  crearSolicitud,
  aprobarSolicitud,
  denegarSolicitud,
  buscarClientes
} = require('../controllers/solicitudReciboController');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas públicas (todos los roles autenticados)
router.get('/clientes/buscar', buscarClientes);
router.get('/', getSolicitudes);
router.post('/', crearSolicitud);

// Rutas solo para Admin y Jefe
router.put('/:id/aprobar', (req, res, next) => {
  if (!['Admin', 'Jefe'].includes(req.user.rol)) {
    return res.status(403).json({
      success: false,
      message: 'No tienes permiso para aprobar solicitudes'
    });
  }
  next();
}, aprobarSolicitud);

router.put('/:id/denegar', (req, res, next) => {
  if (!['Admin', 'Jefe'].includes(req.user.rol)) {
    return res.status(403).json({
      success: false,
      message: 'No tienes permiso para denegar solicitudes'
    });
  }
  next();
}, denegarSolicitud);

module.exports = router;