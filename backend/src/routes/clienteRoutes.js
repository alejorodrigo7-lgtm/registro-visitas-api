const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Cliente = require('../models/Cliente');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configurar multer para archivos CSV (sin usar csv-parser)
const upload = multer({ dest: 'uploads/' });

// ============================================
// 🔍 BUSCAR CLIENTE POR IDENTIFICADOR
// ============================================
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
    console.error('❌ Error en buscar:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 📋 OBTENER TODOS LOS CLIENTES (CON BÚSQUEDA)
// ============================================
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
    console.error('❌ Error en /todos:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 📋 OBTENER TODOS LOS CLIENTES (SIN LÍMITE)
// ============================================
router.get('/todos-sin-limite', protect, async (req, res) => {
  try {
    const { search } = req.query;
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
    
    const clientes = await Cliente.find(query).sort({ nombre: 1 });
    
    console.log(`📋 ${clientes.length} clientes encontrados (sin límite)`);
    
    res.json({
      success: true,
      count: clientes.length,
      data: clientes,
    });
  } catch (error) {
    console.error('❌ Error en /todos-sin-limite:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 👤 CREAR NUEVO CLIENTE (Admin/Jefe)
// ============================================
router.post('/', protect, authorize('Admin', 'Jefe'), async (req, res) => {
  try {
    const { nombre, identificador, barrio, direccion, telefono } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El nombre es obligatorio'
      });
    }
    if (!identificador || !identificador.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El identificador es obligatorio'
      });
    }
    if (!barrio || !barrio.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El barrio es obligatorio'
      });
    }
    if (!direccion || !direccion.trim()) {
      return res.status(400).json({
        success: false,
        message: 'La dirección es obligatoria'
      });
    }
    if (!telefono || !telefono.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El teléfono es obligatorio'
      });
    }

    const existeCliente = await Cliente.findOne({ 
      identificador: identificador.trim() 
    });
    
    if (existeCliente) {
      return res.status(400).json({
        success: false,
        message: `Ya existe un cliente con el identificador ${identificador}`
      });
    }

    const nuevoCliente = new Cliente({
      nombre: nombre.trim(),
      identificador: identificador.trim(),
      barrio: barrio.trim(),
      direccion: direccion.trim(),
      telefono: telefono.trim(),
    });

    await nuevoCliente.save();

    console.log(`✅ Nuevo cliente registrado: ${nuevoCliente.nombre} (${nuevoCliente.identificador})`);

    res.status(201).json({
      success: true,
      message: 'Cliente registrado correctamente',
      data: nuevoCliente,
    });

  } catch (error) {
    console.error('❌ Error al crear cliente:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 🗑️ ELIMINAR CLIENTE (Admin)
// ============================================
router.delete('/:id', protect, authorize('Admin'), async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    await cliente.deleteOne();
    
    res.json({
      success: true,
      message: 'Cliente eliminado correctamente'
    });
  } catch (error) {
    console.error('❌ Error eliminando cliente:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 📋 ACTUALIZAR CLIENTE (Admin/Jefe)
// ============================================
router.put('/:id', protect, authorize('Admin', 'Jefe'), async (req, res) => {
  try {
    const { nombre, identificador, barrio, direccion, telefono } = req.body;
    
    const cliente = await Cliente.findById(req.params.id);
    
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    if (identificador && identificador !== cliente.identificador) {
      const existe = await Cliente.findOne({ 
        identificador: identificador.trim() 
      });
      if (existe) {
        return res.status(400).json({
          success: false,
          message: `Ya existe un cliente con el identificador ${identificador}`
        });
      }
    }

    cliente.nombre = nombre || cliente.nombre;
    cliente.identificador = identificador || cliente.identificador;
    cliente.barrio = barrio || cliente.barrio;
    cliente.direccion = direccion || cliente.direccion;
    cliente.telefono = telefono || cliente.telefono;
    
    await cliente.save();
    
    res.json({
      success: true,
      message: 'Cliente actualizado correctamente',
      data: cliente
    });
  } catch (error) {
    console.error('❌ Error actualizando cliente:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;