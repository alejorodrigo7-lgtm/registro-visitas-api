const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const cajaController = require('../controllers/cajaController');

router.use(protect);

// ============================================
// RUTAS DE CAJA
// ============================================
// Ingresar caja - Solo Jefe y Admin
router.post('/ingresar', authorize('Jefe', 'Admin'), cajaController.ingresarCaja);

// Obtener caja por zona y fecha - Jefe y Admin
router.get('/', authorize('Jefe', 'Admin'), cajaController.getCaja);

// Obtener saldo disponible - Jefe y Admin
router.get('/saldo-disponible', authorize('Jefe', 'Admin'), cajaController.getSaldoDisponible);

// Editar caja - Solo Admin
router.put('/:id', authorize('Admin'), cajaController.editarCaja);

// Buscar cajas - Solo Admin
router.get('/buscar', authorize('Admin'), cajaController.buscarCajas);

// ============================================
// RUTAS DE DEPÓSITOS
// ============================================
// Subir depósito - Jefe y Admin
router.post('/depositos/subir', authorize('Jefe', 'Admin'), cajaController.subirDeposito);

// Revisar depósitos - Jefe y Admin
router.get('/depositos/revisar', authorize('Jefe', 'Admin'), cajaController.revisarDepositos);

// Marcar depósito como revisado - Jefe y Admin
router.put('/depositos/:id/revisar', authorize('Jefe', 'Admin'), cajaController.marcarDepositoRevisado);

// ============================================
// 📊 RUTAS DE CUADRE DE CAJA
// ============================================

// Obtener cuadre por zona y fecha (crea automáticamente si no existe)
router.get('/cuadre/:zona/:fecha', authorize('Jefe', 'Admin'), cajaController.getCuadre);

// Agregar ingreso a un cuadre
router.post('/cuadre/:id/ingreso', authorize('Jefe', 'Admin'), cajaController.agregarIngreso);

// Agregar pago a un cuadre
router.post('/cuadre/:id/pago', authorize('Jefe', 'Admin'), cajaController.agregarPago);

// Cerrar cuadre del día para una zona
router.put('/cuadre/:id/cerrar', authorize('Jefe', 'Admin'), cajaController.cerrarCuadre);

// Enviar correo con resumen de las 3 zonas
router.post('/cuadre/enviar-correo', authorize('Jefe', 'Admin'), cajaController.enviarCorreoResumen);

// Obtener resumen del día para las 3 zonas
router.get('/resumen/:fecha', authorize('Jefe', 'Admin'), cajaController.getResumenDia);

// 🗑️ ELIMINAR CUADRE - SOLO ADMIN (pendiente de implementar)
// router.delete('/cuadre/:id', authorize('Admin'), cajaController.eliminarCuadre);

module.exports = router;