const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const transferenciaController = require('../controllers/transferenciaController');

// ============================================
// ✅ MIDDLEWARE DE VALIDACIÓN DE DOCUMENTO ÚNICO
// ============================================
const validarDocumentoUnico = async (req, res, next) => {
  try {
    const { numeroDocumento } = req.body;
    
    if (!numeroDocumento) {
      return next();
    }
    
    const Transferencia = require('../models/Transferencia');
    const existe = await Transferencia.findOne({ 
      numeroDocumento: numeroDocumento.trim() 
    });
    
    if (existe) {
      return res.status(400).json({
        success: false,
        message: `El número de documento ${numeroDocumento} ya existe en otra transferencia`,
        campo: 'numeroDocumento',
        transferenciaExistente: {
          id: existe._id,
          fecha: existe.fechaTransferencia,
          nombre: existe.nombreUsuario
        }
      });
    }
    
    next();
  } catch (error) {
    console.error('❌ Error validando documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al validar documento'
    });
  }
};

// ============================================
// 🔒 TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================
router.use(protect);

// ============================================
// 📤 RUTAS DE TRANSFERENCIAS CON CONTROL DE ROLES
// ============================================

// ✅ SUBIR TRANSFERENCIA - ADMIN, JEFE, COORDINADOR
router.post('/subir', 
  authorize('Admin', 'Jefe', 'Coordinador'), 
  validarDocumentoUnico, 
  transferenciaController.subirTransferencia
);

// 📋 OBTENER TODAS LAS TRANSFERENCIAS - ADMIN, JEFE, COORDINADOR
router.get('/', 
  authorize('Admin', 'Jefe', 'Coordinador'), 
  transferenciaController.getTransferencias
);

// 📋 OBTENER TRANSFERENCIAS POR ESTADO - ADMIN, JEFE, COORDINADOR
router.get('/estado/:estado', 
  authorize('Admin', 'Jefe', 'Coordinador'), 
  transferenciaController.getTransferenciasByEstado
);

// 🔍 BUSCAR TRANSFERENCIAS PARA REVISIÓN - ADMIN, JEFE
router.get('/buscar-revision', 
  authorize('Admin', 'Jefe'), 
  transferenciaController.buscarTransferenciasRevision
);

// ✅ VERIFICAR SI UN NÚMERO DE DOCUMENTO YA EXISTE - ADMIN, JEFE, COORDINADOR
router.get('/verificar-documento/:numero', 
  authorize('Admin', 'Jefe', 'Coordinador'), 
  async (req, res) => {
    try {
      const { numero } = req.params;
      const Transferencia = require('../models/Transferencia');
      
      const existe = await Transferencia.findOne({ numeroDocumento: numero });
      
      res.json({
        success: true,
        exists: !!existe,
        data: existe ? { 
          id: existe._id, 
          fecha: existe.fechaTransferencia,
          nombre: existe.nombreUsuario
        } : null
      });
    } catch (error) {
      console.error('Error verificando documento:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// 📋 OBTENER UNA TRANSFERENCIA POR ID - ADMIN, JEFE, COORDINADOR
router.get('/:id', 
  authorize('Admin', 'Jefe', 'Coordinador'), 
  transferenciaController.getTransferencia
);

// ✅ CONFIRMAR O DENEGAR TRANSFERENCIA - ADMIN, JEFE
router.put('/:id/confirmar', 
  authorize('Admin', 'Jefe'), 
  transferenciaController.confirmarTransferencia
);

// 💰 INGRESAR TRANSFERENCIA - ADMIN, JEFE
router.put('/:id/ingresar', 
  authorize('Admin', 'Jefe'), 
  transferenciaController.ingresarTransferencia
);

module.exports = router;