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
router.get('/cuadre/:zona/:fecha', cajaController.getCuadre);

// Agregar ingreso a un cuadre
router.post('/cuadre/:id/ingreso', cajaController.agregarIngreso);

// Agregar pago a un cuadre
router.post('/cuadre/:id/pago', cajaController.agregarPago);

// Cerrar cuadre del día para una zona
router.put('/cuadre/:id/cerrar', cajaController.cerrarCuadre);

// Enviar correo con resumen de las 3 zonas
router.post('/cuadre/enviar-correo', cajaController.enviarCorreoResumen);

// Obtener resumen del día para las 3 zonas
router.get('/resumen/:fecha', cajaController.getResumenDia);

module.exports = router;