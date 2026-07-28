const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  crearBodega,
  obtenerBodegas,
  obtenerBodega,
  asignarMaterial,
  restarMaterial,
  eliminarBodega,
  cambiarEstadoBodega,
} = require('../controllers/bodegaController');

// Todas las rutas requieren autenticación
router.use(protect);

// ============================================
// CREAR BODEGA - SOLO ADMIN
// ============================================
router.post('/crear', authorize('Admin'), crearBodega);

// ============================================
// RUTAS PRINCIPALES
// ============================================
router.route('/')
  .get(obtenerBodegas);

// ============================================
// ✅ RUTAS ESPECÍFICAS - DEBEN IR ANTES DE /:id
// ============================================

// GET /api/bodegas/mis-materiales
router.get('/mis-materiales', async (req, res) => {
  try {
    console.log('📦 === OBTENIENDO MATERIALES DEL TÉCNICO ===');
    console.log('📦 Usuario ID:', req.user._id);
    console.log('📦 Email:', req.user.email);
    console.log('📦 Rol:', req.user.rol);
    
    const Bodega = require('../models/Bodega');
    
    let bodega = await Bodega.findOne({ usuario: req.user._id });
    
    if (!bodega) {
      console.log('📦 Bodega no encontrada, creando una vacía...');
      bodega = new Bodega({
        usuario: req.user._id,
        usuarioNombre: req.user.nombre || req.user.email,
        nombre: `Bodega de ${req.user.nombre || req.user.email}`,
        materiales: [],
        estado: 'ACTIVA',
        creadoPor: req.user._id,
      });
      await bodega.save();
      console.log('✅ Bodega creada para técnico:', req.user._id);
    }
    
    console.log(`📦 Materiales en bodega: ${bodega.materiales?.length || 0}`);
    
    res.json({
      success: true,
      data: bodega,
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo materiales del técnico:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/bodegas/mis-materiales
router.post('/mis-materiales', async (req, res) => {
  try {
    const { nombre, cantidad, unidad } = req.body;
    
    if (!nombre || !cantidad) {
      return res.status(400).json({
        success: false,
        message: 'Nombre y cantidad son obligatorios'
      });
    }
    
    console.log('📦 Agregando material a bodega del técnico:', req.user._id);
    console.log(`📦 Material: ${nombre}, Cantidad: ${cantidad}, Unidad: ${unidad || 'uds'}`);
    
    const Bodega = require('../models/Bodega');
    let bodega = await Bodega.findOne({ usuario: req.user._id });
    
    if (!bodega) {
      bodega = new Bodega({
        usuario: req.user._id,
        usuarioNombre: req.user.nombre || req.user.email,
        nombre: `Bodega de ${req.user.nombre || req.user.email}`,
        materiales: [],
        estado: 'ACTIVA',
        creadoPor: req.user._id,
      });
    }
    
    const materialExistente = bodega.materiales.find(m => m.nombre === nombre);
    if (materialExistente) {
      materialExistente.cantidad = (materialExistente.cantidad || 0) + cantidad;
      console.log(`📦 Material existente, nueva cantidad: ${materialExistente.cantidad}`);
    } else {
      bodega.materiales.push({
        nombre,
        cantidad,
        unidad: unidad || 'uds'
      });
      console.log('📦 Material agregado correctamente');
    }
    
    await bodega.save();
    
    res.json({
      success: true,
      message: 'Material agregado a la bodega',
      data: bodega.materiales
    });
    
  } catch (error) {
    console.error('❌ Error agregando material:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 📦 RESTAR MATERIALES DE BODEGA (NUEVO ENDPOINT)
// ============================================
router.post('/restar-materiales-bodega', async (req, res) => {
  try {
    const { materiales } = req.body;
    const usuarioId = req.user._id;
    
    console.log('📦 Restando materiales de bodega...');
    console.log('📦 Usuario:', usuarioId);
    console.log('📦 Materiales a restar:', JSON.stringify(materiales, null, 2));
    
    const Bodega = require('../models/Bodega');
    
    // Buscar la bodega del técnico
    let bodega = await Bodega.findOne({ usuario: usuarioId });
    
    if (!bodega) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró bodega para este técnico'
      });
    }
    
    // Restar cada material
    for (const material of materiales) {
      const materialEnBodega = bodega.materiales.find(
        m => m.nombre === material.nombre
      );
      
      if (materialEnBodega) {
        // Restar cantidad
        const cantidadAnterior = materialEnBodega.cantidad;
        materialEnBodega.cantidad -= material.cantidad;
        
        // Si queda en negativo, poner 0
        if (materialEnBodega.cantidad < 0) {
          materialEnBodega.cantidad = 0;
        }
        
        console.log(`📦 ${material.nombre}: ${cantidadAnterior} → ${materialEnBodega.cantidad} restantes`);
      } else {
        console.log(`⚠️ Material ${material.nombre} no encontrado en bodega`);
      }
    }
    
    // Guardar cambios
    await bodega.save();
    
    console.log('✅ Materiales restados correctamente');
    
    res.json({
      success: true,
      message: 'Materiales restados correctamente',
      data: bodega
    });
    
  } catch (error) {
    console.error('❌ Error restando materiales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al restar materiales',
      error: error.message
    });
  }
});

// ============================================
// ASIGNAR MATERIAL - ADMIN Y JEFE
// ============================================
router.post('/:id/asignar-material', authorize('Admin', 'Jefe'), asignarMaterial);

// ============================================
// RESTAR MATERIAL - DUEÑO DE BODEGA, ADMIN O JEFE
// ============================================
router.post('/:id/restar-material', restarMaterial);

// ============================================
// RUTAS CON PARÁMETRO - DEBEN IR AL FINAL
// ============================================
router.route('/:id')
  .get(obtenerBodega)
  .delete(authorize('Admin'), eliminarBodega);

// ============================================
// CAMBIAR ESTADO - SOLO ADMIN
// ============================================
router.put('/:id/estado', authorize('Admin'), cambiarEstadoBodega);

// ============================================
// 📦 RUTA PARA OBTENER MATERIALES DEL TÉCNICO (CON /api/)
// ============================================
router.get('/api/mis-materiales', async (req, res) => {
  try {
    console.log('📦 === OBTENIENDO MATERIALES DEL TÉCNICO (CON /api/) ===');
    console.log('📦 Usuario ID:', req.user._id);
    console.log('📦 Email:', req.user.email);
    console.log('📦 Rol:', req.user.rol);
    
    const Bodega = require('../models/Bodega');
    
    let bodega = await Bodega.findOne({ usuario: req.user._id });
    
    if (!bodega) {
      console.log('📦 Bodega no encontrada, creando una vacía...');
      bodega = new Bodega({
        usuario: req.user._id,
        usuarioNombre: req.user.nombre || req.user.email,
        nombre: `Bodega de ${req.user.nombre || req.user.email}`,
        materiales: [],
        estado: 'ACTIVA',
        creadoPor: req.user._id,
      });
      await bodega.save();
      console.log('✅ Bodega creada para técnico:', req.user._id);
    }
    
    console.log(`📦 Materiales en bodega: ${bodega.materiales?.length || 0}`);
    
    res.json({
      success: true,
      data: bodega,
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo materiales del técnico:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;