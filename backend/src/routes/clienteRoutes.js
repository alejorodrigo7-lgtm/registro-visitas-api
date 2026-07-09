const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Cliente = require('../models/Cliente');

// 🔍 Buscar cliente por identificador
router.get('/buscar/:identificador', protect, async (req, res) => {
  try {
    const { identificador } = req.params;
    console.log(`🔍 Buscando cliente con identificador: ${identificador}`);
    
    const cliente = await Cliente.findOne({ 
      identificador: identificador.trim() 
    });
    
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: `No se encontró cliente con identificador ${identificador}`
      });
    }
    
    res.json({
      success: true,
      data: {
        nombre: cliente.nombre,
        identificador: cliente.identificador,
        barrio: cliente.barrio,
        direccion: cliente.direccion,
        telefono: cliente.telefono,
        email: cliente.email || '',
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 📋 OBTENER TODOS LOS CLIENTES (CON BÚSQUEDA)
router.get('/todos', protect, async (req, res) => {
  try {
    const { search, limit = 100 } = req.query;
    let query = {};
    
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query = {
        $or: [
          { nombre: { $regex: searchRegex } },
          { identificador: { $regex: searchRegex } },
          { barrio: { $regex: searchRegex } },
          { direccion: { $regex: searchRegex } },
          { telefono: { $regex: searchRegex } }
        ]
      };
    }
    
    const clientes = await Cliente.find(query)
      .sort({ nombre: 1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      count: clientes.length,
      data: clientes,
    });
  } catch (error) {
    console.error('Error en /todos:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 📤 CARGAR CLIENTES DESDE CSV (Admin)
router.post('/cargar-csv', protect, authorize('Admin'), upload.single('archivo'), async (req, res) => {
  // ... (código existente)
});

module.exports = router;