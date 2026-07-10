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

module.exports = router;