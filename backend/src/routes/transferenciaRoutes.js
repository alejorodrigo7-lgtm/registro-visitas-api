const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const transferenciaController = require('../controllers/transferenciaController');

router.use(protect);

router.post('/subir', transferenciaController.subirTransferencia);
router.get('/', transferenciaController.getTransferencias);
router.get('/estado/:estado', transferenciaController.getTransferenciasByEstado);
router.get('/buscar-revision', transferenciaController.buscarTransferenciasRevision);
router.get('/:id', transferenciaController.getTransferencia);
router.put('/:id/confirmar', authorize('Admin', 'Jefe'), transferenciaController.confirmarTransferencia);
router.put('/:id/ingresar', authorize('Admin', 'Jefe'), transferenciaController.ingresarTransferencia);

// Verificar si un numero de documento ya existe
router.get('/verificar-documento/:numero', async (req, res) => {
  try {
    const { numero } = req.params;
    const Transferencia = require('../models/Transferencia');
    
    const existe = await Transferencia.findOne({ numeroDocumento: numero });
    
    res.json({
      success: true,
      exists: !!existe,
      data: existe ? { id: existe._id, fecha: existe.fechaTransferencia } : null
    });
  } catch (error) {
    console.error('Error verificando documento:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
