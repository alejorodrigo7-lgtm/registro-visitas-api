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
// ASIGNAR MATERIAL - ADMIN Y JEFE
// ============================================
router.post('/:id/asignar-material', authorize('Admin', 'Jefe'), asignarMaterial);

// ============================================
// RESTAR MATERIAL - DUEÑO DE BODEGA, ADMIN O JEFE
// ============================================
router.post('/:id/restar-material', restarMaterial);

// ============================================
// RUTAS ESPECÍFICAS
// ============================================
router.route('/:id')
  .get(obtenerBodega)
  .delete(authorize('Admin'), eliminarBodega);

// ============================================
// CAMBIAR ESTADO - SOLO ADMIN
// ============================================
router.put('/:id/estado', authorize('Admin'), cambiarEstadoBodega);

// ============================================
// ✅ RUTA - OBTENER MATERIALES DEL TÉCNICO AUTENTICADO
// ============================================

// GET /api/bodega/mis-materiales - Obtener materiales de la bodega del técnico autenticado
router.get('/mis-materiales', async (req, res) => {
  try {
    console.log('📦 === OBTENIENDO MATERIALES DEL TÉCNICO ===');
    console.log('📦 Usuario ID:', req.user._id);
    console.log('📦 Email:', req.user.email);
    console.log('📦 Rol:', req.user.rol);
    
    const Bodega = require('../models/Bodega');
    
    // ✅ CORREGIDO: Buscar por 'usuario' en lugar de 'tecnicoId'
    let bodega = await Bodega.findOne({ usuario: req.user._id });
    
    if (!bodega) {
      console.log('📦 Bodega no encontrada, creando una vacía...');
      
      // Crear una bodega vacía para el técnico
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
    
    if (bodega.materiales && bodega.materiales.length > 0) {
      console.log('📋 Materiales disponibles:');
      bodega.materiales.forEach((m, i) => {
        console.log(`  ${i+1}. ${m.nombre}: ${m.cantidad} ${m.unidad || 'uds'}`);
      });
    }
    
    res.json({
      success: true,
      data: bodega.materiales || []
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo materiales del técnico:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// ✅ RUTA - AGREGAR MATERIAL A BODEGA DEL TÉCNICO
// ============================================

// POST /api/bodega/mis-materiales - Agregar material a la bodega del técnico
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
    
    // ✅ CORREGIDO: Buscar por 'usuario' en lugar de 'tecnicoId'
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
    
    // Verificar si el material ya existe
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

module.exports = router;